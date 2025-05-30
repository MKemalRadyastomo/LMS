const express = require('express');
const router = express.Router();
const classController = require('../controllers/class.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const classValidation = require('../middleware/validation/class.validation');

router.post('/', authenticate, validate(classValidation.createClass), classController.createClass);
router.get('/', authenticate, validate(classValidation.listClasses), classController.listClasses);
router.get('/:id', authenticate, validate(classValidation.getClass), classController.getClass);
router.put('/:id', authenticate, validate(classValidation.updateClass), classController.updateClass);

// Route for enrolling a single student
router.post('/:classId/enrollments', authenticate, validate(classValidation.enrollStudent), classController.enrollStudent);

// Route for adding content (materials/assignments) to a class
router.post('/:classId/content', authenticate, classController.addContentToClass);

module.exports = router;
