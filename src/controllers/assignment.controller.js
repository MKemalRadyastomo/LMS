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

    res.status(httpStatus.CREATED).send(assignment);
});

// ADDED: Controller to update an assignment
const updateAssignment = catchAsync(async (req, res) => {
    const { courseId, assignmentId } = req.params;
    const { id: userId, role } = req.user;

    const assignment = await assignmentService.getAssignmentById(assignmentId);
    if (assignment.course_id !== parseInt(courseId, 10)) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found in this course');
    }

    if (role === 'guru') {
        const course = await Course.findById(courseId);
        if (!course || course.teacher_id !== userId) {
            throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to update assignments for this course.');
        }
    } else if (role !== 'admin') {
        throw new ApiError(httpStatus.FORBIDDEN, 'Only admins and teachers (guru) can update assignments.');
    }

    const updatedAssignment = await assignmentService.updateAssignmentById(assignmentId, req.body);
    res.send(updatedAssignment);
});

module.exports = {
    createAssignment,
    getAssignments,
    getAssignment,
    updateAssignment, // ADDED: Export the new controller
};