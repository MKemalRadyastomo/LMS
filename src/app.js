const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { apiLimiter } = require('./middleware/rateLimiter');
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

// Mount API routes
app.use('/v1', routes);

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

module.exports = app;
