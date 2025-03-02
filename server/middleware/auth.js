import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

export const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      logger.warn('Authentication failed: No token provided', { 
        path: req.path, 
        method: req.method 
      });
      throw new Error();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    logger.debug('User authenticated successfully', { 
      userId: decoded.id, 
      username: decoded.username,
      role: decoded.role,
      path: req.path
    });
    
    next();
  } catch (error) {
    logger.error('Authentication error', { 
      path: req.path, 
      method: req.method,
      error: error.message 
    });
    res.status(401).json({ error: 'Please authenticate' });
  }
};
