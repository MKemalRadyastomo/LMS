module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./tests/setup.js'],
  testTimeout: 10000, // Set timeout to 10 seconds
  verbose: true,
  forceExit: true, // Force exit after all tests complete
  clearMocks: true,
  restoreMocks: true,
  testMatch: ['**/tests/**/*.test.js'],
};
