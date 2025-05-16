const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Middleware to validate request against express-validator rules
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.param,
      message: error.msg
    }));
    
    return res.status(400).json({
      status: 400,
      message: 'Validation Error',
      errors: errorMessages
    });
  }
  next();
};

module.exports = validate;
