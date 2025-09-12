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

// Configure CORS for frontend-backend communication
const corsOptions = {
  origin: [
    'http://localhost:9876', // Frontend development server (primary)
    'http://localhost:3001', // Alternative frontend port
    'http://localhost:3000', // Alternative frontend port
    'http://127.0.0.1:9876', // Alternative localhost format (primary)
    'http://127.0.0.1:3001', // Alternative localhost format
    'http://127.0.0.1:3000'  // Alternative localhost format
  ],
  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-CSRF-Token'
  ],
  exposedHeaders: ['X-Total-Count'], // Expose headers for pagination
  optionsSuccessStatus: 200 // For legacy browser support
};

app.use(cors(corsOptions));

// Request logging
app.use(morgan('combined', { stream: logger.stream }));

// Apply rate limiting to all requests
app.use(apiLimiter);

// Apply timeout middleware (uses environment variable or defaults to 60 seconds)
app.use(timeoutMiddleware());

// API routes with api prefix
app.use('/api', routes);

// Fallback root route to handle logout redirects and prevent 404 errors
app.get('/', (req, res) => {
  res.json({
    message: 'LMS Backend API',
    status: 'active',
    version: '1.0.0',
    api: '/api'
  });
});

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
