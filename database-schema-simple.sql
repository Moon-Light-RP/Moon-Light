-- MOON LIGHT RolePlay Database Schema (Simplified - No Foreign Keys)
-- Run this in Supabase Dashboard -> SQL Editor
-- This version removes foreign key constraints to avoid "referenced table doesn't exist" errors

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  discord_id VARCHAR(255) UNIQUE NOT NULL,
  discord_username VARCHAR(255) NOT NULL,
  discord_global_name VARCHAR(255),
  discord_avatar VARCHAR(255),
  role VARCHAR(50) DEFAULT 'Player',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Applications Table (NO FOREIGN KEY to users for easier setup)
CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  discord_id VARCHAR(255) NOT NULL,
  discord_username VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- CIVILIAN, POLICE, EMS
  character_name VARCHAR(255) NOT NULL,
  age INTEGER,
  steam_url TEXT,
  experience VARCHAR(100),
  backstory TEXT,
  why_join TEXT,
  department_experience TEXT,
  availability TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, under_review, interview, accepted, rejected
  assigned_to VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_by VARCHAR(255),
  rejection_reason TEXT,
  interview_scheduled_at TIMESTAMP WITH TIME ZONE,
  interview_result TEXT
);

-- Application History Table
CREATE TABLE IF NOT EXISTS application_history (
  id SERIAL PRIMARY KEY,
  application_id INTEGER,
  discord_id VARCHAR(255) NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tickets Table
CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  discord_id VARCHAR(255) NOT NULL,
  discord_username VARCHAR(255) NOT NULL,
  character_name VARCHAR(255),
  type VARCHAR(50) NOT NULL, -- CIVILIAN, POLICE, EMS
  channel VARCHAR(255),
  status VARCHAR(50) DEFAULT 'open', -- open, closed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_by VARCHAR(255),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  discord_id VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  discord_id VARCHAR(255) NOT NULL,
  discord_username VARCHAR(255) NOT NULL,
  area VARCHAR(100) NOT NULL,
  action VARCHAR(255) NOT NULL,
  target VARCHAR(255),
  target_type VARCHAR(50),
  details TEXT,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Staff Roles Table
CREATE TABLE IF NOT EXISTS staff_roles (
  id SERIAL PRIMARY KEY,
  discord_id VARCHAR(255) UNIQUE NOT NULL,
  discord_username VARCHAR(255) NOT NULL,
  role_id VARCHAR(50) NOT NULL,
  added_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role Definitions Table
CREATE TABLE IF NOT EXISTS role_definitions (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  role_id VARCHAR(50) NOT NULL,
  permission VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Police Members
CREATE TABLE IF NOT EXISTS police_members (
  id SERIAL PRIMARY KEY,
  discord_id VARCHAR(255) UNIQUE NOT NULL,
  character_name VARCHAR(255) NOT NULL,
  rank VARCHAR(100) DEFAULT 'Cadet',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Police Ranks
CREATE TABLE IF NOT EXISTS police_ranks (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  permissions JSONB,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Police Promotions
CREATE TABLE IF NOT EXISTS police_promotions (
  id SERIAL PRIMARY KEY,
  discord_id VARCHAR(255) NOT NULL,
  old_rank VARCHAR(100),
  new_rank VARCHAR(100) NOT NULL,
  promoted_by VARCHAR(255),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Police Announcements
CREATE TABLE IF NOT EXISTS police_announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  posted_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- EMS Members
CREATE TABLE IF NOT EXISTS ems_members (
  id SERIAL PRIMARY KEY,
  discord_id VARCHAR(255) UNIQUE NOT NULL,
  character_name VARCHAR(255) NOT NULL,
  rank VARCHAR(100) DEFAULT 'EMT',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- EMS Ranks
CREATE TABLE IF NOT EXISTS ems_ranks (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  permissions JSONB,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- EMS Promotions
CREATE TABLE IF NOT EXISTS ems_promotions (
  id SERIAL PRIMARY KEY,
  discord_id VARCHAR(255) NOT NULL,
  old_rank VARCHAR(100),
  new_rank VARCHAR(100) NOT NULL,
  promoted_by VARCHAR(255),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- EMS Announcements
CREATE TABLE IF NOT EXISTS ems_announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  posted_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Streamers Table
CREATE TABLE IF NOT EXISTS streamers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  url TEXT NOT NULL,
  is_live BOOLEAN DEFAULT FALSE,
  added_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content Management
CREATE TABLE IF NOT EXISTS content_management (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  body TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  updated_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Department Notices
CREATE TABLE IF NOT EXISTS department_notices (
  id SERIAL PRIMARY KEY,
  department VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  posted_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Server Status
CREATE TABLE IF NOT EXISTS server_status (
  id SERIAL PRIMARY KEY,
  is_online BOOLEAN DEFAULT TRUE,
  current_players INTEGER DEFAULT 0,
  max_players INTEGER DEFAULT 128,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_applications_discord_id ON applications(discord_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_type ON applications(type);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tickets_discord_id ON tickets(discord_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_type ON tickets(type);

CREATE INDEX IF NOT EXISTS idx_notifications_discord_id ON notifications(discord_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_discord_id ON audit_logs(discord_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_area ON audit_logs(area);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_staff_roles_discord_id ON staff_roles(discord_id);
CREATE INDEX IF NOT EXISTS idx_staff_roles_role ON staff_roles(role);

CREATE INDEX IF NOT EXISTS idx_police_members_discord_id ON police_members(discord_id);
CREATE INDEX IF NOT EXISTS idx_police_members_status ON police_members(status);

CREATE INDEX IF NOT EXISTS idx_ems_members_discord_id ON ems_members(discord_id);
CREATE INDEX IF NOT EXISTS idx_ems_members_status ON ems_members(status);

CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_roles_updated_at BEFORE UPDATE ON staff_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_police_members_updated_at BEFORE UPDATE ON police_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ems_members_updated_at BEFORE UPDATE ON ems_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_streamers_updated_at BEFORE UPDATE ON streamers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_management_updated_at BEFORE UPDATE ON content_management
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_department_notices_updated_at BEFORE UPDATE ON department_notices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Initial server status
INSERT INTO server_status (is_online, current_players, max_players)
VALUES (TRUE, 0, 128)
ON CONFLICT DO NOTHING;
