-- Table: users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(10) CHECK (
        role IN ('admin', 'guru', 'siswa')
    ) NOT NULL,
    profile_image TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert admin user
-- Hash the admin password
DO $$ 
BEGIN
  INSERT INTO users (email, password_hash, name, role)
  VALUES ('admin@example.com', crypt('adminadmin', gen_salt('bf')), 'Admin User', 'admin');
END $$;

-- Table: assignments
-- Drop the old assignments table if it exists, to ensure a clean slate
DROP TABLE IF EXISTS assignments;

-- Create the new, corrected assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL,
    course_content_id INTEGER, -- Changed to allow NULL
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50),
    due_date TIMESTAMP,
    max_score INTEGER,
    quiz_questions_json JSONB,
    allowed_file_types TEXT,
    max_file_size_mb INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active'
);

-- Table: courses
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    privacy VARCHAR(50) DEFAULT 'private',
    code VARCHAR(6) UNIQUE NOT NULL,
    teacher_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: course_contents
CREATE TABLE IF NOT EXISTS course_contents (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    content_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    order_index INTEGER NOT NULL
);

-- Table: course_enrollments
CREATE TABLE IF NOT EXISTS course_enrollments (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active'
);

-- Table: materials
CREATE TABLE IF NOT EXISTS materials (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT,
    file_path TEXT,
    video_url TEXT,
    publish_date TIMESTAMP
);

-- Table: assignment_submissions
CREATE TABLE IF NOT EXISTS assignment_submissions (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    submission_text TEXT,
    file_path TEXT,
    quiz_answers_json JSONB,
    grade INTEGER,
    feedback TEXT,
    status VARCHAR(50),
    plagiarism_score INTEGER
);