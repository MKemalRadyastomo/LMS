const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { ApiError } = require('../utils/ApiError');
const { submissionService } = require('../services');

const submitEssay = catchAsync(async (req, res) => {
    const { assignmentId } = req.params;
    const { answer_text, draft } = req.body;
    const studentId = req.user.id; // Assuming user ID is available from authentication middleware

    const submission = await submissionService.submitEssay(assignmentId, studentId, answer_text, draft);
    res.status(httpStatus.CREATED).send(submission);
});

const submitFile = catchAsync(async (req, res) => {
    const { assignmentId } = req.params;
    const { draft } = req.body;
    const studentId = req.user.id; // Assuming user ID is available from authentication middleware

    if (!req.file) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'No file uploaded');
    }

    const submission = await submissionService.submitFile(assignmentId, studentId, req.file, draft);
    res.status(httpStatus.CREATED).send(submission);
});

const submitQuiz = catchAsync(async (req, res) => {
    const { assignmentId } = req.params;
    const { answers, draft } = req.body;
    const studentId = req.user.id; // Assuming user ID is available from authentication middleware

    const submission = await submissionService.submitQuiz(assignmentId, studentId, answers, draft);
    res.status(httpStatus.CREATED).send(submission);
});

const getStudentSubmission = catchAsync(async (req, res) => {
    const { assignmentId } = req.params;
    const { id: userId, role } = req.user;

    // Role-based access control
    if (role === 'siswa') {
        // Students can only access their own submissions
        const submission = await submissionService.getStudentSubmissionForAssignment(assignmentId, userId);
        res.send(submission);
    } else if (role === 'guru' || role === 'admin') {
        // Teachers and admins need to specify which student's submission they want
        // For now, if no studentId is provided in query, return error
        const studentId = req.query.studentId || userId;
        
        // For teachers, verify they own the course containing this assignment
        if (role === 'guru') {
            const { assignmentService } = require('../services');
            const assignment = await assignmentService.getAssignmentById(assignmentId);
            const Course = require('../models/course.model');
            const course = await Course.findById(assignment.course_id);
            if (!course || course.teacher_id !== userId) {
                throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to view submissions for this assignment.');
            }
        }
        
        const submission = await submissionService.getStudentSubmissionForAssignment(assignmentId, studentId);
        res.send(submission);
    } else {
        throw new ApiError(httpStatus.FORBIDDEN, 'Invalid role for accessing submissions');
    }
});

const getSubmissionsByAssignment = catchAsync(async (req, res) => {
    const { assignmentId } = req.params;
    // This endpoint might need role-based access control (e.g., only teachers can view all submissions)
    const submissions = await submissionService.getSubmissionsByAssignmentId(assignmentId);
    res.send(submissions);
});

const updateSubmission = catchAsync(async (req, res) => {
    const { submissionId } = req.params;
    const studentId = req.user.id; // Assuming user ID is available from authentication middleware

    // Ensure the student is only updating their own submission
    const existingSubmission = await submissionService.getSubmissionById(submissionId);
    if (!existingSubmission || existingSubmission.student_id !== studentId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'You can only update your own submissions');
    }

    const submission = await submissionService.updateSubmission(submissionId, req.body);
    res.send(submission);
});


const gradeSubmission = catchAsync(async (req, res) => {
    const { submissionId } = req.params;
    const { grade, feedback } = req.body;
    const graderId = req.user.id;

    const submission = await submissionService.gradeSubmission(submissionId, grade, feedback, graderId);
    res.send(submission);
});

// Enhanced submission with version tracking
const submitEnhanced = catchAsync(async (req, res) => {
    const { assignmentId } = req.params;
    const { id: studentId } = req.user;
    const { submission_text, quiz_answers, is_draft = false } = req.body;
    const files = req.files || [];

    // Process file data
    const fileData = files.map(file => ({
        original_filename: file.originalname,
        stored_filename: file.filename,
        file_path: file.path,
        file_size: file.size,
        mime_type: file.mimetype,
        file_hash: generateFileHash(file)
    }));

    const submissionData = {
        assignment_id: parseInt(assignmentId),
        student_id: studentId,
        submission_text,
        quiz_answers_json: quiz_answers,
        file_data: fileData,
        is_draft,
        auto_saved: false
    };

    const submission = await submissionService.createEnhanced(submissionData);
    
    res.status(httpStatus.CREATED).send({
        success: true,
        message: is_draft ? 'Draft saved successfully' : 'Submission created successfully',
        data: submission
    });
});

// Auto-save submission draft
const autoSave = catchAsync(async (req, res) => {
    const { assignmentId } = req.params;
    const { id: studentId } = req.user;
    const content = req.body;

    const submission = await submissionService.autoSave(parseInt(assignmentId), studentId, content);
    
    res.send({
        success: true,
        message: 'Draft auto-saved successfully',
        data: submission
    });
});

// Submit final version
const submitFinal = catchAsync(async (req, res) => {
    const { submissionId } = req.params;
    const { id: studentId } = req.user;

    // Verify ownership
    const existingSubmission = await submissionService.getSubmissionById(submissionId);
    if (!existingSubmission || existingSubmission.student_id !== studentId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'You can only submit your own assignments');
    }

    const submission = await submissionService.submitFinal(submissionId);
    
    res.send({
        success: true,
        message: 'Assignment submitted successfully',
        data: submission
    });
});

// Get submission with version history
const getSubmissionWithVersions = catchAsync(async (req, res) => {
    const { submissionId } = req.params;
    const { id: userId, role } = req.user;

    const submission = await submissionService.getSubmissionWithVersions(submissionId);
    
    if (!submission) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Submission not found');
    }

    // Check access permissions
    if (role === 'siswa' && submission.student_id !== userId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'You can only access your own submissions');
    } else if (role === 'guru') {
        // Verify teacher owns the course
        const assignment = await submissionService.getAssignmentById(submission.assignment_id);
        const course = await Course.findById(assignment.course_id);
        if (!course || course.teacher_id !== userId) {
            throw new ApiError(httpStatus.FORBIDDEN, 'You can only access submissions from your courses');
        }
    }

    res.send({
        success: true,
        data: submission
    });
});

// Get latest version of submission
const getLatestVersion = catchAsync(async (req, res) => {
    const { assignmentId } = req.params;
    const { id: studentId } = req.user;

    const submission = await submissionService.getLatestVersion(parseInt(assignmentId), studentId);
    
    res.send({
        success: true,
        data: submission
    });
});

// Get submission files
const getSubmissionFiles = catchAsync(async (req, res) => {
    const { submissionId } = req.params;
    const { versionId } = req.query;
    const { id: userId, role } = req.user;

    // Verify access
    const submission = await submissionService.getSubmissionById(submissionId);
    if (!submission) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Submission not found');
    }

    if (role === 'siswa' && submission.student_id !== userId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'You can only access your own submission files');
    }

    const files = await submissionService.getSubmissionFiles(submissionId, versionId);
    
    res.send({
        success: true,
        data: files
    });
});

// Delete submission file
const deleteSubmissionFile = catchAsync(async (req, res) => {
    const { fileId } = req.params;
    const { id: userId } = req.user;

    // Verify ownership through submission
    const file = await submissionService.getFileById(fileId);
    if (!file) {
        throw new ApiError(httpStatus.NOT_FOUND, 'File not found');
    }

    const submission = await submissionService.getSubmissionById(file.submission_id);
    if (!submission || submission.student_id !== userId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'You can only delete your own submission files');
    }

    await submissionService.deleteSubmissionFile(fileId);
    
    res.status(httpStatus.NO_CONTENT).send();
});

// Grade with detailed rubric
const gradeDetailed = catchAsync(async (req, res) => {
    const { submissionId } = req.params;
    const { id: graderId, role } = req.user;
    const gradeData = { ...req.body, graded_by: graderId };

    if (role !== 'admin' && role !== 'guru') {
        throw new ApiError(httpStatus.FORBIDDEN, 'Only teachers and admins can grade submissions');
    }

    // Verify teacher can grade this submission
    if (role === 'guru') {
        const hasAccess = await submissionService.verifyTeacherGradingAccess(graderId, [submissionId]);
        if (!hasAccess) {
            throw new ApiError(httpStatus.FORBIDDEN, 'You can only grade submissions from your courses');
        }
    }

    const result = await submissionService.gradeDetailed(submissionId, gradeData);
    
    res.send({
        success: true,
        message: 'Submission graded successfully',
        data: result
    });
});

// Apply automated grading
const applyAutomatedGrading = catchAsync(async (req, res) => {
    const { submissionId } = req.params;
    const { id: userId, role } = req.user;

    if (role !== 'admin' && role !== 'guru') {
        throw new ApiError(httpStatus.FORBIDDEN, 'Only teachers and admins can apply automated grading');
    }

    // Verify teacher can grade this submission
    if (role === 'guru') {
        const hasAccess = await submissionService.verifyTeacherGradingAccess(userId, [submissionId]);
        if (!hasAccess) {
            throw new ApiError(httpStatus.FORBIDDEN, 'You can only grade submissions from your courses');
        }
    }

    const result = await submissionService.applyAutomatedGrading(submissionId);
    
    res.send({
        success: true,
        message: 'Automated grading applied successfully',
        data: { auto_grade: result }
    });
});

// Get plagiarism report
const getPlagiarismReport = catchAsync(async (req, res) => {
    const { submissionId } = req.params;
    const { id: userId, role } = req.user;

    if (role !== 'admin' && role !== 'guru') {
        throw new ApiError(httpStatus.FORBIDDEN, 'Only teachers and admins can access plagiarism reports');
    }

    const report = await submissionService.getPlagiarismReport(submissionId);
    
    res.send({
        success: true,
        data: report
    });
});

// Get student analytics
const getStudentAnalytics = catchAsync(async (req, res) => {
    const { id: studentId } = req.user;
    const { courseId } = req.query;

    const analytics = await submissionService.getStudentAnalytics(studentId, courseId);
    
    res.send({
        success: true,
        data: analytics
    });
});

// Bulk grade submissions
const bulkGradeSubmissions = catchAsync(async (req, res) => {
    const { id: userId, role } = req.user;
    const { grades } = req.body;

    if (role !== 'admin' && role !== 'guru') {
        throw new ApiError(httpStatus.FORBIDDEN, 'Only teachers and admins can grade submissions');
    }

    if (!Array.isArray(grades) || grades.length === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Grades array is required and cannot be empty');
    }

    // Verify teacher can grade all submissions
    if (role === 'guru') {
        const submissionIds = grades.map(grade => grade.submission_id);
        const hasAccess = await submissionService.verifyTeacherGradingAccess(userId, submissionIds);
        if (!hasAccess) {
            throw new ApiError(httpStatus.FORBIDDEN, 'You can only grade submissions from your courses');
        }
    }

    const results = await submissionService.bulkGradeSubmissions(grades);
    
    res.send({
        success: true,
        message: `Successfully graded ${results.length} submissions`,
        data: results
    });
});

// Helper function to generate file hash
const crypto = require('crypto');
const fs = require('fs');

function generateFileHash(file) {
    const fileBuffer = fs.readFileSync(file.path);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

module.exports = {
    submitEssay,
    submitFile,
    submitQuiz,
    getStudentSubmission,
    getSubmissionsByAssignment,
    updateSubmission,
    gradeSubmission,
    submitEnhanced,
    autoSave,
    submitFinal,
    getSubmissionWithVersions,
    getLatestVersion,
    getSubmissionFiles,
    deleteSubmissionFile,
    gradeDetailed,
    applyAutomatedGrading,
    getPlagiarismReport,
    getStudentAnalytics,
    bulkGradeSubmissions,
};
