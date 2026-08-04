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

// POST /api/admin/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both fields are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
    }
    const valid = await db.verifyAdminPassword(req.admin, currentPassword);
    if (!valid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    await db.changeAdminPassword(req.admin.email, newPassword);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/admins
// Any logged-in admin can view the team list.
exports.getAdmins = async (req, res) => {
  try {
    const admins = await db.listAdmins();
    res.json({ success: true, data: { admins } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/admins
// Only a superadmin can create new admin accounts.
exports.createAdmin = async (req, res) => {
  try {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Only a superadmin can add new admins' });
    }
    const { fullName, email, password, role } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: 'Full name, email and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }
    if (role && !['admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    const admin = await db.createAdmin({ fullName, email, password, role: role || 'admin' });
    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: { admin: { fullName: admin.fullName, email: admin.email, role: admin.role } },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/admin/admins/:email/delete
// Only a superadmin can remove admins, and never their own account.
exports.deleteAdmin = async (req, res) => {
  try {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Only a superadmin can remove admins' });
    }
    const targetEmail = decodeURIComponent(req.params.email);
    if (targetEmail === req.admin.email) {
      return res.status(400).json({ success: false, message: 'You cannot remove your own account' });
    }
    await db.deleteAdmin(targetEmail);
    res.json({ success: true, message: 'Admin removed successfully' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
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

// GET /api/admin/settings/notifications
exports.getNotificationSettings = async (req, res) => {
  try {
    const settings = await db.getNotificationSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/settings/notifications
exports.updateNotificationSettings = async (req, res) => {
  try {
    const { pushEnabled, emailEnabled, smsEnabled, promotionsEnabled } = req.body;
    const settings = await db.updateNotificationSettings(
      { pushEnabled, emailEnabled, smsEnabled, promotionsEnabled },
      req.admin.email
    );
    res.json({ success: true, message: 'Notification settings updated', data: settings });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};