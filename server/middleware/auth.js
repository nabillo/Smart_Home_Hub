import jwt from 'jsonwebtoken';
import { logSecurityEvent, SECURITY_EVENTS } from '../utils/auditLogger.js';

export const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error('No token provided');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    // Log unauthorized access attempt
    logSecurityEvent(
      SECURITY_EVENTS.UNAUTHORIZED_ACCESS,
      null,
      { 
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        path: req.originalUrl,
        error: error.message
      }
    );
    
    res.status(401).json({ error: 'Please authenticate' });
  }
};

// Admin-only middleware
export const adminOnly = async (req, res, next) => {
  try {
    if (req.user.profile !== 'admin') {
      // Log unauthorized admin access attempt
      logSecurityEvent(
        SECURITY_EVENTS.UNAUTHORIZED_ACCESS,
        req.user,
        { 
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          path: req.originalUrl,
          reason: 'Admin access required'
        }
      );
      
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
