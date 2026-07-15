const jwt = require('jsonwebtoken');
const db = require('../config/db');

const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Uses the newly updated flexible getFilter system in db.js
    const user = await db.findUserById(decoded.id); 
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Explicitly normalize string ID and ObjectId to bypass Mongoose virtual issues downstream
    req.user = {
      ...user,
      id: user.id || decoded.id, 
      _id: user._id
    };

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

module.exports = auth;