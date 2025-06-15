const Assignment = require('../models/assignment.model');
const CourseContent = require('../models/courseContent.model'); // Import CourseContent model
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
    let assignments;
    if (filter.course_content_id) {
        assignments = await Assignment.findByCourseContentId(filter.course_content_id, filter);
    } else if (filter.course_id) {
        assignments = await Assignment.findByCourseId(filter.course_id, filter);
    } else {
        // If neither course_id nor course_content_id is provided, return an empty array or throw an error
        // depending on desired behavior. For now, returning empty.
        assignments = [];
    }

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

/**
 * Create an assignment
 * @param {Object} assignmentBody
 * @returns {Promise<Assignment>}
 */
AssignmentService.createAssignment = async (assignmentBody) => {
    if (assignmentBody.course_content_id && !assignmentBody.course_id) {
        const courseContent = await CourseContent.findById(assignmentBody.course_content_id);
        if (!courseContent) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Course content not found');
        }
        assignmentBody.course_id = courseContent.course_id;
    }
    const assignment = await Assignment.create(assignmentBody);
    return assignment;
};

module.exports = AssignmentService;
