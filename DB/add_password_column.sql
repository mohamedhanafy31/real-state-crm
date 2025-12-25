-- Add password_hash column to users table for JWT authentication
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);