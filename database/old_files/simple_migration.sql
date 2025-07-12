-- Simple migration commands to run individually if needed

-- 1. Create course_enrollments table
CREATE TABLE IF NOT EXISTS course_enrollments (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active'
);

-- 2. Add missing columns to assignment_submissions
ALTER TABLE assignment_submissions 
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE assignment_submissions 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE assignment_submissions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 3. Insert test enrollment for user 4 in course 1
INSERT INTO course_enrollments (course_id, user_id, enrollment_date, status)
VALUES (1, 4, CURRENT_TIMESTAMP, 'active')
ON CONFLICT DO NOTHING;

-- 4. Update existing assignment_submissions with timestamps
UPDATE assignment_submissions 
SET submitted_at = CURRENT_TIMESTAMP 
WHERE submitted_at IS NULL;

UPDATE assignment_submissions 
SET created_at = CURRENT_TIMESTAMP 
WHERE created_at IS NULL;

UPDATE assignment_submissions 
SET updated_at = CURRENT_TIMESTAMP 
WHERE updated_at IS NULL;