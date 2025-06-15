const express = require('express');
const validate = require('../middleware/validate');
const courseContentValidation = require('../middleware/validation/courseContent.validation');
const courseContentController = require('../controllers/courseContent.controller');
const { authorize } = require('../middleware/auth');

const router = express.Router();

router
    .route('/')
    .post(authorize('manageCourseContents'), validate(courseContentValidation.createCourseContent), courseContentController.createCourseContent)
    .get(authorize('getCourseContents'), validate(courseContentValidation.getCourseContentsByCourse), courseContentController.getCourseContentsByCourse);

router
    .route('/:courseContentId')
    .get(authorize('getCourseContents'), validate(courseContentValidation.getCourseContent), courseContentController.getCourseContent)
    .patch(authorize('manageCourseContents'), validate(courseContentValidation.updateCourseContent), courseContentController.updateCourseContent)
    .delete(authorize('manageCourseContents'), validate(courseContentValidation.deleteCourseContent), courseContentController.deleteCourseContent);

module.exports = router;
