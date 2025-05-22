module.exports = {
    testEnvironment: 'node',
    setupFilesAfterEnv: ['./tests/setup.js'],
  testTimeout: 60000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
  restoreMocks: true,
  detectOpenHandles: true,
  testMatch: ['**/tests/**/*.test.js'],
  globalSetup: '<rootDir>/tests/globalSetup.js',
  globalTeardown: '<rootDir>/tests/globalTeardown.js',
  maxConcurrency: 1,
  maxWorkers: 1
};
