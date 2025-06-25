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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);