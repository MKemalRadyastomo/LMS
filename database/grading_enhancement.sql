-- Grading Enhancement Tables
-- Additional tables needed for comprehensive grading system

-- Table: grading_details (for detailed grading information)
CREATE TABLE IF NOT EXISTS grading_details (
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

-- Indexes for grading_details table
CREATE INDEX IF NOT EXISTS idx_grading_details_submission_id ON grading_details(submission_id);
CREATE INDEX IF NOT EXISTS idx_grading_details_rubric_id ON grading_details(rubric_id);
CREATE INDEX IF NOT EXISTS idx_grading_details_grader_id ON grading_details(grader_id);

-- Add missing columns to assignment_submissions if they don't exist
ALTER TABLE assignment_submissions 
ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS graded_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_graded_by ON assignment_submissions(graded_by);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_graded_at ON assignment_submissions(graded_at);

-- Update triggers for grading_details
CREATE OR REPLACE FUNCTION update_grading_details_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_grading_details_timestamp
    BEFORE UPDATE ON grading_details
    FOR EACH ROW
    EXECUTE FUNCTION update_grading_details_timestamp();

-- Comment tables
COMMENT ON TABLE grading_details IS 'Detailed grading information with rubric scores and breakdown';
COMMENT ON COLUMN grading_details.rubric_scores IS 'JSON object containing scores for each rubric criterion';
COMMENT ON COLUMN grading_details.additional_points IS 'Extra points added by grader';
COMMENT ON COLUMN grading_details.deductions IS 'Points deducted by grader';
COMMENT ON COLUMN grading_details.total_score IS 'Final calculated score';
COMMENT ON COLUMN grading_details.percentage IS 'Score as percentage';
COMMENT ON COLUMN grading_details.letter_grade IS 'Letter grade (A, B, C, D, F)';

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