const Course = require('../models/course.model');
const Enrollment = require('../models/enrollment.model');
const Material = require('../models/material.model');
const Assignment = require('../models/assignment.model');
const CourseContent = require('../models/courseContent.model');
const path = require('path');
const { forbidden, notFound } = require('../utils/ApiError');

exports.createCourse = async (req, res, next) => {
    try {
        if (!['admin', 'guru'].includes(req.user.role)) {
            return next(forbidden('Only admin and teachers can create courses'));
        }

        // Determine teacher_id: use provided teacherId, or current user if they're a teacher
        let teacher_id = req.body.teacher_id || req.body.teacherId;
        
        if (!teacher_id) {
            if (req.user.role === 'guru') {
                teacher_id = req.user.id;
            } else {
                return res.status(400).json({ 
                    message: 'teacher_id is required. Admin users must specify a teacher for the course.' 
                });
            }
        }

        const courseData = {
            name: req.body.name,
            description: req.body.description,
            privacy: req.body.privacy || 'private',
            teacherId: teacher_id // This will be mapped to teacher_id in the model
        };

        const newCourse = await Course.create(courseData);
        res.status(201).json(newCourse);
    } catch (err) {
        next(err);
    }
};

exports.getCourseContentById = async (req, res, next) => {
    try {
        const { courseId, contentId } = req.params;

        // Find the course content entry
        const courseContent = await CourseContent.findByCourseIdAndContentId(courseId, contentId);

        if (!courseContent) {
            return next(notFound('Course content not found'));
        }

        // Check course access (similar to getCourse)
        const course = await Course.findById(courseId);
        if (!course) {
            return next(notFound('Course not found'));
        }

        // If course is private, check if user is admin, teacher of the course, or enrolled student
        if (course.privacy === 'private' &&
            req.user.role !== 'admin' &&
            req.user.id !== course.teacher_id) {
            const enrollment = await Enrollment.findByCourseAndStudent(courseId, req.user.id);
            if (!enrollment || enrollment.status !== 'active') {
                return next(forbidden('You do not have access to this course content'));
            }
        }

        let contentDetails;
        if (courseContent.content_type === 'material') {
            contentDetails = await Material.findById(courseContent.content_id);
        } else if (courseContent.content_type === 'assignment') {
            contentDetails = await Assignment.findById(courseContent.content_id);
        }

        if (!contentDetails) {
            return next(notFound('Content details not found'));
        }

        res.json({
            id: courseContent.id,
            course_id: courseContent.course_id,
            content_type: courseContent.content_type,
            order_index: courseContent.order_index,
            details: contentDetails
        });

    } catch (err) {
        next(err);
    }
};

exports.getCourseContents = async (req, res, next) => {
    try {
        const { courseId } = req.params;

        // Check course access (similar to getCourse)
        const course = await Course.findById(courseId);
        if (!course) {
            return next(notFound('Course not found'));
        }

        // If course is private, check if user is admin, teacher of the course, or enrolled student
        if (course.privacy === 'private' &&
            req.user.role !== 'admin' &&
            req.user.id !== course.teacher_id) {
            const enrollment = await Enrollment.findByCourseAndStudent(courseId, req.user.id);
            if (!enrollment || enrollment.status !== 'active') {
                return next(forbidden('You do not have access to this course content'));
            }
        }

        // Get all course content entries for the given courseId
        const courseContents = await CourseContent.findByCourseId(courseId);

        const detailedContents = await Promise.all(courseContents.map(async (content) => {
            let contentDetails;
            if (content.content_type === 'material') {
                contentDetails = await Material.findById(content.content_id);
            } else if (content.content_type === 'assignment') {
                contentDetails = await Assignment.findById(content.content_id);
            }
            return {
                id: content.id,
                course_id: content.course_id,
                content_type: content.content_type,
                order_index: content.order_index,
                details: contentDetails
            };
        }));

        res.json(detailedContents);

    } catch (err) {
        next(err);
    }
};


exports.addContentToCourse = async (req, res, next) => {
    try {
        const courseId = req.params.courseId;
        let { type } = req.body;

        if (req.headers['content-type'] === 'multipart/form-data' || type === 'material') {
            type = 'material';
            const { title, description, video_url, publish_date } = req.body;
            let file_path = null;
            if (req.file) {
                // Construct the relative path for storage in the database
                // Assuming files are served from the 'public' directory
                const relativeUploadPath = path.relative(path.join(__dirname, '../../public'), req.file.path);
                file_path = `/${relativeUploadPath.replace(/\\/g, '/')}`; // Use forward slashes for URL
            }

            const materialData = {
                course_id: courseId,
                title,
                description,
                content: req.body.content, // Use req.body.content directly
                file_path,
                publish_date
            };

            if (video_url) {
                materialData.video_url = video_url;
            }

            const material = await Material.create(materialData);

            // Add entry to course_contents table
            await CourseContent.create({
                course_id: courseId,
                content_type: 'material',
                content_id: material.id,
                title: material.title,
                order_index: Date.now() // Simple ordering for now
            });

            res.status(201).json({ message: 'Material added successfully', material });
        } else if (type === 'assignment') {
            const { title, description, type: assignment_type, due_date, max_score } = req.body;
            const assignment = await Assignment.create({
                course_id: courseId,
                title,
                description,
                type: assignment_type,
                due_date,
                max_score
            });

            // Add entry to course_contents table
            await CourseContent.create({
                course_id: courseId,
                content_type: 'assignment',
                content_id: assignment.id,
                title: assignment.title,
                order_index: Date.now() // Simple ordering for now
            });

            res.status(201).json({ message: 'Assignment added successfully', assignment });
        } else {
            res.status(400).json({ message: 'Invalid content type' });
        }
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

        // Build update data, excluding undefined values
        const updateData = {};
        
        if (req.body.name !== undefined) {
            updateData.name = req.body.name;
        }
        
        if (req.body.description !== undefined) {
            updateData.description = req.body.description;
        }
        
        if (req.body.privacy !== undefined) {
            updateData.privacy = req.body.privacy;
        }
        
        // Only update teacher_id if explicitly provided
        const newTeacherId = req.body.teacher_id || req.body.teacherId;
        if (newTeacherId) {
            updateData.teacher_id = newTeacherId;
        }
        // If no teacher_id provided, keep the existing one (don't update it)

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
