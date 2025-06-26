const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const assignmentValidation = require('../middleware/validation/assignment.validation');
const assignmentController = require('../controllers/assignment.controller');
const submissionController = require('../controllers/submission.controller');
const { upload } = require('../middleware/upload'); // For handling file uploads

// Add { mergeParams: true } to access parameters from the parent router (like :courseId)
const router = express.Router({ mergeParams: true });

// --- Existing Assignment Routes ---
router
    .route('/')
    .post(
        authenticate,
        authorize(['admin', 'guru']),
        validate(assignmentValidation.createAssignment),
        assignmentController.createAssignment
    )
    .get(
        authenticate,
        validate(assignmentValidation.getAssignments),
        assignmentController.getAssignments
    );

router
    .route('/:assignmentId')
    .get(
        authenticate,
        validate(assignmentValidation.getAssignment),
        assignmentController.getAssignment
    );

// --- NEW: Routes for Assignment Submissions ---

// Route to get all submissions for a specific assignment (for teachers/admins)
router
    .route('/:assignmentId/submissions')
    .get(
        authenticate,
        authorize(['admin', 'guru']),
        submissionController.getSubmissionsByAssignment
    );

// Route for a student to get their own submission
router
    .route('/:assignmentId/submission') // Using singular to denote the user's own submission
    .get(
        authenticate,
        authorize(['siswa']),
        submissionController.getStudentSubmission
    );

// Route to submit an essay-type assignment
router
    .route('/:assignmentId/submissions/essay')
    .post(
        authenticate,
        authorize(['siswa']),
        submissionController.submitEssay
    );

// Route to submit a file-type assignment
router
    .route('/:assignmentId/submissions/file')
    .post(
        authenticate,
        authorize(['siswa']),
        upload.single('file'), // Middleware to handle the file upload. The field name in the form-data should be 'file'.
        submissionController.submitFile
    );

// Route to submit a quiz-type assignment
router
    .route('/:assignmentId/submissions/quiz')
    .post(
        authenticate,
        authorize(['siswa']),
        submissionController.submitQuiz
    );


module.exports = router;