const CourseContent = require('../models/courseContent.model');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');

const CourseContentService = {};

/**
 * Create a course content
 * @param {Object} courseContentBody
 * @returns {Promise<CourseContent>}
 */
CourseContentService.createCourseContent = async (courseContentBody) => {
    const courseContent = await CourseContent.create(courseContentBody);
    return courseContent;
};

/**
 * Query for course contents by course ID
 * @param {number} courseId
 * @returns {Promise<Array<CourseContent>>}
 */
CourseContentService.getCourseContentsByCourseId = async (courseId) => {
    const courseContents = await CourseContent.findByCourseId(courseId);
    return courseContents;
};

/**
 * Get course content by ID
 * @param {number} courseContentId
 * @returns {Promise<CourseContent>}
 */
CourseContentService.getCourseContentById = async (courseContentId) => {
    const courseContent = await CourseContent.findById(courseContentId);
    if (!courseContent) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Course content not found');
    }
    return courseContent;
};

/**
 * Update course content by ID
 * @param {number} courseContentId
 * @param {Object} updateBody
 * @returns {Promise<CourseContent>}
 */
CourseContentService.updateCourseContentById = async (courseContentId, updateBody) => {
    const courseContent = await CourseContent.findById(courseContentId);
    if (!courseContent) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Course content not found');
    }
    const updatedCourseContent = await CourseContent.update(courseContentId, updateBody);
    return updatedCourseContent;
};

/**
 * Delete course content by ID
 * @param {number} courseContentId
 * @returns {Promise<void>}
 */
CourseContentService.deleteCourseContentById = async (courseContentId) => {
    const courseContent = await CourseContent.findById(courseContentId);
    if (!courseContent) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Course content not found');
    }
    await CourseContent.delete(courseContentId);
};

module.exports = CourseContentService;
