import express from 'express';
import pool from '../db/index.js';
import { auth, adminOnly } from '../middleware/auth.js';
import { logSecurityEvent, SECURITY_EVENTS } from '../utils/auditLogger.js';

const router = express.Router();

// Get all roles
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM roles ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Get roles error', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new role (admin only)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name } = req.body;

    // Validate input
    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    // Check if role already exists
    const roleCheck = await pool.query('SELECT id FROM roles WHERE name = $1', [name]);
    if (roleCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Role already exists' });
    }

    // Create role
    const result = await pool.query(
      'INSERT INTO roles (name) VALUES ($1) RETURNING id',
      [name]
    );

    // Log role creation
    logSecurityEvent(
      SECURITY_EVENTS.PERMISSION_CHANGED,
      req.user,
      { 
        action: 'create_role',
        roleName: name
      }
    );

    res.status(201).json({ 
      id: result.rows[0].id, 
      message: 'Role created successfully' 
    });
  } catch (error) {
    req.logger.error('Create role error', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Get role by ID
router.get('/:roleId', async (req, res) => {
  try {
    const roleId = parseInt(req.params.roleId);

    const result = await pool.query(
      'SELECT id, name FROM roles WHERE id = $1',
      [roleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get role error', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update role (admin only)
router.put('/:roleId', auth, adminOnly, async (req, res) => {
  try {
    const roleId = parseInt(req.params.roleId);
    const { name } = req.body;
    
    // Validate input
    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }
    
    // Check if role exists
    const roleCheck = await pool.query('SELECT name FROM roles WHERE id = $1', [roleId]);
    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    const oldRoleName = roleCheck.rows[0].name;
    
    // Check if new name already exists
    if (name !== oldRoleName) {
      const nameCheck = await pool.query('SELECT id FROM roles WHERE name = $1', [name]);
      if (nameCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Role name already exists' });
      }
    }
    
    // Update role
    await pool.query(
      'UPDATE roles SET name = $1, updated_at = NOW() WHERE id = $2',
      [name, roleId]
    );
    
    // Log role update
    logSecurityEvent(
      SECURITY_EVENTS.PERMISSION_CHANGED,
      req.user,
      { 
        action: 'update_role',
        roleId,
        oldName: oldRoleName,
        newName: name
      }
    );
    
    res.json({ message: 'Role updated successfully' });
  } catch (error) {
    req.logger.error('Update role error', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete role (admin only)
router.delete('/:roleId', auth, adminOnly, async (req, res) => {
  try {
    const roleId = parseInt(req.params.roleId);
    
    // Check if role exists
    const roleCheck = await pool.query('SELECT name FROM roles WHERE id = $1', [roleId]);
    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    const roleName = roleCheck.rows[0].name;
    
    // Check if role is in use
    const profileRolesCheck = await pool.query(
      'SELECT COUNT(*) FROM profile_roles WHERE role_id = $1', 
      [roleId]
    );
    
    if (parseInt(profileRolesCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete role that is assigned to profiles' });
    }
    
    // Delete role
    await pool.query('DELETE FROM roles WHERE id = $1', [roleId]);
    
    // Log role deletion
    logSecurityEvent(
      SECURITY_EVENTS.PERMISSION_CHANGED,
      req.user,
      { 
        action: 'delete_role',
        roleId,
        roleName
      }
    );
    
    res.status(204).send();
  } catch (error) {
    req.logger.error('Delete role error', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
