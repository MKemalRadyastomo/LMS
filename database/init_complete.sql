-- =====================================================
-- LMS Database Complete Initialization Script
-- =====================================================
-- This script creates the complete database schema for the LMS
-- Run this on a fresh database to set up everything at once
-- 
-- Usage: psql -d your_database -f database/init_complete.sql
-- =====================================================

-- Enable necessary PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Table: users
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(10) CHECK (
        role IN ('admin', 'guru', 'siswa')
    ) NOT NULL,
    profile_image TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: courses
DROP TABLE IF EXISTS courses CASCADE;
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    privacy VARCHAR(50) DEFAULT 'private',
    status VARCHAR(20) DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'draft', 'archived')),
    code VARCHAR(6) UNIQUE NOT NULL,
    class_code VARCHAR(10), -- For student self-enrollment
    teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: course_enrollments
DROP TABLE IF EXISTS course_enrollments CASCADE;
CREATE TABLE course_enrollments (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    enrollment_method VARCHAR(20) DEFAULT 'manual', -- 'manual', 'code', 'auto'
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'pending', 'dropped'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, user_id)
);

-- Table: materials
DROP TABLE IF EXISTS materials CASCADE;
CREATE TABLE materials (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT,
    file_path TEXT,
    video_url TEXT,
    publish_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: assignments
DROP TABLE IF EXISTS assignments CASCADE;
CREATE TABLE assignments (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    course_content_id INTEGER, -- Allow NULL for flexibility
    template_id INTEGER, -- References assignment_templates(id)
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    type VARCHAR(50), -- 'essay', 'quiz', 'file_upload', 'mixed', 'coding'
    due_date TIMESTAMP,
    max_score INTEGER,
    quiz_questions_json JSONB,
    allowed_file_types TEXT,
    max_file_size_mb INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    -- Enhanced assignment features
    late_submission_penalty DECIMAL(5,2) DEFAULT 0, -- Percentage penalty per day
    allow_late_submissions BOOLEAN DEFAULT true,
    max_late_days INTEGER DEFAULT 7,
    auto_release_grades BOOLEAN DEFAULT false,
    grade_release_date TIMESTAMP,
    multiple_attempts BOOLEAN DEFAULT false,
    max_attempts INTEGER DEFAULT 1,
    show_correct_answers BOOLEAN DEFAULT false,
    shuffle_questions BOOLEAN DEFAULT false,
    time_limit_minutes INTEGER, -- For timed assignments
    require_webcam BOOLEAN DEFAULT false, -- For proctored assignments
    plagiarism_check BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: assignment_templates
DROP TABLE IF EXISTS assignment_templates CASCADE;
CREATE TABLE assignment_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('essay', 'quiz', 'file_upload', 'mixed', 'coding')),
    template_data JSONB NOT NULL, -- Stores the template structure
    instructions TEXT,
    default_max_score INTEGER,
    default_allowed_file_types TEXT,
    default_max_file_size_mb INTEGER,
    quiz_template_json JSONB, -- For quiz templates
    rubric_template JSONB, -- Default rubric structure
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT false, -- Whether template can be used by other teachers
    usage_count INTEGER DEFAULT 0, -- Track how often template is used
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint for template_id after assignment_templates is created
ALTER TABLE assignments ADD CONSTRAINT fk_assignments_template_id 
    FOREIGN KEY (template_id) REFERENCES assignment_templates(id) ON DELETE SET NULL;

-- Table: grading_rubrics
DROP TABLE IF EXISTS grading_rubrics CASCADE;
CREATE TABLE grading_rubrics (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    total_points INTEGER NOT NULL,
    criteria JSONB NOT NULL, -- Array of criteria with points and descriptions
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: grading_criteria (individual rubric criteria)
DROP TABLE IF EXISTS grading_criteria CASCADE;
CREATE TABLE grading_criteria (
    id SERIAL PRIMARY KEY,
    rubric_id INTEGER NOT NULL REFERENCES grading_rubrics(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    max_points INTEGER NOT NULL,
    weight DECIMAL(3,2) DEFAULT 1.00, -- Weighting factor for this criterion
    order_index INTEGER NOT NULL,
    performance_levels JSONB -- Array of performance level descriptors
);

-- Table: assignment_submissions
DROP TABLE IF EXISTS assignment_submissions CASCADE;
CREATE TABLE assignment_submissions (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    submission_text TEXT,
    file_path TEXT,
    quiz_answers_json JSONB,
    grade INTEGER,
    feedback TEXT,
    status VARCHAR(50), -- 'submitted', 'graded', 'late', 'draft'
    graded_at TIMESTAMP,
    graded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assignment_id, student_id)
);

-- Table: submission_versions (for tracking submission history)
DROP TABLE IF EXISTS submission_versions CASCADE;
CREATE TABLE submission_versions (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    submission_text TEXT,
    file_data JSONB, -- Array of file information
    quiz_answers_json JSONB,
    is_draft BOOLEAN DEFAULT true,
    auto_saved BOOLEAN DEFAULT false, -- Whether this was an auto-save
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(submission_id, version_number)
);

-- Table: submission_files (for multiple file uploads per submission)
DROP TABLE IF EXISTS submission_files CASCADE;
CREATE TABLE submission_files (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    version_id INTEGER REFERENCES submission_versions(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL, -- Size in bytes
    mime_type VARCHAR(100),
    file_hash VARCHAR(64), -- For duplicate detection
    upload_order INTEGER DEFAULT 1, -- Order of files in the submission
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: submission_scores (detailed scoring per criterion)
DROP TABLE IF EXISTS submission_scores CASCADE;
CREATE TABLE submission_scores (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    criterion_id INTEGER NOT NULL REFERENCES grading_criteria(id) ON DELETE CASCADE,
    points_earned DECIMAL(5,2) NOT NULL,
    comments TEXT,
    graded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(submission_id, criterion_id)
);

-- Table: automated_grading (for objective question auto-grading)
DROP TABLE IF EXISTS automated_grading CASCADE;
CREATE TABLE automated_grading (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    question_index INTEGER NOT NULL,
    question_type VARCHAR(50) NOT NULL, -- 'multiple_choice', 'true_false', 'short_answer'
    correct_answer TEXT NOT NULL,
    answer_variations JSONB, -- For short answer variations
    points INTEGER NOT NULL,
    case_sensitive BOOLEAN DEFAULT false,
    partial_credit_rules JSONB, -- Rules for partial credit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assignment_id, question_index)
);

-- Table: late_submissions (tracking late submission penalties)
DROP TABLE IF EXISTS late_submissions CASCADE;
CREATE TABLE late_submissions (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    days_late INTEGER NOT NULL,
    penalty_percentage DECIMAL(5,2) NOT NULL,
    original_grade DECIMAL(5,2),
    final_grade DECIMAL(5,2),
    penalty_applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    waived_by INTEGER REFERENCES users(id) ON DELETE SET NULL, -- If penalty was waived
    waived_reason TEXT,
    waived_at TIMESTAMP
);

-- Table: assignment_analytics (detailed analytics per assignment)
DROP TABLE IF EXISTS assignment_analytics CASCADE;
CREATE TABLE assignment_analytics (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    analytics_date DATE NOT NULL,
    total_enrolled INTEGER DEFAULT 0,
    submissions_count INTEGER DEFAULT 0,
    on_time_submissions INTEGER DEFAULT 0,
    late_submissions INTEGER DEFAULT 0,
    average_grade DECIMAL(5,2),
    median_grade DECIMAL(5,2),
    grade_distribution JSONB, -- Distribution of grades by letter/percentage
    time_spent_stats JSONB, -- Statistics on time spent on assignment
    question_analytics JSONB, -- For quiz questions, track answer patterns
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assignment_id, analytics_date)
);

-- Table: plagiarism_reports (placeholder for plagiarism detection integration)
DROP TABLE IF EXISTS plagiarism_reports CASCADE;
CREATE TABLE plagiarism_reports (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    plagiarism_score DECIMAL(5,2) NOT NULL, -- Percentage similarity
    report_data JSONB, -- External service report data
    sources_found JSONB, -- Array of potential sources
    report_url TEXT, -- Link to full report
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: course_contents
DROP TABLE IF EXISTS course_contents CASCADE;
CREATE TABLE course_contents (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL, -- 'material', 'assignment'
    content_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    order_index INTEGER NOT NULL
);

-- =====================================================
-- GRADING ENHANCEMENT TABLES
-- =====================================================

-- Table: grading_details (for detailed grading information)
DROP TABLE IF EXISTS grading_details CASCADE;
CREATE TABLE grading_details (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    rubric_id INTEGER REFERENCES grading_rubrics(id) ON DELETE SET NULL,
    rubric_scores JSONB,
    additional_points INTEGER DEFAULT 0,
    deductions INTEGER DEFAULT 0,
    total_score DECIMAL(5,2),
    percentage DECIMAL(5,2),
    letter_grade VARCHAR(2),
    grader_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- RBAC & SECURITY TABLES
-- =====================================================

-- Table: user_sessions (for session timeout tracking)
DROP TABLE IF EXISTS user_sessions CASCADE;
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: failed_login_attempts (for account lockout)
DROP TABLE IF EXISTS failed_login_attempts CASCADE;
CREATE TABLE failed_login_attempts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    ip_address INET,
    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: activity_logs (for audit trail)
DROP TABLE IF EXISTS activity_logs CASCADE;
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL, -- 'login', 'logout', 'view_material', 'submit_assignment', etc.
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    resource_type VARCHAR(100), -- 'course', 'assignment', 'material', etc.
    resource_id INTEGER,
    description TEXT NOT NULL,
    details JSONB,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ANALYTICS & STATISTICS TABLES
-- =====================================================

-- Table: user_statistics
DROP TABLE IF EXISTS user_statistics CASCADE;
CREATE TABLE user_statistics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    courses_enrolled INTEGER DEFAULT 0,
    assignments_completed INTEGER DEFAULT 0,
    average_grade DECIMAL(5,2),
    total_study_time INTEGER DEFAULT 0, -- in minutes
    last_activity TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Table: course_analytics
DROP TABLE IF EXISTS course_analytics CASCADE;
CREATE TABLE course_analytics (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    total_students INTEGER DEFAULT 0,
    completed_assignments INTEGER DEFAULT 0,
    average_completion_rate DECIMAL(5,2),
    average_grade DECIMAL(5,2),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id)
);

-- Table: system_analytics (for overall system metrics)
DROP TABLE IF EXISTS system_analytics CASCADE;
CREATE TABLE system_analytics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    total_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    total_courses INTEGER DEFAULT 0,
    total_assignments INTEGER DEFAULT 0,
    total_submissions INTEGER DEFAULT 0,
    average_grade DECIMAL(5,2),
    metrics JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date)
);

-- =====================================================
-- NOTIFICATION SYSTEM TABLES
-- =====================================================

-- Table: notifications (for managing user notifications)
DROP TABLE IF EXISTS notifications CASCADE;
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info', -- 'info', 'success', 'warning', 'error', 'assignment', 'course', 'system'
    priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    status VARCHAR(20) NOT NULL DEFAULT 'unread', -- 'unread', 'read', 'archived'
    
    -- Related entities
    related_type VARCHAR(50), -- 'course', 'assignment', 'material', 'submission', 'grade'
    related_id INTEGER,
    
    -- Action data
    action_url VARCHAR(500), -- URL to navigate to when notification is clicked
    action_label VARCHAR(100), -- Button text for action
    
    -- Metadata
    metadata JSONB,
    
    -- Delivery tracking
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    archived_at TIMESTAMP,
    expires_at TIMESTAMP,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: notification_preferences (for user notification settings)
DROP TABLE IF EXISTS notification_preferences CASCADE;
CREATE TABLE notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Email preferences
    email_enabled BOOLEAN DEFAULT true,
    email_frequency VARCHAR(20) DEFAULT 'immediate', -- 'immediate', 'daily', 'weekly', 'never'
    
    -- Push notification preferences
    push_enabled BOOLEAN DEFAULT true,
    push_assignments BOOLEAN DEFAULT true,
    push_grades BOOLEAN DEFAULT true,
    push_course_updates BOOLEAN DEFAULT true,
    push_system_alerts BOOLEAN DEFAULT true,
    
    -- WebSocket preferences
    websocket_enabled BOOLEAN DEFAULT true,
    
    -- Type-specific preferences
    notification_types JSONB DEFAULT '{}', -- Store preferences for each notification type
    
    -- Quiet hours
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    quiet_hours_timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one preference record per user
    UNIQUE(user_id)
);

-- Table: notification_templates (for reusable notification templates)
DROP TABLE IF EXISTS notification_templates CASCADE;
CREATE TABLE notification_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    title_template VARCHAR(255) NOT NULL,
    message_template TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    
    -- Template variables
    required_variables JSONB DEFAULT '[]', -- Array of required variable names
    optional_variables JSONB DEFAULT '[]', -- Arrays of optional variable names
    
    -- Default values
    default_action_url VARCHAR(500),
    default_action_label VARCHAR(100),
    default_expires_hours INTEGER DEFAULT 168, -- 1 week default
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- Table: notification_delivery_log (for tracking delivery status)
DROP TABLE IF EXISTS notification_delivery_log CASCADE;
CREATE TABLE notification_delivery_log (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    delivery_method VARCHAR(50) NOT NULL, -- 'websocket', 'email', 'push'
    delivery_status VARCHAR(50) NOT NULL, -- 'pending', 'sent', 'delivered', 'failed', 'bounced'
    delivery_attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    delivered_at TIMESTAMP,
    error_message TEXT,
    metadata JSONB,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: assignment_notifications (for assignment-related notifications)
DROP TABLE IF EXISTS assignment_notifications CASCADE;
CREATE TABLE assignment_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
    notification_type VARCHAR(100) NOT NULL, -- 'due_soon', 'overdue', 'graded', 'new_assignment'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    action_url TEXT, -- URL to take action
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    scheduled_for TIMESTAMP, -- For scheduled notifications
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Core table indexes
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

CREATE INDEX idx_courses_teacher_id ON courses(teacher_id);
CREATE INDEX idx_courses_active ON courses(is_active);
CREATE INDEX idx_courses_status ON courses(status);

CREATE INDEX idx_enrollments_course_user ON course_enrollments(course_id, user_id);
CREATE INDEX idx_enrollments_status ON course_enrollments(status);

CREATE INDEX idx_materials_course_id ON materials(course_id);

CREATE INDEX idx_assignments_course_id ON assignments(course_id);
CREATE INDEX idx_assignments_type ON assignments(type);
CREATE INDEX idx_assignments_due_date ON assignments(due_date);
CREATE INDEX idx_assignments_template_id ON assignments(template_id);
CREATE INDEX idx_assignments_late_submissions ON assignments(allow_late_submissions);
CREATE INDEX idx_assignments_grade_release ON assignments(grade_release_date);
CREATE INDEX idx_assignments_time_limit ON assignments(time_limit_minutes);

-- Assignment templates indexes
CREATE INDEX idx_assignment_templates_type ON assignment_templates(type);
CREATE INDEX idx_assignment_templates_created_by ON assignment_templates(created_by);
CREATE INDEX idx_assignment_templates_public ON assignment_templates(is_public);

CREATE INDEX idx_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX idx_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX idx_submissions_status ON assignment_submissions(status);
CREATE INDEX idx_submissions_graded_by ON assignment_submissions(graded_by);

-- Submission versions indexes
CREATE INDEX idx_submission_versions_submission_id ON submission_versions(submission_id);
CREATE INDEX idx_submission_versions_draft ON submission_versions(is_draft);
CREATE INDEX idx_submission_versions_version ON submission_versions(submission_id, version_number);

-- Submission files indexes
CREATE INDEX idx_submission_files_submission_id ON submission_files(submission_id);
CREATE INDEX idx_submission_files_version_id ON submission_files(version_id);
CREATE INDEX idx_submission_files_hash ON submission_files(file_hash);

-- Grading table indexes
CREATE INDEX idx_grading_rubrics_assignment_id ON grading_rubrics(assignment_id);
CREATE INDEX idx_grading_criteria_rubric_id ON grading_criteria(rubric_id);
CREATE INDEX idx_grading_criteria_order ON grading_criteria(rubric_id, order_index);
CREATE INDEX idx_grading_details_submission_id ON grading_details(submission_id);
CREATE INDEX idx_grading_details_rubric_id ON grading_details(rubric_id);
CREATE INDEX idx_grading_details_grader_id ON grading_details(grader_id);

-- Submission scores indexes
CREATE INDEX idx_submission_scores_submission ON submission_scores(submission_id);
CREATE INDEX idx_submission_scores_criterion ON submission_scores(criterion_id);

-- Automated grading indexes
CREATE INDEX idx_automated_grading_assignment ON automated_grading(assignment_id);
CREATE INDEX idx_automated_grading_question ON automated_grading(assignment_id, question_index);

-- Late submissions indexes
CREATE INDEX idx_late_submissions_submission_id ON late_submissions(submission_id);
CREATE INDEX idx_late_submissions_waived ON late_submissions(waived_by);

-- Analytics indexes
CREATE INDEX idx_assignment_analytics_assignment ON assignment_analytics(assignment_id);
CREATE INDEX idx_assignment_analytics_date ON assignment_analytics(analytics_date);

-- Plagiarism reports indexes
CREATE INDEX idx_plagiarism_reports_submission ON plagiarism_reports(submission_id);
CREATE INDEX idx_plagiarism_reports_status ON plagiarism_reports(status);

-- Security table indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active);

CREATE INDEX idx_failed_login_email ON failed_login_attempts(email);
CREATE INDEX idx_failed_login_time ON failed_login_attempts(attempt_time);
CREATE INDEX idx_failed_login_email_time ON failed_login_attempts(email, attempt_time);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_course_id ON activity_logs(course_id);
CREATE INDEX idx_activity_logs_activity_type ON activity_logs(activity_type);
CREATE INDEX idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX idx_activity_logs_entity_type ON activity_logs(entity_type);
CREATE INDEX idx_activity_logs_entity_id ON activity_logs(entity_id);
CREATE INDEX idx_activity_logs_resource ON activity_logs(resource_type, resource_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- Composite indexes for activity logs
CREATE INDEX idx_activity_logs_course_created ON activity_logs(course_id, created_at DESC);
CREATE INDEX idx_activity_logs_course_action ON activity_logs(course_id, action_type);
CREATE INDEX idx_activity_logs_course_entity ON activity_logs(course_id, entity_type);

-- Notification indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at);
CREATE INDEX idx_notifications_related ON notifications(related_type, related_id);

-- Composite indexes for common notification queries
CREATE INDEX idx_notifications_user_status ON notifications(user_id, status);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, status) WHERE status = 'unread';
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- Notification preferences indexes
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Notification templates indexes
CREATE INDEX idx_notification_templates_name ON notification_templates(name);
CREATE INDEX idx_notification_templates_type ON notification_templates(type);
CREATE INDEX idx_notification_templates_active ON notification_templates(is_active);

-- Notification delivery log indexes
CREATE INDEX idx_notification_delivery_log_notification_id ON notification_delivery_log(notification_id);
CREATE INDEX idx_notification_delivery_log_method ON notification_delivery_log(delivery_method);
CREATE INDEX idx_notification_delivery_log_status ON notification_delivery_log(delivery_status);
CREATE INDEX idx_notification_delivery_log_created_at ON notification_delivery_log(created_at DESC);

-- Assignment notifications indexes
CREATE INDEX idx_assignment_notifications_user ON assignment_notifications(user_id);
CREATE INDEX idx_assignment_notifications_assignment ON assignment_notifications(assignment_id);
CREATE INDEX idx_assignment_notifications_type ON assignment_notifications(notification_type);
CREATE INDEX idx_assignment_notifications_read ON assignment_notifications(is_read);
CREATE INDEX idx_assignment_notifications_scheduled ON assignment_notifications(scheduled_for);

-- =====================================================
-- FULL-TEXT SEARCH INDEXES
-- =====================================================

CREATE INDEX idx_materials_search ON materials USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || COALESCE(content, '')));
CREATE INDEX idx_assignments_search ON assignments USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
CREATE INDEX idx_courses_search ON courses USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at columns
CREATE TRIGGER trigger_update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_materials_updated_at
    BEFORE UPDATE ON materials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_assignments_updated_at
    BEFORE UPDATE ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_assignment_templates_updated_at
    BEFORE UPDATE ON assignment_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_submissions_updated_at
    BEFORE UPDATE ON assignment_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_grading_details_updated_at
    BEFORE UPDATE ON grading_details
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_course_enrollments_updated_at
    BEFORE UPDATE ON course_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_delivery_log_updated_at
    BEFORE UPDATE ON notification_delivery_log
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < NOW() OR is_active = false;
    
    DELETE FROM failed_login_attempts 
    WHERE attempt_time < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Function to calculate course grade for a student
CREATE OR REPLACE FUNCTION calculate_course_grade(student_id_param INTEGER, course_id_param INTEGER)
RETURNS TABLE(
    total_assignments INTEGER,
    completed_assignments INTEGER,
    average_grade DECIMAL(5,2),
    letter_grade VARCHAR(2),
    completion_percentage DECIMAL(5,2)
) AS $$
DECLARE
    avg_grade DECIMAL(5,2);
    letter VARCHAR(2);
BEGIN
    SELECT 
        COUNT(a.id) as total,
        COUNT(s.id) as completed,
        ROUND(AVG(s.grade)::numeric, 2) as avg_score
    INTO total_assignments, completed_assignments, avg_grade
    FROM assignments a
    LEFT JOIN assignment_submissions s ON a.id = s.assignment_id AND s.student_id = student_id_param
    WHERE a.course_id = course_id_param;
    
    average_grade := COALESCE(avg_grade, 0);
    
    -- Calculate letter grade
    IF average_grade >= 90 THEN
        letter := 'A';
    ELSIF average_grade >= 80 THEN
        letter := 'B';
    ELSIF average_grade >= 70 THEN
        letter := 'C';
    ELSIF average_grade >= 60 THEN
        letter := 'D';
    ELSE
        letter := 'F';
    END IF;
    
    letter_grade := letter;
    completion_percentage := CASE 
        WHEN total_assignments > 0 THEN 
            ROUND((completed_assignments::numeric / total_assignments) * 100, 2)
        ELSE 0 
    END;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate late submission penalty
CREATE OR REPLACE FUNCTION calculate_late_penalty(
    submission_id_param INTEGER,
    assignment_id_param INTEGER
) RETURNS TABLE(
    days_late INTEGER,
    penalty_percentage DECIMAL(5,2),
    final_grade DECIMAL(5,2)
) AS $$
DECLARE
    submission_date TIMESTAMP;
    due_date TIMESTAMP;
    penalty_per_day DECIMAL(5,2);
    allow_late BOOLEAN;
    max_days INTEGER;
    original_grade DECIMAL(5,2);
    calculated_days INTEGER;
    calculated_penalty DECIMAL(5,2);
    calculated_final DECIMAL(5,2);
BEGIN
    -- Get submission and assignment details
    SELECT s.created_at, a.due_date, a.late_submission_penalty, a.allow_late_submissions, a.max_late_days, s.grade
    INTO submission_date, due_date, penalty_per_day, allow_late, max_days, original_grade
    FROM assignment_submissions s
    JOIN assignments a ON s.assignment_id = a.id
    WHERE s.id = submission_id_param AND a.id = assignment_id_param;
    
    -- Check if submission is late
    IF submission_date <= due_date OR NOT allow_late THEN
        days_late := 0;
        penalty_percentage := 0;
        final_grade := original_grade;
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Calculate days late
    calculated_days := CEILING(EXTRACT(EPOCH FROM (submission_date - due_date)) / 86400);
    
    -- Cap at maximum allowed late days
    IF calculated_days > max_days THEN
        calculated_days := max_days;
    END IF;
    
    -- Calculate penalty
    calculated_penalty := calculated_days * penalty_per_day;
    IF calculated_penalty > 100 THEN
        calculated_penalty := 100; -- Cap at 100% penalty
    END IF;
    
    -- Calculate final grade
    calculated_final := original_grade * (1 - calculated_penalty / 100);
    IF calculated_final < 0 THEN
        calculated_final := 0;
    END IF;
    
    days_late := calculated_days;
    penalty_percentage := calculated_penalty;
    final_grade := calculated_final;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-grade objective questions
CREATE OR REPLACE FUNCTION auto_grade_submission(
    submission_id_param INTEGER
) RETURNS DECIMAL(5,2) AS $$
DECLARE
    assignment_id_param INTEGER;
    student_answers JSONB;
    total_score DECIMAL(5,2) := 0;
    max_possible_score INTEGER := 0;
    question_record RECORD;
    student_answer TEXT;
    is_correct BOOLEAN;
BEGIN
    -- Get submission details
    SELECT assignment_id, quiz_answers_json
    INTO assignment_id_param, student_answers
    FROM assignment_submissions
    WHERE id = submission_id_param;
    
    -- Process each auto-gradable question
    FOR question_record IN 
        SELECT * FROM automated_grading 
        WHERE assignment_id = assignment_id_param
        ORDER BY question_index
    LOOP
        max_possible_score := max_possible_score + question_record.points;
        
        -- Get student's answer for this question
        student_answer := student_answers->question_record.question_index::text->>'answer';
        
        IF student_answer IS NULL THEN
            CONTINUE; -- Skip unanswered questions
        END IF;
        
        -- Check if answer is correct based on question type
        is_correct := false;
        
        IF question_record.question_type = 'multiple_choice' OR question_record.question_type = 'true_false' THEN
            -- Exact match for multiple choice and true/false
            is_correct := LOWER(TRIM(student_answer)) = LOWER(TRIM(question_record.correct_answer));
        ELSIF question_record.question_type = 'short_answer' THEN
            -- Check against correct answer and variations
            is_correct := LOWER(TRIM(student_answer)) = LOWER(TRIM(question_record.correct_answer));
            
            -- Check variations if not already correct
            IF NOT is_correct AND question_record.answer_variations IS NOT NULL THEN
                SELECT EXISTS(
                    SELECT 1 FROM jsonb_array_elements_text(question_record.answer_variations) AS variation
                    WHERE LOWER(TRIM(variation)) = LOWER(TRIM(student_answer))
                ) INTO is_correct;
            END IF;
        END IF;
        
        -- Add points if correct
        IF is_correct THEN
            total_score := total_score + question_record.points;
        END IF;
    END LOOP;
    
    -- Convert to percentage if there are auto-gradable questions
    IF max_possible_score > 0 THEN
        RETURN (total_score / max_possible_score) * 100;
    END IF;
    
    RETURN NULL; -- No auto-gradable questions
END;
$$ LANGUAGE plpgsql;

-- Function to update assignment analytics
CREATE OR REPLACE FUNCTION update_assignment_analytics(assignment_id_param INTEGER)
RETURNS void AS $$
DECLARE
    analytics_record RECORD;
    current_date DATE := CURRENT_DATE;
BEGIN
    -- Calculate analytics
    SELECT 
        COUNT(DISTINCT ce.user_id) as total_enrolled,
        COUNT(DISTINCT s.id) as submissions_count,
        COUNT(DISTINCT CASE WHEN s.created_at <= a.due_date THEN s.id END) as on_time_submissions,
        COUNT(DISTINCT CASE WHEN s.created_at > a.due_date THEN s.id END) as late_submissions,
        ROUND(AVG(s.grade), 2) as average_grade,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.grade) as median_grade
    INTO analytics_record
    FROM assignments a
    LEFT JOIN course_enrollments ce ON a.course_id = ce.course_id AND ce.status = 'active'
    LEFT JOIN assignment_submissions s ON a.id = s.assignment_id
    WHERE a.id = assignment_id_param
    GROUP BY a.id;
    
    -- Insert or update analytics
    INSERT INTO assignment_analytics (
        assignment_id, analytics_date, total_enrolled, submissions_count,
        on_time_submissions, late_submissions, average_grade, median_grade
    ) VALUES (
        assignment_id_param, current_date, analytics_record.total_enrolled, 
        analytics_record.submissions_count, analytics_record.on_time_submissions,
        analytics_record.late_submissions, analytics_record.average_grade, 
        analytics_record.median_grade
    )
    ON CONFLICT (assignment_id, analytics_date)
    DO UPDATE SET
        total_enrolled = EXCLUDED.total_enrolled,
        submissions_count = EXCLUDED.submissions_count,
        on_time_submissions = EXCLUDED.on_time_submissions,
        late_submissions = EXCLUDED.late_submissions,
        average_grade = EXCLUDED.average_grade,
        median_grade = EXCLUDED.median_grade,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS FOR ANALYTICS
-- =====================================================

-- View for grade analytics
CREATE OR REPLACE VIEW grade_analytics_view AS
SELECT 
    a.id as assignment_id,
    a.title as assignment_title,
    a.course_id,
    COUNT(s.id) as total_submissions,
    COUNT(CASE WHEN s.grade IS NOT NULL THEN 1 END) as graded_submissions,
    ROUND(AVG(s.grade)::numeric, 2) as average_grade,
    MIN(s.grade) as min_grade,
    MAX(s.grade) as max_grade,
    STDDEV(s.grade) as grade_stddev,
    COUNT(CASE WHEN s.grade >= 90 THEN 1 END) as a_grades,
    COUNT(CASE WHEN s.grade >= 80 AND s.grade < 90 THEN 1 END) as b_grades,
    COUNT(CASE WHEN s.grade >= 70 AND s.grade < 80 THEN 1 END) as c_grades,
    COUNT(CASE WHEN s.grade >= 60 AND s.grade < 70 THEN 1 END) as d_grades,
    COUNT(CASE WHEN s.grade < 60 THEN 1 END) as f_grades
FROM assignments a
LEFT JOIN assignment_submissions s ON a.id = s.assignment_id
GROUP BY a.id, a.title, a.course_id;

-- View for student progress tracking
CREATE OR REPLACE VIEW student_progress_view AS
SELECT 
    u.id as student_id,
    u.name as student_name,
    u.email as student_email,
    c.id as course_id,
    c.name as course_name,
    COUNT(a.id) as total_assignments,
    COUNT(s.id) as submitted_assignments,
    COUNT(CASE WHEN s.grade IS NOT NULL THEN 1 END) as graded_assignments,
    ROUND(AVG(s.grade)::numeric, 2) as average_grade,
    ROUND((COUNT(s.id)::numeric / NULLIF(COUNT(a.id), 0)) * 100, 2) as completion_percentage
FROM users u
CROSS JOIN courses c
LEFT JOIN course_enrollments ce ON u.id = ce.user_id AND c.id = ce.course_id
LEFT JOIN assignments a ON c.id = a.course_id
LEFT JOIN assignment_submissions s ON a.id = s.assignment_id AND u.id = s.student_id
WHERE u.role = 'siswa' AND (ce.status = 'active' OR ce.status IS NULL)
GROUP BY u.id, u.name, u.email, c.id, c.name;

-- View for comprehensive assignment overview
CREATE OR REPLACE VIEW assignment_overview_view AS
SELECT 
    a.*,
    t.name as template_name,
    c.name as course_name,
    u.name as teacher_name,
    COUNT(DISTINCT s.id) as total_submissions,
    COUNT(DISTINCT CASE WHEN s.grade IS NOT NULL THEN s.id END) as graded_submissions,
    COUNT(DISTINCT CASE WHEN s.created_at > a.due_date THEN s.id END) as late_submissions,
    ROUND(AVG(s.grade), 2) as average_grade,
    aa.grade_distribution,
    aa.time_spent_stats
FROM assignments a
LEFT JOIN assignment_templates t ON a.template_id = t.id
LEFT JOIN courses c ON a.course_id = c.id
LEFT JOIN users u ON c.teacher_id = u.id
LEFT JOIN assignment_submissions s ON a.id = s.assignment_id
LEFT JOIN assignment_analytics aa ON a.id = aa.assignment_id AND aa.analytics_date = CURRENT_DATE
GROUP BY a.id, t.name, c.name, u.name, aa.grade_distribution, aa.time_spent_stats;

-- View for student submission history
CREATE OR REPLACE VIEW student_submission_history_view AS
SELECT 
    s.*,
    a.title as assignment_title,
    a.type as assignment_type,
    a.max_score,
    a.due_date,
    c.name as course_name,
    u.name as student_name,
    u.email as student_email,
    sv.version_number,
    sv.is_draft,
    CASE 
        WHEN s.created_at <= a.due_date THEN 'on_time'
        WHEN s.created_at > a.due_date AND a.allow_late_submissions THEN 'late'
        ELSE 'not_allowed'
    END as submission_status,
    ls.days_late,
    ls.penalty_percentage,
    pr.plagiarism_score
FROM assignment_submissions s
JOIN assignments a ON s.assignment_id = a.id
JOIN courses c ON a.course_id = c.id
JOIN users u ON s.student_id = u.id
LEFT JOIN submission_versions sv ON s.id = sv.submission_id AND sv.version_number = (
    SELECT MAX(version_number) FROM submission_versions WHERE submission_id = s.id
)
LEFT JOIN late_submissions ls ON s.id = ls.submission_id
LEFT JOIN plagiarism_reports pr ON s.id = pr.submission_id;

-- =====================================================
-- INITIAL DATA AND DEFAULT TEMPLATES
-- =====================================================

-- Insert default notification templates
INSERT INTO notification_templates (name, title_template, message_template, type, priority, required_variables, default_action_url, default_expires_hours) VALUES
('assignment_created', 'New Assignment: {{assignment_title}}', 'A new assignment "{{assignment_title}}" has been created in {{course_name}}. Due date: {{due_date}}.', 'assignment', 'medium', '["assignment_title", "course_name", "due_date"]', '/assignments/{{assignment_id}}', 168),
('assignment_due_soon', 'Assignment Due Soon: {{assignment_title}}', 'Your assignment "{{assignment_title}}" is due {{due_date}}. Don''t forget to submit!', 'assignment', 'high', '["assignment_title", "due_date"]', '/assignments/{{assignment_id}}', 24),
('assignment_graded', 'Assignment Graded: {{assignment_title}}', 'Your assignment "{{assignment_title}}" has been graded. Score: {{grade}}/{{max_score}}.', 'assignment', 'medium', '["assignment_title", "grade", "max_score"]', '/assignments/{{assignment_id}}/results', 720),
('course_enrollment', 'Enrolled in Course: {{course_name}}', 'You have been successfully enrolled in "{{course_name}}".', 'course', 'medium', '["course_name"]', '/courses/{{course_id}}', 168),
('course_material_added', 'New Material: {{material_title}}', 'New learning material "{{material_title}}" has been added to {{course_name}}.', 'course', 'low', '["material_title", "course_name"]', '/courses/{{course_id}}/materials/{{material_id}}', 168),
('system_maintenance', 'System Maintenance Notice', 'Scheduled maintenance will occur on {{maintenance_date}}. Expected downtime: {{duration}}.', 'system', 'high', '["maintenance_date", "duration"]', null, 48)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE users IS 'System users with role-based access (admin, guru, siswa)';
COMMENT ON TABLE courses IS 'Courses created by teachers with enrollment capabilities';
COMMENT ON COLUMN courses.status IS 'Course status: active (published), draft (unpublished), archived (hidden)';
COMMENT ON TABLE course_enrollments IS 'Student enrollment in courses with status tracking';
COMMENT ON TABLE materials IS 'Course materials with rich content and file support';
COMMENT ON TABLE assignments IS 'Assignments with support for essays, quizzes, and file uploads';
COMMENT ON TABLE assignment_templates IS 'Reusable assignment templates for teachers';
COMMENT ON TABLE grading_rubrics IS 'Rubrics for detailed assignment grading';
COMMENT ON TABLE grading_criteria IS 'Individual criteria for detailed rubric-based grading';
COMMENT ON TABLE assignment_submissions IS 'Student submissions with grading and feedback';
COMMENT ON TABLE submission_versions IS 'Version history for assignment submissions with draft support';
COMMENT ON TABLE submission_files IS 'Multiple file uploads per assignment submission';
COMMENT ON TABLE submission_scores IS 'Detailed scores per grading criterion';
COMMENT ON TABLE automated_grading IS 'Configuration for auto-grading objective questions';
COMMENT ON TABLE late_submissions IS 'Tracking and penalty calculation for late submissions';
COMMENT ON TABLE assignment_analytics IS 'Detailed analytics and reporting for assignments';
COMMENT ON TABLE plagiarism_reports IS 'Integration with plagiarism detection services';
COMMENT ON TABLE grading_details IS 'Detailed grading information with rubric scores';
COMMENT ON TABLE user_sessions IS 'Active user sessions for timeout management';
COMMENT ON TABLE failed_login_attempts IS 'Failed login tracking for account lockout';
COMMENT ON TABLE activity_logs IS 'Audit trail for user activities';
COMMENT ON TABLE user_statistics IS 'User performance and activity statistics';
COMMENT ON TABLE course_analytics IS 'Course-level analytics and metrics';
COMMENT ON TABLE system_analytics IS 'System-wide analytics and usage metrics';
COMMENT ON TABLE notifications IS 'Stores individual notifications for users';
COMMENT ON TABLE notification_preferences IS 'Stores user-specific notification preferences and settings';
COMMENT ON TABLE notification_templates IS 'Reusable templates for generating notifications';
COMMENT ON TABLE notification_delivery_log IS 'Tracks delivery status of notifications across different channels';
COMMENT ON TABLE assignment_notifications IS 'Assignment-related notifications for users';

COMMENT ON COLUMN notifications.metadata IS 'Additional data specific to the notification type (JSON format)';
COMMENT ON COLUMN notifications.related_type IS 'Type of entity this notification relates to';
COMMENT ON COLUMN notifications.related_id IS 'ID of the related entity';
COMMENT ON COLUMN notifications.action_url IS 'URL to navigate to when notification is clicked';
COMMENT ON COLUMN notifications.expires_at IS 'When this notification should be automatically archived';
COMMENT ON COLUMN activity_logs.user_id IS 'User who performed the action (NULL if system action)';
COMMENT ON COLUMN activity_logs.course_id IS 'Course where the activity occurred';
COMMENT ON COLUMN activity_logs.action_type IS 'Type of action performed (created, updated, deleted, etc.)';
COMMENT ON COLUMN activity_logs.entity_type IS 'Type of entity affected (course, material, assignment, enrollment, etc.)';
COMMENT ON COLUMN activity_logs.entity_id IS 'ID of the affected entity';
COMMENT ON COLUMN activity_logs.description IS 'Human-readable description of the activity';
COMMENT ON COLUMN activity_logs.metadata IS 'Additional data about the activity (JSON format)';
COMMENT ON COLUMN activity_logs.created_at IS 'When the activity occurred';

-- =====================================================
-- END OF SCRIPT
-- =====================================================