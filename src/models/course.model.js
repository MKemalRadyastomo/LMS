const db = require('../config/db');
const logger = require('../utils/logger');
const crypto = require('crypto');

class Course {
    /**
     * Generate a unique course code
     * @returns {string} - A 6-character unique code
     */
    static generateCourseCode() {
        // Generate a 6-character alphanumeric code
        return crypto.randomBytes(3).toString('hex').toUpperCase();
    }

    /**
     * Create a new course
     * @param {Object} courseData - Course data
     * @returns {Promise<Object>} Created course
     */
    static async create(courseData) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            const { name, description, privacy = 'private', teacherId } = courseData;
            let code;
            let attempts = 0;
            const maxAttempts = 5;

            // Generate unique code with retries
            do {
                code = this.generateCourseCode();
                const existing = await client.query(
                    'SELECT id FROM courses WHERE code = $1',
                    [code]
                );
                if (existing.rows.length === 0) break;
                attempts++;
            } while (attempts < maxAttempts);

            if (attempts >= maxAttempts) {
                throw new Error('Failed to generate unique course code');
            }

            const query = `
                INSERT INTO courses (name, description, privacy, code, teacher_id)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, name, description, privacy, code, teacher_id, created_at
            `;

            const values = [name, description, privacy, code, teacherId];
            const result = await client.query(query, values);

            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error(`Error creating course: ${error.message}`);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get a course by ID
     * @param {number} id - Course ID
     * @returns {Promise<Object|null>} Found course or null
     */
    static async findById(id) {
        try {
            const query = `
                SELECT c.*, u.name as teacher_name
                FROM courses c
                LEFT JOIN users u ON c.teacher_id = u.id
                WHERE c.id = $1
            `;
            const result = await db.query(query, [id]);
            return result.rows[0] || null;
        } catch (error) {
            logger.error(`Error finding course: ${error.message}`);
            throw error;
        }
    }

    /**
     * List all courses with pagination and filtering
     * @param {Object} options - List options
     * @returns {Promise<Object>} List of courses and pagination info
     */
    static async list({ page = 1, limit = 20, teacherId, search, privacy }) {
        try {
            const offset = (page - 1) * limit;
            let query = `
                SELECT c.*, u.name as teacher_name,
                       COUNT(*) OVER() as total_count
                FROM courses c
                LEFT JOIN users u ON c.teacher_id = u.id
            `;

            const values = [];
            const conditions = [];

            if (teacherId) {
                conditions.push(`c.teacher_id = $${values.length + 1}`);
                values.push(teacherId);
            }

            if (search) {
                conditions.push(`c.name ILIKE $${values.length + 1}`);
                values.push(`%${search}%`);
            }

            if (privacy) {
                conditions.push(`c.privacy = $${values.length + 1}`);
                values.push(privacy);
            }

            if (conditions.length > 0) {
                query += ` WHERE ${conditions.join(' AND ')}`;
            }

            query += ` ORDER BY c.created_at DESC
                      LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;

            values.push(limit, offset);

            const result = await db.query(query, values);

            const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

            return {
                data: result.rows.map(row => {
                    const { total_count, ...courseData } = row;
                    return courseData;
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
            logger.error(`Error listing courses: ${error.message}`);
            throw error;
        }
    }

    /**
     * Update a course
     * @param {number} id - Course ID
     * @param {Object} courseData - Course data to update
     * @returns {Promise<Object|null>} Updated course or null
     */
    static async update(id, courseData) {
        try {
            const allowedFields = ['name', 'description', 'privacy', 'teacher_id'];
            const updates = [];
            const values = [];
            let paramCount = 1;

            for (const [key, value] of Object.entries(courseData)) {
                if (allowedFields.includes(key)) {
                    updates.push(`${key} = $${paramCount}`);
                    values.push(value);
                    paramCount++;
                }
            }

            if (updates.length === 0) return null;

            values.push(id);

            const query = `
                UPDATE courses
                SET ${updates.join(', ')}
                WHERE id = $${paramCount}
                RETURNING id, name, description, privacy, code, teacher_id, created_at
            `;

            const result = await db.query(query, values);
            return result.rows[0] || null;
        } catch (error) {
            logger.error(`Error updating course: ${error.message}`);
            throw error;
        }
    }
}

module.exports = Course;
