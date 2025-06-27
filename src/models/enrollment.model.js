

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
}

module.exports = Enrollment;
