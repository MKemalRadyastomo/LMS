const ApiError = require('../utils/ApiError');

/**
 * Middleware factory to validate request against Joi schemas
 */
const validate = (schema) => (req, res, next) => {
  const validationOptions = {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true,
  };

  if (schema.params) {
    const { error } = schema.params.validate(req.params, validationOptions);
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      return res.status(400).json({
        status: 400,
        message: 'Validation Error',
        errors
      });
    }
  }

  if (schema.query) {
    const { error } = schema.query.validate(req.query, validationOptions);
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      return res.status(400).json({
        status: 400,
        message: 'Validation Error',
        errors
      });
    }
  }

  if (schema.body) {
    const { error } = schema.body.validate(req.body, validationOptions);
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      return res.status(400).json({
        status: 400,
        message: 'Validation Error',
        errors
      });
    }
  }

  next();
};

module.exports = validate;
