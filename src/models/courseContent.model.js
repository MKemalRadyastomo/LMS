const db = require('../config/db');
const logger = require('../utils/logger');

class CourseContent {
    static async create({ course_id, content_type, content_id, title, order_index }) {
        const result = await db.query(
            `INSERT INTO course_contents (course_id, content_type, content_id, title, order_index)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [course_id, content_type, content_id, title, order_index]
        );
        return result.rows[0];
    }

    static async findByCourseId(courseId) {
        const result = await db.query(
            `SELECT * FROM course_contents WHERE course_id = $1 ORDER BY order_index ASC`,
            [courseId]
        );
        return result.rows;
    }

    static async findByCourseIdAndContentId(courseId, contentId) {
        const result = await db.query(
            `SELECT * FROM course_contents WHERE course_id = $1 AND content_id = $2`,
            [courseId, contentId]
        );
        return result.rows[0];
    }

    /**
     * Get recent activity for a course
     * @param {number} courseId - Course ID
     * @param {number} limit - Number of recent activities to return
     * @returns {Promise<Array>} Recent activities
     */
    static async getRecentActivity(courseId, limit = 5) {
        try {
            const result = await db.query(
                `SELECT 
                    cc.id,
                    cc.title,
                    cc.content_type,
                    CASE 
                        WHEN cc.content_type = 'material' THEN m.title
                        WHEN cc.content_type = 'assignment' THEN a.title
                        ELSE cc.title
                    END as content_title,
                    CASE 
                        WHEN cc.content_type = 'material' THEN 'Material'
                        WHEN cc.content_type = 'assignment' THEN 'Assignment'
                        ELSE 'Content'
                    END as type_display
                FROM course_contents cc
                LEFT JOIN materials m ON cc.content_type = 'material' AND cc.content_id = m.id
                LEFT JOIN assignments a ON cc.content_type = 'assignment' AND cc.content_id = a.id
                WHERE cc.course_id = $1
                ORDER BY cc.order_index ASC
                LIMIT $2`,
                [courseId, limit]
            );
            return result.rows;
        } catch (error) {
            logger.error(`Error getting recent activity: ${error.message}`);
            return [];
        }
    }

    /**
     * Get content statistics for a course
     * @param {number} courseId - Course ID
     * @returns {Promise<Object>} Content statistics
     */
    static async getContentStats(courseId) {
        try {
            const result = await db.query(
                `SELECT 
                    content_type,
                    COUNT(*) as count
                FROM course_contents 
                WHERE course_id = $1 
                GROUP BY content_type`,
                [courseId]
            );

            const stats = {
                materials: 0,
                assignments: 0,
                quizzes: 0,
                total: 0
            };

            result.rows.forEach(row => {
                stats[row.content_type + 's'] = parseInt(row.count);
                stats.total += parseInt(row.count);
            });

            return stats;
        } catch (error) {
            logger.error(`Error getting content stats: ${error.message}`);
            return {
                materials: 0,
                assignments: 0,
                quizzes: 0,
                total: 0
            };
        }
    }

    /**
     * Update content order for better navigation
     * @param {number} courseId - Course ID
     * @param {Array} contentOrders - Array of {id, order_index} objects
     * @returns {Promise<boolean>} Success status
     */
    static async updateContentOrder(courseId, contentOrders) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            for (const { id, order_index } of contentOrders) {
                await client.query(
                    `UPDATE course_contents 
                     SET order_index = $1 
                     WHERE id = $2 AND course_id = $3`,
                    [order_index, id, courseId]
                );
            }

            await client.query('COMMIT');
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error(`Error updating content order: ${error.message}`);
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = CourseContent;
