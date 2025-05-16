// Set the environment to test
process.env.NODE_ENV = 'test';

// Make sure we're using the test database
process.env.DB_NAME = 'test_project';

// Use a shorter JWT expiration for tests
process.env.JWT_EXPIRATION = '1h';

// Load dotenv to ensure all environment variables are set
require('dotenv').config();

// Set up any global test fixtures or variables here
