const Course = require('../models/course.model');
const Enrollment = require('../models/enrollment.model');
const Material = require('../models/material.model');
const Assignment = require('../models/assignment.model');
const Submission = require('../models/submission.model');
const CourseContent = require('../models/courseContent.model');
const ActivityLog = require('../models/activityLog.model');
const ResponseHandler = require('../utils/responseHandler');
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
        
        // Log course creation activity
        try {
            await ActivityLog.logCourseActivity({
                userId: req.user.id,
                courseId: newCourse.id,
                action: 'created',
                courseName: newCourse.name
            });
        } catch (logError) {
            // Don't fail the main operation if logging fails
            console.warn('Failed to log course creation activity:', logError.message);
        }
        
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

            // Log content creation activity
            try {
                await ActivityLog.logContentActivity({
                    userId: req.user.id,
                    courseId: courseId,
                    contentId: material.id,
                    contentType: 'material',
                    action: 'created',
                    title: material.title
                });
            } catch (logError) {
                console.warn('Failed to log material creation activity:', logError.message);
            }

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

            // Log assignment creation activity
            try {
                await ActivityLog.logContentActivity({
                    userId: req.user.id,
                    courseId: courseId,
                    contentId: assignment.id,
                    contentType: 'assignment',
                    action: 'created',
                    title: assignment.title
                });
            } catch (logError) {
                console.warn('Failed to log assignment creation activity:', logError.message);
            }

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

        // Get updated course stats for optimistic UI updates
        const courseStats = {
            studentCount: await Enrollment.countActiveStudentsInCourse(courseId),
            lastEnrollment: enrollment.enrollment_date
        };

        // Log enrollment activity
        try {
            await ActivityLog.logEnrollmentActivity({
                userId: req.user.id,
                courseId: courseId,
                studentId: studentId,
                action: 'enrolled',
                newStatus: status
            });
        } catch (logError) {
            console.warn('Failed to log enrollment activity:', logError.message);
        }

        return ResponseHandler.optimisticEnrollment(res, enrollment, courseStats, 'enroll');
    } catch (err) {
        next(err);
    }
};

exports.getCourse = async (req, res, next) => {
    try {
        const includeStats = req.query.includeStats === 'true' || req.query.includeStats === true;
        const courseData = await Course.findById(req.params.id, includeStats);
        
        if (!courseData) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // If course is private, check if user is admin, teacher of the course, or enrolled student
        if (courseData.privacy === 'private' &&
            req.user.role !== 'admin' &&
            req.user.id !== courseData.teacher_id) {
            const enrollment = await Enrollment.findByCourseAndStudent(req.params.id, req.user.id);
            if (!enrollment || enrollment.status !== 'active') {
                return next(forbidden('You do not have access to this course'));
            }
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
        
        // Log course update activity
        try {
            await ActivityLog.logCourseActivity({
                userId: req.user.id,
                courseId: req.params.id,
                action: 'updated',
                courseName: updatedCourse.name,
                changes: Object.keys(updateData)
            });
        } catch (logError) {
            console.warn('Failed to log course update activity:', logError.message);
        }
        
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
            teacherId: req.query.teacherId,
            includeStats: req.query.includeStats === 'true' || req.query.includeStats === true
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

exports.getCourseStatistics = async (req, res, next) => {
    try {
        const { courseId } = req.params;

        // Check if the course exists and get it with stats
        const course = await Course.findById(courseId, true);
        if (!course) {
            return next(notFound('Course not found'));
        }

        // Check access permissions
        if (course.privacy === 'private' &&
            req.user.role !== 'admin' &&
            req.user.id !== course.teacher_id) {
            const enrollment = await Enrollment.findByCourseAndStudent(courseId, req.user.id);
            if (!enrollment || enrollment.status !== 'active') {
                return next(forbidden('You do not have access to view statistics for this course'));
            }
        }

        // Get recent activity details
        const recentActivity = await CourseContent.getRecentActivity(courseId, 5);

        // Get assignment and material breakdown
        const contentStats = await CourseContent.getContentStats(courseId);

        // Enhanced statistics response
        res.json({
            courseId: courseId,
            courseName: course.name,
            teacherName: course.teacher_name,
            
            // Student statistics
            studentCount: course.student_count || 0,
            activeStudentCount: course.active_student_count || 0,
            pendingStudentCount: course.pending_student_count || 0,
            
            // Content statistics
            materialCount: course.material_count || 0,
            assignmentCount: course.assignment_count || 0,
            totalContentItems: (course.material_count || 0) + (course.assignment_count || 0),
            
            // Completion and activity
            averageCompletionRate: course.avg_completion_rate || 0,
            lastActivity: course.last_activity,
            
            // Recent activity summary
            recentActivity: recentActivity || [],
            
            // Content breakdown
            contentBreakdown: contentStats || {
                materials: 0,
                assignments: 0,
                quizzes: 0
            },
            
            // Course health metrics
            healthMetrics: {
                engagement: course.active_student_count > 0 ? 'active' : 'low',
                contentRichness: (course.material_count || 0) > 3 ? 'rich' : 'basic',
                assessmentCoverage: (course.assignment_count || 0) > 0 ? 'covered' : 'needs_assessment'
            }
        });

    } catch (err) {
        next(err);
    }
};

exports.getCourseEnrollments = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const { page, limit, status } = req.query;

        // Check if the course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return next(notFound('Course not found'));
        }

        // Check access permissions
        // If course is private, check if user is admin, teacher of the course, or enrolled student
        if (course.privacy === 'private' &&
            req.user.role !== 'admin' &&
            req.user.id !== course.teacher_id) {
            // Check if user is enrolled in the course
            const enrollment = await Enrollment.findByCourseAndStudent(courseId, req.user.id);
            if (!enrollment || enrollment.status !== 'active') {
                return next(forbidden('You do not have access to view enrollments for this course'));
            }
        }

        const options = {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
            status: status || null
        };

        const result = await Enrollment.findByCourseId(courseId, options);
        res.json(result);

    } catch (err) {
        next(err);
    }
};

exports.bulkEnrollStudents = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const { studentIds, status = 'active' } = req.body;

        // Validate input
        if (!Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ 
                message: 'studentIds must be a non-empty array' 
            });
        }

        // Check if the course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return next(notFound('Course not found'));
        }

        // Check authorization (only admin or course teacher can bulk enroll)
        if (req.user.role !== 'admin' && req.user.id !== course.teacher_id) {
            return next(forbidden('You do not have permission to enroll students in this course'));
        }

        // Perform bulk enrollment
        const result = await Enrollment.bulkEnroll(courseId, studentIds, status);

        return ResponseHandler.batchOperation(res, result, 'enrollment');

    } catch (err) {
        next(err);
    }
};

exports.bulkUpdateEnrollmentStatus = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const { enrollmentIds, status } = req.body;

        // Validate input
        if (!Array.isArray(enrollmentIds) || enrollmentIds.length === 0) {
            return res.status(400).json({ 
                message: 'enrollmentIds must be a non-empty array' 
            });
        }

        if (!['active', 'inactive', 'pending'].includes(status)) {
            return res.status(400).json({ 
                message: 'status must be one of: active, inactive, pending' 
            });
        }

        // Check if the course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return next(notFound('Course not found'));
        }

        // Check authorization (only admin or course teacher can update enrollment status)
        if (req.user.role !== 'admin' && req.user.id !== course.teacher_id) {
            return next(forbidden('You do not have permission to update enrollment status for this course'));
        }

        // Perform bulk status update
        const result = await Enrollment.bulkUpdateStatus(enrollmentIds, status);

        return ResponseHandler.batchOperation(res, { 
            successful: result.updated, 
            failed: 0, 
            total: result.updated,
            results: result 
        }, 'status update');

    } catch (err) {
        next(err);
    }
};

exports.getEnrollmentAnalytics = async (req, res, next) => {
    try {
        const { courseId } = req.params;

        // Check if the course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return next(notFound('Course not found'));
        }

        // Check authorization (only admin or course teacher can view analytics)
        if (req.user.role !== 'admin' && req.user.id !== course.teacher_id) {
            return next(forbidden('You do not have permission to view enrollment analytics for this course'));
        }

        const analytics = await Enrollment.getEnrollmentAnalytics(courseId);

        return ResponseHandler.statisticsResponse(res, {
            courseId: courseId,
            courseName: course.name,
            ...analytics
        });

    } catch (err) {
        next(err);
    }
};

exports.searchSuggestions = async (req, res, next) => {
    try {
        const { q: query, limit } = req.query;

        if (!query || query.trim().length < 2) {
            return res.json([]);
        }

        const suggestions = await Course.searchSuggestions({
            query: query.trim(),
            limit: parseInt(limit) || 10,
            userId: req.user.id,
            userRole: req.user.role
        });

        res.json(suggestions);

    } catch (err) {
        next(err);
    }
};

exports.advancedFilter = async (req, res, next) => {
    try {
        const filters = {
            ...req.query,
            userId: req.user.id,
            userRole: req.user.role
        };

        // Apply role-based constraints
        if (req.user.role !== 'admin') {
            if (req.user.role === 'guru') {
                // Teachers can see all courses (for now)
            } else {
                // Students only see public courses and enrolled courses
                filters.privacy = 'public';
                // TODO: Include courses where student is enrolled
            }
        }

        const results = await Course.advancedFilter(filters);
        return ResponseHandler.searchResponse(res, results, filters.search, filters);

    } catch (err) {
        next(err);
    }
};

exports.findByClassCode = async (req, res, next) => {
    try {
        const { code } = req.params;

        if (!code || code.trim().length === 0) {
            return res.status(400).json({ 
                message: 'Class code is required' 
            });
        }

        const course = await Course.findByCode(code.trim());
        
        if (!course) {
            return res.status(404).json({ 
                message: 'Course not found with the provided class code' 
            });
        }

        // Check if course is accessible to the user
        if (course.privacy === 'private' &&
            req.user.role !== 'admin' &&
            req.user.id !== course.teacher_id) {
            // For private courses accessed via class code, allow students to see basic info for enrollment
            const publicCourseInfo = {
                id: course.id,
                name: course.name,
                description: course.description,
                teacher_name: course.teacher_name,
                privacy: course.privacy,
                code: course.code
            };

            return res.json({
                ...publicCourseInfo,
                canEnroll: req.user.role === 'siswa' // Only students can enroll
            });
        }

        res.json(course);

    } catch (err) {
        next(err);
    }
};

exports.getCourseActivities = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const { page, limit, actionTypes, entityTypes, userId } = req.query;

        // Check if the course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return next(notFound('Course not found'));
        }

        // Check authorization (only admin or course teacher can view activities)
        if (req.user.role !== 'admin' && req.user.id !== course.teacher_id) {
            return next(forbidden('You do not have permission to view activities for this course'));
        }

        const options = {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
            actionTypes: actionTypes ? actionTypes.split(',') : null,
            entityTypes: entityTypes ? entityTypes.split(',') : null,
            userId: userId ? parseInt(userId) : null
        };

        const activities = await ActivityLog.getRecentActivities(courseId, options);

        res.json({
            courseId: courseId,
            courseName: course.name,
            ...activities
        });

    } catch (err) {
        next(err);
    }
};

exports.getCourseActivitySummary = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const { days } = req.query;

        // Check if the course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return next(notFound('Course not found'));
        }

        // Check authorization (only admin or course teacher can view activity summary)
        if (req.user.role !== 'admin' && req.user.id !== course.teacher_id) {
            return next(forbidden('You do not have permission to view activity summary for this course'));
        }

        const summary = await ActivityLog.getActivitySummary(courseId, parseInt(days) || 7);

        res.json({
            courseId: courseId,
            courseName: course.name,
            period: `Last ${days || 7} days`,
            ...summary
        });

    } catch (err) {
        next(err);
    }
};

exports.updateContentOrder = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const { contentOrders } = req.body;

        // Validate input
        if (!Array.isArray(contentOrders) || contentOrders.length === 0) {
            return res.status(400).json({ 
                message: 'contentOrders must be a non-empty array of {id, order_index} objects' 
            });
        }

        // Check if the course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return next(notFound('Course not found'));
        }

        // Check authorization (only admin or course teacher can reorder content)
        if (req.user.role !== 'admin' && req.user.id !== course.teacher_id) {
            return next(forbidden('You do not have permission to reorder content in this course'));
        }

        // Update content order
        const success = await CourseContent.updateContentOrder(courseId, contentOrders);

        if (success) {
            // Log content reordering activity
            try {
                await ActivityLog.create({
                    user_id: req.user.id,
                    course_id: courseId,
                    action_type: 'reordered',
                    entity_type: 'course_content',
                    entity_id: courseId,
                    description: `Course content was reordered`,
                    metadata: { 
                        itemCount: contentOrders.length,
                        contentIds: contentOrders.map(c => c.id)
                    }
                });
            } catch (logError) {
                console.warn('Failed to log content reordering activity:', logError.message);
            }

            res.json({
                message: 'Content order updated successfully',
                updatedItems: contentOrders.length
            });
        } else {
            res.status(500).json({ message: 'Failed to update content order' });
        }

    } catch (err) {
        next(err);
    }
};
