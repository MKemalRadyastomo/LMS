const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { ApiError } = require('../utils/ApiError');
const { assignmentBulkService } = require('../services');
const Course = require('../models/course.model');

const bulkCreateAssignments = catchAsync(async (req, res) => {
    const { id: userId, role } = req.user;
    const { assignments, courseId } = req.body;

    if (role !== 'admin' && role !== 'guru') {
        throw new ApiError(httpStatus.FORBIDDEN, 'Only admins and teachers can create assignments.');
    }

    // Verify course access for teachers
    if (role === 'guru') {
        const course = await Course.findById(courseId);
        if (!course) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Course not found.');
        }
        if (course.teacher_id !== userId) {
            throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to create assignments for this course.');
        }
    }

    if (!Array.isArray(assignments) || assignments.length === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Assignments array is required and cannot be empty.');
    }

    // Add course_id to all assignments
    const assignmentsWithCourse = assignments.map(assignment => ({
        ...assignment,
        course_id: courseId
    }));

    const createdAssignments = await assignmentBulkService.bulkCreateAssignments(assignmentsWithCourse);

    res.status(httpStatus.CREATED).send({
        success: true,
        message: `Successfully created ${createdAssignments.length} assignments`,
        data: createdAssignments
    });
});

const bulkUpdateAssignments = catchAsync(async (req, res) => {
    const { id: userId, role } = req.user;
    const { updates } = req.body;

    if (role !== 'admin' && role !== 'guru') {
        throw new ApiError(httpStatus.FORBIDDEN, 'Only admins and teachers can update assignments.');
    }

    if (!Array.isArray(updates) || updates.length === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Updates array is required and cannot be empty.');
    }

    // For teachers, verify they own all assignments being updated
    if (role === 'guru') {
        const assignmentIds = updates.map(update => update.id);
        const hasPermission = await assignmentBulkService.verifyTeacherAssignmentAccess(userId, assignmentIds);
        
        if (!hasPermission) {
            throw new ApiError(httpStatus.FORBIDDEN, 'You can only update assignments for courses you teach.');
        }
    }

    const updatedAssignments = await assignmentBulkService.bulkUpdateAssignments(updates);

    res.send({
        success: true,
        message: `Successfully updated ${updatedAssignments.length} assignments`,
        data: updatedAssignments
    });
});

const bulkDeleteAssignments = catchAsync(async (req, res) => {
    const { id: userId, role } = req.user;
    const { assignmentIds } = req.body;

    if (role !== 'admin' && role !== 'guru') {
        throw new ApiError(httpStatus.FORBIDDEN, 'Only admins and teachers can delete assignments.');
    }

    if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Assignment IDs array is required and cannot be empty.');
    }

    // For teachers, verify they own all assignments being deleted
    if (role === 'guru') {
        const hasPermission = await assignmentBulkService.verifyTeacherAssignmentAccess(userId, assignmentIds);
        
        if (!hasPermission) {
            throw new ApiError(httpStatus.FORBIDDEN, 'You can only delete assignments for courses you teach.');
        }
    }

    const deletedIds = await assignmentBulkService.bulkDeleteAssignments(assignmentIds);

    res.send({
        success: true,
        message: `Successfully deleted ${deletedIds.length} assignments`,
        data: { deleted_ids: deletedIds }
    });
});

const bulkGradeSubmissions = catchAsync(async (req, res) => {
    const { id: userId, role } = req.user;
    const { grades } = req.body;

    if (role !== 'admin' && role !== 'guru') {
        throw new ApiError(httpStatus.FORBIDDEN, 'Only admins and teachers can grade submissions.');
    }

    if (!Array.isArray(grades) || grades.length === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Grades array is required and cannot be empty.');
    }

    // Add graded_by to all grades
    const gradesWithGrader = grades.map(grade => ({
        ...grade,
        graded_by: userId
    }));

    // For teachers, verify they can grade all submissions
    if (role === 'guru') {
        const submissionIds = grades.map(grade => grade.submission_id);
        const hasPermission = await assignmentBulkService.verifyTeacherGradingAccess(userId, submissionIds);
        
        if (!hasPermission) {
            throw new ApiError(httpStatus.FORBIDDEN, 'You can only grade submissions for courses you teach.');
        }
    }

    const gradedSubmissions = await assignmentBulkService.bulkGradeSubmissions(gradesWithGrader);

    res.send({
        success: true,
        message: `Successfully graded ${gradedSubmissions.length} submissions`,
        data: gradedSubmissions
    });
});

const bulkUpdateAnalytics = catchAsync(async (req, res) => {
    const { id: userId, role } = req.user;
    const { assignmentIds, courseId } = req.body;

    if (role !== 'admin' && role !== 'guru') {
        throw new ApiError(httpStatus.FORBIDDEN, 'Only admins and teachers can update analytics.');
    }

    // Verify course access for teachers
    if (role === 'guru') {
        const course = await Course.findById(courseId);
        if (!course) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Course not found.');
        }
        if (course.teacher_id !== userId) {
            throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to update analytics for this course.');
        }
    }

    if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Assignment IDs array is required and cannot be empty.');
    }

    const results = await assignmentBulkService.bulkUpdateAnalytics(assignmentIds);

    res.send({
        success: true,
        message: `Successfully updated analytics for ${results.length} assignments`,
        data: results
    });
});

const exportAssignments = catchAsync(async (req, res) => {
    const { id: userId, role } = req.user;
    const { assignmentIds, format = 'json', courseId } = req.body;

    if (role !== 'admin' && role !== 'guru') {
        throw new ApiError(httpStatus.FORBIDDEN, 'Only admins and teachers can export assignments.');
    }

    // Verify course access for teachers
    if (role === 'guru') {
        const course = await Course.findById(courseId);
        if (!course) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Course not found.');
        }
        if (course.teacher_id !== userId) {
            throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to export assignments for this course.');
        }
    }

    if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Assignment IDs array is required and cannot be empty.');
    }

    const exportData = await assignmentBulkService.exportAssignments(assignmentIds, format);

    if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=assignments.csv');
        res.send(exportData);
    } else {
        res.send({
            success: true,
            data: exportData,
            format: format
        });
    }
});

const importAssignments = catchAsync(async (req, res) => {
    const { id: userId, role } = req.user;
    const { assignments, courseId, overwrite = false } = req.body;

    if (role !== 'admin' && role !== 'guru') {
        throw new ApiError(httpStatus.FORBIDDEN, 'Only admins and teachers can import assignments.');
    }

    // Verify course access for teachers
    if (role === 'guru') {
        const course = await Course.findById(courseId);
        if (!course) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Course not found.');
        }
        if (course.teacher_id !== userId) {
            throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to import assignments for this course.');
        }
    }

    if (!Array.isArray(assignments) || assignments.length === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Assignments array is required and cannot be empty.');
    }

    const importResults = await assignmentBulkService.importAssignments(assignments, courseId, overwrite);

    res.status(httpStatus.CREATED).send({
        success: true,
        message: `Successfully imported ${importResults.created} assignments`,
        data: {
            created: importResults.created,
            updated: importResults.updated,
            skipped: importResults.skipped,
            errors: importResults.errors
        }
    });
});

module.exports = {
    bulkCreateAssignments,
    bulkUpdateAssignments,
    bulkDeleteAssignments,
    bulkGradeSubmissions,
    bulkUpdateAnalytics,
    exportAssignments,
    importAssignments
};