const express = require('express');
const authRoutes = require('./auth.routes');

const router = express.Router();

/**
 * API version endpoint
 */
router.get('/api-version', (req, res) => {
  res.status(200).json({
    version: '1.0.0',
    release_date: '2025-05-16',
    deprecated: false,
    sunset_date: null
  });
});

/**
 * Register route groups
 */
router.use('/auth', authRoutes);

module.exports = router;
