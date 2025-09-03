const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const assignmentTemplateValidation = require('../middleware/validation/assignmentTemplate.validation');
const assignmentTemplateController = require('../controllers/assignmentTemplate.controller');

const router = express.Router();

// Assignment template routes
router
    .route('/')
    .post(
        authenticate,
        authorize(['admin', 'guru']),
        validate(assignmentTemplateValidation.createTemplate),
        assignmentTemplateController.createTemplate
    )
    .get(
        authenticate,
        validate(assignmentTemplateValidation.getTemplates),
        assignmentTemplateController.getTemplates
    );

router
    .route('/:templateId')
    .get(
        authenticate,
        validate(assignmentTemplateValidation.getTemplate),
        assignmentTemplateController.getTemplate
    )
    .put(
        authenticate,
        authorize(['admin', 'guru']),
        validate(assignmentTemplateValidation.updateTemplate),
        assignmentTemplateController.updateTemplate
    )
    .delete(
        authenticate,
        authorize(['admin', 'guru']),
        validate(assignmentTemplateValidation.deleteTemplate),
        assignmentTemplateController.deleteTemplate
    );

// Create assignment from template
router
    .route('/:templateId/assignments')
    .post(
        authenticate,
        authorize(['admin', 'guru']),
        validate(assignmentTemplateValidation.createFromTemplate),
        assignmentTemplateController.createAssignmentFromTemplate
    );

// Bulk operations for templates
router
    .route('/bulk/delete')
    .post(
        authenticate,
        authorize(['admin']),
        validate(assignmentTemplateValidation.bulkDeleteTemplates),
        assignmentTemplateController.bulkDeleteTemplates
    );

module.exports = router;