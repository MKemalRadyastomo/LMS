const SearchService = require('../services/search.service');
const { ApiError } = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const logger = require('../utils/logger');
const httpStatus = require('http-status');

/**
 * Search Controller - Handles search-related HTTP requests
 */

/**
 * Perform content search
 * GET /api/search?q={query}&type={type}&courseId={courseId}&page={page}&limit={limit}
 */
const searchContent = catchAsync(async (req, res) => {
  const { q: query, type, courseId, teacherId, page = 1, limit = 20 } = req.query;

  if (!query) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Search query is required');
  }

  const searchOptions = {
    type,
    courseId: courseId ? parseInt(courseId) : null,
    teacherId: teacherId ? parseInt(teacherId) : null,
    page: parseInt(page),
    limit: Math.min(parseInt(limit), 50) // Cap at 50 results per page
  };

  const results = await SearchService.searchWithOptimization(query, searchOptions, req.user);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Search completed successfully',
    data: results
  });
});

/**
 * Get search suggestions
 * GET /api/search/suggestions?q={partialQuery}&limit={limit}
 */
const getSearchSuggestions = catchAsync(async (req, res) => {
  const { q: partialQuery, limit = 10 } = req.query;

  if (!partialQuery) {
    return res.status(httpStatus.OK).json({
      success: true,
      data: []
    });
  }

  const suggestions = await SearchService.getSearchSuggestions(
    partialQuery, 
    req.user, 
    Math.min(parseInt(limit), 20)
  );

  res.status(httpStatus.OK).json({
    success: true,
    data: suggestions
  });
});

/**
 * Get popular search terms
 * GET /api/search/popular?timeframe={timeframe}&limit={limit}
 */
const getPopularSearchTerms = catchAsync(async (req, res) => {
  const { timeframe = 'week', limit = 10 } = req.query;

  if (!['day', 'week', 'month'].includes(timeframe)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid timeframe. Must be day, week, or month');
  }

  const popularTerms = await SearchService.getPopularSearchTerms(
    Math.min(parseInt(limit), 50),
    timeframe
  );

  res.status(httpStatus.OK).json({
    success: true,
    data: {
      timeframe,
      terms: popularTerms
    }
  });
});

/**
 * Get search analytics (Admin and Guru only)
 * GET /api/search/analytics?timeframe={timeframe}
 */
const getSearchAnalytics = catchAsync(async (req, res) => {
  // Check permissions
  if (!['admin', 'guru'].includes(req.user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied. Admin or Guru role required.');
  }

  const { timeframe = 'week' } = req.query;

  if (!['day', 'week', 'month'].includes(timeframe)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid timeframe. Must be day, week, or month');
  }

  const analytics = await SearchService.getSearchAnalytics(timeframe);

  res.status(httpStatus.OK).json({
    success: true,
    data: analytics
  });
});

/**
 * Advanced search with multiple filters
 * POST /api/search/advanced
 */
const advancedSearch = catchAsync(async (req, res) => {
  const {
    query,
    contentTypes = ['course', 'material', 'assignment'],
    dateFrom,
    dateTo,
    sortBy = 'relevance',
    sortOrder = 'desc',
    page = 1,
    limit = 20
  } = req.body;

  // Validate required fields
  if (!query) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Search query is required');
  }

  // Validate content types
  const validTypes = ['course', 'material', 'assignment'];
  const invalidTypes = contentTypes.filter(type => !validTypes.includes(type));
  if (invalidTypes.length > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid content types: ${invalidTypes.join(', ')}`);
  }

  // Validate sort parameters
  const validSortBy = ['relevance', 'date', 'title'];
  if (!validSortBy.includes(sortBy)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid sortBy parameter. Must be one of: ${validSortBy.join(', ')}`);
  }

  const validSortOrder = ['asc', 'desc'];
  if (!validSortOrder.includes(sortOrder)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid sortOrder parameter. Must be one of: ${validSortOrder.join(', ')}`);
  }

  // Validate date range
  if (dateFrom && dateTo) {
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid date format. Use YYYY-MM-DD format.');
    }
    
    if (fromDate > toDate) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'dateFrom cannot be later than dateTo');
    }
  }

  const searchParams = {
    query,
    contentTypes,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
    page: parseInt(page),
    limit: Math.min(parseInt(limit), 50)
  };

  const results = await SearchService.advancedSearch(searchParams, req.user);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Advanced search completed successfully',
    data: results
  });
});

/**
 * Search within a specific course
 * GET /api/courses/:courseId/search?q={query}&type={type}&page={page}&limit={limit}
 */
const searchInCourse = catchAsync(async (req, res) => {
  const { courseId } = req.params;
  const { q: query, type, page = 1, limit = 20 } = req.query;

  if (!query) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Search query is required');
  }

  // Validate courseId
  if (!courseId || isNaN(parseInt(courseId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid course ID');
  }

  const searchOptions = {
    type: type === 'all' ? null : type, // Allow searching all types within course
    courseId: parseInt(courseId),
    page: parseInt(page),
    limit: Math.min(parseInt(limit), 50)
  };

  const results = await SearchService.searchWithOptimization(query, searchOptions, req.user);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Course search completed successfully',
    data: results
  });
});

/**
 * Get search history for current user
 * GET /api/search/history?limit={limit}
 */
const getSearchHistory = catchAsync(async (req, res) => {
  const { limit = 10 } = req.query;
  
  // For now, we'll return empty array as search history feature would require additional tables
  // This can be implemented later by tracking user searches in a dedicated table
  
  res.status(httpStatus.OK).json({
    success: true,
    data: {
      searches: [],
      message: 'Search history feature coming soon'
    }
  });
});

/**
 * Clear search history for current user
 * DELETE /api/search/history
 */
const clearSearchHistory = catchAsync(async (req, res) => {
  // Placeholder for future implementation
  
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Search history cleared (feature coming soon)'
  });
});

module.exports = {
  searchContent,
  getSearchSuggestions,
  getPopularSearchTerms,
  getSearchAnalytics,
  advancedSearch,
  searchInCourse,
  getSearchHistory,
  clearSearchHistory
};