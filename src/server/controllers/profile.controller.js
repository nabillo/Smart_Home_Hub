const db = require('../config/db');
const { logUserAction } = require('./auth.controller');
const { logger } = require('../utils/logger');

/**
 * @desc    Get all profiles
 * @route   GET /api/v1/profiles
 * @access  Public
 */
const getProfiles = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT id, name, roles
      FROM profiles
      ORDER BY name
    `);
    
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get profile by ID
 * @route   GET /api/v1/profiles/:profileId
 * @access  Public
 */
const getProfileById = async (req, res, next) => {
  try {
    const { profileId } = req.params;
    
    const result = await db.query(`
      SELECT id, name, roles
      FROM profiles
      WHERE id = $1
    `, [profileId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create new profile
 * @route   POST /api/v1/profiles
 * @access  Private/Admin
 */
const createProfile = async (req, res, next) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { name, roles } = req.body;
    
    // Check if profile already exists
    const profileCheck = await client.query(
      'SELECT id FROM profiles WHERE name = $1',
      [name]
    );
    
    if (profileCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Profile already exists' });
    }
    
    // Create profile
    const result = await client.query(
      'INSERT INTO profiles (name, roles) VALUES ($1, $2) RETURNING id',
      [name, JSON.stringify(roles)]
    );
    
    const profileId = result.rows[0].id;
    
    // Log profile creation
    await client.query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'profile_created', JSON.stringify({ profile_id: profileId, name, roles }), req.ip]
    );
    
    await client.query('COMMIT');
    
    logger.info(`Profile ${name} created by admin ${req.user.login}`);
    
    res.status(201).json({ 
      message: 'Profile created successfully',
      profileId
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * @desc    Update profile
 * @route   PUT /api/v1/profiles/:profileId
 * @access  Private/Admin
 */
const updateProfile = async (req, res, next) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { profileId } = req.params;
    const { roles } = req.body;
    
    // Check if profile exists
    const profileCheck = await client.query(
      'SELECT name FROM profiles WHERE id = $1',
      [profileId]
    );
    
    if (profileCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Profile not found' });
    }
    
    const profileName = profileCheck.rows[0].name;
    
    // Update profile
    await client.query(
      'UPDATE profiles SET roles = $1 WHERE id = $2',
      [JSON.stringify(roles), profileId]
    );
    
    // Log profile update
    await client.query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'profile_updated', JSON.stringify({ profile_id: profileId, name: profileName, roles }), req.ip]
    );
    
    await client.query('COMMIT');
    
    logger.info(`Profile ${profileName} updated by admin ${req.user.login}`);
    
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * @desc    Delete profile
 * @route   DELETE /api/v1/profiles/:profileId
 * @access  Private/Admin
 */
const deleteProfile = async (req, res, next) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { profileId } = req.params;
    
    // Check if profile exists
    const profileCheck = await client.query(
      'SELECT name FROM profiles WHERE id = $1',
      [profileId]
    );
    
    if (profileCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Profile not found' });
    }
    
    const profileName = profileCheck.rows[0].name;
    
    // Check if profile is in use
    const usersWithProfile = await client.query(
      'SELECT COUNT(*) FROM users WHERE profile_id = $1',
      [profileId]
    );
    
    if (parseInt(usersWithProfile.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        message: 'Cannot delete profile that is assigned to users. Reassign users first.' 
      });
    }
    
    // Delete profile
    await client.query(
      'DELETE FROM profiles WHERE id = $1',
      [profileId]
    );
    
    // Log profile deletion
    await client.query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'profile_deleted', JSON.stringify({ profile_id: profileId, name: profileName }), req.ip]
    );
    
    await client.query('COMMIT');
    
    logger.info(`Profile ${profileName} deleted by admin ${req.user.login}`);
    
    res.status(204).send();
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

module.exports = {
  getProfiles,
  getProfileById,
  createProfile,
  updateProfile,
  deleteProfile
};
