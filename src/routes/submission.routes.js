const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const submissionController = require('../controllers/submission.controller');
const materialUpload = require('../middleware/materialUpload');
const validate = require('../middleware/validate');
// You may need to create a submission.validation.js file for validation rules later.

const router = express.Router();

// --- Routes for Assignment Submissions ---

// GET /assignments/:assignmentId/submissions
// Get all submissions for an assignment (for teachers/admins)
router.get(
    '/:assignmentId/submissions',
    authenticate,
    authorize(['admin', 'guru']), // Protect this route
    submissionController.getSubmissionsByAssignment
);

// POST /assignments/:assignmentId/submit/essay
router.post(
    '/:assignmentId/submit/essay',
    authenticate,
    authorize(['siswa']), // Only students can submit
    submissionController.submitEssay
);

// POST /assignments/:assignmentId/submit/file
router.post(
    '/:assignmentId/submit/file',
    authenticate,
    authorize(['siswa']),
    materialUpload.single('file'), // Use middleware for file uploads
    submissionController.submitFile
);

// POST /assignments/:assignmentId/submit/quiz
router.post(
    '/:assignmentId/submit/quiz',
    authenticate,
    authorize(['siswa']),
    submissionController.submitQuiz
);

module.exports = router;