-- Database schema for Smart Home Management API

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  rules JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create profile_roles table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS profile_roles (
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, role_id)
);

-- Create users table with explicit ID sequence
CREATE SEQUENCE IF NOT EXISTS users_id_seq START WITH 1;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  login VARCHAR(50) NOT NULL UNIQUE,
  hashed_password VARCHAR(100) NOT NULL,
  profile_id INTEGER REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  user_id INTEGER REFERENCES users(id),
  ip_address VARCHAR(50),
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create system_logs table
CREATE TABLE IF NOT EXISTS system_logs (
  id SERIAL PRIMARY KEY,
  level VARCHAR(10) NOT NULL,
  message TEXT NOT NULL,
  meta JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default roles if they don't exist
INSERT INTO roles (name, permissions)
VALUES 
  ('admin', '{"all": true}'),
  ('user', '{"read": true, "write": false, "delete": false}'),
  ('guest', '{"read": true, "write": false, "delete": false}'),
  ('system', '{"all": true}')
ON CONFLICT (name) DO NOTHING;

-- Insert default profiles if they don't exist
INSERT INTO profiles (name, rules)
VALUES 
  ('admin', '{"canManageUsers": true, "canManageProfiles": true, "canManageRoles": true}'),
  ('standard', '{"canManageUsers": false, "canManageProfiles": false, "canManageRoles": false}'),
  ('kids', '{"canManageUsers": false, "canManageProfiles": false, "canManageRoles": false, "restrictedAccess": true}'),
  ('monitor', '{"canManageUsers": false, "canManageProfiles": false, "canManageRoles": false, "readOnly": true}'),
  ('system', '{"canManageUsers": true, "canManageProfiles": true, "canManageRoles": true, "isSystem": true}')
ON CONFLICT (name) DO NOTHING;

-- Set up default profile-role relationships
INSERT INTO profile_roles (profile_id, role_id)
VALUES 
  ((SELECT id FROM profiles WHERE name = 'admin'), (SELECT id FROM roles WHERE name = 'admin')),
  ((SELECT id FROM profiles WHERE name = 'standard'), (SELECT id FROM roles WHERE name = 'user')),
  ((SELECT id FROM profiles WHERE name = 'kids'), (SELECT id FROM roles WHERE name = 'guest')),
  ((SELECT id FROM profiles WHERE name = 'monitor'), (SELECT id FROM roles WHERE name = 'guest')),
  ((SELECT id FROM profiles WHERE name = 'system'), (SELECT id FROM roles WHERE name = 'system'))
ON CONFLICT DO NOTHING;

-- Create system user with ID 0 if it doesn't exist
INSERT INTO users (id, login, hashed_password, profile_id)
VALUES (
  0, 
  'system', 
  '$2a$10$eCrTaU0TyDSQKlCBUPxp6.ddy5rKV0Ug9VKt.ZKzOVu0ZXP8X4Iry', -- hashed 'system' password
  (SELECT id FROM profiles WHERE name = 'system')
)
ON CONFLICT (id) DO NOTHING;
