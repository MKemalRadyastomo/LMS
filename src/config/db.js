const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Create a connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production',
  max: process.env.NODE_ENV === 'test' ? 2 : 20, // Reduce pool size in test environment
  idleTimeoutMillis: 1000, // Short idle timeout for tests
  connectionTimeoutMillis: 1000, // Short connection timeout
  statement_timeout: 5000 // Short statement timeout
});

// Test the database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
  } else {
    console.log('Successfully connected to the database');
    release();
  }
});

// Export the pool to be used in other modules
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool, // Export the pool for direct access
  end: () => pool.end(), // Add end method for tests
  getClient: async () => {
    const client = await pool.connect();
    const query = client.query;
    const release = client.release;

    // Set a timeout of 5 seconds, after which we will log this client's last query
    const timeout = setTimeout(() => {
      console.error('A client has been checked out for more than 5 seconds!');
      console.error(`The last executed query on this client was: ${client.lastQuery}`);
    }, 5000);

    // Monkey patch the query method to keep track of the last query executed
    client.query = (...args) => {
      client.lastQuery = args;
      return query.apply(client, args);
    };

    client.release = () => {
      clearTimeout(timeout);
      client.query = query;
      client.release = release;
      return release.apply(client);
    };

    return client;
  },
};
