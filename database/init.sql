-- Initialize the LMS database schema

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

-- Table: courses
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    privacy VARCHAR(10) CHECK (
        privacy IN ('public', 'private')
    ) DEFAULT 'private',
    code VARCHAR(20) UNIQUE NOT NULL,
    teacher_id INTEGER REFERENCES users (id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: course_enrollments
CREATE TABLE IF NOT EXISTS course_enrollments (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses (id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users (id) ON DELETE CASCADE,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Added enrollment_date column
    status VARCHAR(50), -- Added status column
    UNIQUE (course_id, user_id)
);

-- Table: materials
CREATE TABLE IF NOT EXISTS materials (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses (id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT,
    file_path TEXT,
    video_url TEXT,
    publish_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: assignments
CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses (id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) CHECK (
        type IN (
            'essay',
            'quiz',
            'file_upload'
        )
    ),
    due_date TIMESTAMP,
    max_score INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: course_contents (for structuring course materials and assignments)
CREATE TABLE IF NOT EXISTS course_contents (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses (id) ON DELETE CASCADE,
    content_type VARCHAR(20) NOT NULL CHECK (
        content_type IN ('material', 'assignment')
    ),
    content_id INTEGER NOT NULL, -- This will reference either material.id or assignment.id
    title VARCHAR(255) NOT NULL, -- Denormalized title for easier display
    order_index INTEGER NOT NULL, -- To define the order of content within a course
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (
        course_id,
        content_type,
        content_id
    ) -- Ensure unique content per course
);

-- Table: assignment_submissions
CREATE TABLE IF NOT EXISTS assignment_submissions (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER REFERENCES assignments (id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES users (id) ON DELETE CASCADE,
    submission_text TEXT,
    file_path TEXT,
    score INTEGER,
    feedback TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (assignment_id, student_id)
);

-- Table: progress_logs (for tracking material access)
CREATE TABLE IF NOT EXISTS progress_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users (id) ON DELETE CASCADE,
    material_id INTEGER REFERENCES materials (id) ON DELETE CASCADE,
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: grades
CREATE TABLE IF NOT EXISTS grades (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses (id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES users (id) ON DELETE CASCADE,
    assignment_id INTEGER REFERENCES assignments (id) ON DELETE CASCADE,
    score INTEGER,
    graded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: analytics (basic example)
CREATE TABLE IF NOT EXISTS analytics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users (id),
    course_id INTEGER REFERENCES courses (id),
    time_spent_minutes INTEGER,
    difficulty_feedback TEXT,
    analysis_date DATE DEFAULT CURRENT_DATE
);

-- Create admin user (password: admin123)
INSERT INTO
    users (
        email,
        password_hash,
        name,
        role
    )
VALUES (
        'admin@example.com',
        '$2a$10$KAO.ZvQKQm1FEkCKmgEVm.qA9OPNn0jDDuUSBn7MfcL0rKLTNUCWC',
        'Admin User',
        'admin'
    ) ON CONFLICT (email) DO NOTHING;

-- Create teacher user (password: teacher123)
INSERT INTO
    users (
        email,
        password_hash,
        name,
        role
    )
VALUES (
        'teacher@example.com',
        '$2a$10$gFJmVr1UHzNFZKwqj.aSBOfMAZR2B6TgZt2EBCEJexJOKA3KBg2iO',
        'Teacher User',
        'guru'
    ) ON CONFLICT (email) DO NOTHING;

-- Create student user (password: student123)
INSERT INTO
    users (
        email,
        password_hash,
        name,
        role
    )
VALUES (
        'student@example.com',
        '$2a$10$UwbsKLSvpjsxudA2M1TdzOFyfdLFXDxNHw2yc9ZJDWyJOLAZw8Jye',
        'Student User',
        'siswa'
    ) ON CONFLICT (email) DO NOTHING;