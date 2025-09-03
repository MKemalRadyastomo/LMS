const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const assignmentBulkValidation = require('../middleware/validation/assignmentBulk.validation');
const assignmentBulkController = require('../controllers/assignmentBulk.controller');

const router = express.Router();

// Bulk assignment operations
router
    .route('/create')
    .post(
        authenticate,
        authorize(['admin', 'guru']),
        validate(assignmentBulkValidation.bulkCreate),
        assignmentBulkController.bulkCreateAssignments
    );

router
    .route('/update')
    .put(
        authenticate,
        authorize(['admin', 'guru']),
        validate(assignmentBulkValidation.bulkUpdate),
        assignmentBulkController.bulkUpdateAssignments
    );

router
    .route('/delete')
    .post(
        authenticate,
        authorize(['admin', 'guru']),
        validate(assignmentBulkValidation.bulkDelete),
        assignmentBulkController.bulkDeleteAssignments
    );

// Bulk grading operations
router
    .route('/grade')
    .post(
        authenticate,
        authorize(['admin', 'guru']),
        validate(assignmentBulkValidation.bulkGrade),
        assignmentBulkController.bulkGradeSubmissions
    );

// Bulk analytics update
router
    .route('/analytics/update')
    .post(
        authenticate,
        authorize(['admin', 'guru']),
        validate(assignmentBulkValidation.bulkUpdateAnalytics),
        assignmentBulkController.bulkUpdateAnalytics
    );

// Export assignment data
router
    .route('/export')
    .post(
        authenticate,
        authorize(['admin', 'guru']),
        validate(assignmentBulkValidation.exportAssignments),
        assignmentBulkController.exportAssignments
    );

// Import assignment data
router
    .route('/import')
    .post(
        authenticate,
        authorize(['admin', 'guru']),
        validate(assignmentBulkValidation.importAssignments),
        assignmentBulkController.importAssignments
    );

module.exports = router;