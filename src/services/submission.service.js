const Submission = require('../models/submission.model');
const Assignment = require('../models/assignment.model');
const { ApiError } = require('../utils/ApiError');
const { default: httpStatus } = require('http-status');
const path = require('path');
const fs = require('fs');

const SubmissionService = {};

/**
 * Get submission by ID
 * @param {number} submissionId
 * @returns {Promise<Submission>}
 */
SubmissionService.getSubmissionById = async (submissionId) => {
    const submission = await Submission.findById(submissionId);
    if (!submission) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Submission not found');
    }
    return submission;
};

/**
 * Submit an essay assignment
 * @param {number} assignmentId
 * @param {number} studentId
 * @param {string} answerText
 * @param {boolean} isDraft
 * @returns {Promise<Submission>}
 */
SubmissionService.submitEssay = async (assignmentId, studentId, answerText, isDraft) => {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
    }
    if (assignment.type !== 'essay') {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Assignment is not an essay type');
    }

    const existingSubmission = await Submission.findByAssignmentAndStudent(assignmentId, studentId);

    // Enforce the new rule here
    if (existingSubmission && existingSubmission.status === 'submitted' && !assignment.allow_edits) {
        throw new ApiError(httpStatus.CONFLICT, 'This assignment cannot be edited after submission.');
    }

    if (assignment.due_date && new Date() > new Date(assignment.due_date) && !isDraft) {
        throw new ApiError(httpStatus.CONFLICT, 'Assignment due date has passed');
    }

    // Placeholder for anti-plagiarism check
    const plagiarismScore = await SubmissionService.runPlagiarismCheck(answerText);

    const submissionData = {
        assignment_id: assignmentId,
        student_id: studentId,
        submission_text: answerText,
        status: isDraft ? 'draft' : 'submitted',
        plagiarism_score: plagiarismScore,
    };

    if (existingSubmission) {
        return await Submission.update(existingSubmission.id, submissionData);
    } else {
        return await Submission.create(submissionData);
    }
};

/**
 * Submit a file upload assignment
 * @param {number} assignmentId
 * @param {number} studentId
 * @param {Object} file - Express Multer file object
 * @param {boolean} isDraft
 * @returns {Promise<Submission>}
 */
SubmissionService.submitFile = async (assignmentId, studentId, file, isDraft) => {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
    }
    if (assignment.type !== 'file_upload') {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Assignment is not a file upload type');
    }

    const existingSubmission = await Submission.findByAssignmentAndStudent(assignmentId, studentId);

    // Enforce the new rule here
    if (existingSubmission && existingSubmission.status === 'submitted' && !assignment.allow_edits) {
        throw new ApiError(httpStatus.CONFLICT, 'This assignment cannot be edited after submission.');
    }

    if (assignment.due_date && new Date() > new Date(assignment.due_date) && !isDraft) {
        throw new ApiError(httpStatus.CONFLICT, 'Assignment due date has passed');
    }

    // File validation
    const allowedFileTypes = assignment.allowed_file_types ? assignment.allowed_file_types.split(',') : [];
    const maxFileSizeMB = assignment.max_file_size_mb;

    const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);
    if (allowedFileTypes.length > 0 && !allowedFileTypes.includes(fileExtension)) {
        throw new ApiError(httpStatus.UNSUPPORTED_MEDIA_TYPE, `Unsupported file type. Allowed: ${allowedFileTypes.join(', ')}`);
    }
    if (maxFileSizeMB && file.size > maxFileSizeMB * 1024 * 1024) {
        throw new ApiError(httpStatus.PAYLOAD_TOO_LARGE, `File size exceeds limit of ${maxFileSizeMB}MB`);
    }

    // File should already be saved by multer middleware
    // We just need to get the file path from multer
    const filePath = file.path; // multer provides the saved file path

    const submissionData = {
        assignment_id: assignmentId,
        student_id: studentId,
        file_path: filePath,
        status: isDraft ? 'draft' : 'submitted',
    };

    if (existingSubmission) {
        // If updating an existing submission, delete the old file if it exists
        if (existingSubmission.file_path && fs.existsSync(existingSubmission.file_path)) {
            fs.unlinkSync(existingSubmission.file_path);
        }
        return await Submission.update(existingSubmission.id, submissionData);
    } else {
        return await Submission.create(submissionData);
    }
};

/**
 * Submit a quiz assignment
 * @param {number} assignmentId
 * @param {number} studentId
 * @param {Array<Object>} answers - Array of { question_id, answer }
 * @param {boolean} isDraft
 * @returns {Promise<Submission>}
 */
SubmissionService.submitQuiz = async (assignmentId, studentId, answers, isDraft) => {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
    }
    if (assignment.type !== 'quiz') {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Assignment is not a quiz type');
    }

    const existingSubmission = await Submission.findByAssignmentAndStudent(assignmentId, studentId);

    // Enforce the new rule here
    if (existingSubmission && existingSubmission.status === 'submitted' && !assignment.allow_edits) {
        throw new ApiError(httpStatus.CONFLICT, 'This assignment cannot be edited after submission.');
    }

    if (assignment.due_date && new Date() > new Date(assignment.due_date) && !isDraft) {
        throw new ApiError(httpStatus.CONFLICT, 'Assignment due date has passed');
    }

    // Calculate score if auto-gradable
    let score = null;
    if (!isDraft && assignment.quiz_questions_json) {
        score = SubmissionService.calculateQuizScore(assignment.quiz_questions_json, answers);
    }

    const submissionData = {
        assignment_id: assignmentId,
        student_id: studentId,
        quiz_answers_json: JSON.stringify(answers),
        grade: score,
        status: isDraft ? 'draft' : 'submitted',
    };

    if (existingSubmission) {
        return await Submission.update(existingSubmission.id, submissionData);
    } else {
        return await Submission.create(submissionData);
    }
};

/**
 * Get a student's submission for a specific assignment
 * @param {number} assignmentId
 * @param {number} studentId
 * @returns {Promise<Submission>}
 */
SubmissionService.getStudentSubmissionForAssignment = async (assignmentId, studentId) => {
    const submission = await Submission.findByAssignmentAndStudent(assignmentId, studentId);
    if (!submission) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Submission not found for this assignment and student');
    }
    return submission;
};

/**
 * Get all submissions for an assignment (for teachers)
 * @param {number} assignmentId
 * @returns {Promise<Array<Submission>>}
 */
SubmissionService.getSubmissionsByAssignmentId = async (assignmentId) => {
    return await Submission.findByAssignmentId(assignmentId);
};

/**
 * Placeholder for anti-plagiarism check
 * @param {string} text
 * @returns {Promise<number>} plagiarism score (0-100)
 */
SubmissionService.runPlagiarismCheck = async (text) => {
    // In a real application, this would integrate with a plagiarism detection API
    if (text) {
        console.log('Running plagiarism check for text:', text.substring(0, 50) + '...');
        return Math.floor(Math.random() * 10); // Simulate a low plagiarism score
    }
    return 0; // Return 0 if there is no text to check
};

/**
 * Calculate quiz score
 * @param {Array<Object>} quizQuestions - Array of quiz question objects from assignment
 * @param {Array<Object>} studentAnswers - Array of student's answers { question_id, answer }
 * @returns {number} calculated score
 */
SubmissionService.calculateQuizScore = (quizQuestions, studentAnswers) => {
    let score = 0;
    const questions = JSON.parse(quizQuestions); // Parse JSONB from DB

    questions.forEach(q => {
        const studentAnswer = studentAnswers.find(a => a.question_id === q.id);
        if (studentAnswer) {
            // Simple direct match for correct_answer
            if (q.correct_answer && studentAnswer.answer.toLowerCase() === q.correct_answer.toLowerCase()) {
                score += 1; // Assuming each correct answer adds 1 point
            }
        }
    });
    return score;
};


/**
 * Update a submission by its ID
 * @param {number} submissionId
 * @param {Object} updateBody
 * @returns {Promise<Submission>}
 */
SubmissionService.updateSubmission = async (submissionId, updateBody) => {
    const submission = await SubmissionService.getSubmissionById(submissionId);
    if (!submission) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Submission not found');
    }
    return await Submission.update(submissionId, updateBody);
};

/**
 * Grade a submission
 * @param {number} submissionId
 * @param {number} grade
 * @param {string} feedback
 * @param {number} graderId
 * @returns {Promise<Submission>}
 */
SubmissionService.gradeSubmission = async (submissionId, grade, feedback, graderId) => {
    const updateBody = {
        grade,
        feedback,
        graded_by: graderId,
        status: 'graded',
    };
    return SubmissionService.updateSubmission(submissionId, updateBody);
};

module.exports = SubmissionService;

