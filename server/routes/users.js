import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/index.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const { username, password, roleId, profileId } = req.body;
    
    if (password.length < 12 || !/[A-Z]/.test(password) || !/[!@#$%^&*]/.test(password)) {
      return res.status(400).json({ error: 'Password does not meet requirements' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (username, hashed_password, role_id, profile_id) VALUES ($1, $2, $3, $4) RETURNING id',
      [username, hashedPassword, roleId, profileId]
    );

    res.status(201).json({ id: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT u.id, u.username, u.created_at, r.name as role, p.name as profile FROM users u LEFT JOIN roles r ON u.role_id = r.id LEFT JOIN profiles p ON u.profile_id = p.id'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
