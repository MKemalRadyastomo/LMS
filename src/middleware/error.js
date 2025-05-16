const logger = require('../utils/logger');
const { ApiError } = require('../utils/ApiError');
const config = require('../config/config');

/**
 * Error handler for 404 routes - Resource Not Found
 */
const notFound = (req, res, next) => {
  const error = new ApiError(404, `Resource not found - ${req.originalUrl}`);
  next(error);
};

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;
  
  // If it's not an ApiError, convert it
  if (!(err instanceof ApiError)) {
    const isProduction = config.env === 'production';
    statusCode = 500;
    
    // Log the error only if it's not operational
    if (!err.isOperational) {
      logger.error(err);
    }
    
    // In production, don't expose the error message for non-operational errors
    message = isProduction && !err.isOperational
      ? 'Internal Server Error'
      : err.message || 'Internal Server Error';
  }
  
  const response = {
    status: statusCode,
    message,
    ...(config.env === 'development' && { stack: err.stack }),
  };
  
  res.status(statusCode).json(response);
};

module.exports = {
  notFound,
  errorHandler,
};
