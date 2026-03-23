-- Neon Database Schema for TrackApp
-- Copy and paste this entire script into your Neon SQL editor

-- Create app_users table
CREATE TABLE app_users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  birth_date DATE NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX idx_app_users_email ON app_users(email);

-- Create app_reports table
CREATE TABLE app_reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  report_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_id for faster lookups
CREATE INDEX idx_app_reports_user_id ON app_reports(user_id);
CREATE INDEX idx_app_reports_created_at ON app_reports(created_at);

-- Create app_report_attachments table for storing file references
CREATE TABLE app_report_attachments (
  id SERIAL PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES app_reports(id) ON DELETE CASCADE,
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on report_id
CREATE INDEX idx_app_report_attachments_report_id ON app_report_attachments(report_id);

-- Optional: Create a view for recent reports with user info
CREATE VIEW recent_reports AS
SELECT 
  r.id,
  r.user_id,
  u.name as user_name,
  u.email as user_email,
  r.title,
  r.description,
  r.location,
  r.latitude,
  r.longitude,
  r.report_type,
  r.status,
  r.created_at,
  r.updated_at
FROM app_reports r
JOIN app_users u ON r.user_id = u.id
ORDER BY r.created_at DESC;
