const Joi = require('joi');

const createClass = {
    body: Joi.object({
        name: Joi.string().required().min(3).max(255),
        description: Joi.string().optional(),
        privacy: Joi.string().valid('public', 'private').default('private'),
        teacherId: Joi.number().integer().positive().optional()
    })
};

const updateClass = {
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

const getClass = {
    params: Joi.object({
        id: Joi.number().integer().positive().required()
    })
};

const listClasses = {
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
        classId: Joi.number().integer().positive().required()
    }),
    body: Joi.object({
        studentId: Joi.number().integer().positive().required(),
        enrollmentDate: Joi.date().required(),
        status: Joi.string().required()
    })
};

module.exports = {
    createClass,
    updateClass,
    getClass,
    listClasses,
    enrollStudent
};
