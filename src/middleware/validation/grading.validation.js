const Joi = require('joi');

// Rubric criteria schema
const criterionSchema = Joi.object({
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

// Rubric validation schemas
const createRubric = {
    params: Joi.object().keys({
        assignmentId: Joi.number().integer().required()
    }),
    body: Joi.object().keys({
        name: Joi.string().required().messages({
            'string.empty': 'Rubric name is required',
            'any.required': 'Rubric name is required'
        }),
        total_points: Joi.number().integer().min(1).required().messages({
            'number.base': 'Total points must be a number',
            'number.integer': 'Total points must be an integer',
            'number.min': 'Total points must be at least 1',
            'any.required': 'Total points is required'
        }),
        criteria: Joi.array().items(criterionSchema).min(1).required().messages({
            'array.min': 'At least one criterion is required',
            'any.required': 'Criteria array is required'
        })
    })
};

const getRubrics = {
    params: Joi.object().keys({
        assignmentId: Joi.number().integer().required()
    })
};

const getRubric = {
    params: Joi.object().keys({
        rubricId: Joi.number().integer().required()
    })
};

const updateRubric = {
    params: Joi.object().keys({
        rubricId: Joi.number().integer().required()
    }),
    body: Joi.object().keys({
        name: Joi.string().optional(),
        total_points: Joi.number().integer().min(1).optional(),
        criteria: Joi.array().items(criterionSchema).min(1).optional()
    }).min(1)
};

const deleteRubric = {
    params: Joi.object().keys({
        rubricId: Joi.number().integer().required()
    })
};

// Grade statistics validation
const getGradeStatistics = {
    params: Joi.object().keys({
        assignmentId: Joi.number().integer().required()
    }),
    query: Joi.object().keys({
        status: Joi.string().valid('all', 'graded', 'ungraded').default('all'),
        include_late: Joi.boolean().default(true)
    })
};

const getGradingAnalytics = {
    params: Joi.object().keys({
        assignmentId: Joi.number().integer().required()
    }),
    query: Joi.object().keys({
        include_time_data: Joi.boolean().default(true),
        include_question_analysis: Joi.boolean().default(false)
    })
};

// Export grades validation
const exportGrades = {
    params: Joi.object().keys({
        assignmentId: Joi.number().integer().required()
    }),
    query: Joi.object().keys({
        format: Joi.string().valid('csv', 'excel', 'json').default('csv'),
        include_feedback: Joi.boolean().default(true),
        include_late_penalties: Joi.boolean().default(true)
    })
};

const getGradeDistribution = {
    params: Joi.object().keys({
        assignmentId: Joi.number().integer().required()
    }),
    query: Joi.object().keys({
        bucket_size: Joi.number().integer().min(1).max(20).default(10)
    })
};

// Bulk grading validation
const bulkGrade = {
    body: Joi.object().keys({
        grades: Joi.array().items(Joi.object({
            submission_id: Joi.number().integer().required(),
            grade: Joi.number().min(0).max(100).required(),
            feedback: Joi.string().optional().allow(''),
            rubric_scores: Joi.object().optional(),
            additional_points: Joi.number().default(0),
            deductions: Joi.number().default(0)
        })).min(1).required().messages({
            'array.min': 'At least one grade is required',
            'any.required': 'Grades array is required'
        })
    })
};

// Student course grades validation
const getStudentCourseGrades = {
    params: Joi.object().keys({
        studentId: Joi.number().integer().required(),
        courseId: Joi.number().integer().required()
    })
};

// Automated grading validation
const setupAutomatedGrading = {
    params: Joi.object().keys({
        assignmentId: Joi.number().integer().required()
    }),
    body: Joi.object().keys({
        questions: Joi.array().items(Joi.object({
            question_index: Joi.number().integer().min(0).required(),
            question_type: Joi.string().valid('multiple_choice', 'true_false', 'short_answer').required(),
            correct_answer: Joi.string().required(),
            answer_variations: Joi.array().items(Joi.string()).optional(),
            points: Joi.number().integer().min(1).required(),
            case_sensitive: Joi.boolean().default(false),
            partial_credit_rules: Joi.array().items(Joi.object({
                type: Joi.string().valid('contains', 'length', 'regex').required(),
                value: Joi.string().optional(),
                min_length: Joi.number().integer().optional(),
                max_length: Joi.number().integer().optional(),
                pattern: Joi.string().optional(),
                flags: Joi.string().optional(),
                credit_percentage: Joi.number().min(0).max(100).required()
            })).optional()
        })).min(1).required()
    })
};

const gradeObjective = {
    params: Joi.object().keys({
        submissionId: Joi.number().integer().required()
    })
};

// Detailed grading validation
const submitDetailedGrade = {
    params: Joi.object().keys({
        submissionId: Joi.number().integer().required()
    }),
    body: Joi.object().keys({
        grade: Joi.number().min(0).max(100).required(),
        feedback: Joi.string().optional().allow(''),
        rubric_id: Joi.number().integer().optional(),
        criterion_scores: Joi.object().pattern(
            Joi.number().integer(),
            Joi.object({
                points: Joi.number().min(0).required(),
                comments: Joi.string().optional().allow('')
            })
        ).optional(),
        additional_points: Joi.number().default(0),
        deductions: Joi.number().default(0)
    })
};

const getDetailedGrading = {
    params: Joi.object().keys({
        submissionId: Joi.number().integer().required()
    })
};

// Late penalty validation
const applyLatePenalty = {
    params: Joi.object().keys({
        submissionId: Joi.number().integer().required()
    })
};

const waiveLatePenalty = {
    params: Joi.object().keys({
        submissionId: Joi.number().integer().required()
    }),
    body: Joi.object().keys({
        reason: Joi.string().required().messages({
            'string.empty': 'Reason for waiving penalty is required',
            'any.required': 'Reason for waiving penalty is required'
        })
    })
};

module.exports = {
    createRubric,
    getRubrics,
    getRubric,
    updateRubric,
    deleteRubric,
    getGradeStatistics,
    getGradingAnalytics,
    exportGrades,
    getGradeDistribution,
    bulkGrade,
    getStudentCourseGrades,
    setupAutomatedGrading,
    gradeObjective,
    submitDetailedGrade,
    getDetailedGrading,
    applyLatePenalty,
    waiveLatePenalty
};