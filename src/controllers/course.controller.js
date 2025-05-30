const Course = require('../models/course.model');
const Enrollment = require('../models/enrollment.model'); // Import Enrollment model
const { forbidden } = require('../utils/ApiError');

exports.createCourse = async (req, res, next) => {
    try {
        // Check if user is admin or guru
        if (!['admin', 'guru'].includes(req.user.role)) {
            return next(forbidden('Only admin and teachers can create courses'));
        }

        const courseData = {
            name: req.body.name,
            description: req.body.description,
            privacy: req.body.privacy || 'private',
            teacherId: req.body.teacherId || (req.user.role === 'guru' ? req.user.id : null)
        };

        const newCourse = await Course.create(courseData);
        res.status(201).json(newCourse);
    } catch (err) {
        next(err);
    }
};

exports.addContentToCourse = async (req, res, next) => {
    try {
        // Placeholder for adding content (materials/assignments) to a course
        const courseId = req.params.courseId;
        // TODO: Implement logic to add materials or assignments based on request body
        res.status(200).json({ message: `Content added to course ${courseId}` });
    } catch (err) {
        next(err);
    }
};

exports.enrollStudent = async (req, res, next) => {
    try {
        // TODO: Implement authorization check (e.g., only admin or teacher can enroll students)

        const courseId = req.params.courseId;
        const { studentId, enrollmentDate, status } = req.body;

        const enrollment = await Enrollment.create({ courseId, studentId, enrollmentDate, status });

        res.status(201).json(enrollment); // Send the created enrollment data
    } catch (err) {
        next(err);
    }
};

exports.getCourse = async (req, res, next) => {
    try {
        const courseData = await Course.findById(req.params.id);
        if (!courseData) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // If course is private, check if user is admin, teacher of the course, or enrolled student
        if (courseData.privacy === 'private' &&
            req.user.role !== 'admin' &&
            req.user.id !== courseData.teacher_id) {
            // TODO: Check if user is enrolled in the course
            return next(forbidden('You do not have access to this course'));
        }

        res.json(courseData);
    } catch (err) {
        next(err);
    }
};

exports.updateCourse = async (req, res, next) => {
    try {
        const courseData = await Course.findById(req.params.id);
        if (!courseData) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Only admin or the course teacher can update
        if (req.user.role !== 'admin' && req.user.id !== courseData.teacher_id) {
            return next(forbidden('You do not have permission to update this course'));
        }

        const updateData = {
            name: req.body.name,
            description: req.body.description,
            privacy: req.body.privacy,
            teacherId: req.body.teacherId
        };

        const updatedCourse = await Course.update(req.params.id, updateData);
        res.json(updatedCourse);
    } catch (err) {
        next(err);
    }
};

exports.listCourses = async (req, res, next) => {
    try {
        const options = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            search: req.query.search,
            privacy: req.query.privacy,
            teacherId: req.query.teacherId
        };

        // For non-admin users, only show public courses and their own courses
        if (req.user.role !== 'admin') {
            if (req.user.role === 'guru') {
                // options.teacherId = req.user.id; // Allow teachers to see all courses
            } else {
                options.privacy = 'public';
                // TODO: Include courses where student is enrolled
            }
        }

        const courses = await Course.list(options);
        res.json(courses);
    } catch (err) {
        next(err);
    }
};
