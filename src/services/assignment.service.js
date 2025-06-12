const Assignment = require('../models/assignment.model');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');

const AssignmentService = {};

/**
 * Get assignment by ID
 * @param {number} assignmentId
 * @returns {Promise<Assignment>}
 */
AssignmentService.getAssignmentById = async (assignmentId) => {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
    }
    return assignment;
};

/**
 * Query for assignments
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
AssignmentService.queryAssignments = async (filter, options) => {
    // This is a simplified pagination and filtering.
    // In a real application, you'd build dynamic queries based on filter and options.
    const assignments = await Assignment.findByCourseId(filter.course_id, filter); // Assuming course_id is in filter
    // For now, we'll return all found assignments without actual pagination logic here.
    // Real pagination would involve limit, offset, and total counts.
    return {
        results: assignments,
        page: options.page || 1,
        limit: options.limit || assignments.length,
        totalPages: 1,
        totalResults: assignments.length,
    };
};

module.exports = AssignmentService;
