const express = require('express');
const AuthController = require('../controllers/auth.controller');
const { loginValidation, registerValidation } = require('../middleware/validation/auth.validation');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * @route POST /auth/login
 * @desc User login
 * @access Public
 */
router.post('/login', authLimiter, loginValidation, validate, AuthController.login);

/**
 * @route POST /auth/register
 * @desc User registration
 * @access Public
 */
router.post('/register', authLimiter, authenticate, authorize(['admin']), registerValidation, validate, AuthController.register);

/**
 * @route GET /auth/me
 * @desc Get current user information
 * @access Private
 */
router.get('/me', authenticate, AuthController.me);

/**
 * @route POST /auth/logout
 * @desc User logout
 * @access Private (requires authentication)
 */
router.post('/logout', authenticate, AuthController.logout);

module.exports = router;
