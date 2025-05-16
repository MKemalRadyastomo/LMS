const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create a connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production',
});

/**
 * Initialize the database with schema
 */
async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Reading SQL initialization script...');
    const sqlPath = path.join(__dirname, '..', 'database', 'init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Executing SQL initialization script...');
    await client.query(sql);
    console.log('Database initialized successfully!');
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Run the initialization if this script is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Database setup complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Failed to initialize database:', err);
      process.exit(1);
    });
}

module.exports = {
  initializeDatabase,
};
