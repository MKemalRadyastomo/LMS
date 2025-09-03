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
 * Initialize RBAC enhancement tables
 */
async function initializeRBACTables() {
  const client = await pool.connect();

  try {
    console.log('Reading RBAC enhancement SQL script...');
    const sqlPath = path.join(__dirname, '..', '..', 'database', 'rbac_enhancement.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing RBAC enhancement SQL script...');
    await client.query(sql);
    console.log('RBAC enhancement tables created successfully!');
  } catch (err) {
    console.error('Error creating RBAC enhancement tables:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the initialization if this script is executed directly
if (require.main === module) {
  initializeRBACTables()
    .then(() => {
      console.log('RBAC enhancement setup complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Failed to initialize RBAC enhancement:', err);
      process.exit(1);
    });
}

module.exports = {
  initializeRBACTables,
};