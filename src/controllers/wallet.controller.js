const { v4: uuidv4 } = require('uuid');
const db = require('../../config/db');

// GET /api/wallet
exports.getWallet = (req, res) => {
  const wallet = db.getWallet(req.user.id);
  if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });
  res.json({ success: true, data: { wallet } });
};

// POST /api/wallet/fund
exports.fundWallet = (req, res) => {
  try {
    const { amount, method, reference } = req.body;
    if (!amount || amount < 100) {
      return res.status(400).json({ success: false, message: 'Minimum funding amount is ₦100' });
    }
    // In production: verify payment with Paystack using reference before crediting
    const wallet = db.creditWallet(req.user.id, parseFloat(amount));
    const txn = db.createTransaction({
      userId: req.user.id,
      type: 'credit',
      category: 'fund',
      title: `Wallet Funding via ${method || 'Bank Transfer'}`,
      amount: parseFloat(amount),
      status: 'successful',
      icon: 'account_balance',
      reference: reference || `FUND${Date.now()}`,
    });
    res.json({
      success: true,
      message: `₦${Number(amount).toLocaleString()} added to your wallet`,
      data: { wallet, transaction: txn },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/wallet/withdraw
exports.withdraw = (req, res) => {
  try {
    const { amount, accountNumber, bankName } = req.body;
    if (!amount || amount < 100) {
      return res.status(400).json({ success: false, message: 'Minimum withdrawal is ₦100' });
    }
    if (!accountNumber || !bankName) {
      return res.status(400).json({ success: false, message: 'Account number and bank name required' });
    }
    const wallet = db.debitWallet(req.user.id, parseFloat(amount));
    const txn = db.createTransaction({
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
exports.transfer = (req, res) => {
  try {
    const { amount, accountNumber, bankName, note } = req.body;
    if (!amount || amount < 10) {
      return res.status(400).json({ success: false, message: 'Minimum transfer is ₦10' });
    }
    if (!accountNumber || !bankName) {
      return res.status(400).json({ success: false, message: 'Account number and bank name required' });
    }
    const wallet = db.debitWallet(req.user.id, parseFloat(amount));
    const ref = `TXF${Date.now()}`;
    const txn = db.createTransaction({
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
    // Internal transfer: if destination is a Lumina account, credit them too
    const destUser = [...Array.from({ length: 0 })]; // placeholder for real lookup
    res.json({
      success: true,
      message: `₦${Number(amount).toLocaleString()} sent successfully`,
      data: { wallet, transaction: txn, reference: ref },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
