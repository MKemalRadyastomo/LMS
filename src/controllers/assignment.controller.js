const { default: httpStatus } = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { assignmentService } = require('../services');
const ApiError = require('../utils/ApiError');
const Course = require('../models/course.model');

const getAssignments = catchAsync(async (req, res) => {
    const { courseId } = req.params;
    const filter = { ...req.query, course_id: parseInt(courseId, 10) };
    const options = {
        limit: req.query.limit,
        page: req.query.page,
    };
    const result = await assignmentService.queryAssignments(filter, options);
    res.send(result);
});

const getAssignment = catchAsync(async (req, res) => {
    const assignment = await assignmentService.getAssignmentById(req.params.assignmentId);
    if (assignment.course_id !== parseInt(req.params.courseId, 10)) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found in this course');
    }
    res.send(assignment);
});

const createAssignment = catchAsync(async (req, res) => {
    const { courseId } = req.params;
    const { id: userId, role } = req.user;

    if (role === 'guru') {
        const course = await Course.findById(courseId);
        if (!course) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Course not found.');
        }
        if (course.teacher_id !== userId) {
            throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to create assignments for this course.');
        }
    } else if (role !== 'admin') {
        throw new ApiError(httpStatus.FORBIDDEN, 'Only admins and teachers (guru) can create assignments.');
    }

    const assignmentBody = { ...req.body, course_id: parseInt(courseId, 10) };
    const assignment = await assignmentService.createAssignment(assignmentBody);

    console.log('--- DEBUG START ---');
    console.log('Value of httpStatus.CREATED:', httpStatus.CREATED);
    console.log('--- DEBUG END ---');

    res.status(httpStatus.CREATED).send(assignment);
});

module.exports = {
    createAssignment,
    getAssignments,
    getAssignment,
};