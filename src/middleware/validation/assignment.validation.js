const Joi = require('joi');

const createAssignment = {
    params: Joi.object().keys({
        courseId: Joi.number().integer().required(), // Add validation for courseId from path params
    }),
    body: Joi.object().keys({
        title: Joi.string().required(),
        description: Joi.string().required(),
        type: Joi.string().valid('essay', 'file_upload', 'quiz', 'mixed', 'coding').required().messages({
            'any.only': 'Assignment type must be one of: essay, file_upload, quiz, mixed, coding',
            'any.required': 'Assignment type is required'
        }),
        due_date: Joi.date().required(),
        max_score: Joi.number().integer().min(1).required(),
        instructions: Joi.string().optional(),
        quiz_questions_json: Joi.array().items(Joi.object()).optional().default([]),
        allowed_file_types: Joi.string().optional(),
        max_file_size_mb: Joi.number().integer().min(1).max(100).optional(),
        template_id: Joi.number().integer().optional(),
        late_submission_penalty: Joi.number().min(0).max(100).default(0),
        allow_late_submissions: Joi.boolean().default(true),
        max_late_days: Joi.number().integer().min(1).default(7),
        auto_release_grades: Joi.boolean().default(false),
        grade_release_date: Joi.date().optional(),
        multiple_attempts: Joi.boolean().default(false),
        max_attempts: Joi.number().integer().min(1).default(1),
        show_correct_answers: Joi.boolean().default(false),
        shuffle_questions: Joi.boolean().default(false),
        time_limit_minutes: Joi.number().integer().min(1).optional(),
        require_webcam: Joi.boolean().default(false),
        plagiarism_check: Joi.boolean().default(false)
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
        type: Joi.string().valid('essay', 'file_upload', 'quiz', 'mixed', 'coding').optional(),
        due_date: Joi.date().optional(),
        max_score: Joi.number().integer().min(1).optional(),
        instructions: Joi.string().optional(),
        quiz_questions_json: Joi.array().items(Joi.object()).optional(),
        allowed_file_types: Joi.string().optional(),
        max_file_size_mb: Joi.number().integer().min(1).max(100).optional(),
        late_submission_penalty: Joi.number().min(0).max(100).optional(),
        allow_late_submissions: Joi.boolean().optional(),
        max_late_days: Joi.number().integer().min(1).optional(),
        auto_release_grades: Joi.boolean().optional(),
        grade_release_date: Joi.date().optional(),
        multiple_attempts: Joi.boolean().optional(),
        max_attempts: Joi.number().integer().min(1).optional(),
        show_correct_answers: Joi.boolean().optional(),
        shuffle_questions: Joi.boolean().optional(),
        time_limit_minutes: Joi.number().integer().min(1).optional(),
        require_webcam: Joi.boolean().optional(),
        plagiarism_check: Joi.boolean().optional()
    }),
};

const deleteAssignment = {
    params: Joi.object().keys({
        courseId: Joi.number().integer().required(),
        assignmentId: Joi.number().integer().required(),
    }),
};

const duplicateAssignment = {
    params: Joi.object().keys({
        courseId: Joi.number().integer().required(),
        assignmentId: Joi.number().integer().required(),
    }),
    body: Joi.object().keys({
        title: Joi.string().optional(),
        description: Joi.string().optional(),
        due_date: Joi.date().optional(),
        max_score: Joi.number().integer().min(1).optional(),
        course_id: Joi.number().integer().optional() // Allow copying to different course
    })
};

module.exports = {
    createAssignment,
    getAssignments,
    getAssignment,
    updateAssignment,
    deleteAssignment,
    duplicateAssignment,
};
