const db = require('../config/db');

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
}

module.exports = CourseContent;
