const express = require('express');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const assignmentValidation = require('../middleware/validation/assignment.validation');
const assignmentController = require('../controllers/assignment.controller');

const router = express.Router();

router
    .route('/courses/:courseId/assignments')
    .post(auth.authorize('manageAssignments'), validate(assignmentValidation.createAssignment), assignmentController.createAssignment);

router
    .route('/')
    .get(auth.authorize('getAssignments'), validate(assignmentValidation.getAssignments), assignmentController.getAssignments);

router
    .route('/:assignmentId')
    .get(auth.authorize('getAssignment'), validate(assignmentValidation.getAssignment), assignmentController.getAssignment);

module.exports = router;
