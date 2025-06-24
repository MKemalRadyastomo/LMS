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