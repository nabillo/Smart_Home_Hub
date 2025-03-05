const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');

/**
 * Middleware to authenticate JWT tokens
 */
const auth = (req, res, next) => {
  // Get token from header
  const authHeader = req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }
  
  // Extract token
  const token = authHeader.split(' ')[1];
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user from payload
    req.user = decoded.user;
    next();
  } catch (err) {
    logger.error(`Auth middleware error: ${err.message}`);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

/**
 * Middleware to check if user has admin role
 */
const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authorization denied' });
  }
  
  if (req.user.profile !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
  
  next();
};

module.exports = { auth, adminOnly };
