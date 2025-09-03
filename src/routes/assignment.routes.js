const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const assignmentValidation = require('../middleware/validation/assignment.validation');
const assignmentController = require('../controllers/assignment.controller');

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

// Comprehensive analytics route
router
    .route('/:assignmentId/analytics/comprehensive')
    .get(
        authenticate,
        authorize(['admin', 'guru']),
        validate(assignmentValidation.getAssignment),
        assignmentController.getComprehensiveAnalytics
    );

// Duplicate assignment route
router
    .route('/:assignmentId/duplicate')
    .post(
        authenticate,
        authorize(['admin', 'guru']),
        validate(assignmentValidation.duplicateAssignment),
        assignmentController.duplicateAssignment
    );

// Update analytics route
router
    .route('/:assignmentId/analytics/update')
    .post(
        authenticate,
        authorize(['admin', 'guru']),
        validate(assignmentValidation.getAssignment),
        assignmentController.updateAnalytics
    );

module.exports = router;