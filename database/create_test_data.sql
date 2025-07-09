-- Check existing data and create test data if needed

-- 1. Check what users exist
SELECT id, email, name, role FROM users ORDER BY id;

-- 2. Check what courses exist  
SELECT id, name, teacher_id, code FROM courses ORDER BY id;

-- 3. Check what assignments exist
SELECT id, course_id, title, type FROM assignments ORDER BY id;

-- 4. Check enrollments
SELECT * FROM course_enrollments ORDER BY id;

-- 5. Create test course if none exist
INSERT INTO courses (id, name, description, code, teacher_id, created_at)
SELECT 1, 'Test Course 1', 'A test course for development', 'TEST01', 1, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE id = 1);

-- 6. Create test assignment if none exist  
INSERT INTO assignments (id, course_id, title, description, type, due_date, max_score, status, created_at)
SELECT 1, 1, 'Test Assignment 1', 'A test assignment for development', 'essay', 
       CURRENT_TIMESTAMP + INTERVAL '7 days', 100, 'active', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM assignments WHERE id = 1);

-- 7. Now try to create the enrollment
INSERT INTO course_enrollments (course_id, user_id, enrollment_date, status)
SELECT 1, 4, CURRENT_TIMESTAMP, 'active'
WHERE NOT EXISTS (
    SELECT 1 FROM course_enrollments 
    WHERE course_id = 1 AND user_id = 4
);

-- 8. Verify the setup
SELECT 'Data verification:' as section;
SELECT 'Users:' as type, count(*) as count FROM users
UNION ALL
SELECT 'Courses:', count(*) FROM courses  
UNION ALL
SELECT 'Assignments:', count(*) FROM assignments
UNION ALL
SELECT 'Enrollments:', count(*) FROM course_enrollments;

-- 9. Show the specific data for our test
SELECT 'Test setup verification:' as section;
SELECT u.id as user_id, u.email, u.role, c.id as course_id, c.name as course_name, 
       ce.status as enrollment_status, a.id as assignment_id, a.title as assignment_title
FROM users u
LEFT JOIN course_enrollments ce ON u.id = ce.user_id
LEFT JOIN courses c ON ce.course_id = c.id  
LEFT JOIN assignments a ON c.id = a.course_id
WHERE u.id = 4 OR u.role = 'admin'
ORDER BY u.id;