const db = require('../config/db');

const Assignment = {};

Assignment.create = async (assignmentData) => {
    try {
        const { course_id, title, description, type, due_date, max_score } = assignmentData;
        const query = 'INSERT INTO assignments (course_id, title, description, type, due_date, max_score) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
        const values = [course_id, title, description, type, due_date, max_score];
        const { rows } = await db.query(query, values);
        return rows[0];
    } catch (error) {
        throw error;
    }
};

module.exports = Assignment;
