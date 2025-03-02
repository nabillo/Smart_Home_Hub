import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/index.js';
import { auth, adminOnly } from '../middleware/auth.js';
import { logSecurityEvent, SECURITY_EVENTS } from '../utils/auditLogger.js';

const router = express.Router();

// Get all users (admin only)
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT u.id, u.login, p.name as profile, u.created_at as "createdAt" FROM users u ' +
      'JOIN profiles p ON u.profile_id = p.id ' +
      'ORDER BY u.id'
    );

    res.json(result.rows);
  } catch (error) {
    req.logger.error('Get users error', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new user (admin only)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { login, password, profile } = req.body;

    // Validate input
    if (!login || !password || !profile) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if login already exists
    const userCheck = await pool.query('SELECT id FROM users WHERE login = $1', [login]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Login already exists' });
    }

    // Get profile ID
    const profileResult = await pool.query('SELECT id FROM profiles WHERE name = $1', [profile]);
    if (profileResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid profile' });
    }
    const profileId = profileResult.rows[0].id;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (login, hashed_password, profile_id) VALUES ($1, $2, $3) RETURNING id',
      [login, hashedPassword, profileId]
    );

    // Log user creation
    logSecurityEvent(
      SECURITY_EVENTS.USER_CREATED,
      req.user,
      { 
        newUserId: result.rows[0].id,
        newUserLogin: login,
        profile
      }
    );

    res.status(201).json({ id: result.rows[0].id, message: 'User created successfully' });
  } catch (error) {
    req.logger.error('Create user error', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user by ID
router.get('/:userId', auth, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Check if user is admin or requesting their own info
    if (req.user.profile !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      'SELECT u.id, u.login, p.name as profile, u.created_at as "createdAt" FROM users u ' +
      'JOIN profiles p ON u.profile_id = p.id ' +
      'WHERE u.id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    req.logger.error('Get user error', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user (admin only)
router.put('/:userId', auth, adminOnly, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { profile } = req.body;
    
    // Validate input
    if (!profile) {
      return res.status(400).json({ error: 'Profile is required' });
    }
    
    // Check if user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get profile ID
    const profileResult = await pool.query('SELECT id FROM profiles WHERE name = $1', [profile]);
    if (profileResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid profile' });
    }
    const profileId = profileResult.rows[0].id;
    
    // Update user
    await pool.query(
      'UPDATE users SET profile_id = $1, updated_at = NOW() WHERE id = $2',
      [profileId, userId]
    );
    
    // Log user update
    logSecurityEvent(
      SECURITY_EVENTS.USER_UPDATED,
      req.user,
      { 
        targetUserId: userId,
        changes: { profile }
      }
    );
    
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    req.logger.error('Update user error', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user (admin only)
router.delete('/:userId', auth, adminOnly, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Prevent deleting self
    if (req.user.id === userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    // Check if user exists
    const userCheck = await pool.query('SELECT login FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userLogin = userCheck.rows[0].login;
    
    // Delete user
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    
    // Log user deletion
    logSecurityEvent(
      SECURITY_EVENTS.USER_DELETED,
      req.user,
      { 
        deletedUserId: userId,
        deletedUserLogin: userLogin
      }
    );
    
    res.status(204).send();
  } catch (error) {
    req.logger.error('Delete user error', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Assign profile to user
router.put('/:userId/profile', auth, adminOnly, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { profile } = req.body;
    
    // Validate input
    if (!profile) {
      return res.status(400).json({ error: 'Profile is required' });
    }
    
    // Check if user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get profile ID
    const profileResult = await pool.query('SELECT id FROM profiles WHERE name = $1', [profile]);
    if (profileResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid profile' });
    }
    const profileId = profileResult.rows[0].id;
    
    // Update user's profile
    await pool.query(
      'UPDATE users SET profile_id = $1, updated_at = NOW() WHERE id = $2',
      [profileId, userId]
    );
    
    // Log profile assignment
    logSecurityEvent(
      SECURITY_EVENTS.ROLE_CHANGED,
      req.user,
      { 
        targetUserId: userId,
        newProfile: profile
      }
    );
    
    res.json({ message: 'Profile assigned successfully' });
  } catch (error) {
    req.logger.error('Assign profile error', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
