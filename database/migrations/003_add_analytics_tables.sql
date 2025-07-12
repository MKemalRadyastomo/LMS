-- Migration 003: Add Analytics Tables and Enhancements
-- Purpose: Add additional analytics and tracking capabilities

-- Add updated_at column to materials if not exists
ALTER TABLE materials ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add updated_at column to courses if not exists  
ALTER TABLE courses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add created_at column to materials if not exists
ALTER TABLE materials ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add created_at column to assignment_submissions if not exists
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add created_at column to course_enrollments if not exists  
ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Table: activity_logs (for tracking user activities)
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'login', 'logout', 'view_material', 'submit_assignment', etc.
    resource_type VARCHAR(50), -- 'course', 'assignment', 'material', etc.
    resource_id INTEGER,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_activity_type ON activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON activity_logs(resource_type, resource_id);

-- Table: system_analytics (for overall system metrics)
CREATE TABLE IF NOT EXISTS system_analytics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    total_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    total_courses INTEGER DEFAULT 0,
    total_assignments INTEGER DEFAULT 0,
    total_submissions INTEGER DEFAULT 0,
    average_grade DECIMAL(5,2),
    metrics JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint for system_analytics by date
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_analytics_date ON system_analytics(date);

-- Add enrollment_method to course_enrollments if not exists
ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS enrollment_method VARCHAR(20) DEFAULT 'manual';

-- Add class_code to courses if not exists
ALTER TABLE courses ADD COLUMN IF NOT EXISTS class_code VARCHAR(10);

-- Add is_active to courses if not exists
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;