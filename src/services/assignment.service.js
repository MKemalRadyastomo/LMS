const Assignment = require('../models/assignment.model');
const CourseContent = require('../models/courseContent.model'); // Import CourseContent model
const { ApiError } = require('../utils/ApiError');
const { default: httpStatus } = require('http-status');

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

/**
 * Update assignment by ID
 * @param {number} assignmentId
 * @param {Object} updateBody
 * @returns {Promise<Assignment>}
 */
AssignmentService.updateAssignment = async (assignmentId, updateBody) => {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
    }
    const updatedAssignment = await Assignment.update(assignmentId, updateBody);
    return updatedAssignment;
};

/**
 * Delete assignment by ID
 * @param {number} assignmentId
 * @returns {Promise<void>}
 */
AssignmentService.deleteAssignment = async (assignmentId) => {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
    }
    await Assignment.delete(assignmentId);
};

/**
 * Get assignment analytics
 * @param {number} assignmentId
 * @returns {Promise<Object>} analytics data
 */
AssignmentService.getAssignmentAnalytics = async (assignmentId) => {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
    }

    return await Assignment.getAnalytics(assignmentId);
};

/**
 * Get comprehensive assignment analytics
 * @param {number} assignmentId
 * @returns {Promise<Object>} comprehensive analytics data
 */
AssignmentService.getComprehensiveAnalytics = async (assignmentId) => {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
    }

    return await Assignment.getComprehensiveAnalytics(assignmentId);
};

/**
 * Duplicate assignment
 * @param {number} assignmentId
 * @param {Object} newAssignmentData
 * @returns {Promise<Assignment>}
 */
AssignmentService.duplicateAssignment = async (assignmentId, newAssignmentData = {}) => {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
    }

    return await Assignment.duplicate(assignmentId, newAssignmentData);
};

/**
 * Update assignment analytics
 * @param {number} assignmentId
 * @returns {Promise<boolean>}
 */
AssignmentService.updateAnalytics = async (assignmentId) => {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
    }

    return await Assignment.updateAnalytics(assignmentId);
};

/**
 * Create assignment using enhanced method
 * @param {Object} assignmentBody
 * @returns {Promise<Assignment>}
 */
AssignmentService.createEnhancedAssignment = async (assignmentBody) => {
    if (assignmentBody.course_content_id && !assignmentBody.course_id) {
        const courseContent = await CourseContent.findById(assignmentBody.course_content_id);
        if (!courseContent) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Course content not found');
        }
        assignmentBody.course_id = courseContent.course_id;
    }
    
    return await Assignment.createEnhanced(assignmentBody);
};

/**
 * Get upcoming assignments for a course
 * @param {number} courseId
 * @param {number} daysAhead
 * @returns {Promise<Array>}
 */
AssignmentService.getUpcomingAssignments = async (courseId, daysAhead = 7) => {
    return await Assignment.getUpcoming(courseId, daysAhead);
};

/**
 * Get overdue assignments for a course
 * @param {number} courseId
 * @returns {Promise<Array>}
 */
AssignmentService.getOverdueAssignments = async (courseId) => {
    return await Assignment.getOverdue(courseId);
};

/**
 * Get assignments by type
 * @param {string} type
 * @param {Object} filters
 * @returns {Promise<Array>}
 */
AssignmentService.getAssignmentsByType = async (type, filters = {}) => {
    return await Assignment.findByType(type, filters);
};

/**
 * Get assignments with submissions for teacher view
 * @param {number} assignmentId
 * @returns {Promise<Array>}
 */
AssignmentService.getAssignmentWithSubmissions = async (assignmentId) => {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
    }

    return await Assignment.getSubmissionsWithStudents(assignmentId);
};

/**
 * Query assignments by multiple course IDs (for students)
 * @param {Object} filter - Query filter including course_ids array
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
AssignmentService.queryAssignmentsByMultipleCourses = async (filter, options) => {
    const { course_ids, ...otherFilters } = filter;
    
    if (!course_ids || !Array.isArray(course_ids) || course_ids.length === 0) {
        return {
            results: [],
            page: options.page || 1,
            limit: options.limit || 0,
            totalPages: 0,
            totalResults: 0
        };
    }

    const assignments = await Assignment.findByMultipleCourseIds(course_ids, otherFilters);
    
    return {
        results: assignments,
        page: options.page || 1,
        limit: options.limit || assignments.length,
        totalPages: 1,
        totalResults: assignments.length
    };
};

/**
 * Query assignments by teacher ID (for teachers)
 * @param {Object} filter - Query filter including teacher_id
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
AssignmentService.queryAssignmentsByTeacher = async (filter, options) => {
    const assignments = await Assignment.findByTeacherId(filter.teacher_id, filter);
    
    return {
        results: assignments,
        page: options.page || 1,
        limit: options.limit || assignments.length,
        totalPages: 1,
        totalResults: assignments.length
    };
};

module.exports = AssignmentService;
