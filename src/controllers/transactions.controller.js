const db = require('../../config/db');

// GET /api/transactions
exports.getTransactions = (req, res) => {
  const { page = 1, limit = 20, category } = req.query;
  const result = db.getUserTransactions(req.user.id, {
    page: parseInt(page),
    limit: parseInt(limit),
    category,
  });
  res.json({ success: true, data: result });
};

// GET /api/transactions/:id
exports.getTransaction = (req, res) => {
  const txn = db.getTransactionById(req.params.id);
  if (!txn || txn.userId !== req.user.id) {
    return res.status(404).json({ success: false, message: 'Transaction not found' });
  }
  res.json({ success: true, data: { transaction: txn } });
};
