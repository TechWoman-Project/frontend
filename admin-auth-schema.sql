-- Create admin_users table for storing admin credentials
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE
);

-- Add index for faster username lookup
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);

-- Password hash generated using bcrypt with 10 rounds
-- You should run this in your Supabase SQL editor
INSERT INTO admin_users (username, password_hash) 
VALUES (
  'admin',
  '$2a$10$YourHashedPasswordWillBeGeneratedByBcrypt'
) ON CONFLICT (username) DO NOTHING;

-- Note: The actual password hash will be generated and inserted via the API
-- This is just the schema setup
