const Joi = require('joi');

// Quiz question schema for templates
const quizQuestionSchema = Joi.object({
    type: Joi.string().valid('multiple_choice', 'true_false', 'short_answer', 'essay').required(),
    question: Joi.string().required(),
    points: Joi.number().integer().min(1).required(),
    options: Joi.array().items(Joi.string()).when('type', {
        is: 'multiple_choice',
        then: Joi.array().items(Joi.string()).min(2).required(),
        otherwise: Joi.optional()
    }),
    correct_answer: Joi.when('type', {
        is: Joi.string().valid('multiple_choice', 'true_false', 'short_answer'),
        then: Joi.string().required(),
        otherwise: Joi.optional()
    }),
    answer_variations: Joi.array().items(Joi.string()).optional(),
    case_sensitive: Joi.boolean().default(false),
    sample_answer: Joi.string().optional(),
    rubric: Joi.object().optional()
});

// Rubric criteria schema
const rubricCriterionSchema = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    maxPoints: Joi.number().integer().min(1).required(),
    weight: Joi.number().min(0).max(2).default(1),
    levels: Joi.array().items(Joi.object({
        name: Joi.string().required(),
        description: Joi.string().required(),
        points: Joi.number().min(0).required()
    })).optional()
});

// Template data schema
const templateDataSchema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    quiz_questions: Joi.array().items(quizQuestionSchema).optional(),
    rubric_criteria: Joi.array().items(rubricCriterionSchema).optional(),
    instructions: Joi.string().optional(),
    time_limit: Joi.number().integer().min(1).optional(),
    additional_settings: Joi.object().optional()
});

const createTemplate = {
    body: Joi.object().keys({
        name: Joi.string().required().messages({
            'string.empty': 'Template name is required',
            'any.required': 'Template name is required'
        }),
        description: Joi.string().required().messages({
            'string.empty': 'Template description is required',
            'any.required': 'Template description is required'
        }),
        type: Joi.string().valid('essay', 'quiz', 'file_upload', 'mixed', 'coding').required().messages({
            'any.only': 'Template type must be one of: essay, quiz, file_upload, mixed, coding',
            'any.required': 'Template type is required'
        }),
        template_data: templateDataSchema.required(),
        instructions: Joi.string().optional(),
        default_max_score: Joi.number().integer().min(1).optional(),
        default_allowed_file_types: Joi.string().optional(),
        default_max_file_size_mb: Joi.number().integer().min(1).max(100).optional(),
        quiz_template_json: Joi.array().items(quizQuestionSchema).optional(),
        rubric_template: Joi.array().items(rubricCriterionSchema).optional(),
        is_public: Joi.boolean().default(false)
    })
};

const getTemplates = {
    query: Joi.object().keys({
        type: Joi.string().valid('essay', 'quiz', 'file_upload', 'mixed', 'coding').optional(),
        search: Joi.string().optional(),
        include_public: Joi.boolean().optional(),
        limit: Joi.number().integer().min(1).max(100).default(20),
        page: Joi.number().integer().min(1).default(1)
    })
};

const getTemplate = {
    params: Joi.object().keys({
        templateId: Joi.number().integer().required().messages({
            'number.base': 'Template ID must be a number',
            'any.required': 'Template ID is required'
        })
    })
};

const updateTemplate = {
    params: Joi.object().keys({
        templateId: Joi.number().integer().required()
    }),
    body: Joi.object().keys({
        name: Joi.string().optional(),
        description: Joi.string().optional(),
        type: Joi.string().valid('essay', 'quiz', 'file_upload', 'mixed', 'coding').optional(),
        template_data: templateDataSchema.optional(),
        instructions: Joi.string().optional(),
        default_max_score: Joi.number().integer().min(1).optional(),
        default_allowed_file_types: Joi.string().optional(),
        default_max_file_size_mb: Joi.number().integer().min(1).max(100).optional(),
        quiz_template_json: Joi.array().items(quizQuestionSchema).optional(),
        rubric_template: Joi.array().items(rubricCriterionSchema).optional(),
        is_public: Joi.boolean().optional()
    }).min(1)
};

const deleteTemplate = {
    params: Joi.object().keys({
        templateId: Joi.number().integer().required()
    })
};

const createFromTemplate = {
    params: Joi.object().keys({
        templateId: Joi.number().integer().required()
    }),
    body: Joi.object().keys({
        course_id: Joi.number().integer().required().messages({
            'number.base': 'Course ID must be a number',
            'any.required': 'Course ID is required'
        }),
        title: Joi.string().optional(),
        description: Joi.string().optional(),
        due_date: Joi.date().optional(),
        max_score: Joi.number().integer().min(1).optional(),
        instructions: Joi.string().optional(),
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
    })
};

const bulkDeleteTemplates = {
    body: Joi.object().keys({
        templateIds: Joi.array().items(
            Joi.number().integer().required()
        ).min(1).required().messages({
            'array.min': 'At least one template ID is required',
            'any.required': 'Template IDs array is required'
        })
    })
};

module.exports = {
    createTemplate,
    getTemplates,
    getTemplate,
    updateTemplate,
    deleteTemplate,
    createFromTemplate,
    bulkDeleteTemplates
};