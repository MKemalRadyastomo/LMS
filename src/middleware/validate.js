const { validationResult } = require('express-validator');
const Joi = require('joi');
const logger = require('../utils/logger');

/**
 * Hybrid validation middleware that handles both express-validator and Joi
 */
const validate = (schema) => {
  // If no schema provided, this is express-validator usage
  if (!schema) {
    return (req, res, next) => {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        // Log validation errors for debugging
        logger.warn('Express-validator validation failed', {
          url: req.url,
          method: req.method,
          errors: errors.array()
        });
        
        // Format errors in a consistent way
        const formattedErrors = errors.array().map(error => ({
          field: error.path || error.param,
          message: error.msg,
          value: error.value
        }));
        
        return res.status(400).json({
          status: 400,
          message: 'Validation Error',
          errors: formattedErrors
        });
      }
      
      next();
    };
  }

  // If schema provided, this is Joi usage
  return (req, res, next) => {
    const validationOptions = {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true,
    };

    const errors = [];

    // Validate params
    if (schema.params) {
      const paramsSchema = typeof schema.params.validate === 'function' 
        ? schema.params 
        : Joi.object(schema.params);
      const { error } = paramsSchema.validate(req.params, validationOptions);
      if (error) {
        errors.push(...error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        })));
      }
    }

    // Validate query
    if (schema.query) {
      const querySchema = typeof schema.query.validate === 'function' 
        ? schema.query 
        : Joi.object(schema.query);
      const { error } = querySchema.validate(req.query, validationOptions);
      if (error) {
        errors.push(...error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        })));
      }
    }

    // Validate body
    if (schema.body) {
      const bodySchema = typeof schema.body.validate === 'function' 
        ? schema.body 
        : Joi.object(schema.body);
      const { error } = bodySchema.validate(req.body, validationOptions);
      if (error) {
        errors.push(...error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        })));
      }
    }

    // If there are validation errors, return them
    if (errors.length > 0) {
      logger.warn('Joi validation failed', {
        url: req.url,
        method: req.method,
        errors: errors
      });

      return res.status(400).json({
        status: 400,
        message: 'Validation Error',
        errors
      });
    }

    next();
  };
};

module.exports = validate;
