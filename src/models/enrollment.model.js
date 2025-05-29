

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

            const { classId, studentId, enrollmentDate, status } = enrollmentData;

            const query = `
                INSERT INTO class_enrollments (class_id, user_id, enrollment_date, status)
                VALUES ($1, $2, $3, $4)
                RETURNING id, class_id, user_id, enrollment_date, status
            `;

            const values = [classId, studentId, enrollmentDate, status];
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

    // TODO: Add other enrollment-related model functions (e.g., findById, listByClass, delete)
}

module.exports = Enrollment;
