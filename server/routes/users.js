import express from 'express';
import { auth } from '../middleware/auth.js';
import pool from '../db/index.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Get all users (admin only)
router.get('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      logger.warn('Unauthorized access attempt to users list', { 
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role
      });
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      'SELECT u.id, u.username, r.name as role FROM users u JOIN roles r ON u.role_id = r.id'
    );

    logger.info('Users list retrieved', { 
      userId: req.user.id,
      count: result.rows.length
    });

    res.json(result.rows);
  } catch (error) {
    logger.error('Error retrieving users', { 
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
