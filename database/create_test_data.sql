-- =====================================================
-- LMS Database Test Data Creation Script
-- =====================================================
-- This script creates comprehensive test data for the LMS
-- All passwords hash to 'password123'
-- 
-- Usage: psql -d your_database -f database/create_test_data.sql
-- =====================================================

-- Clear existing data (optional - uncomment if needed)
-- TRUNCATE TABLE activity_logs CASCADE;
-- TRUNCATE TABLE assignment_notifications CASCADE;
-- TRUNCATE TABLE notification_delivery_log CASCADE;
-- TRUNCATE TABLE notifications CASCADE;
-- TRUNCATE TABLE notification_preferences CASCADE;
-- TRUNCATE TABLE plagiarism_reports CASCADE;
-- TRUNCATE TABLE assignment_analytics CASCADE;
-- TRUNCATE TABLE late_submissions CASCADE;
-- TRUNCATE TABLE automated_grading CASCADE;
-- TRUNCATE TABLE submission_scores CASCADE;
-- TRUNCATE TABLE submission_files CASCADE;
-- TRUNCATE TABLE submission_versions CASCADE;
-- TRUNCATE TABLE assignment_submissions CASCADE;
-- TRUNCATE TABLE grading_criteria CASCADE;
-- TRUNCATE TABLE grading_rubrics CASCADE;
-- TRUNCATE TABLE assignments CASCADE;
-- TRUNCATE TABLE assignment_templates CASCADE;
-- TRUNCATE TABLE materials CASCADE;
-- TRUNCATE TABLE course_contents CASCADE;
-- TRUNCATE TABLE course_enrollments CASCADE;
-- TRUNCATE TABLE courses CASCADE;
-- TRUNCATE TABLE user_statistics CASCADE;
-- TRUNCATE TABLE course_analytics CASCADE;
-- TRUNCATE TABLE system_analytics CASCADE;
-- TRUNCATE TABLE user_sessions CASCADE;
-- TRUNCATE TABLE failed_login_attempts CASCADE;
-- TRUNCATE TABLE grading_details CASCADE;
-- TRUNCATE TABLE users CASCADE;

-- =====================================================
-- TEST USERS
-- =====================================================
-- Password hash for 'password123' using bcrypt with salt $2a$10$
-- Hash: $2a$10$t37wSRokkwpx1OzhtMxjNuITPX1SxepaPBzPdLBtlos6KGQuKzSEG

INSERT INTO users (email, password_hash, name, role, created_at) VALUES 
-- Admin users
('admin@lms.edu', '$2a$10$t37wSRokkwpx1OzhtMxjNuITPX1SxepaPBzPdLBtlos6KGQuKzSEG', 'System Administrator', 'admin', '2024-01-01 08:00:00'),
('superadmin@lms.edu', '$2a$10$t37wSRokkwpx1OzhtMxjNuITPX1SxepaPBzPdLBtlos6KGQuKzSEG', 'Super Admin', 'admin', '2024-01-01 08:00:00'),

-- Teacher users (guru)
('john.smith@lms.edu', '$2a$10$t37wSRokkwpx1OzhtMxjNuITPX1SxepaPBzPdLBtlos6KGQuKzSEG', 'Dr. John Smith', 'guru', '2024-01-02 09:00:00'),
('sarah.johnson@lms.edu', '$2a$10$t37wSRokkwpx1OzhtMxjNuITPX1SxepaPBzPdLBtlos6KGQuKzSEG', 'Prof. Sarah Johnson', 'guru', '2024-01-02 09:15:00'),
('michael.brown@lms.edu', '$2a$10$t37wSRokkwpx1OzhtMxjNuITPX1SxepaPBzPdLBtlos6KGQuKzSEG', 'Dr. Michael Brown', 'guru', '2024-01-02 09:30:00'),
('emily.davis@lms.edu', '$2a$10$t37wSRokkwpx1OzhtMxjNuITPX1SxepaPBzPdLBtlos6KGQuKzSEG', 'Prof. Emily Davis', 'guru', '2024-01-02 09:45:00'),

-- Student users (siswa)
('alice.wilson@student.lms.edu', '$2a$10$t37wSRokkwpx1OzhtMxjNuITPX1SxepaPBzPdLBtlos6KGQuKzSEG', 'Alice Wilson', 'siswa', '2024-01-03 10:00:00'),
('bob.garcia@student.lms.edu', '$2a$10$t37wSRokkwpx1OzhtMxjNuITPX1SxepaPBzPdLBtlos6KGQuKzSEG', 'Bob Garcia', 'siswa', '2024-01-03 10:15:00'),
('charlie.martinez@student.lms.edu', '$2a$10$t37wSRokkwpx1OzhtMxjNuITPX1SxepaPBzPdLBtlos6KGQuKzSEG', 'Charlie Martinez', 'siswa', '2024-01-03 10:30:00'),
('diana.lopez@student.lms.edu', '$2a$10$t37wSRokkwpx1OzhtMxjNuITPX1SxepaPBzPdLBtlos6KGQuKzSEG', 'Diana Lopez', 'siswa', '2024-01-03 10:45:00'),
('ethan.anderson@student.lms.edu', '$2a$10$t37wSRokkwpx1OzhtMxjNuITPX1SxepaPBzPdLBtlos6KGQuKzSEG', 'Ethan Anderson', 'siswa', '2024-01-03 11:00:00'),
('fiona.taylor@student.lms.edu', '$2a$10$t37wSRokkwpx1OzhtMxjNuITPX1SxepaPBzPdLBtlos6KGQuKzSEG', 'Fiona Taylor', 'siswa', '2024-01-03 11:15:00'),
('george.thomas@student.lms.edu', '$2a$10$t37wSRokkwpx1OzhtMxjNuITPX1SxepaPBzPdLBtlos6KGQuKzSEG', 'George Thomas', 'siswa', '2024-01-03 11:30:00'),
('hannah.jackson@student.lms.edu', '$2a$10$t37wSRokkwpx1OzhtMxjNuITPX1SxepaPBzPdLBtlos6KGQuKzSEG', 'Hannah Jackson', 'siswa', '2024-01-03 11:45:00'),
('ivan.white@student.lms.edu', '$2a$10$t37wSRokkwpx1OzhtMxjNuITPX1SxepaPBzPdLBtlos6KGQuKzSEG', 'Ivan White', 'siswa', '2024-01-03 12:00:00'),
('jessica.harris@student.lms.edu', '$2a$10$t37wSRokkwpx1OzhtMxjNuITPX1SxepaPBzPdLBtlos6KGQuKzSEG', 'Jessica Harris', 'siswa', '2024-01-03 12:15:00'),
('kevin.clark@student.lms.edu', '$2a$10$t37wSRokkwpx1OzhtMxjNuITPX1SxepaPBzPdLBtlos6KGQuKzSEG', 'Kevin Clark', 'siswa', '2024-01-03 12:30:00'),
('laura.lewis@student.lms.edu', '$2a$10$t37wSRokkwpx1OzhtMxjNuITPX1SxepaPBzPdLBtlos6KGQuKzSEG', 'Laura Lewis', 'siswa', '2024-01-03 12:45:00');

-- =====================================================
-- ASSIGNMENT TEMPLATES
-- =====================================================

INSERT INTO assignment_templates (name, description, type, template_data, instructions, default_max_score, created_by, is_public, usage_count, created_at) VALUES 
('Essay Template', 'Standard essay assignment template', 'essay', '{"wordCount": {"min": 500, "max": 1500}, "format": "academic", "citations": true}', 'Write a well-structured essay following academic writing standards. Include proper citations and references.', 100, 3, true, 5, '2024-01-05 09:00:00'),

('Multiple Choice Quiz', 'Basic multiple choice quiz template', 'quiz', '{"questionTypes": ["multiple_choice"], "timeLimit": 30, "shuffleQuestions": true}', 'Complete the quiz within the time limit. Each question has only one correct answer.', 50, 3, true, 8, '2024-01-05 09:15:00'),

('File Upload Assignment', 'Template for file submission assignments', 'file_upload', '{"allowedTypes": [".pdf", ".doc", ".docx"], "maxFileSize": 10, "multipleFiles": false}', 'Upload your completed assignment as a PDF or Word document. Maximum file size: 10MB.', 100, 4, true, 3, '2024-01-05 09:30:00'),

('Lab Report Template', 'Template for scientific lab reports', 'mixed', '{"components": ["theory", "procedure", "results", "analysis"], "format": "scientific"}', 'Submit a complete lab report including theoretical background, experimental procedure, results, and analysis.', 100, 5, true, 2, '2024-01-05 09:45:00');

-- =====================================================
-- TEST COURSES
-- =====================================================

INSERT INTO courses (name, description, privacy, status, code, class_code, teacher_id, is_active, created_at) VALUES 
('Introduction to Computer Science', 'Fundamental concepts of computer science including programming basics, data structures, and algorithms.', 'public', 'active', 'CS101', 'CS101A', 3, true, '2024-01-10 08:00:00'),

('Advanced Mathematics', 'Calculus, linear algebra, and differential equations for engineering students.', 'public', 'active', 'MA301', 'MATH301B', 4, true, '2024-01-10 08:30:00'),

('Digital Marketing Strategies', 'Modern digital marketing techniques including SEO, social media, and content marketing.', 'private', 'active', 'MK201', 'MKT201C', 5, true, '2024-01-10 09:00:00'),

('Data Science Fundamentals', 'Introduction to data science, statistics, and machine learning concepts.', 'public', 'active', 'DS200', 'DS200D', 3, true, '2024-01-10 09:30:00'),

('Web Development Workshop', 'Hands-on web development using HTML, CSS, JavaScript, and modern frameworks.', 'public', 'active', 'WB150', 'WEB150E', 6, true, '2024-01-10 10:00:00'),

('Database Management Systems', 'Database design, SQL, and database administration concepts.', 'public', 'draft', 'DB300', 'DB300F', 4, false, '2024-01-10 10:30:00'),

('Project Management Essentials', 'Project management methodologies, tools, and best practices.', 'private', 'archived', 'PM100', 'PM100G', 5, false, '2024-01-10 11:00:00');

-- =====================================================
-- COURSE ENROLLMENTS
-- =====================================================

INSERT INTO course_enrollments (course_id, user_id, enrollment_date, enrollment_method, status, created_at) VALUES 
-- CS101 enrollments
(1, 7, '2024-01-15 10:00:00', 'code', 'active', '2024-01-15 10:00:00'),
(1, 8, '2024-01-15 10:15:00', 'code', 'active', '2024-01-15 10:15:00'),
(1, 9, '2024-01-15 10:30:00', 'manual', 'active', '2024-01-15 10:30:00'),
(1, 10, '2024-01-15 10:45:00', 'code', 'active', '2024-01-15 10:45:00'),
(1, 11, '2024-01-15 11:00:00', 'code', 'active', '2024-01-15 11:00:00'),
(1, 12, '2024-01-15 11:15:00', 'manual', 'active', '2024-01-15 11:15:00'),

-- MATH301 enrollments
(2, 7, '2024-01-16 09:00:00', 'manual', 'active', '2024-01-16 09:00:00'),
(2, 9, '2024-01-16 09:15:00', 'code', 'active', '2024-01-16 09:15:00'),
(2, 11, '2024-01-16 09:30:00', 'code', 'active', '2024-01-16 09:30:00'),
(2, 13, '2024-01-16 09:45:00', 'manual', 'active', '2024-01-16 09:45:00'),
(2, 15, '2024-01-16 10:00:00', 'code', 'active', '2024-01-16 10:00:00'),

-- MKT201 enrollments
(3, 8, '2024-01-17 14:00:00', 'manual', 'active', '2024-01-17 14:00:00'),
(3, 10, '2024-01-17 14:15:00', 'manual', 'active', '2024-01-17 14:15:00'),
(3, 12, '2024-01-17 14:30:00', 'manual', 'active', '2024-01-17 14:30:00'),
(3, 14, '2024-01-17 14:45:00', 'manual', 'active', '2024-01-17 14:45:00'),

-- DS200 enrollments
(4, 7, '2024-01-18 13:00:00', 'code', 'active', '2024-01-18 13:00:00'),
(4, 8, '2024-01-18 13:15:00', 'code', 'active', '2024-01-18 13:15:00'),
(4, 11, '2024-01-18 13:30:00', 'manual', 'active', '2024-01-18 13:30:00'),
(4, 13, '2024-01-18 13:45:00', 'code', 'active', '2024-01-18 13:45:00'),
(4, 16, '2024-01-18 14:00:00', 'code', 'active', '2024-01-18 14:00:00'),
(4, 17, '2024-01-18 14:15:00', 'manual', 'active', '2024-01-18 14:15:00'),

-- WEB150 enrollments
(5, 9, '2024-01-19 15:00:00', 'code', 'active', '2024-01-19 15:00:00'),
(5, 10, '2024-01-19 15:15:00', 'code', 'active', '2024-01-19 15:15:00'),
(5, 12, '2024-01-19 15:30:00', 'manual', 'active', '2024-01-19 15:30:00'),
(5, 14, '2024-01-19 15:45:00', 'code', 'active', '2024-01-19 15:45:00'),
(5, 18, '2024-01-19 16:00:00', 'code', 'active', '2024-01-19 16:00:00');

-- =====================================================
-- COURSE MATERIALS
-- =====================================================

INSERT INTO materials (course_id, title, description, content, file_path, video_url, publish_date, created_at) VALUES 
-- CS101 Materials
(1, 'Course Introduction', 'Welcome to Computer Science 101', 'This course will introduce you to fundamental concepts in computer science. We will cover programming basics, problem-solving techniques, and computational thinking.', '/course_materials/cs101/intro.pdf', 'https://video.lms.edu/cs101/intro', '2024-01-20 08:00:00', '2024-01-20 08:00:00'),

(1, 'Programming Basics - Variables and Data Types', 'Introduction to programming concepts', 'Learn about variables, data types, and basic programming constructs. This lesson covers integers, strings, booleans, and how to use them in your programs.', '/course_materials/cs101/variables.pdf', 'https://video.lms.edu/cs101/variables', '2024-01-22 08:00:00', '2024-01-22 08:00:00'),

(1, 'Control Structures', 'Loops and conditional statements', 'Master control flow in programming with if-else statements, for loops, and while loops. Practice with real-world examples and exercises.', '/course_materials/cs101/control.pdf', 'https://video.lms.edu/cs101/control', '2024-01-25 08:00:00', '2024-01-25 08:00:00'),

-- MATH301 Materials
(2, 'Calculus Review', 'Quick review of calculus fundamentals', 'Review of differential and integral calculus concepts essential for advanced mathematics. Includes limits, derivatives, and integration techniques.', '/course_materials/math301/calculus_review.pdf', null, '2024-01-21 09:00:00', '2024-01-21 09:00:00'),

(2, 'Linear Algebra Fundamentals', 'Vectors, matrices, and linear transformations', 'Comprehensive introduction to linear algebra including vector spaces, matrix operations, eigenvalues, and eigenvectors.', '/course_materials/math301/linear_algebra.pdf', 'https://video.lms.edu/math301/linear', '2024-01-24 09:00:00', '2024-01-24 09:00:00'),

-- MKT201 Materials
(3, 'Digital Marketing Overview', 'Introduction to digital marketing landscape', 'Explore the digital marketing ecosystem, key channels, and measurement strategies. Understand how digital marketing fits into overall marketing strategy.', '/course_materials/mkt201/overview.pdf', 'https://video.lms.edu/mkt201/overview', '2024-01-23 14:00:00', '2024-01-23 14:00:00'),

(3, 'SEO Best Practices', 'Search Engine Optimization techniques', 'Learn on-page and off-page SEO strategies to improve website visibility. Cover keyword research, content optimization, and link building.', '/course_materials/mkt201/seo.pdf', null, '2024-01-26 14:00:00', '2024-01-26 14:00:00'),

-- DS200 Materials
(4, 'Introduction to Data Science', 'What is data science?', 'Overview of data science field, methodologies, and applications across industries. Introduction to the data science process and key tools.', '/course_materials/ds200/intro.pdf', 'https://video.lms.edu/ds200/intro', '2024-01-24 13:00:00', '2024-01-24 13:00:00'),

(4, 'Statistics for Data Science', 'Statistical concepts and methods', 'Essential statistical concepts including descriptive statistics, probability distributions, hypothesis testing, and confidence intervals.', '/course_materials/ds200/statistics.pdf', 'https://video.lms.edu/ds200/stats', '2024-01-27 13:00:00', '2024-01-27 13:00:00'),

-- WEB150 Materials
(5, 'HTML Fundamentals', 'Building web pages with HTML', 'Learn HTML structure, semantic elements, forms, and best practices for creating accessible web content.', '/course_materials/web150/html.pdf', 'https://video.lms.edu/web150/html', '2024-01-25 15:00:00', '2024-01-25 15:00:00'),

(5, 'CSS Styling and Layout', 'Styling web pages with CSS', 'Master CSS selectors, box model, flexbox, grid, and responsive design principles for modern web development.', '/course_materials/web150/css.pdf', 'https://video.lms.edu/web150/css', '2024-01-28 15:00:00', '2024-01-28 15:00:00');

-- =====================================================
-- ASSIGNMENTS
-- =====================================================

INSERT INTO assignments (course_id, template_id, title, description, instructions, type, due_date, max_score, status, allow_late_submissions, max_late_days, late_submission_penalty, created_at) VALUES 
-- CS101 Assignments
(1, 1, 'Programming Fundamentals Essay', 'Write an essay about the importance of programming in modern society', 'Write a 750-word essay discussing how programming impacts different aspects of modern life. Include specific examples and cite at least 3 reliable sources.', 'essay', '2024-02-10 23:59:59', 100, 'active', true, 3, 10.00, '2024-01-30 10:00:00'),

(1, 2, 'Data Types and Variables Quiz', 'Quiz on programming basics', 'Complete this quiz covering variables, data types, and basic programming concepts. You have 30 minutes to complete 20 questions.', 'quiz', '2024-02-05 23:59:59', 50, 'active', true, 1, 20.00, '2024-01-28 10:00:00'),

(1, 3, 'Simple Calculator Program', 'Build a basic calculator application', 'Create a simple calculator program that can perform basic arithmetic operations. Submit your source code and a brief documentation.', 'file_upload', '2024-02-15 23:59:59', 150, 'active', true, 5, 5.00, '2024-02-01 10:00:00'),

-- MATH301 Assignments
(2, 1, 'Linear Algebra Applications', 'Essay on real-world applications of linear algebra', 'Explore and discuss real-world applications of linear algebra in engineering, computer graphics, or data science. Provide mathematical examples.', 'essay', '2024-02-12 23:59:59', 100, 'active', true, 2, 15.00, '2024-01-29 11:00:00'),

(2, 2, 'Matrix Operations Quiz', 'Test your matrix calculation skills', 'Complete problems involving matrix multiplication, determinants, and inverse matrices. Show all work for partial credit.', 'quiz', '2024-02-08 23:59:59', 75, 'active', false, 0, 0.00, '2024-01-31 11:00:00'),

-- MKT201 Assignments
(3, 1, 'Digital Marketing Strategy Analysis', 'Analyze a company digital marketing strategy', 'Choose a company and analyze their digital marketing strategy. Evaluate their use of different channels and suggest improvements.', 'essay', '2024-02-14 23:59:59', 120, 'active', true, 3, 10.00, '2024-02-01 14:00:00'),

(3, 3, 'SEO Audit Report', 'Conduct an SEO audit of a website', 'Perform a comprehensive SEO audit of a website of your choice. Submit a detailed report with recommendations for improvement.', 'file_upload', '2024-02-18 23:59:59', 100, 'active', true, 2, 12.50, '2024-02-02 14:00:00'),

-- DS200 Assignments
(4, 4, 'Data Analysis Project', 'Complete data analysis using provided dataset', 'Analyze the provided sales dataset and create visualizations. Submit your code, analysis report, and presentation slides.', 'mixed', '2024-02-20 23:59:59', 150, 'active', true, 4, 8.00, '2024-02-03 13:00:00'),

(4, 2, 'Statistics Fundamentals Quiz', 'Test your statistics knowledge', 'Quiz covering probability, distributions, and hypothesis testing. Includes both theoretical questions and practical problems.', 'quiz', '2024-02-09 23:59:59', 60, 'active', true, 1, 25.00, '2024-02-01 13:00:00'),

-- WEB150 Assignments
(5, 3, 'Personal Portfolio Website', 'Create your personal portfolio website', 'Build a responsive personal portfolio website using HTML, CSS, and JavaScript. Include sections for about, projects, and contact information.', 'file_upload', '2024-02-22 23:59:59', 200, 'active', true, 7, 5.00, '2024-02-05 15:00:00'),

(5, 2, 'HTML/CSS Knowledge Check', 'Quick assessment of HTML and CSS skills', 'Multiple choice and short answer questions covering HTML structure, CSS selectors, and responsive design principles.', 'quiz', '2024-02-11 23:59:59', 40, 'active', true, 2, 15.00, '2024-02-03 15:00:00');

-- =====================================================
-- ASSIGNMENT SUBMISSIONS
-- =====================================================

INSERT INTO assignment_submissions (assignment_id, student_id, submission_text, file_path, grade, feedback, status, graded_by, created_at, graded_at) VALUES 
-- CS101 Submissions
(1, 7, 'Programming has revolutionized modern society in countless ways. From the smartphones we carry to the cars we drive, programming forms the backbone of our digital world...', null, 85, 'Good analysis of programming impact. Could benefit from more specific examples in healthcare and finance sectors. Well-structured arguments.', 'graded', 3, '2024-02-08 14:30:00', '2024-02-12 09:15:00'),

(1, 8, 'In today digital age, programming is not just a technical skill but a fundamental literacy. It enables automation, creates new possibilities for communication...', null, 92, 'Excellent essay with comprehensive coverage of programming applications. Strong use of examples and well-cited sources. Great work!', 'graded', 3, '2024-02-09 16:45:00', '2024-02-12 10:20:00'),

(1, 9, 'Programming languages serve as the bridge between human ideas and computer execution. The importance of programming extends beyond software development...', null, 78, 'Good understanding of the topic. Some arguments could be stronger with more supporting evidence. Check grammar and sentence structure.', 'graded', 3, '2024-02-10 20:15:00', '2024-02-13 11:30:00'),

(2, 7, null, null, 42, 'Good understanding of basic concepts. Review array handling and loop structures for better performance.', 'graded', 3, '2024-02-04 19:20:00', '2024-02-06 08:45:00'),

(2, 8, null, null, 48, 'Excellent work! Strong grasp of data types and variable scope. Perfect score on advanced questions.', 'graded', 3, '2024-02-05 10:30:00', '2024-02-06 09:15:00'),

(2, 9, null, null, 35, 'Need to review basic programming concepts. Focus on variable declaration and type conversion. Office hours recommended.', 'graded', 3, '2024-02-05 22:45:00', '2024-02-07 14:20:00'),

-- MATH301 Submissions
(4, 7, 'Linear algebra finds extensive applications in computer graphics, particularly in 3D transformations and rendering. Matrix operations enable efficient rotation, scaling, and translation...', null, 88, 'Strong mathematical foundation and good real-world connections. Include more detailed calculations in your examples.', 'graded', 4, '2024-02-11 13:45:00', '2024-02-14 16:30:00'),

(4, 9, 'The applications of linear algebra in machine learning are profound and numerous. From principal component analysis to neural network computations...', null, 95, 'Outstanding analysis! Excellent mathematical rigor combined with practical applications. Perfect integration of theory and practice.', 'graded', 4, '2024-02-12 09:20:00', '2024-02-15 10:15:00'),

(5, 7, null, null, 68, 'Good work on basic matrix operations. Review eigenvalue calculations and double-check arithmetic in complex problems.', 'graded', 4, '2024-02-07 17:30:00', '2024-02-09 11:45:00'),

(5, 9, null, null, 72, 'Solid understanding of matrix operations. Minor errors in determinant calculations. Overall good performance.', 'graded', 4, '2024-02-08 14:15:00', '2024-02-09 12:30:00'),

-- MKT201 Submissions
(6, 8, 'Nike digital marketing strategy demonstrates a masterful integration of social media, content marketing, and influencer partnerships. Their approach to storytelling...', null, null, null, 'submitted', null, '2024-02-13 21:30:00', null),

(6, 10, 'Apple marketing strategy focuses heavily on brand experience and emotional connection. Their minimalist approach to digital advertising reflects their product design philosophy...', null, null, null, 'submitted', null, '2024-02-14 16:45:00', null),

-- DS200 Submissions  
(9, 7, null, null, null, null, 'submitted', null, '2024-02-08 19:15:00', null),

(9, 8, null, null, 55, 'Good understanding of probability concepts. Review confidence interval calculations and hypothesis testing procedures.', 'graded', 3, '2024-02-09 11:30:00', '2024-02-11 14:20:00'),

-- WEB150 Submissions
(11, 9, null, null, 35, 'Basic HTML structure is correct but CSS styling needs improvement. Focus on responsive design principles and accessibility.', 'graded', 6, '2024-02-10 20:45:00', '2024-02-13 16:30:00'),

(11, 10, null, null, 38, 'Good quiz performance overall. Review CSS flexbox and grid concepts. Strong understanding of HTML semantics.', 'graded', 6, '2024-02-11 15:20:00', '2024-02-13 17:15:00');

-- =====================================================
-- GRADING RUBRICS
-- =====================================================

INSERT INTO grading_rubrics (assignment_id, name, total_points, criteria) VALUES 
(1, 'Essay Grading Rubric', 100, '{"criteria": [
    {"name": "Content Quality", "points": 40, "description": "Depth of analysis and understanding"},
    {"name": "Organization", "points": 25, "description": "Logical structure and flow"},
    {"name": "Citations and Sources", "points": 20, "description": "Proper use and citation of sources"},
    {"name": "Grammar and Style", "points": 15, "description": "Writing quality and mechanics"}
]}'),

(3, 'Programming Assignment Rubric', 150, '{"criteria": [
    {"name": "Functionality", "points": 60, "description": "Program works correctly and meets requirements"},
    {"name": "Code Quality", "points": 40, "description": "Clean, readable, and well-structured code"},
    {"name": "Documentation", "points": 30, "description": "Clear comments and documentation"},
    {"name": "Testing", "points": 20, "description": "Adequate testing and error handling"}
]}'),

(8, 'Data Analysis Project Rubric', 150, '{"criteria": [
    {"name": "Data Analysis", "points": 50, "description": "Correct statistical analysis and interpretation"},
    {"name": "Visualizations", "points": 40, "description": "Clear and informative data visualizations"},
    {"name": "Code Quality", "points": 35, "description": "Clean and documented code"},
    {"name": "Report Writing", "points": 25, "description": "Clear communication of findings"}
]}');

-- =====================================================
-- NOTIFICATION PREFERENCES (for existing users)
-- =====================================================

INSERT INTO notification_preferences (user_id, email_enabled, email_frequency, push_assignments, push_grades, push_course_updates) VALUES 
(3, true, 'immediate', true, true, true),
(4, true, 'daily', true, true, false),
(5, true, 'immediate', true, true, true),
(6, false, 'never', false, false, false),
(7, true, 'immediate', true, true, true),
(8, true, 'immediate', true, true, true),
(9, true, 'daily', true, true, false),
(10, true, 'immediate', true, false, true),
(11, true, 'weekly', false, true, true),
(12, true, 'immediate', true, true, true),
(13, true, 'daily', true, true, true),
(14, true, 'immediate', true, true, false),
(15, true, 'immediate', true, true, true),
(16, true, 'daily', true, false, true),
(17, true, 'immediate', true, true, true),
(18, true, 'immediate', true, true, true);

-- =====================================================
-- SAMPLE NOTIFICATIONS
-- =====================================================

INSERT INTO notifications (user_id, title, message, type, priority, status, related_type, related_id, action_url, sent_at, created_at) VALUES 
(7, 'New Assignment: Programming Fundamentals Essay', 'A new assignment "Programming Fundamentals Essay" has been created in Introduction to Computer Science. Due date: February 10, 2024.', 'assignment', 'medium', 'read', 'assignment', 1, '/assignments/1', '2024-01-30 10:15:00', '2024-01-30 10:15:00'),

(8, 'Assignment Graded: Data Types and Variables Quiz', 'Your assignment "Data Types and Variables Quiz" has been graded. Score: 48/50.', 'assignment', 'medium', 'read', 'assignment', 2, '/assignments/2/results', '2024-02-06 09:30:00', '2024-02-06 09:30:00'),

(7, 'Assignment Due Soon: Simple Calculator Program', 'Your assignment "Simple Calculator Program" is due February 15, 2024. Don''t forget to submit!', 'assignment', 'high', 'unread', 'assignment', 3, '/assignments/3', '2024-02-13 08:00:00', '2024-02-13 08:00:00'),

(9, 'New Material: Control Structures', 'New learning material "Control Structures" has been added to Introduction to Computer Science.', 'course', 'low', 'unread', 'material', 3, '/courses/1/materials/3', '2024-01-25 08:15:00', '2024-01-25 08:15:00'),

(10, 'Enrolled in Course: Digital Marketing Strategies', 'You have been successfully enrolled in "Digital Marketing Strategies".', 'course', 'medium', 'read', 'course', 3, '/courses/3', '2024-01-17 14:20:00', '2024-01-17 14:20:00');

-- =====================================================
-- SAMPLE ACTIVITY LOGS
-- =====================================================

INSERT INTO activity_logs (user_id, course_id, activity_type, action_type, entity_type, entity_id, description, metadata, created_at) VALUES 
(3, 1, 'assignment_created', 'created', 'assignment', 1, 'Created assignment "Programming Fundamentals Essay"', '{"assignment_title": "Programming Fundamentals Essay", "due_date": "2024-02-10T23:59:59"}', '2024-01-30 10:00:00'),

(7, 1, 'assignment_submitted', 'submitted', 'submission', 1, 'Submitted assignment "Programming Fundamentals Essay"', '{"assignment_id": 1, "submission_method": "text"}', '2024-02-08 14:30:00'),

(3, 1, 'assignment_graded', 'graded', 'submission', 1, 'Graded submission for "Programming Fundamentals Essay"', '{"assignment_id": 1, "student_id": 7, "grade": 85}', '2024-02-12 09:15:00'),

(4, 2, 'material_created', 'created', 'material', 4, 'Added material "Calculus Review"', '{"material_title": "Calculus Review"}', '2024-01-21 09:00:00'),

(9, 2, 'material_viewed', 'viewed', 'material', 5, 'Viewed material "Linear Algebra Fundamentals"', '{"material_id": 5, "view_duration": 1200}', '2024-01-24 14:30:00'),

(8, 3, 'course_enrolled', 'enrolled', 'enrollment', 8, 'Enrolled in course "Digital Marketing Strategies"', '{"enrollment_method": "manual"}', '2024-01-17 14:00:00'),

(5, 3, 'assignment_created', 'created', 'assignment', 6, 'Created assignment "Digital Marketing Strategy Analysis"', '{"assignment_title": "Digital Marketing Strategy Analysis", "due_date": "2024-02-14T23:59:59"}', '2024-02-01 14:00:00');

-- =====================================================
-- USER STATISTICS
-- =====================================================

INSERT INTO user_statistics (user_id, courses_enrolled, assignments_completed, average_grade, total_study_time, last_activity, updated_at) VALUES 
(7, 3, 4, 75.25, 1440, '2024-02-13 16:30:00', '2024-02-13 16:30:00'),
(8, 3, 3, 86.33, 960, '2024-02-12 11:45:00', '2024-02-12 11:45:00'),
(9, 4, 3, 81.67, 1200, '2024-02-11 19:20:00', '2024-02-11 19:20:00'),
(10, 3, 1, 85.00, 480, '2024-02-14 16:45:00', '2024-02-14 16:45:00'),
(11, 3, 0, null, 240, '2024-02-10 14:15:00', '2024-02-10 14:15:00'),
(12, 3, 0, null, 180, '2024-02-09 10:30:00', '2024-02-09 10:30:00'),
(13, 2, 0, null, 120, '2024-02-08 15:45:00', '2024-02-08 15:45:00'),
(14, 2, 0, null, 360, '2024-02-13 12:20:00', '2024-02-13 12:20:00'),
(15, 1, 0, null, 60, '2024-02-07 16:00:00', '2024-02-07 16:00:00'),
(16, 1, 0, null, 90, '2024-02-12 13:45:00', '2024-02-12 13:45:00'),
(17, 1, 0, null, 150, '2024-02-11 17:30:00', '2024-02-11 17:30:00'),
(18, 1, 0, null, 200, '2024-02-13 18:15:00', '2024-02-13 18:15:00');

-- =====================================================
-- COURSE ANALYTICS
-- =====================================================

INSERT INTO course_analytics (course_id, total_students, completed_assignments, average_completion_rate, average_grade, updated_at) VALUES 
(1, 6, 12, 66.67, 80.25, '2024-02-13 18:00:00'),
(2, 5, 6, 60.00, 83.75, '2024-02-13 18:00:00'),
(3, 4, 2, 25.00, 85.00, '2024-02-13 18:00:00'),
(4, 6, 2, 16.67, 55.00, '2024-02-13 18:00:00'),
(5, 5, 2, 20.00, 36.50, '2024-02-13 18:00:00');

-- =====================================================
-- SYSTEM ANALYTICS
-- =====================================================

INSERT INTO system_analytics (date, total_users, active_users, total_courses, total_assignments, total_submissions, average_grade, metrics) VALUES 
('2024-02-01', 18, 12, 7, 8, 15, 78.5, '{"new_enrollments": 5, "materials_viewed": 23, "notifications_sent": 12}'),
('2024-02-02', 18, 14, 7, 9, 16, 79.2, '{"new_enrollments": 2, "materials_viewed": 31, "notifications_sent": 8}'),
('2024-02-03', 18, 13, 7, 11, 16, 79.2, '{"new_enrollments": 0, "materials_viewed": 28, "notifications_sent": 15}'),
('2024-02-04', 18, 15, 7, 11, 17, 76.8, '{"new_enrollments": 1, "materials_viewed": 35, "notifications_sent": 6}'),
('2024-02-05', 18, 16, 7, 11, 19, 78.1, '{"new_enrollments": 0, "materials_viewed": 42, "notifications_sent": 11}'),
('2024-02-06', 18, 14, 7, 11, 19, 78.1, '{"new_enrollments": 0, "materials_viewed": 29, "notifications_sent": 9}'),
('2024-02-07', 18, 12, 7, 11, 20, 78.5, '{"new_enrollments": 0, "materials_viewed": 25, "notifications_sent": 4}'),
('2024-02-08', 18, 13, 7, 11, 22, 79.3, '{"new_enrollments": 0, "materials_viewed": 33, "notifications_sent": 7}'),
('2024-02-09', 18, 15, 7, 11, 24, 79.8, '{"new_enrollments": 0, "materials_viewed": 38, "notifications_sent": 13}'),
('2024-02-10', 18, 11, 7, 11, 26, 80.2, '{"new_enrollments": 0, "materials_viewed": 22, "notifications_sent": 5}'),
('2024-02-11', 18, 14, 7, 11, 28, 80.1, '{"new_enrollments": 0, "materials_viewed": 31, "notifications_sent": 8}'),
('2024-02-12', 18, 16, 7, 11, 29, 80.6, '{"new_enrollments": 0, "materials_viewed": 44, "notifications_sent": 12}'),
('2024-02-13', 18, 17, 7, 11, 31, 79.9, '{"new_enrollments": 0, "materials_viewed": 47, "notifications_sent": 9}');

-- =====================================================
-- SAMPLE AUTOMATED GRADING RULES
-- =====================================================

INSERT INTO automated_grading (assignment_id, question_index, question_type, correct_answer, answer_variations, points, case_sensitive) VALUES 
(2, 1, 'multiple_choice', 'B', null, 5, false),
(2, 2, 'multiple_choice', 'A', null, 5, false),
(2, 3, 'true_false', 'True', null, 3, false),
(2, 4, 'short_answer', 'integer', '["int", "whole number", "whole numbers"]', 4, false),
(2, 5, 'multiple_choice', 'C', null, 5, false),

(5, 1, 'multiple_choice', 'D', null, 8, false),
(5, 2, 'short_answer', '6', '["six", "6.0"]', 10, false),
(5, 3, 'true_false', 'False', null, 5, false),
(5, 4, 'multiple_choice', 'A', null, 8, false),

(9, 1, 'multiple_choice', 'C', null, 6, false),
(9, 2, 'short_answer', 'normal distribution', '["normal", "gaussian", "bell curve"]', 8, false),
(9, 3, 'true_false', 'True', null, 4, false),
(9, 4, 'multiple_choice', 'B', null, 6, false),

(11, 1, 'multiple_choice', 'A', null, 4, false),
(11, 2, 'short_answer', 'flexbox', '["flex", "flexible box"]', 6, false),
(11, 3, 'true_false', 'False', null, 3, false),
(11, 4, 'multiple_choice', 'D', null, 4, false);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check user counts by role
SELECT 'User counts by role:' as info;
SELECT role, count(*) as count FROM users GROUP BY role;

-- Check course enrollment summary
SELECT 'Course enrollment summary:' as info;
SELECT c.name, COUNT(ce.user_id) as enrolled_students 
FROM courses c 
LEFT JOIN course_enrollments ce ON c.id = ce.course_id AND ce.status = 'active'
WHERE c.status = 'active'
GROUP BY c.id, c.name 
ORDER BY enrolled_students DESC;

-- Check assignment submission status
SELECT 'Assignment submission summary:' as info;
SELECT a.title, 
       COUNT(s.id) as total_submissions,
       COUNT(CASE WHEN s.grade IS NOT NULL THEN 1 END) as graded_submissions
FROM assignments a 
LEFT JOIN assignment_submissions s ON a.id = s.assignment_id
WHERE a.status = 'active'
GROUP BY a.id, a.title
ORDER BY total_submissions DESC;

-- Check notification counts
SELECT 'Notification summary:' as info;
SELECT type, status, COUNT(*) as count 
FROM notifications 
GROUP BY type, status 
ORDER BY type, status;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT 'Test data creation completed successfully!' as status,
       'All users have password: password123' as login_info,
       'Database is ready for testing' as ready_state;

-- =====================================================
-- END OF TEST DATA SCRIPT
-- =====================================================