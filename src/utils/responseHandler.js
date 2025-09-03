/**
 * Standardized response handler for optimistic updates and consistent API responses
 */

class ResponseHandler {
    /**
     * Success response with optimistic update support
     * @param {Object} res - Express response object
     * @param {Object} data - Response data
     * @param {string} message - Success message
     * @param {number} statusCode - HTTP status code
     * @param {Object} optimisticData - Data for optimistic updates
     */
    static success(res, data, message = 'Success', statusCode = 200, optimisticData = null) {
        const response = {
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        };

        // Add optimistic update data if provided
        if (optimisticData) {
            response.optimistic = optimisticData;
        }

        return res.status(statusCode).json(response);
    }

    /**
     * Error response with detailed error information
     * @param {Object} res - Express response object
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     * @param {string} errorCode - Internal error code
     * @param {Object} details - Additional error details
     */
    static error(res, message, statusCode = 500, errorCode = null, details = null) {
        const response = {
            success: false,
            message,
            timestamp: new Date().toISOString()
        };

        if (errorCode) {
            response.errorCode = errorCode;
        }

        if (details) {
            response.details = details;
        }

        return res.status(statusCode).json(response);
    }

    /**
     * Validation error response
     * @param {Object} res - Express response object
     * @param {Array} errors - Validation errors
     */
    static validationError(res, errors) {
        return this.error(res, 'Validation failed', 400, 'VALIDATION_ERROR', { errors });
    }

    /**
     * Optimistic enrollment response
     * @param {Object} res - Express response object
     * @param {Object} enrollmentData - Actual enrollment data
     * @param {Object} courseStats - Updated course statistics for optimistic UI
     * @param {string} operation - Operation type (enroll, unenroll, status_change)
     */
    static optimisticEnrollment(res, enrollmentData, courseStats = null, operation = 'enroll') {
        const optimisticData = {
            operation,
            timestamp: new Date().toISOString(),
            immediate: true
        };

        if (courseStats) {
            optimisticData.courseStats = courseStats;
        }

        return this.success(
            res, 
            enrollmentData, 
            `Enrollment ${operation} successful`, 
            operation === 'enroll' ? 201 : 200,
            optimisticData
        );
    }

    /**
     * Batch operation response
     * @param {Object} res - Express response object
     * @param {Object} results - Batch operation results
     * @param {string} operation - Operation type
     */
    static batchOperation(res, results, operation) {
        const { successful, failed, total, errors = [] } = results;
        
        const response = {
            success: failed === 0,
            partial: failed > 0 && successful > 0,
            message: failed === 0 
                ? `All ${total} ${operation} operations completed successfully`
                : `${successful} successful, ${failed} failed out of ${total} ${operation} operations`,
            data: {
                summary: {
                    total,
                    successful,
                    failed,
                    successRate: total > 0 ? Math.round((successful / total) * 100) : 0
                },
                results
            },
            timestamp: new Date().toISOString()
        };

        if (errors.length > 0) {
            response.errors = errors;
        }

        const statusCode = failed === 0 ? 200 : (successful > 0 ? 207 : 400); // 207 = Multi-Status
        return res.status(statusCode).json(response);
    }

    /**
     * Activity log response with recent activities
     * @param {Object} res - Express response object
     * @param {Object} activities - Activities data
     * @param {Object} summary - Activity summary
     */
    static activityResponse(res, activities, summary = null) {
        const response = {
            success: true,
            message: 'Activities retrieved successfully',
            data: activities,
            timestamp: new Date().toISOString()
        };

        if (summary) {
            response.summary = summary;
        }

        return res.json(response);
    }

    /**
     * Statistics response with caching headers
     * @param {Object} res - Express response object
     * @param {Object} stats - Statistics data
     * @param {number} cacheTime - Cache time in seconds
     */
    static statisticsResponse(res, stats, cacheTime = 300) {
        // Set cache headers for statistics (5 minutes default)
        res.set({
            'Cache-Control': `public, max-age=${cacheTime}`,
            'ETag': `"${Date.now()}"` // Simple ETag based on timestamp
        });

        return this.success(res, stats, 'Statistics retrieved successfully');
    }

    /**
     * Search results response
     * @param {Object} res - Express response object
     * @param {Object} results - Search results
     * @param {string} query - Search query
     * @param {Object} filters - Applied filters
     */
    static searchResponse(res, results, query = null, filters = null) {
        const response = {
            success: true,
            message: 'Search completed successfully',
            data: results,
            meta: {
                query,
                filters,
                resultCount: results.data ? results.data.length : 0,
                totalResults: results.pagination ? results.pagination.total : 0
            },
            timestamp: new Date().toISOString()
        };

        return res.json(response);
    }

    /**
     * Content response with metadata
     * @param {Object} res - Express response object
     * @param {Object} content - Content data
     * @param {string} contentType - Type of content
     * @param {Object} metadata - Additional metadata
     */
    static contentResponse(res, content, contentType, metadata = null) {
        const response = {
            success: true,
            message: `${contentType} retrieved successfully`,
            data: content,
            contentType,
            timestamp: new Date().toISOString()
        };

        if (metadata) {
            response.metadata = metadata;
        }

        return res.json(response);
    }
}

module.exports = ResponseHandler;