const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
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
    const studentId = req.user.id; // Assuming user ID is available from authentication middleware

    const submission = await submissionService.getStudentSubmissionForAssignment(assignmentId, studentId);
    res.send(submission);
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

module.exports = {
    submitEssay,
    submitFile,
    submitQuiz,
    getStudentSubmission,
    getSubmissionsByAssignment,
    updateSubmission,
    gradeSubmission,
};
