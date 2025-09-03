const db = require('../config/db');
const logger = require('../utils/logger');

class ActivityLog {
    /**
     * Create an activity log entry
     * @param {Object} logData - Activity log data
     * @returns {Promise<Object>} Created log entry
     */
    static async create(logData) {
        try {
            const {
                user_id,
                course_id,
                action_type,
                entity_type,
                entity_id,
                description,
                metadata = null
            } = logData;

            const query = `
                INSERT INTO activity_logs 
                (user_id, course_id, action_type, entity_type, entity_id, description, metadata, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                RETURNING *
            `;

            const values = [
                user_id,
                course_id,
                action_type,
                entity_type,
                entity_id,
                description,
                metadata ? JSON.stringify(metadata) : null
            ];

            const result = await db.query(query, values);
            return result.rows[0];
        } catch (error) {
            logger.error(`Error creating activity log: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get recent activities for a course
     * @param {number} courseId - Course ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Recent activities with pagination
     */
    static async getRecentActivities(courseId, options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                actionTypes = null,
                entityTypes = null,
                userId = null
            } = options;

            const offset = (page - 1) * limit;
            
            let query = `
                SELECT 
                    al.*,
                    u.name as user_name,
                    u.email as user_email,
                    u.role as user_role,
                    COUNT(*) OVER() as total_count
                FROM activity_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE al.course_id = $1
            `;

            const values = [courseId];
            let paramCount = 1;

            if (actionTypes && Array.isArray(actionTypes)) {
                paramCount++;
                query += ` AND al.action_type = ANY($${paramCount})`;
                values.push(actionTypes);
            }

            if (entityTypes && Array.isArray(entityTypes)) {
                paramCount++;
                query += ` AND al.entity_type = ANY($${paramCount})`;
                values.push(entityTypes);
            }

            if (userId) {
                paramCount++;
                query += ` AND al.user_id = $${paramCount}`;
                values.push(userId);
            }

            query += ` 
                ORDER BY al.created_at DESC
                LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
            `;
            values.push(limit, offset);

            const result = await db.query(query, values);
            const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

            return {
                activities: result.rows.map(row => {
                    const { total_count, ...activityData } = row;
                    return {
                        ...activityData,
                        metadata: activityData.metadata ? JSON.parse(activityData.metadata) : null
                    };
                }),
                pagination: {
                    total: totalCount,
                    per_page: limit,
                    current_page: page,
                    last_page: Math.ceil(totalCount / limit),
                    from: offset + 1,
                    to: offset + result.rows.length
                }
            };
        } catch (error) {
            logger.error(`Error getting recent activities: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get activity summary for a course
     * @param {number} courseId - Course ID
     * @param {number} days - Number of days to look back (default: 7)
     * @returns {Promise<Object>} Activity summary
     */
    static async getActivitySummary(courseId, days = 7) {
        try {
            const query = `
                SELECT 
                    action_type,
                    entity_type,
                    COUNT(*) as count,
                    DATE_TRUNC('day', created_at) as activity_date
                FROM activity_logs
                WHERE course_id = $1 
                AND created_at >= NOW() - INTERVAL '${days} days'
                GROUP BY action_type, entity_type, DATE_TRUNC('day', created_at)
                ORDER BY activity_date DESC, count DESC
            `;

            const result = await db.query(query, [courseId]);

            // Process results into summary format
            const summary = {
                totalActivities: 0,
                actionBreakdown: {},
                entityBreakdown: {},
                dailyTrend: {}
            };

            result.rows.forEach(row => {
                summary.totalActivities += parseInt(row.count);
                
                // Action type breakdown
                if (!summary.actionBreakdown[row.action_type]) {
                    summary.actionBreakdown[row.action_type] = 0;
                }
                summary.actionBreakdown[row.action_type] += parseInt(row.count);

                // Entity type breakdown
                if (!summary.entityBreakdown[row.entity_type]) {
                    summary.entityBreakdown[row.entity_type] = 0;
                }
                summary.entityBreakdown[row.entity_type] += parseInt(row.count);

                // Daily trend
                const dateKey = row.activity_date.toISOString().split('T')[0];
                if (!summary.dailyTrend[dateKey]) {
                    summary.dailyTrend[dateKey] = 0;
                }
                summary.dailyTrend[dateKey] += parseInt(row.count);
            });

            return summary;
        } catch (error) {
            logger.error(`Error getting activity summary: ${error.message}`);
            throw error;
        }
    }

    /**
     * Log course enrollment activity
     * @param {Object} enrollmentData - Enrollment activity data
     * @returns {Promise<Object>} Created log entry
     */
    static async logEnrollmentActivity(enrollmentData) {
        const {
            userId,
            courseId,
            studentId,
            action, // 'enrolled', 'unenrolled', 'status_changed'
            oldStatus = null,
            newStatus = null
        } = enrollmentData;

        let description;
        let metadata = {};

        switch (action) {
            case 'enrolled':
                description = `Student enrolled in course`;
                metadata = { studentId, status: newStatus };
                break;
            case 'unenrolled':
                description = `Student unenrolled from course`;
                metadata = { studentId };
                break;
            case 'status_changed':
                description = `Student enrollment status changed from ${oldStatus} to ${newStatus}`;
                metadata = { studentId, oldStatus, newStatus };
                break;
            default:
                description = 'Enrollment activity';
                metadata = { studentId, action };
        }

        return this.create({
            user_id: userId,
            course_id: courseId,
            action_type: action,
            entity_type: 'enrollment',
            entity_id: studentId,
            description,
            metadata
        });
    }

    /**
     * Log course content activity
     * @param {Object} contentData - Content activity data
     * @returns {Promise<Object>} Created log entry
     */
    static async logContentActivity(contentData) {
        const {
            userId,
            courseId,
            contentId,
            contentType, // 'material', 'assignment'
            action, // 'created', 'updated', 'deleted', 'published'
            title
        } = contentData;

        let description;
        switch (action) {
            case 'created':
                description = `${contentType} "${title}" was created`;
                break;
            case 'updated':
                description = `${contentType} "${title}" was updated`;
                break;
            case 'deleted':
                description = `${contentType} "${title}" was deleted`;
                break;
            case 'published':
                description = `${contentType} "${title}" was published`;
                break;
            default:
                description = `${contentType} activity`;
        }

        return this.create({
            user_id: userId,
            course_id: courseId,
            action_type: action,
            entity_type: contentType,
            entity_id: contentId,
            description,
            metadata: { title, contentType }
        });
    }

    /**
     * Log course management activity
     * @param {Object} courseData - Course management activity data
     * @returns {Promise<Object>} Created log entry
     */
    static async logCourseActivity(courseData) {
        const {
            userId,
            courseId,
            action, // 'created', 'updated', 'published', 'archived'
            courseName,
            changes = null
        } = courseData;

        let description;
        let metadata = { courseName };

        switch (action) {
            case 'created':
                description = `Course "${courseName}" was created`;
                break;
            case 'updated':
                description = `Course "${courseName}" was updated`;
                if (changes) metadata.changes = changes;
                break;
            case 'published':
                description = `Course "${courseName}" was published`;
                break;
            case 'archived':
                description = `Course "${courseName}" was archived`;
                break;
            default:
                description = 'Course activity';
        }

        return this.create({
            user_id: userId,
            course_id: courseId,
            action_type: action,
            entity_type: 'course',
            entity_id: courseId,
            description,
            metadata
        });
    }
}

module.exports = ActivityLog;