const express = require('express');
const router = express.Router();
const courseController = require('../controllers/course.controller.js');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const courseValidation = require('../middleware/validation/course.validation');
const materialUpload = require('../middleware/materialUpload');

router.post('/', authenticate, validate(courseValidation.createCourse), courseController.createCourse);
router.get('/', authenticate, validate(courseValidation.listCourses), courseController.listCourses);
router.get('/:id', authenticate, validate(courseValidation.getCourse), courseController.getCourse);
router.put('/:id', authenticate, validate(courseValidation.updateCourse), courseController.updateCourse);

// Route for enrolling a single student
router.post('/:courseId/enrollments', authenticate, validate(courseValidation.enrollStudent), courseController.enrollStudent);

// Route for adding content (materials/assignments) to a course
router.post('/:courseId/content', authenticate, materialUpload.single('file'), validate(courseValidation.addContentToCourse), courseController.addContentToCourse);

module.exports = router;
