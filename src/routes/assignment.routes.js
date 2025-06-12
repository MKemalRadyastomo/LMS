const express = require('express');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const assignmentValidation = require('../middleware/validation/assignment.validation');
const assignmentController = require('../controllers/assignment.controller');

const router = express.Router();

router
    .route('/')
    .get(auth('getAssignments'), validate(assignmentValidation.getAssignments), assignmentController.getAssignments);

router
    .route('/:assignmentId')
    .get(auth('getAssignment'), validate(assignmentValidation.getAssignment), assignmentController.getAssignment);

module.exports = router;
