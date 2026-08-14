const db = require('../config/db');
const { sendServerError } = require('../utils/errors');

// GET /api/notifications
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await db.getUserNotifications(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
    });
    res.json({ success: true, data: result });
  } catch (err) {
    sendServerError(res, err, { context: 'getNotifications' });
  }
};

// GET /api/notifications/unread-count
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await db.getUnreadNotificationCount(req.user.id);
    res.json({ success: true, data: { count } });
  } catch (err) {
    sendServerError(res, err, { context: 'getUnreadCount' });
  }
};

// POST /api/notifications/:id/read
exports.markRead = async (req, res) => {
  try {
    const notification = await db.markNotificationRead(req.params.id, req.user.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.json({ success: true, data: { notification } });
  } catch (err) {
    sendServerError(res, err, { context: 'markRead' });
  }
};

// POST /api/notifications/read-all
exports.markAllRead = async (req, res) => {
  try {
    await db.markAllNotificationsRead(req.user.id);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    sendServerError(res, err, { context: 'markAllRead' });
  }
};