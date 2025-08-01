const logger = require('./logger');

/**
 * Search Response Transformer - Maps backend search results to frontend format
 */
class SearchTransformer {
  
  /**
   * Transform backend search results to frontend SearchResult format
   * @param {Array} backendResults - Raw results from backend search
   * @param {string} baseUrl - Base URL for generating result URLs
   */
  static transformSearchResults(backendResults, baseUrl = '') {
    try {
      return backendResults.map(result => this.transformSingleResult(result, baseUrl));
    } catch (error) {
      logger.error(`Failed to transform search results: ${error.message}`);
      return [];
    }
  }

  /**
   * Transform a single search result
   * @param {Object} result - Single backend search result
   * @param {string} baseUrl - Base URL for generating result URLs
   */
  static transformSingleResult(result, baseUrl = '') {
    try {
      const transformed = {
        id: result.id.toString(),
        title: result.title || 'Untitled',
        content: this.generateSnippet(result),
        type: this.mapContentType(result.type),
        score: this.calculateRelevanceScore(result.rank),
        url: this.generateResultUrl(result, baseUrl),
        createdAt: result.created_at,
        updatedAt: result.updated_at || result.created_at,
        metadata: this.generateMetadata(result),
        highlight: this.generateHighlight(result)
      };

      return transformed;
    } catch (error) {
      logger.error(`Failed to transform single search result: ${error.message}`);
      return this.createFallbackResult(result);
    }
  }

  /**
   * Transform backend search response to frontend SearchResponse format
   * @param {Object} backendResponse - Backend search response
   * @param {string} originalQuery - Original search query
   * @param {Object} filters - Applied filters
   * @param {string} baseUrl - Base URL for generating URLs
   */
  static transformSearchResponse(backendResponse, originalQuery, filters = {}, baseUrl = '') {
    try {
      const {
        results = [],
        total = 0,
        pagination = {},
        query,
        searchTime
      } = backendResponse;

      const transformedResults = this.transformSearchResults(results, baseUrl);

      return {
        results: transformedResults,
        total: total,
        page: pagination.current_page || 1,
        limit: pagination.per_page || 20,
        totalPages: pagination.last_page || Math.ceil(total / (pagination.per_page || 20)),
        searchTime: searchTime || Date.now(),
        suggestions: [], // Will be populated by suggestions endpoint
        facets: this.generateFacets(results)
      };
    } catch (error) {
      logger.error(`Failed to transform search response: ${error.message}`);
      return this.createEmptySearchResponse(originalQuery, filters);
    }
  }

  /**
   * Transform backend suggestions to frontend format
   * @param {Array} backendSuggestions - Backend suggestions
   */
  static transformSuggestions(backendSuggestions) {
    try {
      return backendSuggestions.map((suggestion, index) => ({
        id: `suggestion_${index}`,
        text: suggestion.suggestion || suggestion.title,
        type: this.mapSuggestionType(suggestion.type),
        score: 1.0 - (index * 0.1), // Decreasing score based on order
        metadata: {
          category: suggestion.type
        }
      }));
    } catch (error) {
      logger.error(`Failed to transform suggestions: ${error.message}`);
      return [];
    }
  }

  /**
   * Transform popular search terms to frontend format
   * @param {Array} popularTerms - Backend popular terms
   */
  static transformPopularSearches(popularTerms) {
    try {
      return popularTerms.map(term => term.query || term.term || term);
    } catch (error) {
      logger.error(`Failed to transform popular searches: ${error.message}`);
      return [];
    }
  }

  /**
   * Transform search analytics to frontend format
   * @param {Object} backendAnalytics - Backend analytics data
   */
  static transformAnalytics(backendAnalytics) {
    try {
      return {
        totalSearches: parseInt(backendAnalytics.total_searches) || 0,
        averageResponseTime: parseFloat(backendAnalytics.avg_response_time) || 0,
        mostSearchedTerms: backendAnalytics.popular_terms || []
      };
    } catch (error) {
      logger.error(`Failed to transform analytics: ${error.message}`);
      return {
        totalSearches: 0,
        averageResponseTime: 0,
        mostSearchedTerms: []
      };
    }
  }

  // Private helper methods

  /**
   * Generate content snippet from search result
   */
  static generateSnippet(result) {
    const description = result.description || '';
    const maxLength = 200;
    
    if (description.length <= maxLength) {
      return description;
    }
    
    return description.substring(0, maxLength).trim() + '...';
  }

  /**
   * Map backend content type to frontend type
   */
  static mapContentType(backendType) {
    const typeMap = {
      'course': 'course',
      'material': 'material',
      'assignment': 'assignment',
      'user': 'user',
      'announcement': 'announcement'
    };
    
    return typeMap[backendType] || 'material';
  }

  /**
   * Map backend suggestion type to frontend type
   */
  static mapSuggestionType(backendType) {
    const typeMap = {
      'course': 'course',
      'material': 'query',
      'assignment': 'query',
      'user': 'user'
    };
    
    return typeMap[backendType] || 'query';
  }

  /**
   * Calculate relevance score from backend rank
   */
  static calculateRelevanceScore(rank) {
    if (!rank || isNaN(rank)) return 0.5;
    
    // Normalize rank to 0-1 score (higher rank = higher score)
    // Assume rank is between 0 and 1 from PostgreSQL ts_rank
    return Math.min(Math.max(parseFloat(rank), 0), 1);
  }

  /**
   * Generate result URL based on type and ID
   */
  static generateResultUrl(result, baseUrl = '') {
    const { type, id, course_id } = result;
    
    const urlMap = {
      'course': `/courses/${id}`,
      'material': `/courses/${course_id}/materials/${id}`,
      'assignment': `/courses/${course_id}/assignments/${id}`,
      'user': `/users/${id}`,
      'announcement': `/announcements/${id}`
    };
    
    const path = urlMap[type] || `/search/result/${id}`;
    return baseUrl + path;
  }

  /**
   * Generate metadata for search result
   */
  static generateMetadata(result) {
    const metadata = {
      courseId: result.course_id?.toString(),
      courseName: result.course_name,
      authorId: result.teacher_id?.toString() || result.author_id?.toString(),
      authorName: result.author_name,
      description: result.description,
      tags: result.tags || [],
      fileType: result.file_type,
      fileSize: result.file_size
    };

    // Remove undefined/null values
    return Object.fromEntries(
      Object.entries(metadata).filter(([_, value]) => value != null)
    );
  }

  /**
   * Generate highlight information
   */
  static generateHighlight(result) {
    const highlight = {};
    
    if (result.title) {
      highlight.title = result.title;
    }
    
    if (result.description) {
      highlight.content = this.generateSnippet(result);
    }
    
    return Object.keys(highlight).length > 0 ? highlight : undefined;
  }

  /**
   * Generate facets from search results
   */
  static generateFacets(results) {
    if (!results || results.length === 0) {
      return {
        contentTypes: [],
        courses: [],
        authors: [],
        tags: []
      };
    }

    const facets = {
      contentTypes: this.aggregateByField(results, 'type'),
      courses: this.aggregateByFields(results, ['course_id', 'course_name'], 'id', 'name'),
      authors: this.aggregateByFields(results, ['teacher_id', 'author_name'], 'id', 'name'),
      tags: []
    };

    return facets;
  }

  /**
   * Aggregate results by a single field
   */
  static aggregateByField(results, field) {
    const counts = {};
    
    results.forEach(result => {
      const value = result[field];
      if (value) {
        counts[value] = (counts[value] || 0) + 1;
      }
    });

    return Object.entries(counts).map(([type, count]) => ({
      type: this.mapContentType(type),
      count
    }));
  }

  /**
   * Aggregate results by multiple fields
   */
  static aggregateByFields(results, fields, idKey, nameKey) {
    const counts = {};
    
    results.forEach(result => {
      const id = result[fields[0]];
      const name = result[fields[1]];
      
      if (id && name) {
        const key = id.toString();
        if (!counts[key]) {
          counts[key] = { [idKey]: key, [nameKey]: name, count: 0 };
        }
        counts[key].count++;
      }
    });

    return Object.values(counts);
  }

  /**
   * Create fallback result for transformation errors
   */
  static createFallbackResult(originalResult) {
    return {
      id: originalResult.id?.toString() || 'unknown',
      title: originalResult.title || 'Unknown Result',
      content: originalResult.description || '',
      type: 'material',
      score: 0.5,
      url: '/search/error',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {},
      highlight: undefined
    };
  }

  /**
   * Create empty search response for errors
   */
  static createEmptySearchResponse(query, filters) {
    return {
      results: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
      searchTime: Date.now(),
      suggestions: [],
      facets: {
        contentTypes: [],
        courses: [],
        authors: [],
        tags: []
      }
    };
  }
}

module.exports = SearchTransformer;