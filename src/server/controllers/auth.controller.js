const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { logger } = require('../utils/logger');

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { login, password } = req.body;
    
    // Check if user exists
    const userResult = await db.query(
      'SELECT id, login, hashed_password, profile_id FROM users WHERE login = $1',
      [login]
    );
    
    if (userResult.rows.length === 0) {
      // Log failed login attempt
      await logFailedLogin(login, req.ip);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const user = userResult.rows[0];
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.hashed_password);
    
    if (!isMatch) {
      // Log failed login attempt
      await logFailedLogin(login, req.ip);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Get profile name
    const profileResult = await db.query(
      'SELECT name FROM profiles WHERE id = $1',
      [user.profile_id]
    );
    
    const profileName = profileResult.rows.length > 0 ? profileResult.rows[0].name : 'standard';
    
    // Create JWT payload
    const payload = {
      user: {
        id: user.id,
        login: user.login,
        profile: profileName
      }
    };
    
    // Sign token
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { algorithm: 'HS512', expiresIn: process.env.JWT_EXPIRATION || '24h' },
      (err, token) => {
        if (err) throw err;
        
        // Log successful login
        logSuccessfulLogin(user.id, req.ip);
        
        res.json({ token });
      }
    );
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
const logout = async (req, res, next) => {
  try {
    // In a stateless JWT system, the client is responsible for discarding the token
    // Here we just log the logout event
    await logUserAction(req.user.id, 'user_logout', req.ip);
    
    res.status(200).json({ message: 'Logout successful' });
  } catch (err) {
    next(err);
  }
};

/**
 * Log failed login attempt
 */
const logFailedLogin = async (login, ipAddress) => {
  try {
    await db.query(
      'INSERT INTO audit_logs (action, details, ip_address) VALUES ($1, $2, $3)',
      ['failed_login_attempt', JSON.stringify({ login }), ipAddress]
    );
    
    logger.warn(`Failed login attempt for user: ${login} from IP: ${ipAddress}`);
  } catch (err) {
    logger.error(`Error logging failed login: ${err.message}`);
  }
};

/**
 * Log successful login
 */
const logSuccessfulLogin = async (userId, ipAddress) => {
  try {
    await db.query(
      'INSERT INTO audit_logs (user_id, action, ip_address) VALUES ($1, $2, $3)',
      [userId, 'user_login', ipAddress]
    );
    
    logger.info(`User ID ${userId} logged in from IP: ${ipAddress}`);
  } catch (err) {
    logger.error(`Error logging successful login: ${err.message}`);
  }
};

/**
 * Log user action
 */
const logUserAction = async (userId, action, ipAddress, details = {}) => {
  try {
    await db.query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [userId, action, JSON.stringify(details), ipAddress]
    );
    
    logger.info(`User ID ${userId} performed action: ${action}`);
  } catch (err) {
    logger.error(`Error logging user action: ${err.message}`);
  }
};

module.exports = {
  login,
  logout,
  logUserAction
};
