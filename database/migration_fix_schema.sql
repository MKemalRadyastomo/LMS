-- Migration to fix assignment_submissions table schema
-- Run this script to add missing columns

-- Create course_enrollments table if it doesn't exist (fix table name issue)
CREATE TABLE IF NOT EXISTS course_enrollments (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active'
);

-- Migrate data from class_enrollments to course_enrollments if class_enrollments exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'class_enrollments') THEN
        INSERT INTO course_enrollments (course_id, user_id, enrollment_date, status)
        SELECT class_id, user_id, enrollment_date, status 
        FROM class_enrollments
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Add missing timestamp columns to assignment_submissions table
ALTER TABLE assignment_submissions 
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
    -- Check if foreign key constraint for assignment_id exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_assignment_submissions_assignment_id' 
        AND table_name = 'assignment_submissions'
    ) THEN
        ALTER TABLE assignment_submissions 
        ADD CONSTRAINT fk_assignment_submissions_assignment_id 
        FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE;
    END IF;

    -- Check if foreign key constraint for student_id exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_assignment_submissions_student_id' 
        AND table_name = 'assignment_submissions'
    ) THEN
        ALTER TABLE assignment_submissions 
        ADD CONSTRAINT fk_assignment_submissions_student_id 
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;

    -- Check if foreign key constraint for course_id in assignments exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_assignments_course_id' 
        AND table_name = 'assignments'
    ) THEN
        ALTER TABLE assignments 
        ADD CONSTRAINT fk_assignments_course_id 
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
    END IF;

    -- Check if foreign key constraint for teacher_id in courses exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_courses_teacher_id' 
        AND table_name = 'courses'
    ) THEN
        ALTER TABLE courses 
        ADD CONSTRAINT fk_courses_teacher_id 
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE RESTRICT;
    END IF;

    -- Check if foreign key constraint for course_enrollments exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_course_enrollments_course_id' 
        AND table_name = 'course_enrollments'
    ) THEN
        ALTER TABLE course_enrollments 
        ADD CONSTRAINT fk_course_enrollments_course_id 
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_course_enrollments_user_id' 
        AND table_name = 'course_enrollments'
    ) THEN
        ALTER TABLE course_enrollments 
        ADD CONSTRAINT fk_course_enrollments_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Update existing records to have proper timestamps if they don't already have them
UPDATE assignment_submissions 
SET submitted_at = CURRENT_TIMESTAMP 
WHERE submitted_at IS NULL;

UPDATE assignment_submissions 
SET created_at = CURRENT_TIMESTAMP 
WHERE created_at IS NULL;

UPDATE assignment_submissions 
SET updated_at = CURRENT_TIMESTAMP 
WHERE updated_at IS NULL;

-- Insert test enrollment for user 4 (siswa) in course 1 if not exists
INSERT INTO course_enrollments (course_id, user_id, enrollment_date, status)
SELECT 1, 4, CURRENT_TIMESTAMP, 'active'
WHERE NOT EXISTS (
    SELECT 1 FROM course_enrollments 
    WHERE course_id = 1 AND user_id = 4
);

-- Display current status
SELECT 'Migration completed successfully' as status;