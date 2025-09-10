const { default: httpStatus } = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { assignmentService } = require('../services');
const { ApiError } = require('../utils/ApiError');
const Course = require('../models/course.model');

const getAssignments = catchAsync(async (req, res) => {
    const { courseId } = req.params;
    const { id: userId, role } = req.user;

    // Role-based access control
    if (role === 'siswa') {
        const Enrollment = require('../models/enrollment.model');
        const enrollment = await Enrollment.findByCourseAndStudent(courseId, userId);
        if (!enrollment || enrollment.status !== 'active') {
            throw new ApiError(httpStatus.FORBIDDEN, 'You are not enrolled in this course');
        }
    } else if (role === 'guru') {
        const course = await Course.findById(courseId);
        if (!course) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Course not found.');
        }
        if (course.teacher_id !== userId) {
            throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to view assignments for this course.');
        }
    }
    // Admins can access all assignments (no additional check needed)

    const filter = { ...req.query, course_id: parseInt(courseId, 10) };
    const options = {
        limit: req.query.limit,
        page: req.query.page,
    };
    const result = await assignmentService.queryAssignments(filter, options);
    res.send(result);
});

const getAssignment = catchAsync(async (req, res) => {
    const { courseId, assignmentId } = req.params;
    const { id: userId, role } = req.user;

    const assignment = await assignmentService.getAssignmentById(assignmentId);
    if (assignment.course_id !== parseInt(courseId, 10)) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found in this course');
    }

    // For students, check if they are enrolled in the course
    if (role === 'siswa') {
        const Enrollment = require('../models/enrollment.model');
        const enrollment = await Enrollment.findByCourseAndStudent(courseId, userId);
        if (!enrollment || enrollment.status !== 'active') {
            throw new ApiError(httpStatus.FORBIDDEN, 'You are not enrolled in this course');
        }
    }
    // For teachers, check if they own the course
    else if (role === 'guru') {
        const course = await Course.findById(courseId);
        if (!course) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Course not found.');
        }
        if (course.teacher_id !== userId) {
            throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to view assignments for this course.');
        }
    }
    // Admins can access all assignments (no additional check needed)

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

    res.status(httpStatus.CREATED).send({
        success: true,
        message: 'Assignment created successfully',
        data: assignment
    });
});

const getComprehensiveAnalytics = catchAsync(async (req, res) => {
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

    const analytics = await assignmentService.getComprehensiveAnalytics(assignmentId);
    res.send({
        success: true,
        data: analytics
    });
});

const duplicateAssignment = catchAsync(async (req, res) => {
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
            throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to duplicate assignments for this course.');
        }
    } else if (role !== 'admin') {
        throw new ApiError(httpStatus.FORBIDDEN, 'Only admins and teachers (guru) can duplicate assignments.');
    }

    const duplicateData = req.body || {};
    const duplicate = await assignmentService.duplicateAssignment(assignmentId, duplicateData);
    
    res.status(httpStatus.CREATED).send({
        success: true,
        message: 'Assignment duplicated successfully',
        data: duplicate
    });
});

const updateAnalytics = catchAsync(async (req, res) => {
    const { courseId, assignmentId } = req.params;
    const { id: userId, role } = req.user;

    // Check if assignment exists and belongs to the course
    const assignment = await assignmentService.getAssignmentById(assignmentId);
    if (assignment.course_id !== parseInt(courseId, 10)) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found in this course');
    }

    // Permission check - only teachers and admins can update analytics
    if (role === 'guru') {
        const course = await Course.findById(courseId);
        if (!course) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Course not found.');
        }
        if (course.teacher_id !== userId) {
            throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to update analytics for this course.');
        }
    } else if (role !== 'admin') {
        throw new ApiError(httpStatus.FORBIDDEN, 'Only admins and teachers (guru) can update assignment analytics.');
    }

    const result = await assignmentService.updateAnalytics(assignmentId);
    res.send({
        success: true,
        message: 'Analytics updated successfully',
        data: { updated: result }
    });
});

const getAllAssignmentsForUser = catchAsync(async (req, res) => {
    const { id: userId, role } = req.user;
    const { status, course_id, search, sortBy = 'due_date', sortOrder = 'asc' } = req.query;

    let assignments = [];

    if (role === 'siswa') {
        // For students, get assignments from enrolled courses
        const Enrollment = require('../models/enrollment.model');
        const enrollments = await Enrollment.findByStudent(userId);
        
        if (enrollments && enrollments.length > 0) {
            const courseIds = enrollments
                .filter(enrollment => enrollment.status === 'active')
                .map(enrollment => enrollment.course_id);
            
            if (courseIds.length > 0) {
                const filter = { 
                    course_ids: courseIds,
                    ...(status && { status }),
                    ...(course_id && { course_id: parseInt(course_id, 10) }),
                    ...(search && { search })
                };
                
                const options = {
                    sortBy,
                    sortOrder,
                    limit: req.query.limit,
                    page: req.query.page,
                };
                
                const result = await assignmentService.queryAssignmentsByMultipleCourses(filter, options);
                assignments = result.results || [];
            }
        }
    } else if (role === 'guru') {
        // For teachers, get assignments from courses they teach
        const filter = { 
            teacher_id: userId,
            ...(status && { status }),
            ...(course_id && { course_id: parseInt(course_id, 10) }),
            ...(search && { search })
        };
        
        const options = {
            sortBy,
            sortOrder,
            limit: req.query.limit,
            page: req.query.page,
        };
        
        const result = await assignmentService.queryAssignmentsByTeacher(filter, options);
        assignments = result.results || [];
    } else if (role === 'admin') {
        // For admins, get all assignments
        const filter = { 
            ...(status && { status }),
            ...(course_id && { course_id: parseInt(course_id, 10) }),
            ...(search && { search })
        };
        
        const options = {
            sortBy,
            sortOrder,
            limit: req.query.limit,
            page: req.query.page,
        };
        
        const result = await assignmentService.queryAssignments(filter, options);
        assignments = result.results || [];
    }

    res.send({
        success: true,
        data: assignments,
        message: 'Assignments retrieved successfully'
    });
});

module.exports = {
    createAssignment,
    getAssignments,
    getAssignment,
    updateAssignment,
    deleteAssignment,
    getAssignmentAnalytics,
    getComprehensiveAnalytics,
    duplicateAssignment,
    updateAnalytics,
    getAllAssignmentsForUser,
};