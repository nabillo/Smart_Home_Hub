import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db/index.js';
import { auth } from '../middleware/auth.js';
import { logSecurityEvent, SECURITY_EVENTS } from '../utils/auditLogger.js';

const router = express.Router();

// System user for logging
const systemUser = {
  id: 0,
  login: 'system',
  profile: 'system'
};

// Login route
router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    
    // Validate input
    if (!login || !password) {
      return res.status(400).json({ error: 'Login and password are required' });
    }
    
    // Find user
    const result = await pool.query(
      'SELECT u.id, u.login, u.hashed_password, p.name as profile ' +
      'FROM users u ' +
      'JOIN profiles p ON u.profile_id = p.id ' +
      'WHERE u.login = $1',
      [login]
    );
    
    if (result.rows.length === 0) {
      // Log failed login attempt
      logSecurityEvent(
        SECURITY_EVENTS.LOGIN_FAILURE,
        systemUser,
        { 
          attemptedLogin: login,
          reason: 'User not found',
          ip: req.ip,
          userAgent: req.headers['user-agent']
        }
      );
      
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.hashed_password);
    
    if (!isMatch) {
      // Log failed login attempt
      logSecurityEvent(
        SECURITY_EVENTS.LOGIN_FAILURE,
        systemUser,
        { 
          attemptedLogin: login,
          reason: 'Invalid password',
          ip: req.ip,
          userAgent: req.headers['user-agent']
        }
      );
      
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create JWT token
    const payload = {
      id: user.id,
      login: user.login,
      profile: user.profile
    };
    
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    // Log successful login
    logSecurityEvent(
      SECURITY_EVENTS.LOGIN_SUCCESS,
      payload,
      { 
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    );
    
    res.json({ token });
  } catch (error) {
    req.logger?.error('Login error', { error: error.message }) || 
      console.error('Login error', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout route
router.post('/logout', auth, (req, res) => {
  try {
    // Log logout event
    logSecurityEvent(
      SECURITY_EVENTS.LOGOUT,
      req.user,
      { 
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    );
    
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    req.logger?.error('Logout error', { error: error.message }) || 
      console.error('Logout error', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
