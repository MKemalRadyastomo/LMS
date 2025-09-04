const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password123',
  database: process.env.DB_NAME || 'test_project',
});

async function createTestUser() {
  try {
    const email = 'testuser@example.com';
    const password = 'password123';
    const name = 'Test User';
    const role = 'guru';
    
    // Hash the password using the same method as the auth service
    const passwordHash = await bcrypt.hash(password, 10);
    
    console.log(`Creating user: ${email} with password: ${password}`);
    console.log(`Password hash: ${passwordHash}`);
    
    // Insert the user
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET password_hash = $2 RETURNING id, email, name, role',
      [email, passwordHash, name, role]
    );
    
    console.log('User created successfully:', result.rows[0]);
    
    // Test the login immediately
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const isValid = await bcrypt.compare(password, user.rows[0].password_hash);
    
    console.log('Password validation test:', isValid ? 'SUCCESS' : 'FAILED');
    
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await pool.end();
  }
}

createTestUser();