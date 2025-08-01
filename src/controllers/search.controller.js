const SearchService = require('../services/search.service');
const SearchTransformer = require('../utils/searchTransformer');
const { ApiError } = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const logger = require('../utils/logger');
const httpStatus = require('http-status');

/**
 * Search Controller - Handles search-related HTTP requests
 */

/**
 * Perform content search - Frontend compatible endpoint
 * GET /api/search?q={query}&contentType={type}&courseId={courseId}&page={page}&limit={limit}
 */
const searchContent = catchAsync(async (req, res) => {
  const { 
    q: query, 
    type, 
    contentType, 
    courseId, 
    authorId,
    teacherId, 
    page = 1, 
    limit = 20,
    sort = 'relevance',
    sortOrder = 'desc'
  } = req.query;

  if (!query || query.trim().length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Search query is required');
  }

  // Handle both 'type' and 'contentType' parameters for compatibility
  const searchType = contentType || type;
  
  // Map frontend contentType array to backend type
  let mappedTypes = null;
  if (Array.isArray(searchType)) {
    mappedTypes = searchType.length === 1 ? searchType[0] : null;
  } else if (searchType) {
    mappedTypes = searchType;
  }

  const searchOptions = {
    type: mappedTypes,
    courseId: courseId ? parseInt(courseId) : null,
    teacherId: (authorId || teacherId) ? parseInt(authorId || teacherId) : null,
    page: parseInt(page),
    limit: Math.min(parseInt(limit), 50), // Cap at 50 results per page
    sort,
    sortOrder
  };

  // Get the base URL for generating result URLs
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  try {
    const backendResults = await SearchService.searchWithOptimization(query, searchOptions, req.user);
    
    // Transform backend response to frontend format
    const transformedResponse = SearchTransformer.transformSearchResponse(
      backendResults, 
      query, 
      { contentType: searchType, courseId, authorId }, 
      baseUrl
    );

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Search completed successfully',
      ...transformedResponse
    });
  } catch (error) {
    logger.error(`Search error: ${error.message}`);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Search failed. Please try again.');
  }
});

/**
 * Get search suggestions - Frontend compatible endpoint
 * GET /api/search/suggestions?q={partialQuery}&limit={limit}
 */
const getSearchSuggestions = catchAsync(async (req, res) => {
  const { q: partialQuery, limit = 10, type } = req.query;

  if (!partialQuery || partialQuery.trim().length < 2) {
    return res.status(httpStatus.OK).json({
      success: true,
      suggestions: []
    });
  }

  try {
    const backendSuggestions = await SearchService.getSearchSuggestions(
      partialQuery, 
      req.user, 
      Math.min(parseInt(limit), 20)
    );

    // Transform backend suggestions to frontend format
    const transformedSuggestions = SearchTransformer.transformSuggestions(backendSuggestions);

    res.status(httpStatus.OK).json({
      success: true,
      suggestions: transformedSuggestions
    });
  } catch (error) {
    logger.error(`Suggestions error: ${error.message}`);
    // Return empty suggestions on error rather than failing the request
    res.status(httpStatus.OK).json({
      success: true,
      suggestions: []
    });
  }
});

/**
 * Get popular search terms - Frontend compatible endpoint
 * GET /api/search/popular?timeframe={timeframe}&limit={limit}
 */
const getPopularSearchTerms = catchAsync(async (req, res) => {
  const { timeframe = 'week', limit = 10 } = req.query;

  if (!['day', 'week', 'month'].includes(timeframe)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid timeframe. Must be day, week, or month');
  }

  try {
    const popularTerms = await SearchService.getPopularSearchTerms(
      Math.min(parseInt(limit), 50),
      timeframe
    );

    // Transform to match frontend expectations
    const transformedSearches = SearchTransformer.transformPopularSearches(popularTerms);

    res.status(httpStatus.OK).json({
      success: true,
      searches: transformedSearches,
      timeframe,
      data: {
        timeframe,
        terms: popularTerms // Keep original format for backward compatibility
      }
    });
  } catch (error) {
    logger.error(`Popular searches error: ${error.message}`);
    res.status(httpStatus.OK).json({
      success: true,
      searches: [],
      timeframe,
      data: { timeframe, terms: [] }
    });
  }
});

/**
 * Get search analytics - Frontend compatible endpoint
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

  try {
    const backendAnalytics = await SearchService.getSearchAnalytics(timeframe);
    
    // Transform to frontend format
    const transformedAnalytics = SearchTransformer.transformAnalytics(backendAnalytics);

    res.status(httpStatus.OK).json({
      success: true,
      ...transformedAnalytics,
      data: backendAnalytics // Keep original for backward compatibility
    });
  } catch (error) {
    logger.error(`Search analytics error: ${error.message}`);
    res.status(httpStatus.OK).json({
      success: true,
      totalSearches: 0,
      averageResponseTime: 0,
      mostSearchedTerms: [],
      data: {}
    });
  }
});

/**
 * Advanced search with multiple filters - Frontend compatible endpoint
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
    limit = 20,
    includeAnalytics = false,
    includeFacets = false,
    includeHighlights = false
  } = req.body;

  // Validate required fields
  if (!query || query.trim().length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Search query is required');
  }

  // Validate content types
  const validTypes = ['course', 'material', 'assignment', 'user', 'announcement'];
  const invalidTypes = contentTypes.filter(type => !validTypes.includes(type));
  if (invalidTypes.length > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid content types: ${invalidTypes.join(', ')}`);
  }

  // Validate sort parameters
  const validSortBy = ['relevance', 'date', 'title', 'author'];
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

  const baseUrl = `${req.protocol}://${req.get('host')}`;

  try {
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

    const backendResults = await SearchService.advancedSearch(searchParams, req.user);
    
    // Transform to frontend format
    const transformedResponse = SearchTransformer.transformSearchResponse(
      backendResults,
      query,
      { contentTypes, dateFrom, dateTo },
      baseUrl
    );

    // Add additional features if requested
    let response = {
      success: true,
      message: 'Advanced search completed successfully',
      ...transformedResponse
    };

    if (includeAnalytics && ['admin', 'guru'].includes(req.user.role)) {
      const analytics = await SearchService.getSearchAnalytics('week');
      response.analytics = SearchTransformer.transformAnalytics(analytics);
    }

    res.status(httpStatus.OK).json(response);
  } catch (error) {
    logger.error(`Advanced search error: ${error.message}`);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Advanced search failed. Please try again.');
  }
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

/**
 * Save a search for later use
 * POST /api/search/saved
 */
const saveSearch = catchAsync(async (req, res) => {
  const { name, query, filters, notificationEnabled = false } = req.body;

  if (!name || !query) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Name and query are required');
  }

  // For now, return a mock response - implement full saved search functionality later
  const savedSearch = {
    id: `saved_${Date.now()}`,
    name,
    query,
    filters: filters || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notificationEnabled,
    userId: req.user.id
  };

  res.status(httpStatus.CREATED).json({
    success: true,
    message: 'Search saved successfully',
    ...savedSearch
  });
});

/**
 * Get user's saved searches
 * GET /api/search/saved
 */
const getSavedSearches = catchAsync(async (req, res) => {
  // For now, return empty array - implement full saved search functionality later
  res.status(httpStatus.OK).json({
    success: true,
    searches: []
  });
});

/**
 * Update a saved search
 * PATCH /api/search/saved/:id
 */
const updateSavedSearch = catchAsync(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // For now, return mock updated search
  const updatedSearch = {
    id,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Search updated successfully',
    ...updatedSearch
  });
});

/**
 * Delete a saved search
 * DELETE /api/search/saved/:id
 */
const deleteSavedSearch = catchAsync(async (req, res) => {
  const { id } = req.params;

  // For now, just return success - implement deletion later
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Search deleted successfully'
  });
});

/**
 * Track search analytics (for frontend analytics tracking)
 * POST /api/search/analytics
 */
const trackSearchAnalytics = catchAsync(async (req, res) => {
  const { query, resultCount, responseTime } = req.body;

  if (query && req.user.id) {
    // Log the search for analytics (already done in searchContent, but this provides additional tracking)
    await SearchService.logSearchQuery?.(req.user.id, query, resultCount, { responseTime });
  }

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Analytics tracked successfully'
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
  clearSearchHistory,
  saveSearch,
  getSavedSearches,
  updateSavedSearch,
  deleteSavedSearch,
  trackSearchAnalytics
};