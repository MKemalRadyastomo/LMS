-- Migration 002: Add Search Indexes and Performance Optimizations
-- Purpose: Add full-text search capabilities and performance indexes

-- Enhanced indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_type ON assignments(type);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_user ON course_enrollments(course_id, user_id);
CREATE INDEX IF NOT EXISTS idx_materials_course_id ON materials(course_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Full-text search indexes for PostgreSQL
CREATE INDEX IF NOT EXISTS idx_materials_search ON materials USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || COALESCE(content, '')));
CREATE INDEX IF NOT EXISTS idx_assignments_search ON assignments USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_courses_search ON courses USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Add indexes for grading_rubrics
CREATE INDEX IF NOT EXISTS idx_grading_rubrics_assignment_id ON grading_rubrics(assignment_id);

-- Add indexes for user_sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Add index for course_enrollments status
CREATE INDEX IF NOT EXISTS idx_course_enrollments_status ON course_enrollments(status);

-- Add index for assignment due dates
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);

-- Add index for assignment submissions status
CREATE INDEX IF NOT EXISTS idx_submissions_status ON assignment_submissions(status);