const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  });
  db.storeRefreshToken(refreshToken);
  return { accessToken, refreshToken };
};

const formatUser = (user, wallet) => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  kycTier: user.kycTier,
  kycVerified: user.kycVerified,
  avatarUrl: user.avatarUrl,
  createdAt: user.createdAt,
  wallet: wallet ? {
    balance: wallet.balance,
    accountNumber: wallet.accountNumber,
    bankName: wallet.bankName,
  } : null,
});
// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Phone and password required' });
    }

    const user = await db.findUserByPhone(phone);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if account is locked
    if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
      const minutesLeft = Math.ceil(
        (new Date(user.lockedUntil) - new Date()) / 1000 / 60
      );
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`
      });
    }

    const valid = await db.verifyPassword(user, password);

    if (!valid) {
      // Increment failed attempts
      const attempts = (user.failedAttempts || 0) + 1;
      const updateData = { failedAttempts: attempts };

      // Lock account after 5 failed attempts for 30 minutes
      if (attempts >= 5) {
        updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
        updateData.failedAttempts = 0;
        await db.updateUser(user.id, updateData);
        return res.status(423).json({
          success: false,
          message: 'Account locked for 30 minutes due to too many failed attempts.'
        });
      }

      await db.updateUser(user.id, updateData);
      return res.status(401).json({
        success: false,
        message: `Invalid credentials. ${5 - attempts} attempt${5 - attempts > 1 ? 's' : ''} remaining.`
      });
    }

    // Reset failed attempts on successful login
    await db.updateUser(user.id, { failedAttempts: 0, lockedUntil: null });

    const wallet = await db.getWallet(user.id);
    const { accessToken, refreshToken } = generateTokens(user.id);
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: formatUser(user, wallet),
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;
    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    const user = await db.createUser({ fullName, email, phone, password });
    const wallet = await db.getWallet(user.id); // ← await added
    const { accessToken, refreshToken } = generateTokens(user.id);
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: formatUser(user, wallet),
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/auth/refresh
exports.refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Refresh token required' });
  }
  const valid = await db.hasRefreshToken(refreshToken); // ← await added
  if (!valid) {
    return res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    await db.deleteRefreshToken(refreshToken); // ← await added
    const { accessToken, refreshToken: newRefresh } = generateTokens(decoded.id);
    res.json({ success: true, data: { accessToken, refreshToken: newRefresh } });
  } catch {
    res.status(401).json({ success: false, message: 'Expired refresh token' });
  }
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) await db.deleteRefreshToken(refreshToken); // ← await added
  res.json({ success: true, message: 'Logged out successfully' });
};

// GET /api/auth/me
exports.me = async (req, res) => {
  const wallet = await db.getWallet(req.user.id); // ← await added
  res.json({ success: true, data: { user: formatUser(req.user, wallet) } });
};