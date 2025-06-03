const Joi = require('joi');

const createCourse = {
    body: Joi.object({
        name: Joi.string().required().min(3).max(255),
        description: Joi.string().optional(),
        privacy: Joi.string().valid('public', 'private').default('private'),
        teacherId: Joi.number().integer().positive().optional()
    })
};

const updateCourse = {
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

const getCourse = {
    params: Joi.object({
        id: Joi.number().integer().positive().required()
    })
};

const listCourses = {
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
        courseId: Joi.number().integer().positive().required()
    }),
    body: Joi.object({
        studentId: Joi.number().integer().positive().required(),
        enrollmentDate: Joi.date().required(),
        status: Joi.string().required()
    })
};

const addContentToCourse = {
    params: Joi.object({
        courseId: Joi.number().integer().positive().required()
    }),
    body: Joi.object({
        type: Joi.string().valid('material', 'assignment').required(),
        title: Joi.string().min(3).max(255).required(),
        description: Joi.string().optional(),
        video_url: Joi.string().uri().optional(),
        publish_date: Joi.date().optional(),
        content: Joi.string().optional(), // For material content if not a file
        assignment_type: Joi.string().optional(), // For assignment
        due_date: Joi.date().optional(), // For assignment
        max_score: Joi.number().integer().min(0).optional() // For assignment
    }).when(Joi.object({ type: 'material' }).unknown(), {
        then: Joi.object({
            title: Joi.string().required(),
            description: Joi.string().optional(),
            video_url: Joi.string().uri().optional(),
            publish_date: Joi.date().optional(),
            content: Joi.string().optional()
        })
    }).when(Joi.object({ type: 'assignment' }).unknown(), {
        then: Joi.object({
            title: Joi.string().required(),
            description: Joi.string().optional(),
            assignment_type: Joi.string().required(),
            due_date: Joi.date().required(),
            max_score: Joi.number().integer().min(0).required()
        })
    })
};

module.exports = {
    createCourse,
    updateCourse,
    getCourse,
    listCourses,
    enrollStudent,
    addContentToCourse
};
