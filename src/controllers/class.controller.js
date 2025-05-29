const Class = require('../models/class.model');
const { forbidden } = require('../utils/ApiError');

exports.createClass = async (req, res, next) => {
    try {
        // Check if user is admin or guru
        if (!['admin', 'guru'].includes(req.user.role)) {
            return next(forbidden('Only admin and teachers can create classes'));
        }

        const classData = {
            name: req.body.name,
            description: req.body.description,
            privacy: req.body.privacy || 'private',
            teacherId: req.body.teacherId || (req.user.role === 'guru' ? req.user.id : null)
        };

        const newClass = await Class.create(classData);
        res.status(201).json(newClass);
    } catch (err) {
        next(err);
    }
};

exports.getClass = async (req, res, next) => {
    try {
        const classData = await Class.findById(req.params.id);
        if (!classData) {
            return res.status(404).json({ message: 'Class not found' });
        }

        // If class is private, check if user is admin, teacher of the class, or enrolled student
        if (classData.privacy === 'private' &&
            req.user.role !== 'admin' &&
            req.user.id !== classData.teacher_id) {
            // TODO: Check if user is enrolled in the class
            return next(forbidden('You do not have access to this class'));
        }

        res.json(classData);
    } catch (err) {
        next(err);
    }
};

exports.updateClass = async (req, res, next) => {
    try {
        const classData = await Class.findById(req.params.id);
        if (!classData) {
            return res.status(404).json({ message: 'Class not found' });
        }

        // Only admin or the class teacher can update
        if (req.user.role !== 'admin' && req.user.id !== classData.teacher_id) {
            return next(forbidden('You do not have permission to update this class'));
        }

        const updateData = {
            name: req.body.name,
            description: req.body.description,
            privacy: req.body.privacy,
            teacherId: req.body.teacherId
        };

        const updatedClass = await Class.update(req.params.id, updateData);
        res.json(updatedClass);
    } catch (err) {
        next(err);
    }
};

exports.listClasses = async (req, res, next) => {
    try {
        const options = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            search: req.query.search,
            privacy: req.query.privacy,
            teacherId: req.query.teacherId
        };

        // For non-admin users, only show public classes and their own classes
        if (req.user.role !== 'admin') {
            if (req.user.role === 'guru') {
                // options.teacherId = req.user.id; // Allow teachers to see all classes
            } else {
                options.privacy = 'public';
                // TODO: Include classes where student is enrolled
            }
        }

        const classes = await Class.list(options);
        res.json(classes);
    } catch (err) {
        next(err);
    }
};
