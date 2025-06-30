const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const reportController = require('../controllers/report.controller');

const router = express.Router({ mergeParams: true });

router.get(
    '/progress-report',
    authenticate,
    authorize(['admin', 'guru']),
    reportController.getCourseProgressReport
);

router.get(
    '/gradebook',
    authenticate,
    authorize(['admin', 'guru']),
    reportController.getCourseGradebook
);

router.put(
    '/gradebook',
    authenticate,
    authorize(['admin', 'guru']),
    reportController.updateCourseGradebook
);

router.get(
    '/analytics',
    authenticate,
    authorize(['admin', 'guru']),
    reportController.getCourseLearningAnalytics
);

// This route should be handled by a different router if it's not course-specific
// For now, placing it here but consider moving it to a user-specific router
router.get(
    '/me/performance-report',
    authenticate,
    authorize(['siswa']),
    reportController.getMyPerformanceReport
);

module.exports = router;