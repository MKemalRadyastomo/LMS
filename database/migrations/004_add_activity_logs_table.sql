-- Migration: Add activity logs table for course activity tracking
-- Date: 2025-01-30
-- Description: Creates activity_logs table to track all course-related activities

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    description TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_course_id ON activity_logs(course_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_id ON activity_logs(entity_id);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_course_created ON activity_logs(course_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_course_action ON activity_logs(course_id, action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_course_entity ON activity_logs(course_id, entity_type);

-- Add comments to table and columns
COMMENT ON TABLE activity_logs IS 'Tracks all activities and changes within courses';
COMMENT ON COLUMN activity_logs.user_id IS 'User who performed the action (NULL if system action)';
COMMENT ON COLUMN activity_logs.course_id IS 'Course where the activity occurred';
COMMENT ON COLUMN activity_logs.action_type IS 'Type of action performed (created, updated, deleted, etc.)';
COMMENT ON COLUMN activity_logs.entity_type IS 'Type of entity affected (course, material, assignment, enrollment, etc.)';
COMMENT ON COLUMN activity_logs.entity_id IS 'ID of the affected entity';
COMMENT ON COLUMN activity_logs.description IS 'Human-readable description of the activity';
COMMENT ON COLUMN activity_logs.metadata IS 'Additional data about the activity (JSON format)';
COMMENT ON COLUMN activity_logs.created_at IS 'When the activity occurred';

-- Insert some example data for testing (optional)
-- INSERT INTO activity_logs (user_id, course_id, action_type, entity_type, entity_id, description, metadata) VALUES
-- (1, 1, 'created', 'course', 1, 'Course "Introduction to Programming" was created', '{"courseName": "Introduction to Programming"}'),
-- (1, 1, 'created', 'material', 1, 'Material "Course Overview" was created', '{"title": "Course Overview", "contentType": "material"}'),
-- (2, 1, 'enrolled', 'enrollment', 2, 'Student enrolled in course', '{"studentId": 2, "status": "active"}');

-- Migration completed successfully