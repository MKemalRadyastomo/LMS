const Joi = require('joi');

const createCourseContent = {
    body: Joi.object().keys({
        course_id: Joi.number().integer().required(),
        content_type: Joi.string().valid('material', 'assignment').required(),
        content_id: Joi.number().integer().required(),
        title: Joi.string().required(),
        order_index: Joi.number().integer().required(),
        type: Joi.when('content_type', { is: 'assignment', then: Joi.string().required() }),
        max_score: Joi.when('content_type', { is: 'assignment', then: Joi.number().integer().required() }),
    }),
};

const getCourseContentsByCourse = {
    params: Joi.object().keys({
        courseId: Joi.number().integer().required(),
    }),
};

const getCourseContent = {
    params: Joi.object().keys({
        courseContentId: Joi.number().integer().required(),
    }),
};

const updateCourseContent = {
    params: Joi.object().keys({
        courseContentId: Joi.number().integer().required(),
    }),
    body: Joi.object().keys({
        course_id: Joi.number().integer().optional(),
        content_type: Joi.string().valid('material', 'assignment').optional(),
        content_id: Joi.number().integer().optional(),
        title: Joi.string().optional(),
        order_index: Joi.number().integer().optional(),
    }).min(1),
};

const deleteCourseContent = {
    params: Joi.object().keys({
        courseContentId: Joi.number().integer().required(),
    }),
};

module.exports = {
    createCourseContent,
    getCourseContentsByCourse,
    getCourseContent,
    updateCourseContent,
    deleteCourseContent,
};
