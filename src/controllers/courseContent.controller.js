const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { courseContentService, courseService } = require('../services');
const ApiError = require('../utils/ApiError');

const createCourseContent = catchAsync(async (req, res) => {
    const { courseId } = req.body;
    const { id: userId, role } = req.user;

    if (role === 'guru') {
        if (!courseId) {
            throw ApiError.badRequest('Course ID is required for teachers to create course content.');
        }
        const course = await courseService.getCourseById(courseId);
        if (!course) {
            throw ApiError.notFound('Course not found.');
        }
        if (course.teacher_id !== userId) {
            throw ApiError.forbidden('You are not authorized to create course content for this course.');
        }
    } else if (role !== 'admin') {
        throw ApiError.forbidden('Only admins and teachers (guru) can create course content.');
    }

    const courseContent = await courseContentService.createCourseContent(req.body);
    res.status(httpStatus.CREATED).send(courseContent);
});

const getCourseContentsByCourse = catchAsync(async (req, res) => {
    const courseContents = await courseContentService.getCourseContentsByCourseId(req.params.courseId);
    res.send(courseContents);
});

const getCourseContent = catchAsync(async (req, res) => {
    const courseContent = await courseContentService.getCourseContentById(req.params.courseContentId);
    res.send(courseContent);
});

const updateCourseContent = catchAsync(async (req, res) => {
    const courseContent = await courseContentService.updateCourseContentById(req.params.courseContentId, req.body);
    res.send(courseContent);
});

const deleteCourseContent = catchAsync(async (req, res) => {
    await courseContentService.deleteCourseContentById(req.params.courseContentId);
    res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
    createCourseContent,
    getCourseContentsByCourse,
    getCourseContent,
    updateCourseContent,
    deleteCourseContent,
};
