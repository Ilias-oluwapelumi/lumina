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
        // ─── 🔍 INVESTIGATE THE AUTH TOKEN CONTENT ────────────────
        console.log("=========================================");
        console.log("👉 Full req.user object received:", req.user);
        console.log("👉 req.user.id value:", req.user?.id);
        console.log("👉 req.user._id value:", req.user?._id);
        console.log("=========================================");

        if (!pin) {
            return res.status(400).json({
                success: false,
                message: 'Transaction PIN is required'
            });
        }

        if (!/^\d{4}$/.test(pin)) {
            return res.status(400).json({
                success: false,
                message: 'PIN must be exactly 4 digits'
            });
        }
        console.log("req.user.id =", req.user.id);
console.log("req.user._id =", req.user._id);

        const pinData = await db.getTransactionPin(req.user);

        // Prevent resetting an existing PIN
        if (pinData && pinData.transactionPin) {
            return res.status(400).json({
                success: false,
                message: 'Transaction PIN already exists. Use Change PIN instead.'
            });
        }

        const hash = await bcrypt.hash(pin, 12);

        await db.setTransactionPin(req.user, hash);

        return res.json({
            success: true,
            message: 'Transaction PIN created successfully'
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }
};
exports.changePin = async (req, res) => {

    try {

        const {
            oldPin,
            newPin
        } = req.body;

        if (!oldPin || !newPin) {
            return res.status(400).json({
                success: false,
                message: 'Old PIN and New PIN are required'
            });
        }

        if (!/^\d{4}$/.test(newPin)) {
            return res.status(400).json({
                success: false,
                message: 'New PIN must be exactly 4 digits'
            });
        }

        const pinData = await db.getTransactionPin(req.user);

        if (!pinData || !pinData.transactionPin) {
            return res.status(400).json({
                success: false,
                message: 'Transaction PIN not found'
            });
        }

        const valid = await bcrypt.compare(
            oldPin,
            pinData.transactionPin
        );

        if (!valid) {
            return res.status(401).json({
                success: false,
                message: 'Old PIN is incorrect'
            });
        }

        const hash = await bcrypt.hash(newPin, 12);

        await db.changeTransactionPin(
            req.user.id,
            hash
        );

        return res.json({
            success: true,
            message: 'Transaction PIN changed successfully'
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }

};
// POST /api/users/verify-pin
exports.verifyPin = async (req, res) => {
    try {

        const { pin } = req.body;

        if (!pin) {
            return res.status(400).json({
                success: false,
                message: 'PIN is required'
            });
        }

        const pinData = await db.getTransactionPin(req.user);

        if (!pinData || !pinData.transactionPin) {
            return res.status(400).json({
                success: false,
                message: 'Transaction PIN not set'
            });
        }

        // Check if PIN is locked
        if (
            pinData.pinLockedUntil &&
            new Date(pinData.pinLockedUntil) > new Date()
        ) {
            return res.status(423).json({
                success: false,
                message: 'PIN is temporarily locked. Try again later.'
            });
        }

        const valid = await bcrypt.compare(
            pin,
            pinData.transactionPin
        );

        if (!valid) {

            await db.increasePinAttempts(req.user);

            return res.status(401).json({
                success: false,
                message: 'Invalid transaction PIN'
            });
        }

        await db.resetPinAttempts(req.user.id);

        return res.json({
            success: true,
            message: 'PIN verified successfully'
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }
};