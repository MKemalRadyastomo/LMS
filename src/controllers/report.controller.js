const { default: httpStatus } = require('http-status');
const catchAsync = require('../utils/catchAsync');
const reportService = require('../services/report.service'); // Corrected path
const ApiError = require('../utils/ApiError');

const getCourseProgressReport = catchAsync(async (req, res) => {
    const { courseId } = req.params;
    const report = await reportService.getCourseProgressReport(courseId);
    res.send(report);
});

const getCourseGradebook = catchAsync(async (req, res) => {
    const { courseId } = req.params;
    const gradebook = await reportService.getCourseGradebook(courseId);
    res.send(gradebook);
});

const updateCourseGradebook = catchAsync(async (req, res) => {
    const { courseId } = req.params;
    const updatedGradebook = await reportService.updateCourseGradebook(courseId, req.body);
    res.send(updatedGradebook);
});

const getCourseLearningAnalytics = catchAsync(async (req, res) => {
    const { courseId } = req.params;
    const analytics = await reportService.getCourseLearningAnalytics(courseId);
    res.send(analytics);
});

const getMyPerformanceReport = catchAsync(async (req, res) => {
    const { id: studentId } = req.user;
    const report = await reportService.getStudentPerformanceReport(studentId);
    res.send(report);
});

// Ensure all functions are included in the export
module.exports = {
    getCourseProgressReport,
    getCourseGradebook,
    updateCourseGradebook,
    getCourseLearningAnalytics,
    getMyPerformanceReport,
};