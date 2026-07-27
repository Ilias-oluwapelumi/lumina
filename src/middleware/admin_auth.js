const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Separate secret from regular user auth so an admin token can never be
// forged from (or confused with) a normal user's access token.
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || `${process.env.JWT_SECRET}_admin`;

const adminAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No admin token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
    if (decoded.scope !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not an admin token' });
    }
    const admin = await db.findAdminByEmail(decoded.email);
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin not found' });
    }
    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired admin token' });
  }
};

module.exports = adminAuth;
module.exports.ADMIN_JWT_SECRET = ADMIN_JWT_SECRET;