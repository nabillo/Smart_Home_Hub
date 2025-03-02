import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db/index.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    logger.debug('Login attempt', { username });
    
    const result = await pool.query(
      'SELECT u.*, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE username = $1',
      [username]
    );

    const user = result.rows[0];
    
    if (!user) {
      logger.warn('Login failed: User not found', { username });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.hashed_password);
    
    if (!isPasswordValid) {
      logger.warn('Login failed: Invalid password', { username });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    logger.info('User logged in successfully', { 
      userId: user.id, 
      username: user.username,
      role: user.role
    });

    res.json({ token });
  } catch (error) {
    logger.error('Login error', { 
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
