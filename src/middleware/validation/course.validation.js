const Joi = require('joi');

const createCourse = {
    body: {
        name: Joi.string().required().min(3).max(255),
        description: Joi.string().optional(),
        privacy: Joi.string().valid('public', 'private').default('private'),
        teacherId: Joi.number().integer().positive().optional()
    }
};

const updateCourse = {
    params: {
        id: Joi.number().integer().positive().required()
    },
    body: {
        name: Joi.string().min(3).max(255).optional(),
        description: Joi.string().optional(),
        privacy: Joi.string().valid('public', 'private').optional(),
        teacherId: Joi.number().integer().positive().optional()
    }
};

const getCourse = {
    params: {
        id: Joi.number().integer().positive().required()
    }
};

const listCourses = {
    query: {
        page: Joi.number().integer().min(1).optional(),
        limit: Joi.number().integer().min(1).max(100).optional(),
        search: Joi.string().optional(),
        privacy: Joi.string().valid('public', 'private').optional(),
        teacherId: Joi.number().integer().positive().optional()
    }
};

const enrollStudent = {
    params: {
        courseId: Joi.number().integer().positive().required()
    },
    body: {
        studentId: Joi.number().integer().positive().required(),
        enrollmentDate: Joi.date().required(),
        status: Joi.string().required()
    }
};

const addContentToCourse = {
    params: {
        courseId: Joi.number().integer().positive().required()
    },
    body: {
        type: Joi.string().valid('material', 'assignment').required(),
        title: Joi.string().min(3).max(255).required(),
        description: Joi.string().optional(),
        video_url: Joi.string().uri().allow('').optional(),
        publish_date: Joi.date().optional(),
        content: Joi.string().optional(), // For material content if not a file
        assignment_type: Joi.string().optional(), // For assignment
        due_date: Joi.date().optional(), // For assignment
        max_score: Joi.number().integer().min(0).optional() // For assignment
    }
};

const getCourseContentById = {
    params: {
        courseId: Joi.number().integer().positive().required(),
        contentId: Joi.number().integer().positive().required()
    }
};

const getCourseContents = {
    params: {
        courseId: Joi.number().integer().positive().required()
    }
};

const getCourseEnrollments = {
    params: {
        courseId: Joi.number().integer().positive().required()
    },
    query: {
        page: Joi.number().integer().min(1).optional(),
        limit: Joi.number().integer().min(1).max(100).optional(),
        status: Joi.string().valid('active', 'inactive', 'pending').optional()
    }
};

module.exports = {
    createCourse,
    updateCourse,
    getCourse,
    listCourses,
    enrollStudent,
    addContentToCourse,
    getCourseContentById,
    getCourseContents,
    getCourseEnrollments
};
