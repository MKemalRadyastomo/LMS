

const db = require('../config/db');
const logger = require('../utils/logger');

class Enrollment {
    /**
     * Create a new enrollment
     * @param {Object} enrollmentData - Enrollment data
     * @returns {Promise<Object>} Created enrollment
     */
    static async create(enrollmentData) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            const { courseId, studentId, enrollmentDate, status } = enrollmentData;

            const query = `
                INSERT INTO course_enrollments (course_id, user_id, enrollment_date, status)
                VALUES ($1, $2, $3, $4)
                RETURNING id, course_id, user_id, enrollment_date, status
            `;

            const values = [courseId, studentId, enrollmentDate, status];
            const result = await client.query(query, values);

            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error(`Error creating enrollment: ${error.message}`);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Find an enrollment by course ID and student ID
     * @param {number} courseId - The ID of the course
     * @param {number} studentId - The ID of the student (user)
     * @returns {Promise<Object|null>} Enrollment object if found, null otherwise
     */
    static async findByCourseAndStudent(courseId, studentId) {
        const query = `
            SELECT id, course_id, user_id, enrollment_date, status
            FROM course_enrollments
            WHERE course_id = $1 AND user_id = $2
        `;
        const values = [courseId, studentId];
        try {
            const result = await db.query(query, values);
            return result.rows[0] || null;
        } catch (error) {
            logger.error(`Error finding enrollment by course and student: ${error.message}`);
            throw error;
        }
    }

    /**
     * Count active students in a specific course
     * @param {number} courseId - The ID of the course
     * @returns {Promise<number>} Number of active students
     */
    static async countActiveStudentsInCourse(courseId) {
        const query = `
            SELECT COUNT(DISTINCT user_id)
            FROM course_enrollments
            WHERE course_id = $1 AND status = 'active'
        `;
        const values = [courseId];
        try {
            const result = await db.query(query, values);
            return parseInt(result.rows[0].count, 10);
        } catch (error) {
            logger.error(`Error counting active students in course: ${error.message}`);
            throw error;
        }
    }

    /**
     * Find all enrollments for a specific course with user details
     * @param {number} courseId - The ID of the course
     * @param {Object} options - Query options (page, limit, status)
     * @returns {Promise<Object>} Enrollments with pagination
     */
    static async findByCourseId(courseId, options = {}) {
        const {
            page = 1,
            limit = 20,
            status = null
        } = options;

        const offset = (page - 1) * limit;
        
        try {
            // Build queries based on whether status filter is provided
            let countQuery, dataQuery, countParams, dataParams;
            
            if (status) {
                // With status filter
                countQuery = `
                    SELECT COUNT(*) as total
                    FROM course_enrollments ce
                    WHERE ce.course_id = $1 AND ce.status = $2
                `;
                countParams = [courseId, status];
                
                dataQuery = `
                    SELECT 
                        ce.id,
                        ce.course_id,
                        ce.user_id,
                        ce.enrollment_date,
                        ce.status,
                        u.name as user_name,
                        u.email as user_email,
                        u.role as user_role
                    FROM course_enrollments ce
                    INNER JOIN users u ON ce.user_id = u.id
                    WHERE ce.course_id = $1 AND ce.status = $2
                    ORDER BY ce.enrollment_date DESC
                    LIMIT $3 OFFSET $4
                `;
                dataParams = [courseId, status, limit, offset];
            } else {
                // Without status filter
                countQuery = `
                    SELECT COUNT(*) as total
                    FROM course_enrollments ce
                    WHERE ce.course_id = $1
                `;
                countParams = [courseId];
                
                dataQuery = `
                    SELECT 
                        ce.id,
                        ce.course_id,
                        ce.user_id,
                        ce.enrollment_date,
                        ce.status,
                        u.name as user_name,
                        u.email as user_email,
                        u.role as user_role
                    FROM course_enrollments ce
                    INNER JOIN users u ON ce.user_id = u.id
                    WHERE ce.course_id = $1
                    ORDER BY ce.enrollment_date DESC
                    LIMIT $2 OFFSET $3
                `;
                dataParams = [courseId, limit, offset];
            }

            // Get total count
            const countResult = await db.query(countQuery, countParams);
            const total = parseInt(countResult.rows[0].total, 10);
            const totalPages = Math.ceil(total / limit);

            // Get data
            const dataResult = await db.query(dataQuery, dataParams);
            
            // Format response
            const enrollments = dataResult.rows.map(row => ({
                id: row.id,
                course_id: row.course_id,
                user_id: row.user_id,
                enrollment_date: row.enrollment_date,
                status: row.status,
                user: {
                    id: row.user_id,
                    name: row.user_name,
                    email: row.user_email,
                    role: row.user_role
                }
            }));

            return {
                enrollments,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages
                }
            };
        } catch (error) {
            logger.error(`Error finding enrollments by course ID: ${error.message}`);
            throw error;
        }
    }

    /**
     * Bulk enroll students in a course
     * @param {number} courseId - The ID of the course
     * @param {Array} studentIds - Array of student IDs to enroll
     * @param {string} status - Enrollment status (default: 'active')
     * @returns {Promise<Object>} Results of bulk enrollment
     */
    static async bulkEnroll(courseId, studentIds, status = 'active') {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            const enrollmentDate = new Date().toISOString();
            const successful = [];
            const failed = [];

            for (const studentId of studentIds) {
                try {
                    // Check if enrollment already exists
                    const existing = await this.findByCourseAndStudent(courseId, studentId);
                    
                    if (existing) {
                        failed.push({
                            studentId,
                            error: 'Student already enrolled in this course'
                        });
                        continue;
                    }

                    // Create enrollment
                    const query = `
                        INSERT INTO course_enrollments (course_id, user_id, enrollment_date, status)
                        VALUES ($1, $2, $3, $4)
                        RETURNING id, course_id, user_id, enrollment_date, status
                    `;
                    
                    const result = await client.query(query, [courseId, studentId, enrollmentDate, status]);
                    successful.push(result.rows[0]);
                    
                } catch (error) {
                    failed.push({
                        studentId,
                        error: error.message
                    });
                }
            }

            await client.query('COMMIT');
            
            return {
                successful: successful.length,
                failed: failed.length,
                total: studentIds.length,
                enrollments: successful,
                errors: failed
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error(`Error in bulk enrollment: ${error.message}`);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Bulk update enrollment status
     * @param {Array} enrollmentIds - Array of enrollment IDs
     * @param {string} status - New status to set
     * @returns {Promise<Object>} Results of bulk update
     */
    static async bulkUpdateStatus(enrollmentIds, status) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            const query = `
                UPDATE course_enrollments 
                SET status = $1 
                WHERE id = ANY($2::int[])
                RETURNING id, course_id, user_id, status
            `;
            
            const result = await client.query(query, [status, enrollmentIds]);
            
            await client.query('COMMIT');
            
            return {
                updated: result.rows.length,
                enrollments: result.rows
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error(`Error in bulk status update: ${error.message}`);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get enrollment analytics for a course
     * @param {number} courseId - The ID of the course
     * @returns {Promise<Object>} Enrollment analytics
     */
    static async getEnrollmentAnalytics(courseId) {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_enrollments,
                    COUNT(*) FILTER (WHERE status = 'active') as active_enrollments,
                    COUNT(*) FILTER (WHERE status = 'pending') as pending_enrollments,
                    COUNT(*) FILTER (WHERE status = 'inactive') as inactive_enrollments,
                    DATE_TRUNC('day', enrollment_date) as enrollment_day,
                    COUNT(*) as daily_count
                FROM course_enrollments 
                WHERE course_id = $1
                GROUP BY DATE_TRUNC('day', enrollment_date)
                ORDER BY enrollment_day DESC
                LIMIT 30
            `;
            
            const result = await db.query(query, [courseId]);
            
            const summaryQuery = `
                SELECT 
                    COUNT(*) as total_enrollments,
                    COUNT(*) FILTER (WHERE status = 'active') as active_enrollments,
                    COUNT(*) FILTER (WHERE status = 'pending') as pending_enrollments,
                    COUNT(*) FILTER (WHERE status = 'inactive') as inactive_enrollments
                FROM course_enrollments 
                WHERE course_id = $1
            `;
            
            const summaryResult = await db.query(summaryQuery, [courseId]);
            
            return {
                summary: summaryResult.rows[0],
                dailyTrend: result.rows
            };
            
        } catch (error) {
            logger.error(`Error getting enrollment analytics: ${error.message}`);
            throw error;
        }
    }

    /**
     * Find all enrollments for a student
     * @param {number} studentId - Student ID
     * @param {string} status - Optional status filter
     * @returns {Promise<Array>} List of enrollments
     */
    static async findByStudent(studentId, status = null) {
        try {
            let query = `
                SELECT ce.*, c.title as course_title, c.code as course_code
                FROM course_enrollments ce
                LEFT JOIN courses c ON ce.course_id = c.id
                WHERE ce.user_id = $1
            `;
            
            const values = [studentId];
            
            if (status) {
                query += ` AND ce.status = $2`;
                values.push(status);
            }
            
            query += ` ORDER BY ce.enrollment_date DESC`;
            
            const result = await db.query(query, values);
            return result.rows;
        } catch (error) {
            logger.error(`Error finding enrollments by student: ${error.message}`);
            throw error;
        }
    }
}

module.exports = Enrollment;
