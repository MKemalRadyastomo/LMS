const Joi = require('joi');

const submitEssay = {
    params: Joi.object().keys({
        assignmentId: Joi.number().integer().required(),
    }),
    body: Joi.object().keys({
        answer_text: Joi.string().required().min(10).max(50000), // Min 10 chars, max 50k chars
        draft: Joi.boolean().optional().default(false),
    }),
};

const submitFile = {
    params: Joi.object().keys({
        assignmentId: Joi.number().integer().required(),
    }),
    body: Joi.object().keys({
        draft: Joi.boolean().optional().default(false),
    }),
};

const submitQuiz = {
    params: Joi.object().keys({
        assignmentId: Joi.number().integer().required(),
    }),
    body: Joi.object().keys({
        answers: Joi.array().items(
            Joi.object().keys({
                question_id: Joi.number().integer().required(),
                answer: Joi.string().required(),
            })
        ).required(),
        draft: Joi.boolean().optional().default(false),
    }),
};

const getStudentSubmission = {
    params: Joi.object().keys({
        assignmentId: Joi.number().integer().required(),
    }),
};

const getSubmissionsByAssignment = {
    params: Joi.object().keys({
        assignmentId: Joi.number().integer().required(),
    }),
    query: Joi.object().keys({
        status: Joi.string().valid('draft', 'submitted', 'graded').optional(),
        student_id: Joi.number().integer().optional(),
    }),
};

const updateSubmission = {
    params: Joi.object().keys({
        submissionId: Joi.number().integer().required(),
    }),
    body: Joi.object().keys({
        submission_text: Joi.string().optional(),
        grade: Joi.number().min(0).optional(),
        feedback: Joi.string().optional(),
        status: Joi.string().valid('draft', 'submitted', 'graded').optional(),
        draft: Joi.boolean().optional(),
    }),
};

const gradeSubmission = {
    params: Joi.object().keys({
        submissionId: Joi.number().integer().required(),
    }),
    body: Joi.object().keys({
        grade: Joi.number().min(0).max(100).required(),
        feedback: Joi.string().optional().allow(''),
    }),
};

// Enhanced submission validation
const submitEnhanced = {
    params: Joi.object().keys({
        assignmentId: Joi.number().integer().required(),
    }),
    body: Joi.object().keys({
        submission_text: Joi.string().optional().min(1).max(50000),
        quiz_answers: Joi.object().optional(),
        is_draft: Joi.boolean().default(false),
        file_data: Joi.array().items(Joi.object()).optional()
    })
};

const autoSave = {
    params: Joi.object().keys({
        assignmentId: Joi.number().integer().required(),
    }),
    body: Joi.object().keys({
        text: Joi.string().optional(),
        quiz_answers: Joi.object().optional(),
        files: Joi.array().items(Joi.object()).optional()
    })
};

const submitFinal = {
    params: Joi.object().keys({
        submissionId: Joi.number().integer().required(),
    })
};

const getSubmissionVersions = {
    params: Joi.object().keys({
        submissionId: Joi.number().integer().required(),
    })
};

const getLatestVersion = {
    params: Joi.object().keys({
        assignmentId: Joi.number().integer().required(),
    })
};

const getSubmissionFiles = {
    params: Joi.object().keys({
        submissionId: Joi.number().integer().required(),
    }),
    query: Joi.object().keys({
        versionId: Joi.number().integer().optional()
    })
};

const deleteFile = {
    params: Joi.object().keys({
        fileId: Joi.number().integer().required(),
    })
};

const gradeDetailed = {
    params: Joi.object().keys({
        submissionId: Joi.number().integer().required(),
    }),
    body: Joi.object().keys({
        grade: Joi.number().min(0).max(100).required(),
        feedback: Joi.string().optional().allow(''),
        criterion_scores: Joi.object().optional(),
        rubric_id: Joi.number().integer().optional(),
        additional_points: Joi.number().default(0),
        deductions: Joi.number().default(0)
    })
};

const autoGrade = {
    params: Joi.object().keys({
        submissionId: Joi.number().integer().required(),
    })
};

const getPlagiarismReport = {
    params: Joi.object().keys({
        submissionId: Joi.number().integer().required(),
    })
};

const getStudentAnalytics = {
    query: Joi.object().keys({
        courseId: Joi.number().integer().optional()
    })
};

const bulkGrade = {
    body: Joi.object().keys({
        grades: Joi.array().items(Joi.object({
            submission_id: Joi.number().integer().required(),
            grade: Joi.number().min(0).max(100).required(),
            feedback: Joi.string().optional().allow('')
        })).min(1).required().messages({
            'array.min': 'At least one grade is required',
            'any.required': 'Grades array is required'
        })
    })
};

module.exports = {
    submitEssay,
    submitFile,
    submitQuiz,
    getStudentSubmission,
    getSubmissionsByAssignment,
    updateSubmission,
    gradeSubmission,
    submitEnhanced,
    autoSave,
    submitFinal,
    getSubmissionVersions,
    getLatestVersion,
    getSubmissionFiles,
    deleteFile,
    gradeDetailed,
    autoGrade,
    getPlagiarismReport,
    getStudentAnalytics,
    bulkGrade,
};
