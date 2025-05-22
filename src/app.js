const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { apiLimiter } = require('./middleware/rateLimiter');
const timeoutMiddleware = require('./middleware/timeout');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');
const logger = require('./utils/logger');
const config = require('./config/config');

// Initialize Express app
const app = express();

// Set security HTTP headers
app.use(helmet());

// Parse JSON request body
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded request body
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enable CORS
app.use(cors());

// Request logging
app.use(morgan('combined', { stream: logger.stream }));

// Apply rate limiting to all requests
app.use(apiLimiter);

// Apply timeout middleware (30 seconds timeout)
app.use(timeoutMiddleware(30000));

// API routes with v1 prefix
app.use('/v1', routes);

// Serve static files
app.use(express.static('public'));
app.use('/profile_pictures', express.static(path.join(__dirname, '../public/profile_pictures')));

// Error handling middlewares
app.use(notFound);
app.use(errorHandler);

// Add server and cleanup handling for tests
if (process.env.NODE_ENV === 'test') {
  let server;
  app.startServer = () => {
    server = app.listen(0); // Use port 0 to get random available port
    return server;
  };
  app.closeServer = async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  };
}

module.exports = app;
