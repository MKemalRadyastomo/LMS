const Joi = require('joi');

const createAssignment = {
    body: Joi.object().keys({
        course_id: Joi.number().integer().required(),
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
        assignmentId: Joi.number().integer().required(),
    }),
};

module.exports = {
    createAssignment,
    getAssignments,
    getAssignment,
};
