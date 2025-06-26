const Joi = require('joi');

const createAssignment = {
    params: Joi.object().keys({
        courseId: Joi.number().integer().required(), // Add validation for courseId from path params
    }),
    body: Joi.object().keys({
        title: Joi.string().required(),
        description: Joi.string().required(),
        type: Joi.string().required(),
        due_date: Joi.date().required(),
        max_score: Joi.number().integer().required(),
        quiz_questions_json: Joi.object().optional(),
        allowed_file_types: Joi.string().optional(),
        max_file_size_mb: Joi.number().integer().optional(),
    }),
};

const getAssignments = {
    query: Joi.object().keys({
        courseId: Joi.number().integer(),
    }),
};

const getAssignment = {
    params: Joi.object().keys({
        courseId: Joi.number().integer().required(),
        assignmentId: Joi.number().integer().required(),
    }),
};

const updateAssignment = {
    params: Joi.object().keys({
        courseId: Joi.number().integer().required(),
        assignmentId: Joi.number().integer().required(),
    }),
    body: Joi.object().keys({
        title: Joi.string().optional(),
        description: Joi.string().optional(),
        type: Joi.string().valid('essay', 'file_upload', 'quiz').optional(),
        due_date: Joi.date().optional(),
        max_score: Joi.number().integer().optional(),
        quiz_questions_json: Joi.object().optional(),
        allowed_file_types: Joi.string().optional(),
        max_file_size_mb: Joi.number().integer().optional(),
    }),
};

const deleteAssignment = {
    params: Joi.object().keys({
        courseId: Joi.number().integer().required(),
        assignmentId: Joi.number().integer().required(),
    }),
};

module.exports = {
    createAssignment,
    getAssignments,
    getAssignment,
    updateAssignment,
    deleteAssignment,
};
