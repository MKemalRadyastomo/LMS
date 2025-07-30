-- =====================================================
-- Assignment System Enhancements Migration
-- =====================================================
-- This migration adds advanced features for the assignment system:
-- - Assignment templates for reusable content
-- - Enhanced submission management with versioning
-- - Late submission penalties and automated handling
-- - Multiple file uploads per submission
-- - Enhanced grading features
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ASSIGNMENT TEMPLATES
-- =====================================================

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

-- =====================================================
-- ENHANCED ASSIGNMENTS TABLE
-- =====================================================

-- Add new columns to assignments table
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS template_id INTEGER REFERENCES assignment_templates(id) ON DELETE SET NULL;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS late_submission_penalty DECIMAL(5,2) DEFAULT 0; -- Percentage penalty per day
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS allow_late_submissions BOOLEAN DEFAULT true;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS max_late_days INTEGER DEFAULT 7;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS auto_release_grades BOOLEAN DEFAULT false;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS grade_release_date TIMESTAMP;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS multiple_attempts BOOLEAN DEFAULT false;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 1;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS show_correct_answers BOOLEAN DEFAULT false;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT false;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER; -- For timed assignments
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS require_webcam BOOLEAN DEFAULT false; -- For proctored assignments
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS plagiarism_check BOOLEAN DEFAULT false;

-- =====================================================
-- SUBMISSION VERSIONS AND FILES
-- =====================================================

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

-- =====================================================
-- ENHANCED GRADING TABLES
-- =====================================================

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

-- =====================================================
-- LATE SUBMISSION TRACKING
-- =====================================================

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

-- =====================================================
-- ASSIGNMENT ANALYTICS
-- =====================================================

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

-- =====================================================
-- PLAGIARISM DETECTION
-- =====================================================

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

-- =====================================================
-- NOTIFICATION SYSTEM
-- =====================================================

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

-- Assignment templates indexes
CREATE INDEX idx_assignment_templates_type ON assignment_templates(type);
CREATE INDEX idx_assignment_templates_created_by ON assignment_templates(created_by);
CREATE INDEX idx_assignment_templates_public ON assignment_templates(is_public);

-- Enhanced assignments indexes
CREATE INDEX idx_assignments_template_id ON assignments(template_id);
CREATE INDEX idx_assignments_late_submissions ON assignments(allow_late_submissions);
CREATE INDEX idx_assignments_grade_release ON assignments(grade_release_date);
CREATE INDEX idx_assignments_time_limit ON assignments(time_limit_minutes);

-- Submission versions indexes
CREATE INDEX idx_submission_versions_submission_id ON submission_versions(submission_id);
CREATE INDEX idx_submission_versions_draft ON submission_versions(is_draft);
CREATE INDEX idx_submission_versions_version ON submission_versions(submission_id, version_number);

-- Submission files indexes
CREATE INDEX idx_submission_files_submission_id ON submission_files(submission_id);
CREATE INDEX idx_submission_files_version_id ON submission_files(version_id);
CREATE INDEX idx_submission_files_hash ON submission_files(file_hash);

-- Grading criteria indexes
CREATE INDEX idx_grading_criteria_rubric_id ON grading_criteria(rubric_id);
CREATE INDEX idx_grading_criteria_order ON grading_criteria(rubric_id, order_index);

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

-- Notifications indexes
CREATE INDEX idx_assignment_notifications_user ON assignment_notifications(user_id);
CREATE INDEX idx_assignment_notifications_assignment ON assignment_notifications(assignment_id);
CREATE INDEX idx_assignment_notifications_type ON assignment_notifications(notification_type);
CREATE INDEX idx_assignment_notifications_read ON assignment_notifications(is_read);
CREATE INDEX idx_assignment_notifications_scheduled ON assignment_notifications(scheduled_for);

-- =====================================================
-- UPDATED TRIGGERS
-- =====================================================

-- Update triggers for new tables
CREATE TRIGGER trigger_update_assignment_templates_updated_at
    BEFORE UPDATE ON assignment_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ENHANCED FUNCTIONS
-- =====================================================

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
-- VIEWS FOR ENHANCED REPORTING
-- =====================================================

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
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE assignment_templates IS 'Reusable assignment templates for teachers';
COMMENT ON TABLE submission_versions IS 'Version history for assignment submissions with draft support';
COMMENT ON TABLE submission_files IS 'Multiple file uploads per assignment submission';
COMMENT ON TABLE grading_criteria IS 'Individual criteria for detailed rubric-based grading';
COMMENT ON TABLE submission_scores IS 'Detailed scores per grading criterion';
COMMENT ON TABLE automated_grading IS 'Configuration for auto-grading objective questions';
COMMENT ON TABLE late_submissions IS 'Tracking and penalty calculation for late submissions';
COMMENT ON TABLE assignment_analytics IS 'Detailed analytics and reporting for assignments';
COMMENT ON TABLE plagiarism_reports IS 'Integration with plagiarism detection services';
COMMENT ON TABLE assignment_notifications IS 'Assignment-related notifications for users';

-- =====================================================
-- END OF MIGRATION
-- =====================================================