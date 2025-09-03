const express = require('express');
const searchController = require('../controllers/search.controller');
const { authenticate, requireRole, requirePermission } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const { searchCacheMiddleware } = require('../middleware/searchCache');
const Joi = require('joi');

const router = express.Router();

// All search routes require authentication
router.use(authenticate);

/**
 * Search validation schemas
 */
const searchQueryValidation = {
  query: {
    q: Joi.string().min(1).max(100).required().messages({
      'string.min': 'Search query must be at least 1 character long',
      'string.max': 'Search query cannot exceed 100 characters',
      'any.required': 'Search query is required'
    }),
    type: Joi.string().valid('course', 'material', 'assignment', 'user', 'announcement').optional(),
    contentType: Joi.alternatives().try(
      Joi.string().valid('course', 'material', 'assignment', 'user', 'announcement'),
      Joi.array().items(Joi.string().valid('course', 'material', 'assignment', 'user', 'announcement'))
    ).optional(),
    courseId: Joi.number().integer().positive().optional(),
    authorId: Joi.number().integer().positive().optional(),
    teacherId: Joi.number().integer().positive().optional(),
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(50).default(20).optional(),
    sort: Joi.string().valid('relevance', 'date', 'title', 'author').default('relevance').optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc').optional()
  }
};

const advancedSearchValidation = {
  body: {
    query: Joi.string().min(3).max(100).required().messages({
      'string.min': 'Search query must be at least 3 characters long',
      'string.max': 'Search query cannot exceed 100 characters',
      'any.required': 'Search query is required'
    }),
    contentTypes: Joi.array()
      .items(Joi.string().valid('course', 'material', 'assignment'))
      .min(1)
      .default(['course', 'material', 'assignment'])
      .optional(),
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).optional(),
    sortBy: Joi.string().valid('relevance', 'date', 'title').default('relevance').optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc').optional(),
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(50).default(20).optional()
  }
};

const suggestionsValidation = {
  query: {
    q: Joi.string().min(2).max(50).required().messages({
      'string.min': 'Query must be at least 2 characters long for suggestions',
      'string.max': 'Query cannot exceed 50 characters',
      'any.required': 'Query parameter is required'
    }),
    limit: Joi.number().integer().min(1).max(20).default(10).optional()
  }
};

const analyticsValidation = {
  query: {
    timeframe: Joi.string().valid('day', 'week', 'month').default('week').optional()
  }
};

const courseSearchValidation = {
  params: {
    courseId: Joi.number().integer().positive().required().messages({
      'number.base': 'Course ID must be a number',
      'number.positive': 'Course ID must be positive',
      'any.required': 'Course ID is required'
    })
  },
  query: {
    q: Joi.string().min(1).max(100).required(),
    type: Joi.string().valid('material', 'assignment', 'all').default('all').optional(),
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(50).default(20).optional()
  }
};

const saveSearchValidation = {
  body: {
    name: Joi.string().min(1).max(100).required().messages({
      'string.min': 'Search name must be at least 1 character long',
      'string.max': 'Search name cannot exceed 100 characters',
      'any.required': 'Search name is required'
    }),
    query: Joi.string().min(1).max(100).required().messages({
      'string.min': 'Search query must be at least 1 character long',
      'string.max': 'Search query cannot exceed 100 characters',
      'any.required': 'Search query is required'
    }),
    filters: Joi.object().optional(),
    notificationEnabled: Joi.boolean().default(false).optional()
  }
};

const updateSavedSearchValidation = {
  params: {
    id: Joi.string().required().messages({
      'any.required': 'Search ID is required'
    })
  },
  body: {
    name: Joi.string().min(1).max(100).optional(),
    query: Joi.string().min(1).max(100).optional(),
    filters: Joi.object().optional(),
    notificationEnabled: Joi.boolean().optional()
  }
};

const trackAnalyticsValidation = {
  body: {
    query: Joi.string().min(1).max(100).required(),
    resultCount: Joi.number().integer().min(0).required(),
    responseTime: Joi.number().min(0).required()
  }
};

/**
 * @route   GET /api/search
 * @desc    Search across all content types
 * @access  Private (All authenticated users)
 */
router.get(
  '/',
  searchCacheMiddleware({ skipInDev: false }),
  validate(searchQueryValidation),
  searchController.searchContent
);

/**
 * @route   GET /api/search/suggestions
 * @desc    Get search suggestions based on partial query
 * @access  Private (All authenticated users)
 */
router.get(
  '/suggestions',
  searchCacheMiddleware({ skipInDev: false }),
  validate(suggestionsValidation),
  searchController.getSearchSuggestions
);

/**
 * @route   GET /api/search/popular
 * @desc    Get popular search terms
 * @access  Private (All authenticated users)
 */
router.get(
  '/popular',
  searchCacheMiddleware({ skipInDev: false }),
  validate(analyticsValidation),
  searchController.getPopularSearchTerms
);

/**
 * @route   GET /api/search/analytics
 * @desc    Get search analytics and metrics
 * @access  Private (Admin and Guru only)
 */
router.get(
  '/analytics',
  requireRole(['admin', 'guru']),
  searchCacheMiddleware({ skipInDev: false }),
  validate(analyticsValidation),
  searchController.getSearchAnalytics
);

/**
 * @route   POST /api/search/advanced
 * @desc    Perform advanced search with multiple filters
 * @access  Private (All authenticated users)
 */
router.post(
  '/advanced',
  validate(advancedSearchValidation),
  searchController.advancedSearch
);

/**
 * @route   GET /api/search/history
 * @desc    Get user's search history
 * @access  Private (All authenticated users)
 */
router.get(
  '/history',
  searchController.getSearchHistory
);

/**
 * @route   DELETE /api/search/history
 * @desc    Clear user's search history
 * @access  Private (All authenticated users)
 */
router.delete(
  '/history',
  searchController.clearSearchHistory
);

/**
 * @route   GET /api/courses/:courseId/search
 * @desc    Search within a specific course
 * @access  Private (Enrolled users, course teachers, admins)
 */
router.get(
  '/course/:courseId',
  validate(courseSearchValidation),
  // Note: Course-specific access will be checked in the controller
  searchController.searchInCourse
);

/**
 * @route   POST /api/search/saved
 * @desc    Save a search for later use
 * @access  Private (All authenticated users)
 */
router.post(
  '/saved',
  validate(saveSearchValidation),
  searchController.saveSearch
);

/**
 * @route   GET /api/search/saved
 * @desc    Get user's saved searches
 * @access  Private (All authenticated users)
 */
router.get(
  '/saved',
  searchController.getSavedSearches
);

/**
 * @route   PATCH /api/search/saved/:id
 * @desc    Update a saved search
 * @access  Private (All authenticated users)
 */
router.patch(
  '/saved/:id',
  validate(updateSavedSearchValidation),
  searchController.updateSavedSearch
);

/**
 * @route   DELETE /api/search/saved/:id
 * @desc    Delete a saved search
 * @access  Private (All authenticated users)
 */
router.delete(
  '/saved/:id',
  validate({ params: { id: Joi.string().required() } }),
  searchController.deleteSavedSearch
);

/**
 * @route   POST /api/search/analytics
 * @desc    Track search analytics
 * @access  Private (All authenticated users)
 */
router.post(
  '/analytics',
  validate(trackAnalyticsValidation),
  searchController.trackSearchAnalytics
);

module.exports = router;