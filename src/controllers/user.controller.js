const db = require('../config/db');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const User = () => mongoose.model('User');

// GET /api/users/profile
exports.getProfile = async (req, res) => {
  try {
    const wallet = await db.getWallet(req.user.id);
    const { passwordHash, ...safeUser } = req.user;
    res.json({ success: true, data: { user: { ...safeUser, wallet } } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/users/profile
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, email, avatarUrl } = req.body;
    const updated = await db.updateUser(req.user.id, {
      ...(fullName && { fullName }),
      ...(email && { email }),
      ...(avatarUrl !== undefined && { avatarUrl }),
    });
    const { passwordHash, ...safeUser } = updated;
    res.json({ success: true, message: 'Profile updated', data: { user: safeUser } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/users/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both fields required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }
    const valid = await db.verifyPassword(req.user, currentPassword);
    if (!valid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await User().findOneAndUpdate(
      { id: req.user.id },
      { $set: { passwordHash: hash } }
    );
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/users/dashboard-summary
exports.getDashboardSummary = async (req, res) => {
  try {
    const wallet = await db.getWallet(req.user.id);
    const { transactions } = await db.getUserTransactions(req.user.id, { limit: 5 });
    const credits = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
    const debits  = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
    res.json({
      success: true,
      data: {
        wallet,
        recentTransactions: transactions,
        summary: { totalCredits: credits, totalDebits: debits },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/users/set-pin
exports.setPin = async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ success: false, message: 'PIN must be exactly 4 digits' });
    }

    const hash = await bcrypt.hash(pin, 10);
    console.log('PIN received:', pin);
    console.log('Authenticated user:', {
      id: req.user?.id,
      _id: req.user?._id,
      email: req.user?.email,
    });

    await db.setTransactionPin(req.user.id || req.user._id, hash);

    res.json({ success: true, message: 'Transaction PIN set successfully' });
  } catch (err) {
    console.error('setPin error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/users/verify-pin
exports.verifyPin = async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ success: false, message: 'PIN required' });
    }

    const transactionPin = await db.getTransactionPin(req.user.id);
    console.log('verifyPin transactionPin:', transactionPin?.substring(0, 10));

    if (!transactionPin) {
      return res.status(400).json({ success: false, message: 'Transaction PIN not set' });
    }

    const valid = await bcrypt.compare(pin, transactionPin);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid PIN' });
    }

    res.json({ success: true, message: 'PIN verified' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};