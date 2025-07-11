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

const updateAssignment = catchAsync(async (req, res) => {
    const { courseId, assignmentId } = req.params;
    const { id: userId, role } = req.user;

    // Check if assignment exists and belongs to the course
    const assignment = await assignmentService.getAssignmentById(assignmentId);
    if (assignment.course_id !== parseInt(courseId, 10)) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found in this course');
    }

    // Permission check for teachers
    if (role === 'guru') {
        const course = await Course.findById(courseId);
        if (!course) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Course not found.');
        }
        if (course.teacher_id !== userId) {
            throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to update assignments for this course.');
        }
    } else if (role !== 'admin') {
        throw new ApiError(httpStatus.FORBIDDEN, 'Only admins and teachers (guru) can update assignments.');
    }

    const updatedAssignment = await assignmentService.updateAssignment(assignmentId, req.body);
    res.send(updatedAssignment);
});

const deleteAssignment = catchAsync(async (req, res) => {
    const { courseId, assignmentId } = req.params;
    const { id: userId, role } = req.user;

    // Check if assignment exists and belongs to the course
    const assignment = await assignmentService.getAssignmentById(assignmentId);
    if (assignment.course_id !== parseInt(courseId, 10)) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found in this course');
    }

    // Permission check for teachers
    if (role === 'guru') {
        const course = await Course.findById(courseId);
        if (!course) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Course not found.');
        }
        if (course.teacher_id !== userId) {
            throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to delete assignments for this course.');
        }
    } else if (role !== 'admin') {
        throw new ApiError(httpStatus.FORBIDDEN, 'Only admins and teachers (guru) can delete assignments.');
    }

    await assignmentService.deleteAssignment(assignmentId);
    res.status(httpStatus.NO_CONTENT).send();
});

const getAssignmentAnalytics = catchAsync(async (req, res) => {
    const { courseId, assignmentId } = req.params;
    const { id: userId, role } = req.user;

    // Check if assignment exists and belongs to the course
    const assignment = await assignmentService.getAssignmentById(assignmentId);
    if (assignment.course_id !== parseInt(courseId, 10)) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found in this course');
    }

    // Permission check - only teachers and admins can view analytics
    if (role === 'guru') {
        const course = await Course.findById(courseId);
        if (!course) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Course not found.');
        }
        if (course.teacher_id !== userId) {
            throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to view analytics for this course.');
        }
    } else if (role !== 'admin') {
        throw new ApiError(httpStatus.FORBIDDEN, 'Only admins and teachers (guru) can view assignment analytics.');
    }

    const analytics = await assignmentService.getAssignmentAnalytics(assignmentId);
    res.send(analytics);
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
    updateAssignment,
    deleteAssignment,
    getAssignmentAnalytics,
};