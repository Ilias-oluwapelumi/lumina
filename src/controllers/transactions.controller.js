const db = require('../config/db');

// GET /api/transactions
exports.getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, category } = req.query;
    const result = await db.getUserTransactions(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      category,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/transactions/:id
exports.getTransaction = async (req, res) => {
  try {
    const txn = await db.getTransactionById(req.params.id);
    if (!txn || txn.userId !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    res.json({ success: true, data: { transaction: txn } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};