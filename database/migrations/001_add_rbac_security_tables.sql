-- Migration 001: Add RBAC and Security Tables
-- Purpose: Add tables for enhanced security features including grading rubrics, user sessions, and failed login attempts

-- Table: grading_rubrics
CREATE TABLE IF NOT EXISTS grading_rubrics (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    total_points INTEGER NOT NULL,
    criteria JSONB NOT NULL, -- Array of criteria with points and descriptions
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: user_sessions (for session timeout tracking)
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- Table: failed_login_attempts (for account lockout)
CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    ip_address INET,
    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for email and time for efficient lockout checking
CREATE INDEX IF NOT EXISTS idx_failed_attempts_email_time ON failed_login_attempts(email, attempt_time);

-- Table: user_statistics
CREATE TABLE IF NOT EXISTS user_statistics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    courses_enrolled INTEGER DEFAULT 0,
    assignments_completed INTEGER DEFAULT 0,
    average_grade DECIMAL(5,2),
    total_study_time INTEGER DEFAULT 0, -- in minutes
    last_activity TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: course_analytics
CREATE TABLE IF NOT EXISTS course_analytics (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    total_students INTEGER DEFAULT 0,
    completed_assignments INTEGER DEFAULT 0,
    average_completion_rate DECIMAL(5,2),
    average_grade DECIMAL(5,2),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint for user_statistics
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_statistics_user_id ON user_statistics(user_id);

-- Add unique constraint for course_analytics  
CREATE UNIQUE INDEX IF NOT EXISTS idx_course_analytics_course_id ON course_analytics(course_id);