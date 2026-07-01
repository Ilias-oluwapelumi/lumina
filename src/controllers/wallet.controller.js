const { v4: uuidv4 } = require('uuid');
const db = require('../../config/db');

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

// POST /api/wallet/fund
exports.fundWallet = async (req, res) => {
  try {
    const { amount, method, reference } = req.body;
    if (!amount || amount < 100) {
      return res.status(400).json({ success: false, message: 'Minimum funding amount is ₦100' });
    }
    const wallet = await db.creditWallet(req.user.id, parseFloat(amount));
    const txn = await db.createTransaction({
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