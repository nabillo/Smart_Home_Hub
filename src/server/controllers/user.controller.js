const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { encrypt, decrypt } = require('../utils/encryption');
const { logUserAction } = require('./auth.controller');
const { logger } = require('../utils/logger');

/**
 * @desc    Get all users
 * @route   GET /api/v1/users
 * @access  Private/Admin
 */
const getUsers = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.login, p.name as profile, u.created_at
      FROM users u
      LEFT JOIN profiles p ON u.profile_id = p.id
      ORDER BY u.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get user by ID
 * @route   GET /api/v1/users/:userId
 * @access  Private
 */
const getUserById = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Check if user is admin or requesting their own data
    if (req.user.profile !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ message: 'Not authorized to access this user data' });
    }
    
    const result = await db.query(`
      SELECT u.id, u.login, p.name as profile, u.created_at
      FROM users u
      LEFT JOIN profiles p ON u.profile_id = p.id
      WHERE u.id = $1
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new user
 * @route   POST /api/v1/users
 * @access  Private/Admin
 */
const createUser = async (req, res, next) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { login, password, profile } = req.body;
    
    // Check if user already exists
    const userCheck = await client.query(
      'SELECT id FROM users WHERE login = $1',
      [login]
    );
    
    if (userCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Get profile ID
    const profileResult = await client.query(
      'SELECT id FROM profiles WHERE name = $1',
      [profile]
    );
    
    if (profileResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid profile' });
    }
    
    const profileId = profileResult.rows[0].id;
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const result = await client.query(
      'INSERT INTO users (login, hashed_password, profile_id, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
      [login, hashedPassword, profileId]
    );
    
    const userId = result.rows[0].id;
    
    // Log user creation
    await client.query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'user_created', JSON.stringify({ created_user_id: userId, profile }), req.ip]
    );
    
    await client.query('COMMIT');
    
    logger.info(`User ${login} created by admin ${req.user.login}`);
    
    res.status(201).json({ 
      message: 'User created successfully',
      userId
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * @desc    Update user
 * @route   PUT /api/v1/users/:userId
 * @access  Private/Admin
 */
const updateUser = async (req, res, next) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { userId } = req.params;
    const { profile } = req.body;
    
    // Check if user exists
    const userCheck = await client.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get profile ID
    const profileResult = await client.query(
      'SELECT id FROM profiles WHERE name = $1',
      [profile]
    );
    
    if (profileResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid profile' });
    }
    
    const profileId = profileResult.rows[0].id;
    
    // Update user
    await client.query(
      'UPDATE users SET profile_id = $1 WHERE id = $2',
      [profileId, userId]
    );
    
    // Log user update
    await client.query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'user_updated', JSON.stringify({ updated_user_id: userId, profile }), req.ip]
    );
    
    await client.query('COMMIT');
    
    logger.info(`User ${userId} updated by admin ${req.user.login}`);
    
    res.json({ message: 'User updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/v1/users/:userId
 * @access  Private/Admin
 */
const deleteUser = async (req, res, next) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { userId } = req.params;
    
    // Check if user exists
    const userCheck = await client.query(
      'SELECT login FROM users WHERE id = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userLogin = userCheck.rows[0].login;
    
    // Delete user
    await client.query(
      'DELETE FROM users WHERE id = $1',
      [userId]
    );
    
    // Log user deletion
    await client.query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'user_deleted', JSON.stringify({ deleted_user_id: userId, login: userLogin }), req.ip]
    );
    
    await client.query('COMMIT');
    
    logger.info(`User ${userLogin} (ID: ${userId}) deleted by admin ${req.user.login}`);
    
    res.status(204).send();
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * @desc    Assign profile to user
 * @route   PUT /api/v1/users/:userId/profile
 * @access  Private/Admin
 */
const assignProfile = async (req, res, next) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { userId } = req.params;
    const { profile } = req.body;
    
    // Check if user exists
    const userCheck = await client.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get profile ID
    const profileResult = await client.query(
      'SELECT id FROM profiles WHERE name = $1',
      [profile]
    );
    
    if (profileResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid profile' });
    }
    
    const profileId = profileResult.rows[0].id;
    
    // Update user's profile
    await client.query(
      'UPDATE users SET profile_id = $1 WHERE id = $2',
      [profileId, userId]
    );
    
    // Log profile assignment
    await client.query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'profile_assigned', JSON.stringify({ user_id: userId, profile }), req.ip]
    );
    
    await client.query('COMMIT');
    
    logger.info(`Profile ${profile} assigned to user ${userId} by admin ${req.user.login}`);
    
    res.json({ message: 'Profile assigned successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  assignProfile
};
