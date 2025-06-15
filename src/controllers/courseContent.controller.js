const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { courseContentService } = require('../services');

const createCourseContent = catchAsync(async (req, res) => {
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
