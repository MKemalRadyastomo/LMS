const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const assignmentValidation = require('../middleware/validation/assignment.validation');
const assignmentController = require('../controllers/assignment.controller');
const submissionRoutes = require('./submission.routes'); // Import submission routes

// Add { mergeParams: true } to access parameters from the parent router
const router = express.Router({ mergeParams: true });

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
    )
    .put(
        authenticate,
        authorize(['admin', 'guru']),
        validate(assignmentValidation.updateAssignment),
        assignmentController.updateAssignment
    )
    .delete(
        authenticate,
        authorize(['admin', 'guru']),
        validate(assignmentValidation.deleteAssignment),
        assignmentController.deleteAssignment
    );

// Analytics route for assignments
router
    .route('/:assignmentId/analytics')
    .get(
        authenticate,
        authorize(['admin', 'guru']),
        validate(assignmentValidation.getAssignment), // Reuse validation since it just checks assignmentId
        assignmentController.getAssignmentAnalytics
    );

// Nest the submission routes under the specific assignment
router.use('/:assignmentId/submissions', submissionRoutes);

module.exports = router;