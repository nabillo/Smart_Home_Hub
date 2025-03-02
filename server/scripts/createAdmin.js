import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import pool from '../db/index.js';
import logger from '../utils/logger.js';

dotenv.config();

const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin123', // Change this in production
};

async function createAdminUser() {
  const client = await pool.connect();

  try {
    logger.info('Starting admin user creation process');
    await client.query('BEGIN');

    // Check if admin role exists
    const roleResult = await client.query(
      'SELECT id FROM roles WHERE name = $1',
      ['admin']
    );

    let roleId;
    if (roleResult.rows.length === 0) {
      logger.info('Admin role does not exist, creating it');
      // Create admin role if it doesn't exist
      const newRole = await client.query(
        'INSERT INTO roles (name, permissions) VALUES ($1, $2) RETURNING id',
        ['admin', JSON.stringify({ all: true })]
      );
      roleId = newRole.rows[0].id;
      logger.debug('Admin role created', { roleId });
    } else {
      roleId = roleResult.rows[0].id;
      logger.debug('Admin role already exists', { roleId });
    }

    // Check if admin user already exists
    const userCheck = await client.query(
      'SELECT id FROM users WHERE username = $1',
      [DEFAULT_ADMIN.username]
    );

    if (userCheck.rows.length > 0) {
      logger.warn('Admin user already exists, skipping creation', {
        username: DEFAULT_ADMIN.username
      });
      await client.query('COMMIT');
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create default profile for admin
    logger.info('Creating admin profile');
    const profileResult = await client.query(
      'INSERT INTO profiles (name, rules) VALUES ($1, $2) RETURNING id',
      ['Admin Profile', JSON.stringify({ isAdmin: true })]
    );
    const profileId = profileResult.rows[0].id;
    logger.debug('Admin profile created', { profileId });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, salt);

    // Create admin user
    logger.info('Creating admin user');
    const userResult = await client.query(
      'INSERT INTO users (username, hashed_password, role_id, profile_id) VALUES ($1, $2, $3, $4) RETURNING id',
      [DEFAULT_ADMIN.username, hashedPassword, roleId, profileId]
    );
    
    logger.info('Admin user created successfully', {
      userId: userResult.rows[0].id,
      username: DEFAULT_ADMIN.username
    });

    await client.query('COMMIT');
    console.log('Admin user created successfully');
    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating admin user', {
      error: error.message,
      stack: error.stack
    });
    console.error('Error creating admin user:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

createAdminUser();
