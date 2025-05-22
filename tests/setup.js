// Set the environment to test
process.env.NODE_ENV = 'test';

// Make sure we're using the test database
process.env.DB_NAME = 'test_project';

// Use a shorter JWT expiration for tests
process.env.JWT_EXPIRATION = '1h';

// Configure shorter timeouts for tests
process.env.DB_CONNECTION_TIMEOUT = '5000';
process.env.REQUEST_TIMEOUT = '5000';

// Load dotenv to ensure all environment variables are set
require('dotenv').config();

// Increase the timeout for all tests
jest.setTimeout(10000);

// Set up global test fixtures or variables here

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
});
