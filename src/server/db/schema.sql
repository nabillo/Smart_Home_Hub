-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  roles JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  login VARCHAR(50) NOT NULL UNIQUE,
  hashed_password VARCHAR(100) NOT NULL,
  profile_id INTEGER REFERENCES profiles(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  details JSONB,
  ip_address VARCHAR(45),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create default profiles
INSERT INTO profiles (name, roles) 
VALUES 
  ('admin', '["manage_users", "manage_profiles", "view_logs", "manage_devices", "manage_settings"]'::jsonb),
  ('standard', '["manage_own_devices", "view_own_usage"]'::jsonb),
  ('kids', '["limited_access", "view_own_usage"]'::jsonb),
  ('monitor', '["view_usage", "view_devices"]'::jsonb)
ON CONFLICT (name) DO NOTHING;
