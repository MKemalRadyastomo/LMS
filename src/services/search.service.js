const Search = require('../models/search.model');
const logger = require('../utils/logger');

/**
 * Search Service - High-level search operations and business logic
 */
class SearchService {
  
  /**
   * Perform comprehensive search with caching and optimization
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @param {Object} user - Current user object
   */
  static async searchWithOptimization(query, options = {}, user) {
    try {
      const {
        type = null,
        courseId = null,
        teacherId = null,
        page = 1,
        limit = 20,
        minLength = 3
      } = options;

      // Validate query length
      if (!query || query.trim().length < minLength) {
        return {
          results: [],
          total: 0,
          query: query || '',
          filters: { type, courseId, teacherId },
          pagination: this.createEmptyPagination(page, limit),
          message: `Search query must be at least ${minLength} characters long`
        };
      }

      // Sanitize and prepare query
      const sanitizedQuery = this.sanitizeSearchQuery(query);
      const offset = (page - 1) * limit;

      // Perform search
      const searchResult = await Search.searchContent(
        sanitizedQuery,
        { type, courseId, teacherId },
        limit,
        offset,
        user.id,
        user.role
      );

      // Log search for analytics
      await Search.logSearchQuery(
        user.id,
        sanitizedQuery,
        searchResult.results.length,
        { type, courseId, teacherId }
      );

      // Enhance results with additional metadata
      const enhancedResults = await this.enhanceSearchResults(searchResult.results, user);

      return {
        ...searchResult,
        results: enhancedResults,
        searchTime: Date.now()
      };

    } catch (error) {
      logger.error(`Search service error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get search suggestions with optimization
   * @param {string} partialQuery - Partial search query
   * @param {Object} user - Current user object
   * @param {number} limit - Maximum suggestions
   */
  static async getSearchSuggestions(partialQuery, user, limit = 10) {
    try {
      if (!partialQuery || partialQuery.length < 2) {
        return [];
      }

      const sanitizedQuery = this.sanitizeSearchQuery(partialQuery);
      const suggestions = await Search.getSearchSuggestions(
        sanitizedQuery,
        limit,
        user.id,
        user.role
      );

      return suggestions;
    } catch (error) {
      logger.error(`Search suggestions error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get popular search terms for user's role
   */
  static async getPopularSearchTerms(limit = 10, timeframe = 'week') {
    try {
      return await Search.getPopularSearchTerms(limit, timeframe);
    } catch (error) {
      logger.error(`Popular search terms error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get search analytics and insights
   */
  static async getSearchAnalytics(timeframe = 'week') {
    try {
      const analytics = await Search.getSearchAnalytics(timeframe);
      
      // Calculate additional metrics
      const zeroResultsRate = analytics.total_searches > 0 
        ? (analytics.zero_result_searches / analytics.total_searches) * 100 
        : 0;

      return {
        ...analytics,
        zero_results_rate: Math.round(zeroResultsRate * 100) / 100,
        timeframe
      };
    } catch (error) {
      logger.error(`Search analytics error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sanitize search query to prevent injection attacks
   * @param {string} query - Raw search query
   */
  static sanitizeSearchQuery(query) {
    if (!query) return '';
    
    // Remove dangerous characters and normalize
    return query
      .trim()
      .replace(/[<>\"']/g, '') // Remove potentially dangerous characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, 100); // Limit length
  }

  /**
   * Enhance search results with additional metadata
   * @param {Array} results - Raw search results
   * @param {Object} user - Current user object
   */
  static async enhanceSearchResults(results, user) {
    try {
      const enhanced = await Promise.all(results.map(async (result) => {
        const enhancedResult = {
          ...result,
          highlights: this.generateHighlights(result),
          metadata: await this.getResultMetadata(result, user)
        };

        return enhancedResult;
      }));

      return enhanced;
    } catch (error) {
      logger.error(`Failed to enhance search results: ${error.message}`);
      return results; // Return original results if enhancement fails
    }
  }

  /**
   * Generate text highlights for search results
   * @param {Object} result - Search result
   */
  static generateHighlights(result) {
    const highlights = [];
    
    if (result.title) {
      highlights.push({
        field: 'title',
        value: result.title,
        highlighted: true
      });
    }

    if (result.description) {
      // Truncate description for preview
      const truncatedDesc = result.description.length > 150 
        ? result.description.substring(0, 150) + '...'
        : result.description;
      
      highlights.push({
        field: 'description',
        value: truncatedDesc,
        highlighted: false
      });
    }

    return highlights;
  }

  /**
   * Get additional metadata for search result
   * @param {Object} result - Search result
   * @param {Object} user - Current user object
   */
  static async getResultMetadata(result, user) {
    try {
      const metadata = {
        type: result.type,
        accessible: true,
        userRole: user.role
      };

      // Add type-specific metadata
      switch (result.type) {
        case 'course':
          metadata.isEnrolled = await this.checkCourseEnrollment(result.id, user.id);
          metadata.isOwner = result.teacher_id === user.id;
          break;
        case 'material':
          metadata.courseTitle = await this.getCourseTitle(result.course_id);
          break;
        case 'assignment':
          metadata.courseTitle = await this.getCourseTitle(result.course_id);
          metadata.hasSubmission = await this.checkAssignmentSubmission(result.id, user.id);
          break;
      }

      return metadata;
    } catch (error) {
      logger.error(`Failed to get result metadata: ${error.message}`);
      return { type: result.type, accessible: true };
    }
  }

  /**
   * Check if user is enrolled in a course
   */
  static async checkCourseEnrollment(courseId, userId) {
    try {
      const db = require('../config/db');
      const result = await db.query(`
        SELECT 1 FROM course_enrollments 
        WHERE course_id = $1 AND user_id = $2 AND status = 'active'
      `, [courseId, userId]);
      
      return result.rowCount > 0;
    } catch (error) {
      logger.error(`Failed to check course enrollment: ${error.message}`);
      return false;
    }
  }

  /**
   * Get course title by ID
   */
  static async getCourseTitle(courseId) {
    try {
      const db = require('../config/db');
      const result = await db.query(`
        SELECT name FROM courses WHERE id = $1
      `, [courseId]);
      
      return result.rows[0]?.name || 'Unknown Course';
    } catch (error) {
      logger.error(`Failed to get course title: ${error.message}`);
      return 'Unknown Course';
    }
  }

  /**
   * Check if user has submitted an assignment
   */
  static async checkAssignmentSubmission(assignmentId, userId) {
    try {
      const db = require('../config/db');
      const result = await db.query(`
        SELECT 1 FROM assignment_submissions 
        WHERE assignment_id = $1 AND student_id = $2
      `, [assignmentId, userId]);
      
      return result.rowCount > 0;
    } catch (error) {
      logger.error(`Failed to check assignment submission: ${error.message}`);
      return false;
    }
  }

  /**
   * Create empty pagination object
   */
  static createEmptyPagination(page, limit) {
    return {
      total: 0,
      per_page: limit,
      current_page: page,
      last_page: 1,
      from: 0,
      to: 0
    };
  }

  /**
   * Advanced search with filters and sorting
   * @param {Object} searchParams - Advanced search parameters
   * @param {Object} user - Current user object
   */
  static async advancedSearch(searchParams, user) {
    try {
      const {
        query,
        contentTypes = ['course', 'material', 'assignment'],
        dateFrom,
        dateTo,
        sortBy = 'relevance', // relevance, date, title
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = searchParams;

      // Validate parameters
      if (!query || query.trim().length < 3) {
        throw new Error('Search query must be at least 3 characters long');
      }

      // For now, implement basic search with enhanced filtering
      // Advanced features like date filtering can be added later
      const searchOptions = {
        type: contentTypes.length === 1 ? contentTypes[0] : null,
        page,
        limit
      };

      const results = await this.searchWithOptimization(query, searchOptions, user);

      // Apply sorting if not by relevance
      if (sortBy !== 'relevance') {
        results.results.sort((a, b) => {
          let comparison = 0;
          
          switch (sortBy) {
            case 'date':
              comparison = new Date(a.created_at) - new Date(b.created_at);
              break;
            case 'title':
              comparison = a.title.localeCompare(b.title);
              break;
            default:
              return 0;
          }
          
          return sortOrder === 'desc' ? -comparison : comparison;
        });
      }

      return results;
    } catch (error) {
      logger.error(`Advanced search error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = SearchService;