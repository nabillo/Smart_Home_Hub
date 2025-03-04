const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

// Create database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

/**
 * Initialize database schema
 */
const initializeDatabase = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Starting database initialization...');
    
    await client.query('BEGIN');
    
    // Create profiles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        roles JSONB NOT NULL DEFAULT '[]'::jsonb
      )
    `);
    console.log('Profiles table created or already exists');
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        login VARCHAR(50) NOT NULL UNIQUE,
        hashed_password VARCHAR(100) NOT NULL,
        profile_id INTEGER REFERENCES profiles(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('Users table created or already exists');
    
    // Create audit_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(50) NOT NULL,
        details JSONB,
        ip_address VARCHAR(45),
        timestamp TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('Audit logs table created or already exists');
    
    // Check if default profiles exist
    const profilesExist = await client.query(`
      SELECT COUNT(*) FROM profiles 
      WHERE name IN ('admin', 'standard', 'kids', 'monitor')
    `);
    
    if (parseInt(profilesExist.rows[0].count) < 4) {
      // Create default profiles
      await client.query(`
        INSERT INTO profiles (name, roles) 
        VALUES 
          ('admin', '["manage_users", "manage_profiles", "view_logs", "manage_devices", "manage_settings"]'::jsonb),
          ('standard', '["manage_own_devices", "view_own_usage"]'::jsonb),
          ('kids', '["limited_access", "view_own_usage"]'::jsonb),
          ('monitor', '["view_usage", "view_devices"]'::jsonb)
        ON CONFLICT (name) DO NOTHING
      `);
      console.log('Default profiles created');
    } else {
      console.log('Default profiles already exist');
    }
    
    await client.query('COMMIT');
    console.log('Database initialization completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error initializing database:', err);
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Create admin user
 */
const createAdminUser = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get admin profile ID
    const profileResult = await client.query(
      'SELECT id FROM profiles WHERE name = $1',
      ['admin']
    );
    
    if (profileResult.rows.length === 0) {
      throw new Error('Admin profile not found');
    }
    
    const profileId = profileResult.rows[0].id;
    
    // Check if admin user exists
    const adminExists = await client.query(
      'SELECT COUNT(*) FROM users WHERE login = $1',
      ['admin']
    );
    
    if (parseInt(adminExists.rows[0].count) > 0) {
      console.log('Admin user already exists');
      await client.query('COMMIT');
      return;
    }
    
    // Generate password
    const password = process.argv.includes('--secure-password') 
      ? process.argv[process.argv.indexOf('--secure-password') + 1] 
      : 'AdminPassword123!';
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create admin user
    await client.query(
      'INSERT INTO users (login, hashed_password, profile_id, created_at) VALUES ($1, $2, $3, NOW())',
      ['admin', hashedPassword, profileId]
    );
    
    await client.query('COMMIT');
    console.log('Admin user created successfully');
    console.log('Username: admin');
    console.log(`Password: ${password}`);
    console.log('IMPORTANT: Please change this password after first login!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating admin user:', err);
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Main function
 */
const main = async () => {
  try {
    await initializeDatabase();
    
    if (process.argv.includes('--create-admin')) {
      await createAdminUser();
    }
    
    console.log('Setup completed successfully');
  } catch (err) {
    console.error('Setup failed:', err);
    process.exit(1);
  } finally {
    pool.end();
  }
};

// Run the script
main();
