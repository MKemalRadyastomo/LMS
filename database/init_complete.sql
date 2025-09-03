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
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50), -- 'essay', 'quiz', 'file_upload', 'mixed'
    due_date TIMESTAMP,
    max_score INTEGER,
    quiz_questions_json JSONB,
    allowed_file_types TEXT,
    max_file_size_mb INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
    plagiarism_score INTEGER,
    graded_at TIMESTAMP,
    graded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assignment_id, student_id)
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
    activity_type VARCHAR(100) NOT NULL, -- 'login', 'logout', 'view_material', 'submit_assignment', etc.
    resource_type VARCHAR(100), -- 'course', 'assignment', 'material', etc.
    resource_id INTEGER,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Core table indexes
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

CREATE INDEX idx_courses_teacher_id ON courses(teacher_id);
CREATE INDEX idx_courses_active ON courses(is_active);

CREATE INDEX idx_enrollments_course_user ON course_enrollments(course_id, user_id);
CREATE INDEX idx_enrollments_status ON course_enrollments(status);

CREATE INDEX idx_materials_course_id ON materials(course_id);

CREATE INDEX idx_assignments_course_id ON assignments(course_id);
CREATE INDEX idx_assignments_type ON assignments(type);
CREATE INDEX idx_assignments_due_date ON assignments(due_date);

CREATE INDEX idx_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX idx_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX idx_submissions_status ON assignment_submissions(status);
CREATE INDEX idx_submissions_graded_by ON assignment_submissions(graded_by);

-- Grading table indexes
CREATE INDEX idx_grading_rubrics_assignment_id ON grading_rubrics(assignment_id);
CREATE INDEX idx_grading_details_submission_id ON grading_details(submission_id);
CREATE INDEX idx_grading_details_rubric_id ON grading_details(rubric_id);
CREATE INDEX idx_grading_details_grader_id ON grading_details(grader_id);

-- Security table indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active);

CREATE INDEX idx_failed_login_email ON failed_login_attempts(email);
CREATE INDEX idx_failed_login_time ON failed_login_attempts(attempt_time);
CREATE INDEX idx_failed_login_email_time ON failed_login_attempts(email, attempt_time);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_activity_type ON activity_logs(activity_type);
CREATE INDEX idx_activity_logs_resource ON activity_logs(resource_type, resource_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

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

CREATE TRIGGER trigger_update_submissions_updated_at
    BEFORE UPDATE ON assignment_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_grading_details_updated_at
    BEFORE UPDATE ON grading_details
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default admin user
-- Password: adminadmin (hashed with bcrypt)
INSERT INTO users (email, password_hash, name, role) VALUES 
('admin@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin User', 'admin');

-- Insert test teacher
INSERT INTO users (email, password_hash, name, role) VALUES 
('teacher@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test Teacher', 'guru');

-- Insert test student
INSERT INTO users (email, password_hash, name, role) VALUES 
('student@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test Student', 'siswa');

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE users IS 'System users with role-based access (admin, guru, siswa)';
COMMENT ON TABLE courses IS 'Courses created by teachers with enrollment capabilities';
COMMENT ON TABLE course_enrollments IS 'Student enrollment in courses with status tracking';
COMMENT ON TABLE materials IS 'Course materials with rich content and file support';
COMMENT ON TABLE assignments IS 'Assignments with support for essays, quizzes, and file uploads';
COMMENT ON TABLE grading_rubrics IS 'Rubrics for detailed assignment grading';
COMMENT ON TABLE assignment_submissions IS 'Student submissions with grading and feedback';
COMMENT ON TABLE grading_details IS 'Detailed grading information with rubric scores';
COMMENT ON TABLE user_sessions IS 'Active user sessions for timeout management';
COMMENT ON TABLE failed_login_attempts IS 'Failed login tracking for account lockout';
COMMENT ON TABLE activity_logs IS 'Audit trail for user activities';
COMMENT ON TABLE user_statistics IS 'User performance and activity statistics';
COMMENT ON TABLE course_analytics IS 'Course-level analytics and metrics';
COMMENT ON TABLE system_analytics IS 'System-wide analytics and usage metrics';

-- =====================================================
-- END OF SCRIPT
-- =====================================================