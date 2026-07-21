const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const monnify = require('../services/monnify.service');

// GET /api/wallet
exports.getWallet = async (req, res) => {
  try {
    const wallet = await db.getWallet(req.user.id);
    if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });
    res.json({ success: true, data: { wallet } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/*
|--------------------------------------------------------------------------
| GET / CREATE FUNDING ACCOUNT (MONNIFY RESERVED ACCOUNT)
|--------------------------------------------------------------------------
| Unlike the old Paystack/Flutterwave flow, there's no "amount" up front —
| the user gets ONE permanent account number and can transfer any amount,
| any time. This reuses the /wallet/fund/initialize route your app already
| calls, just with a different meaning: "make sure my funding account
| exists, and tell me what it is."
*/
// POST /api/wallet/fund/initialize
exports.initializeFunding = async (req, res) => {
  try {
    const wallet = await db.getWallet(req.user.id);
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    // Already provisioned — just hand back what's on file.
    if (wallet.monnifyAccountReference) {
      return res.json({
        success: true,
        data: {
          accountNumber: wallet.accountNumber,
          bankName: wallet.bankName,
        },
      });
    }

    const user = await db.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const account = await monnify.createReservedAccount({
      accountReference: `WALLET-${req.user.id}`,
      name: user.fullName,
      email: user.email,
      phone: user.phone,
    });

    // Monnify can return multiple partner banks for the same reserved
    // account (e.g. Wema + a second bank) — any of them credits the same
    // wallet. We show the first as the primary display account.
    const primary = account.accounts?.[0];
    if (!primary) {
      throw new Error('Monnify did not return an account to use');
    }

    const updatedWallet = await db.setWalletAccountDetails(req.user.id, {
      accountNumber: primary.accountNumber,
      bankName: primary.bankName,
      monnifyAccountReference: account.accountReference,
    });

    res.json({
      success: true,
      data: {
        accountNumber: updatedWallet.accountNumber,
        bankName: updatedWallet.bankName,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

/*
|--------------------------------------------------------------------------
| MANUAL REFRESH
|--------------------------------------------------------------------------
| Crediting now happens automatically via the Monnify webhook below — this
| endpoint just re-fetches the current wallet, for a "pull to refresh" /
| "check my balance" button in the app after the user has made a transfer.
| Kept at the same route (/wallet/fund/verify) your app already calls.
*/
// POST /api/wallet/fund/verify
exports.verifyFunding = async (req, res) => {
  try {
    const wallet = await db.getWallet(req.user.id);
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }
    res.json({
      success: true,
      message: 'Balance refreshed',
      data: { wallet, transaction: { reference: '' } },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/*
|--------------------------------------------------------------------------
| MONNIFY WEBHOOK — AUTO-CREDIT ON SUCCESSFUL TRANSFER
|--------------------------------------------------------------------------
| This is what actually credits the wallet. Called by Monnify's servers,
| not by your app — must NOT have the `auth` middleware in front of it.
|
| IMPORTANT: this route needs the raw request body (Buffer) for signature
| verification, not the parsed JSON your other routes get from
| express.json(). See index.js wiring notes.
*/
// POST /api/wallet/webhook/monnify
exports.monnifyWebhook = async (req, res) => {
  try {
    const signature = req.headers['monnify-signature'];
    const rawBody = req.body; // Buffer — see index.js wiring

    if (!monnify.verifyWebhookSignature(rawBody, signature)) {
      console.warn('Rejected Monnify webhook: invalid signature');
      return res.status(401).json({ success: false });
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    const { eventType, eventData } = payload;

    if (eventType !== 'SUCCESSFUL_TRANSACTION') {
      // Ack anything we don't act on so Monnify doesn't keep retrying it.
      return res.status(200).json({ success: true });
    }

    const accountReference = eventData?.product?.reference;
    const paymentReference = eventData?.transactionReference;
    const amountPaid = eventData?.amountPaid;

    if (!accountReference || !paymentReference || !amountPaid) {
      console.warn('Monnify webhook missing expected fields', eventData);
      return res.status(200).json({ success: true });
    }

    // Idempotency — Monnify retries webhooks that don't get a fast 200,
    // so the same payment can arrive more than once.
    const existing = await db.getTransactionByReference(paymentReference);
    if (existing) {
      return res.status(200).json({ success: true });
    }

    if (!accountReference.startsWith('WALLET-')) {
      console.warn('Unrecognized Monnify account reference:', accountReference);
      return res.status(200).json({ success: true });
    }

    const userId = accountReference.replace('WALLET-', '');

    await db.creditWallet(userId, Number(amountPaid));

    await db.createTransaction({
      userId,
      type: 'credit',
      category: 'fund',
      title: 'Wallet Funding via Monnify',
      amount: Number(amountPaid),
      status: 'successful',
      icon: 'account_balance',
      reference: paymentReference,
      meta: { provider: 'monnify', eventData },
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Monnify webhook error:', err);
    // Return 200 even on our own bug so Monnify doesn't hammer retries —
    // but this is logged loudly above so you catch it. Switch to 500 once
    // this has been running cleanly for a while if you'd rather it retry.
    return res.status(200).json({ success: false });
  }
};

// POST /api/wallet/withdraw
exports.withdraw = async (req, res) => {
  try {
    const { amount, accountNumber, bankName } = req.body;
    if (!amount || amount < 100) {
      return res.status(400).json({ success: false, message: 'Minimum withdrawal is ₦100' });
    }
    if (!accountNumber || !bankName) {
      return res.status(400).json({ success: false, message: 'Account number and bank name required' });
    }
    const wallet = await db.debitWallet(req.user.id, parseFloat(amount));
    const txn = await db.createTransaction({
      userId: req.user.id,
      type: 'debit',
      category: 'withdrawal',
      title: `Withdrawal to ${bankName}`,
      amount: parseFloat(amount),
      status: 'successful',
      icon: 'account_balance_wallet',
      reference: `WDR${Date.now()}`,
      meta: { accountNumber, bankName },
    });
    res.json({
      success: true,
      message: `₦${Number(amount).toLocaleString()} withdrawal initiated`,
      data: { wallet, transaction: txn },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/wallet/transfer
exports.transfer = async (req, res) => {
  try {
    const { amount, accountNumber, bankName, note } = req.body;
    if (!amount || amount < 10) {
      return res.status(400).json({ success: false, message: 'Minimum transfer is ₦10' });
    }
    if (!accountNumber || !bankName) {
      return res.status(400).json({ success: false, message: 'Account number and bank name required' });
    }
    const wallet = await db.debitWallet(req.user.id, parseFloat(amount));
    const ref = `TXF${Date.now()}`;
    const txn = await db.createTransaction({
      userId: req.user.id,
      type: 'debit',
      category: 'transfer',
      title: `Transfer to ${bankName} · ${accountNumber.slice(-4).padStart(accountNumber.length, '*')}`,
      amount: parseFloat(amount),
      status: 'successful',
      icon: 'send',
      reference: ref,
      meta: { accountNumber, bankName, note },
    });
    res.json({
      success: true,
      message: `₦${Number(amount).toLocaleString()} sent successfully`,
      data: { wallet, transaction: txn, reference: ref },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};