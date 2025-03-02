import express from 'express';
import pool from '../db/index.js';
import { auth, adminOnly } from '../middleware/auth.js';
import { logSecurityEvent, SECURITY_EVENTS } from '../utils/auditLogger.js';

const router = express.Router();

// Get all profiles
router.get('/', async (req, res) => {
  try {
    // Get profiles with their roles
    const result = await pool.query(`
      SELECT 
        p.id, 
        p.name, 
        COALESCE(
          json_agg(r.name) FILTER (WHERE r.name IS NOT NULL), 
          '[]'
        ) as roles
      FROM profiles p
      LEFT JOIN profile_roles pr ON p.id = pr.profile_id
      LEFT JOIN roles r ON pr.role_id = r.id
      GROUP BY p.id, p.name
      ORDER BY p.id
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get profiles error', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new profile (admin only)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name, roles } = req.body;

    // Validate input
    if (!name) {
      return res.status(400).json({ error: 'Profile name is required' });
    }

    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create profile
      const profileResult = await client.query(
        'INSERT INTO profiles (name) VALUES ($1) RETURNING id',
        [name]
      );
      
      const profileId = profileResult.rows[0].id;

      // Assign roles if provided
      if (roles && Array.isArray(roles) && roles.length > 0) {
        // Get role IDs
        const roleIds = await Promise.all(roles.map(async (roleName) => {
          const roleResult = await client.query(
            'SELECT id FROM roles WHERE name = $1',
            [roleName]
          );
          
          if (roleResult.rows.length === 0) {
            throw new Error(`Role "${roleName}" not found`);
          }
          
          return roleResult.rows[0].id;
        }));

        // Create profile-role relationships
        for (const roleId of roleIds) {
          await client.query(
            'INSERT INTO profile_roles (profile_id, role_id) VALUES ($1, $2)',
            [profileId, roleId]
          );
        }
      }

      await client.query('COMMIT');

      // Log profile creation
      logSecurityEvent(
        SECURITY_EVENTS.PERMISSION_CHANGED,
        req.user,
        { 
          action: 'create_profile',
          profileName: name,
          roles: roles || []
        }
      );

      res.status(201).json({ 
        id: profileId, 
        message: 'Profile created successfully' 
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    req.logger.error('Create profile error', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Get profile by ID
router.get('/:profileId', async (req, res) => {
  try {
    const profileId = parseInt(req.params.profileId);

    // Get profile with its roles
    const result = await pool.query(`
      SELECT 
        p.id, 
        p.name, 
        COALESCE(
          json_agg(r.name) FILTER (WHERE r.name IS NOT NULL), 
          '[]'
        ) as roles
      FROM profiles p
      LEFT JOIN profile_roles pr ON p.id = pr.profile_id
      LEFT JOIN roles r ON pr.role_id = r.id
      WHERE p.id = $1
      GROUP BY p.id, p.name
    `, [profileId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get profile error', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update profile (admin only)
router.put('/:profileId', auth, adminOnly, async (req, res) => {
  try {
    const profileId = parseInt(req.params.profileId);
    const { roles } = req.body;
    
    // Validate input
    if (!roles || !Array.isArray(roles)) {
      return res.status(400).json({ error: 'Roles array is required' });
    }
    
    // Check if profile exists
    const profileCheck = await pool.query('SELECT name FROM profiles WHERE id = $1', [profileId]);
    if (profileCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    const profileName = profileCheck.rows[0].name;
    
    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Remove existing role assignments
      await client.query('DELETE FROM profile_roles WHERE profile_id = $1', [profileId]);
      
      // Get role IDs and create new assignments
      for (const roleName of roles) {
        const roleResult = await client.query('SELECT id FROM roles WHERE name = $1', [roleName]);
        
        if (roleResult.rows.length === 0) {
          throw new Error(`Role "${roleName}" not found`);
        }
        
        const roleId = roleResult.rows[0].id;
        
        await client.query(
          'INSERT INTO profile_roles (profile_id, role_id) VALUES ($1, $2)',
          [profileId, roleId]
        );
      }
      
      await client.query('COMMIT');
      
      // Log profile update
      logSecurityEvent(
        SECURITY_EVENTS.PERMISSION_CHANGED,
        req.user,
        { 
          action: 'update_profile',
          profileId,
          profileName,
          newRoles: roles
        }
      );
      
      res.json({ message: 'Profile updated successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    req.logger.error('Update profile error', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete profile (admin only)
router.delete('/:profileId', auth, adminOnly, async (req, res) => {
  try {
    const profileId = parseInt(req.params.profileId);
    
    // Check if profile exists
    const profileCheck = await pool.query('SELECT name FROM profiles WHERE id = $1', [profileId]);
    if (profileCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    const profileName = profileCheck.rows[0].name;
    
    // Check if profile is in use
    const usersCheck = await pool.query('SELECT COUNT(*) FROM users WHERE profile_id = $1', [profileId]);
    if (parseInt(usersCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete profile that is assigned to users' });
    }
    
    // Delete profile (cascade will remove profile_roles entries)
    await pool.query('DELETE FROM profiles WHERE id = $1', [profileId]);
    
    // Log profile deletion
    logSecurityEvent(
      SECURITY_EVENTS.PERMISSION_CHANGED,
      req.user,
      { 
        action: 'delete_profile',
        profileId,
        profileName
      }
    );
    
    res.status(204).send();
  } catch (error) {
    req.logger.error('Delete profile error', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
