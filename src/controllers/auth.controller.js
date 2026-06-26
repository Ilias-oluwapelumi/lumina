const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../../config/db');

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
    const wallet = db.getWallet(user.id);
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

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Phone and password required' });
    }
    const user = db.findUserByPhone(phone);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const valid = await db.verifyPassword(user, password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const wallet = db.getWallet(user.id);
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

// POST /api/auth/refresh
exports.refresh = (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Refresh token required' });
  }
  if (!db.hasRefreshToken(refreshToken)) {
    return res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    db.deleteRefreshToken(refreshToken);
    const { accessToken, refreshToken: newRefresh } = generateTokens(decoded.id);
    res.json({ success: true, data: { accessToken, refreshToken: newRefresh } });
  } catch {
    res.status(401).json({ success: false, message: 'Expired refresh token' });
  }
};

// POST /api/auth/logout
exports.logout = (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) db.deleteRefreshToken(refreshToken);
  res.json({ success: true, message: 'Logged out successfully' });
};

// GET /api/auth/me
exports.me = (req, res) => {
  const wallet = db.getWallet(req.user.id);
  res.json({ success: true, data: { user: formatUser(req.user, wallet) } });
};
