/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Create a bad request error
 * @param {string} message - Error message
 * @returns {ApiError}
 */
const badRequest = (message) => new ApiError(400, message);

/**
 * Create an unauthorized error
 * @param {string} message - Error message
 * @returns {ApiError}
 */
const unauthorized = (message = 'Unauthorized') => new ApiError(401, message);

/**
 * Create a forbidden error
 * @param {string} message - Error message
 * @returns {ApiError}
 */
const forbidden = (message = 'Forbidden') => new ApiError(403, message);

/**
 * Create a not found error
 * @param {string} message - Error message
 * @returns {ApiError}
 */
const notFound = (message = 'Resource not found') => new ApiError(404, message);

/**
 * Create a conflict error
 * @param {string} message - Error message
 * @returns {ApiError}
 */
const conflict = (message) => new ApiError(409, message);

/**
 * Create an internal server error
 * @param {string} message - Error message
 * @param {boolean} isOperational - Is this an operational error
 * @returns {ApiError}
 */
const internal = (message = 'Internal server error', isOperational = true) => 
  new ApiError(500, message, isOperational);

module.exports = {
  ApiError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  internal
};
