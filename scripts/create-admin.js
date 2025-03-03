import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import pool from '../server/db/index.js';
import { logSecurityEvent, SECURITY_EVENTS } from '../server/utils/auditLogger.js';

// Load environment variables
dotenv.config();

// System user for logging
const systemUser = {
  id: 0,
  login: 'system',
  profile: 'system'
};

// Function to create admin user
async function createAdminUser() {
  try {
    console.log('Starting admin user creation...');
    
    // Get admin login and password from environment variables or use defaults
    const adminLogin = process.env.ADMIN_LOGIN || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    // Check if admin user already exists
    const userCheck = await pool.query('SELECT id FROM users WHERE login = $1', [adminLogin]);
    
    if (userCheck.rows.length > 0) {
      console.log(`Admin user '${adminLogin}' already exists.`);
      return;
    }
    
    // Get admin profile ID
    const profileResult = await pool.query('SELECT id FROM profiles WHERE name = $1', ['admin']);
    
    if (profileResult.rows.length === 0) {
      console.error('Admin profile not found. Please run database migrations first.');
      return;
    }
    
    const profileId = profileResult.rows[0].id;
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);
    
    // Create admin user
    const result = await pool.query(
      'INSERT INTO users (id, login, hashed_password, profile_id) VALUES (nextval(\'users_id_seq\'), $1, $2, $3) RETURNING id',
      [adminLogin, hashedPassword, profileId]
    );
    
    const userId = result.rows[0].id;
    
    console.log(`Admin user '${adminLogin}' created successfully with ID: ${userId}`);
    
    // Log admin creation
    await logSecurityEvent(
      SECURITY_EVENTS.USER_CREATED,
      systemUser,
      { 
        newUserId: userId,
        newUserLogin: adminLogin,
        profile: 'admin',
        source: 'create-admin script'
      }
    );
    
    console.log('Admin user creation completed.');
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the function
createAdminUser();
