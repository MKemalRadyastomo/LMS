const Joi = require('joi');

const getClassProgressReport = {
    params: Joi.object().keys({
        courseId: Joi.number().integer().required(),
    }),
    query: Joi.object().keys({
        filterBy: Joi.string().valid('assignment', 'material'),
        sortBy: Joi.string(),
    }),
};

const getStudentProgressReport = {
    params: Joi.object().keys({
        studentId: Joi.number().integer().required(),
    }),
    query: Joi.object().keys({
        courseId: Joi.number().integer(),
    }),
};

const exportClassProgressReport = {
    params: Joi.object().keys({
        courseId: Joi.number().integer().required(),
    }),
    query: Joi.object().keys({
        format: Joi.string().valid('pdf', 'xlsx').required(),
    }),
};

module.exports = {
    getClassProgressReport,
    getStudentProgressReport,
    exportClassProgressReport,
};
