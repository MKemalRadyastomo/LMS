const { body } = require('express-validator');

/**
 * Validation rules for login
 */
const loginValidation = [
  body('username')
    .isEmail()
    .withMessage('Username must be a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * Validation rules for registration
 */
const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Email must be valid')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
    .matches(/[a-zA-Z]/)
    .withMessage('Password must contain at least one letter'),
  
  body('full_name')
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Full name must be between 2 and 255 characters long')
];

module.exports = {
  loginValidation,
  registerValidation
};
