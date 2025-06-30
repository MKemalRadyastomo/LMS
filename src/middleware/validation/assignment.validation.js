const Joi = require('joi');

const createAssignment = {
    params: Joi.object().keys({
        courseId: Joi.number().integer().required(), // Add validation for courseId from path params
    }),
    body: Joi.object().keys({
        title: Joi.string().required(),
        description: Joi.string().required(),
        type: Joi.string().valid('essay', 'file_upload', 'quiz').required().messages({
            'any.only': 'Jenis tugas harus dipilih dari: esai, upload file, atau kuis',
            'any.required': 'Jenis tugas wajib dipilih'
        }),
        due_date: Joi.date().required(),
        max_score: Joi.number().integer().required(),
        quiz_questions_json: Joi.array().items(Joi.object()).optional().default([]),
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

// ADDED: Validation schema for updating an assignment
const updateAssignment = {
    params: Joi.object().keys({
        courseId: Joi.number().integer().positive().required(),
        assignmentId: Joi.number().integer().positive().required(),
    }),
    body: Joi.object().keys({
        title: Joi.string().min(3).max(255).optional(),
        description: Joi.string().optional(),
        type: Joi.string().valid('essay', 'file_upload', 'quiz').optional(),
        due_date: Joi.date().optional(),
        max_score: Joi.number().integer().min(0).optional(),
        status: Joi.string().valid('active', 'draft', 'archived').optional()
    }).min(1) // At least one field must be provided for an update
};


module.exports = {
    createAssignment,
    getAssignments,
    getAssignment,
    updateAssignment,
    deleteAssignment,
};