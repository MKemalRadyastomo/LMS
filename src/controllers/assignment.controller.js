const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { assignmentService } = require('../services');
const ApiError = require('../utils/ApiError');
const Course = require('../models/course.model');

const getAssignments = catchAsync(async (req, res) => {
    const filter = { ...req.query }; // course_id and course_content_id will be in req.query
    const options = {
        limit: req.query.limit,
        page: req.query.page,
    };
    const result = await assignmentService.queryAssignments(filter, options);
    res.send(result);
});

const getAssignment = catchAsync(async (req, res) => {
    const assignment = await assignmentService.getAssignmentById(req.params.assignmentId);
    res.send(assignment);
});

const createAssignment = catchAsync(async (req, res) => {
    const { courseId } = req.params;
    const { id: userId, role } = req.user;

    if (role === 'guru') {
        if (!courseId) {
            throw ApiError.badRequest('Course ID is required for teachers to create assignments.');
        }
        const course = await Course.findById(courseId);
        if (!course) {
            throw ApiError.notFound('Course not found.');
        }
        if (course.teacher_id !== userId) {
            throw ApiError.forbidden('You are not authorized to create assignments for this course.');
        }
    } else if (role !== 'admin') {
        throw ApiError.forbidden('Only admins and teachers (guru) can create assignments.');
    }

    const assignmentBody = { ...req.body, course_id: courseId };
    const assignment = await assignmentService.createAssignment(assignmentBody);
    res.status(httpStatus.CREATED).send(assignment);
});

const getAssignmentsByCourse = catchAsync(async (req, res) => {
    const { courseId } = req.params;
    const filter = { course_id: courseId };
    const options = {
        limit: req.query.limit,
        page: req.query.page,
    };
    const result = await assignmentService.queryAssignments(filter, options);
    res.send(result);
});

module.exports = {
    createAssignment,
    getAssignments,
    getAssignment,
    getAssignmentsByCourse,
};
