-- Simple test data creation script
-- Run this to create the missing course and assignment

-- Check if we have a teacher user (admin or guru)
SELECT id, email, role FROM users WHERE role IN ('admin', 'guru') LIMIT 1;

-- Create a test course with teacher_id = 1 (assuming admin exists)
INSERT INTO courses (name, description, code, teacher_id, created_at)
VALUES ('Introduction to Programming', 'Basic programming concepts', 'PROG01', 1, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING
RETURNING id, name, teacher_id;

-- Get the course ID we just created or that exists
-- Create assignment for the course
INSERT INTO assignments (course_id, title, description, type, due_date, max_score, status, created_at)
VALUES (
    (SELECT id FROM courses WHERE code = 'PROG01' LIMIT 1),
    'Programming Assignment 1', 
    'Write a simple program',
    'essay',
    CURRENT_TIMESTAMP + INTERVAL '7 days',
    100,
    'active',
    CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING
RETURNING id, course_id, title;

-- Enroll user 4 (siswa) in the course
INSERT INTO course_enrollments (course_id, user_id, enrollment_date, status)
VALUES (
    (SELECT id FROM courses WHERE code = 'PROG01' LIMIT 1),
    4,
    CURRENT_TIMESTAMP,
    'active'
)
ON CONFLICT DO NOTHING
RETURNING id, course_id, user_id;

-- Show final setup
SELECT 'Final verification:' as info;
SELECT c.id as course_id, c.name as course_name, c.teacher_id,
       a.id as assignment_id, a.title as assignment_title,
       ce.user_id as enrolled_student, u.email as student_email
FROM courses c
LEFT JOIN assignments a ON c.id = a.course_id  
LEFT JOIN course_enrollments ce ON c.id = ce.course_id
LEFT JOIN users u ON ce.user_id = u.id
WHERE c.code = 'PROG01';