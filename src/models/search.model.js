const db = require('../config/db');
const logger = require('../utils/logger');

/**
 * Search Model - Handles full-text search across courses, materials, and assignments
 */
class Search {
  
  /**
   * Perform full-text search across all content types
   * @param {string} query - Search query
   * @param {Object} filters - Search filters
   * @param {number} limit - Maximum results to return
   * @param {number} offset - Offset for pagination
   * @param {number} userId - Current user ID for permission filtering
   * @param {string} userRole - Current user role for permission filtering
   */
  static async searchContent(query, filters = {}, limit = 20, offset = 0, userId = null, userRole = 'siswa') {
    try {
      const { type, courseId, teacherId } = filters;
      const params = [query];
      let paramCount = 1;

      // Base search query with role-based filtering
      let searchQuery = `
        WITH search_results AS (
          -- Search in courses
          SELECT 
            'course' as type, 
            c.id, 
            c.name as title, 
            c.description, 
            NULL as course_id,
            c.teacher_id,
            c.privacy,
            ts_rank(to_tsvector('english', c.name || ' ' || COALESCE(c.description, '')), plainto_tsquery('english', $1)) as rank,
            c.created_at
          FROM courses c
          WHERE to_tsvector('english', c.name || ' ' || COALESCE(c.description, '')) @@ plainto_tsquery('english', $1)
            AND (
              $${++paramCount} = 'admin' 
              OR c.privacy = 'public'
              OR c.teacher_id = $${++paramCount}
              OR EXISTS (
                SELECT 1 FROM course_enrollments ce 
                WHERE ce.course_id = c.id AND ce.user_id = $${paramCount} AND ce.status = 'active'
              )
            )
          
          UNION ALL
          
          -- Search in materials
          SELECT 
            'material' as type, 
            m.id, 
            m.title, 
            m.description, 
            m.course_id,
            c.teacher_id,
            c.privacy,
            ts_rank(to_tsvector('english', m.title || ' ' || COALESCE(m.description, '') || ' ' || COALESCE(m.content, '')), plainto_tsquery('english', $1)) as rank,
            m.created_at
          FROM materials m
          JOIN courses c ON m.course_id = c.id
          WHERE to_tsvector('english', m.title || ' ' || COALESCE(m.description, '') || ' ' || COALESCE(m.content, '')) @@ plainto_tsquery('english', $1)
            AND (
              $${paramCount} = 'admin' 
              OR c.privacy = 'public'
              OR c.teacher_id = $${paramCount}
              OR EXISTS (
                SELECT 1 FROM course_enrollments ce 
                WHERE ce.course_id = c.id AND ce.user_id = $${paramCount} AND ce.status = 'active'
              )
            )
          
          UNION ALL
          
          -- Search in assignments
          SELECT 
            'assignment' as type, 
            a.id, 
            a.title, 
            a.description, 
            a.course_id,
            c.teacher_id,
            c.privacy,
            ts_rank(to_tsvector('english', a.title || ' ' || COALESCE(a.description, '')), plainto_tsquery('english', $1)) as rank,
            a.created_at
          FROM assignments a
          JOIN courses c ON a.course_id = c.id
          WHERE to_tsvector('english', a.title || ' ' || COALESCE(a.description, '')) @@ plainto_tsquery('english', $1)
            AND a.status = 'active'
            AND (
              $${paramCount} = 'admin' 
              OR c.privacy = 'public'
              OR c.teacher_id = $${paramCount}
              OR EXISTS (
                SELECT 1 FROM course_enrollments ce 
                WHERE ce.course_id = c.id AND ce.user_id = $${paramCount} AND ce.status = 'active'
              )
            )
        )
        SELECT * FROM search_results
      `;

      params.push(userRole, userId, userId);

      // Add type filter
      if (type && ['course', 'material', 'assignment'].includes(type)) {
        searchQuery += ` WHERE type = $${++paramCount}`;
        params.push(type);
      }

      // Add course filter
      if (courseId) {
        const connector = type ? 'AND' : 'WHERE';
        searchQuery += ` ${connector} (course_id = $${++paramCount} OR (type = 'course' AND id = $${paramCount}))`;
        params.push(courseId);
      }

      // Add teacher filter
      if (teacherId) {
        const connector = (type || courseId) ? 'AND' : 'WHERE';
        searchQuery += ` ${connector} teacher_id = $${++paramCount}`;
        params.push(teacherId);
      }

      // Add ordering and pagination
      searchQuery += ` ORDER BY rank DESC, created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
      params.push(limit, offset);

      const result = await db.query(searchQuery, params);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total FROM (
          SELECT 1 FROM courses c
          WHERE to_tsvector('english', c.name || ' ' || COALESCE(c.description, '')) @@ plainto_tsquery('english', $1)
            AND (
              $2 = 'admin' 
              OR c.privacy = 'public'
              OR c.teacher_id = $3
              OR EXISTS (
                SELECT 1 FROM course_enrollments ce 
                WHERE ce.course_id = c.id AND ce.user_id = $3 AND ce.status = 'active'
              )
            )
          
          UNION ALL
          
          SELECT 1 FROM materials m
          JOIN courses c ON m.course_id = c.id
          WHERE to_tsvector('english', m.title || ' ' || COALESCE(m.description, '') || ' ' || COALESCE(m.content, '')) @@ plainto_tsquery('english', $1)
            AND (
              $2 = 'admin' 
              OR c.privacy = 'public'
              OR c.teacher_id = $3
              OR EXISTS (
                SELECT 1 FROM course_enrollments ce 
                WHERE ce.course_id = c.id AND ce.user_id = $3 AND ce.status = 'active'
              )
            )
          
          UNION ALL
          
          SELECT 1 FROM assignments a
          JOIN courses c ON a.course_id = c.id
          WHERE to_tsvector('english', a.title || ' ' || COALESCE(a.description, '')) @@ plainto_tsquery('english', $1)
            AND a.status = 'active'
            AND (
              $2 = 'admin' 
              OR c.privacy = 'public'
              OR c.teacher_id = $3
              OR EXISTS (
                SELECT 1 FROM course_enrollments ce 
                WHERE ce.course_id = c.id AND ce.user_id = $3 AND ce.status = 'active'
              )
            )
        ) as combined_results
      `;

      const countResult = await db.query(countQuery, [query, userRole, userId]);
      const total = parseInt(countResult.rows[0].total);

      return {
        results: result.rows,
        total,
        query,
        filters,
        pagination: {
          total,
          per_page: limit,
          current_page: Math.floor(offset / limit) + 1,
          last_page: Math.ceil(total / limit),
          from: offset + 1,
          to: Math.min(offset + limit, total)
        }
      };
    } catch (error) {
      logger.error(`Search failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get search suggestions based on partial query
   * @param {string} partialQuery - Partial search query
   * @param {number} limit - Maximum suggestions to return
   */
  static async getSearchSuggestions(partialQuery, limit = 10, userId = null, userRole = 'siswa') {
    try {
      if (!partialQuery || partialQuery.length < 2) {
        return [];
      }

      const query = `
        WITH suggestions AS (
          SELECT DISTINCT c.name as suggestion, 'course' as type, 1 as priority
          FROM courses c
          WHERE c.name ILIKE $1
            AND (
              $3 = 'admin' 
              OR c.privacy = 'public'
              OR c.teacher_id = $4
              OR EXISTS (
                SELECT 1 FROM course_enrollments ce 
                WHERE ce.course_id = c.id AND ce.user_id = $4 AND ce.status = 'active'
              )
            )
          
          UNION ALL
          
          SELECT DISTINCT title as suggestion, 'material' as type, 2 as priority
          FROM materials m
          JOIN courses c ON m.course_id = c.id
          WHERE m.title ILIKE $1
            AND (
              $3 = 'admin' 
              OR c.privacy = 'public'
              OR c.teacher_id = $4
              OR EXISTS (
                SELECT 1 FROM course_enrollments ce 
                WHERE ce.course_id = c.id AND ce.user_id = $4 AND ce.status = 'active'
              )
            )
          
          UNION ALL
          
          SELECT DISTINCT title as suggestion, 'assignment' as type, 3 as priority
          FROM assignments a
          JOIN courses c ON a.course_id = c.id
          WHERE a.title ILIKE $1
            AND a.status = 'active'
            AND (
              $3 = 'admin' 
              OR c.privacy = 'public'
              OR c.teacher_id = $4
              OR EXISTS (
                SELECT 1 FROM course_enrollments ce 
                WHERE ce.course_id = c.id AND ce.user_id = $4 AND ce.status = 'active'
              )
            )
        )
        SELECT suggestion, type FROM suggestions
        ORDER BY priority, LENGTH(suggestion)
        LIMIT $2
      `;

      const result = await db.query(query, [`%${partialQuery}%`, limit, userRole, userId]);
      return result.rows;
    } catch (error) {
      logger.error(`Search suggestions failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Log search query for analytics
   * @param {number} userId - User ID who performed the search
   * @param {string} query - Search query
   * @param {number} resultCount - Number of results returned
   * @param {Object} filters - Applied filters
   */
  static async logSearchQuery(userId, query, resultCount, filters = {}) {
    try {
      await db.query(`
        INSERT INTO activity_logs (user_id, activity_type, details)
        VALUES ($1, 'search', $2)
      `, [userId, JSON.stringify({
        query,
        resultCount,
        filters,
        timestamp: new Date().toISOString()
      })]);
    } catch (error) {
      logger.error(`Failed to log search query: ${error.message}`);
    }
  }

  /**
   * Get popular search terms
   * @param {number} limit - Maximum terms to return
   * @param {string} timeframe - Time frame for popularity calculation ('day', 'week', 'month')
   */
  static async getPopularSearchTerms(limit = 10, timeframe = 'week') {
    try {
      let timeCondition = '';
      switch (timeframe) {
        case 'day':
          timeCondition = 'created_at > NOW() - INTERVAL \'1 day\'';
          break;
        case 'week':
          timeCondition = 'created_at > NOW() - INTERVAL \'1 week\'';
          break;
        case 'month':
          timeCondition = 'created_at > NOW() - INTERVAL \'1 month\'';
          break;
        default:
          timeCondition = 'created_at > NOW() - INTERVAL \'1 week\'';
      }

      const query = `
        SELECT 
          details->>'query' as query,
          COUNT(*) as search_count,
          COALESCE(
            AVG(
              CASE 
                WHEN details->>'resultCount' ~ '^[0-9]+$' 
                THEN (details->>'resultCount')::integer 
                ELSE 0 
              END
            ), 0
          )::numeric(10,2) as avg_results
        FROM activity_logs
        WHERE activity_type = 'search'
          AND ${timeCondition}
          AND details IS NOT NULL
          AND details->>'query' IS NOT NULL
          AND LENGTH(details->>'query') > 0
        GROUP BY details->>'query'
        ORDER BY search_count DESC
        LIMIT $1
      `;

      const result = await db.query(query, [limit]);
      return result.rows;
    } catch (error) {
      logger.error(`Failed to get popular search terms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get search analytics
   * @param {string} timeframe - Time frame for analytics ('day', 'week', 'month')
   */
  static async getSearchAnalytics(timeframe = 'week') {
    try {
      let timeCondition = '';
      switch (timeframe) {
        case 'day':
          timeCondition = 'created_at > NOW() - INTERVAL \'1 day\'';
          break;
        case 'week':
          timeCondition = 'created_at > NOW() - INTERVAL \'1 week\'';
          break;
        case 'month':
          timeCondition = 'created_at > NOW() - INTERVAL \'1 month\'';
          break;
        default:
          timeCondition = 'created_at > NOW() - INTERVAL \'1 week\'';
      }

      const query = `
        SELECT 
          COUNT(*) as total_searches,
          COUNT(DISTINCT user_id) as unique_searchers,
          COALESCE(
            AVG(
              CASE 
                WHEN details->>'resultCount' ~ '^[0-9]+$' 
                THEN (details->>'resultCount')::integer 
                ELSE 0 
              END
            ), 0
          )::numeric(10,2) as avg_results_per_search,
          COUNT(
            CASE 
              WHEN details->>'resultCount' ~ '^[0-9]+$' 
                AND (details->>'resultCount')::integer = 0 
              THEN 1 
            END
          ) as zero_result_searches,
          COALESCE(
            AVG(
              CASE 
                WHEN details->>'responseTime' ~ '^[0-9.]+$' 
                THEN (details->>'responseTime')::numeric 
                ELSE 0 
              END
            ), 0
          )::numeric(10,2) as avg_response_time
        FROM activity_logs
        WHERE activity_type = 'search'
          AND ${timeCondition}
          AND details IS NOT NULL
      `;

      const result = await db.query(query);
      const analytics = result.rows[0];

      // Ensure all values are properly formatted
      return {
        total_searches: parseInt(analytics.total_searches) || 0,
        unique_searchers: parseInt(analytics.unique_searchers) || 0,
        avg_results_per_search: parseFloat(analytics.avg_results_per_search) || 0,
        zero_result_searches: parseInt(analytics.zero_result_searches) || 0,
        avg_response_time: parseFloat(analytics.avg_response_time) || 0,
        timeframe
      };
    } catch (error) {
      logger.error(`Failed to get search analytics: ${error.message}`);
      throw error;
    }
  }
}

module.exports = Search;