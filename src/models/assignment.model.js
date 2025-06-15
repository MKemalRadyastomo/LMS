const db = require('../config/db');

const Assignment = {};

Assignment.create = async (assignmentData) => {
    try {
        const { course_id, course_content_id, title, description, type, due_date, max_score } = assignmentData;
        const quiz_questions_json = assignmentData.quiz_questions_json || null;
        const allowed_file_types = assignmentData.allowed_file_types || null;
        const max_file_size_mb = assignmentData.max_file_size_mb || null;
        const query = `
            INSERT INTO assignments (
                course_id, course_content_id, title, description, type, due_date, max_score,
                quiz_questions_json, allowed_file_types, max_file_size_mb
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;
        const values = [
            course_id, course_content_id, title, description, type, due_date, max_score,
            quiz_questions_json, allowed_file_types, max_file_size_mb
        ];
        const { rows } = await db.query(query, values);
        return rows[0];
    } catch (error) {
        throw error;
    }
};

Assignment.findById = async (id) => {
    try {
        const query = 'SELECT * FROM assignments WHERE id = $1';
        const { rows } = await db.query(query, [id]);
        return rows[0];
    } catch (error) {
        throw error;
    }
};

Assignment.findByCourseId = async (courseId, filters = {}) => {
    try {
        let query = 'SELECT * FROM assignments WHERE course_id = $1';
        const values = [courseId];
        let paramIndex = 2;

        if (filters.status) {
            query += ` AND status = $${paramIndex++}`;
            values.push(filters.status);
        }
        if (filters.due_date_before) {
            query += ` AND due_date <= $${paramIndex++}`;
            values.push(filters.due_date_before);
        }
        if (filters.due_date_after) {
            query += ` AND due_date >= $${paramIndex++}`;
            values.push(filters.due_date_after);
        }

        const { rows } = await db.query(query, values);
        return rows;
    } catch (error) {
        throw error;
    }
};

Assignment.findByCourseContentId = async (courseContentId, filters = {}) => {
    try {
        let query = 'SELECT * FROM assignments WHERE course_content_id = $1';
        const values = [courseContentId];
        let paramIndex = 2;

        if (filters.status) {
            query += ` AND status = $${paramIndex++}`;
            values.push(filters.status);
        }
        if (filters.due_date_before) {
            query += ` AND due_date <= $${paramIndex++}`;
            values.push(filters.due_date_before);
        }
        if (filters.due_date_after) {
            query += ` AND due_date >= $${paramIndex++}`;
            values.push(filters.due_date_after);
        }

        const { rows } = await db.query(query, values);
        return rows;
    } catch (error) {
        throw error;
    }
};

module.exports = Assignment;
