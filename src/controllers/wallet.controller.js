const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const flutterwave = require('../services/flutterwave.service');

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

// POST /api/wallet/fund/initialize
exports.initializeFunding = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 100) {
      return res.status(400).json({ success: false, message: 'Minimum funding amount is ₦100' });
    }

    const user = await db.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const reference = `FUND${Date.now()}`;

    const payment = await flutterwave.initializePayment({
      tx_ref: reference,
      amount: parseFloat(amount),
      email: user.email,
      name: user.fullName,
      phone: user.phone,
      redirect_url: process.env.FLW_REDIRECT_URL,
    });

    // Record the transaction as pending now, locking in the amount the user
    // actually requested. verifyFunding credits this recorded amount rather
    // than trusting anything passed to it later.
    await db.createTransaction({
      userId: req.user.id,
      type: 'credit',
      category: 'fund',
      title: 'Wallet Funding via Flutterwave',
      amount: parseFloat(amount),
      status: 'pending',
      icon: 'account_balance',
      reference,
    });

    res.json({
      success: true,
      message: 'Payment initialized',
      data: {
        authorizationUrl: payment.link,
        reference,
        amount: parseFloat(amount),
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/wallet/fund/verify
exports.verifyFunding = async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) {
      return res.status(400).json({ success: false, message: 'Reference required' });
    }

    const existing = await db.getTransactionByReference(reference);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'This transaction does not belong to you' });
    }

    // Idempotent — if we already credited this one, just return it again
    // rather than erroring, since the user may tap "I've paid" more than once.
    if (existing.status === 'successful') {
      const wallet = await db.getWallet(req.user.id);
      return res.json({
        success: true,
        message: 'Wallet already funded',
        data: { wallet, transaction: existing },
      });
    }

    const payment = await flutterwave.verifyByReference(reference);

    const paymentOk =
      payment.status === 'successful' &&
      payment.currency === 'NGN' &&
      payment.tx_ref === reference &&
      Number(payment.amount) >= Number(existing.amount);

    if (!paymentOk) {
      await db.updateTransactionStatus(reference, 'failed');
      return res.status(400).json({ success: false, message: 'Payment not successful' });
    }

    // Credit using OUR recorded amount (already confirmed >= what was paid above),
    // not a value read straight off the request.
    const wallet = await db.creditWallet(req.user.id, Number(existing.amount));
    const txn = await db.updateTransactionStatus(reference, 'successful');

    res.json({
      success: true,
      message: `₦${Number(existing.amount).toLocaleString()} added to your wallet`,
      data: { wallet, transaction: txn },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
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