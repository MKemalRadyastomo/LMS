-- Initialize the LMS database schema

-- Drop tables if they exist to ensure a clean slate for re-initialization
DROP TABLE IF EXISTS analytics CASCADE;

DROP TABLE IF EXISTS grades CASCADE;

DROP TABLE IF EXISTS progress_logs CASCADE;

DROP TABLE IF EXISTS assignment_submissions CASCADE;

DROP TABLE IF EXISTS course_contents CASCADE;

DROP TABLE IF EXISTS assignments CASCADE;

DROP TABLE IF EXISTS materials CASCADE;

DROP TABLE IF EXISTS course_enrollments CASCADE;

DROP TABLE IF EXISTS courses CASCADE;

DROP TABLE IF EXISTS users CASCADE;

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
    max_score NUMERIC(5, 2), -- Changed to NUMERIC for float scores
    quiz_questions_json JSONB, -- For quiz type assignments
    allowed_file_types TEXT, -- Comma-separated, e.g., 'pdf,docx,jpg'
    max_file_size_mb INTEGER,
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
    order_index BIGINT NOT NULL, -- To define the order of content within a course
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
    quiz_answers_json JSONB, -- For quiz type submissions
    grade NUMERIC(5, 2), -- Changed from score to grade, and type to NUMERIC
    feedback TEXT,
    status VARCHAR(20) CHECK (
        status IN (
            'draft',
            'submitted',
            'graded',
            'late'
        )
    ) DEFAULT 'draft', -- Added status column
    plagiarism_score NUMERIC(5, 2), -- Added for essay anti-plagiarism
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    -- Removed UNIQUE (assignment_id, student_id) to allow multiple drafts/submissions
    -- The application logic will handle final submission uniqueness if needed.
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
-- Sample courses
INSERT INTO
    courses (
        name,
        description,
        privacy,
        code,
        teacher_id
    )
VALUES (
        'Introduction to Programming',
        'Learn the basics of programming with Python.',
        'public',
        'PROG101',
        2
    ),
    (
        'Web Development Fundamentals',
        'Build interactive websites using HTML, CSS, and JavaScript.',
        'public',
        'WEBDEV201',
        2
    ),
    (
        'Database Management',
        'Understand relational databases and SQL.',
        'private',
        'DB301',
        2
    );