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
    );

module.exports = router;