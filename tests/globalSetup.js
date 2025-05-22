const { createServer } = require('http');
const app = require('../src/app');
const db = require('../src/config/db');

module.exports = async () => {
  // Create server instance
  const server = createServer(app);
  
  // Start server on random port
  await new Promise(resolve => {
    server.listen(0, () => {
      console.log(`Test server started on port ${server.address().port}`);
      resolve();
    });
  });

  // Store server instance globally
  global.__SERVER__ = server;

  // Store db connection globally
  global.__DB__ = db;
};
