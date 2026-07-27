const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { ADMIN_JWT_SECRET } = require('../middleware/admin_auth');

// POST /api/admin/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }
    const admin = await db.findAdminByEmail(email);
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const valid = await db.verifyAdminPassword(admin, password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { email: admin.email, scope: 'admin' },
      ADMIN_JWT_SECRET,
      { expiresIn: '12h' }
    );
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        admin: { fullName: admin.fullName, email: admin.email, role: admin.role },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/me
exports.me = async (req, res) => {
  res.json({
    success: true,
    data: {
      admin: {
        fullName: req.admin.fullName,
        email: req.admin.email,
        role: req.admin.role,
      },
    },
  });
};

// GET /api/admin/dashboard
exports.getDashboard = async (req, res) => {
  try {
    const stats = await db.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/users
exports.getUsers = async (req, res) => {
  try {
    const { query, page = 1, limit = 20 } = req.query;
    const result = await db.searchUsers({ query, page: parseInt(page), limit: parseInt(limit) });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/users/:id
exports.getUserDetail = async (req, res) => {
  try {
    const user = await db.findUserById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const wallet = await db.getWallet(user.id);
    const { transactions } = await db.getUserTransactions(user.id, { limit: 20 });
    const { passwordHash, transactionPin, ...safeUser } = user;
    res.json({ success: true, data: { user: safeUser, wallet, transactions } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/users/:id/suspend
exports.suspendUser = async (req, res) => {
  try {
    await db.setUserSuspended(req.params.id, true);
    res.json({ success: true, message: 'User suspended' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/admin/users/:id/unsuspend
exports.unsuspendUser = async (req, res) => {
  try {
    await db.setUserSuspended(req.params.id, false);
    res.json({ success: true, message: 'User unsuspended' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/admin/users/:id/adjust-wallet
exports.adjustWallet = async (req, res) => {
  try {
    const { amount, note } = req.body;
    if (amount === undefined || isNaN(parseFloat(amount)) || parseFloat(amount) === 0) {
      return res.status(400).json({ success: false, message: 'A non-zero amount is required' });
    }
    const result = await db.adminAdjustWallet(req.params.id, amount, note, req.admin.email);
    res.json({ success: true, message: 'Wallet adjusted successfully', data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /api/admin/transactions
exports.getTransactions = async (req, res) => {
  try {
    const { query, status, category, page = 1, limit = 20 } = req.query;
    const result = await db.searchTransactions({
      query, status, category, page: parseInt(page), limit: parseInt(limit),
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/pricing/:category
exports.getPricing = async (req, res) => {
  try {
    const prices = await db.getAllProductPrices(req.params.category);
    res.json({ success: true, data: prices });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/pricing
exports.updatePricing = async (req, res) => {
  try {
    const { category, provider, productCode, productName, buyingPrice, sellingPrice } = req.body;
    if (!category || !provider || !productCode || sellingPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: 'category, provider, productCode and sellingPrice are required',
      });
    }
    const updated = await db.updateProductPrice({
      category, provider, productCode, productName,
      buyingPrice: buyingPrice || 0, sellingPrice,
    });
    res.json({ success: true, message: 'Price updated', data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/admin/notifications/broadcast
exports.broadcast = async (req, res) => {
  try {
    const { title, message, icon } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }
    const result = await db.broadcastNotification({ title, message, icon });
    res.json({ success: true, message: 'Broadcast sent', data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};