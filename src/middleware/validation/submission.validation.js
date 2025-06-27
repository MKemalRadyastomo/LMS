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

module.exports = {
    submitEssay,
    submitFile,
    submitQuiz,
    getStudentSubmission,
    getSubmissionsByAssignment,
    updateSubmission,
    gradeSubmission,
};
