const Joi = require('joi');

const createCourse = {
    body: Joi.object({
        name: Joi.string().required().min(3).max(255),
        description: Joi.string().optional(),
        privacy: Joi.string().valid('public', 'private').default('private'),
        teacherId: Joi.number().integer().positive().optional()
    })
};

const updateCourse = {
    params: Joi.object({
        id: Joi.number().integer().positive().required()
    }),
    body: Joi.object({
        name: Joi.string().min(3).max(255).optional(),
        description: Joi.string().optional(),
        privacy: Joi.string().valid('public', 'private').optional(),
        teacherId: Joi.number().integer().positive().optional()
    })
};

const getCourse = {
    params: Joi.object({
        id: Joi.number().integer().positive().required()
    })
};

const listCourses = {
    query: Joi.object({
        page: Joi.number().integer().min(1).optional(),
        limit: Joi.number().integer().min(1).max(100).optional(),
        search: Joi.string().optional(),
        privacy: Joi.string().valid('public', 'private').optional(),
        teacherId: Joi.number().integer().positive().optional()
    })
};

const enrollStudent = {
    params: Joi.object({
        courseId: Joi.number().integer().positive().required()
    }),
    body: Joi.object({
        studentId: Joi.number().integer().positive().required(),
        enrollmentDate: Joi.date().required(),
        status: Joi.string().required()
    })
};

module.exports = {
    createCourse,
    updateCourse,
    getCourse,
    listCourses,
    enrollStudent
};
