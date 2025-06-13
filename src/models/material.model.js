const db = require('../config/db');

const Material = {};

Material.create = async (materialData) => {
    try {
        const { course_id, title, description, content, file_path, video_url, publish_date } = materialData;
        const query = 'INSERT INTO materials (course_id, title, description, content, file_path, video_url, publish_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *';
        const values = [course_id, title, description, content, file_path, video_url, publish_date];
        const { rows } = await db.query(query, values);
        return rows[0];
    } catch (error) {
        throw error;
    }
};

Material.findById = async (id) => {
    try {
        const query = 'SELECT * FROM materials WHERE id = $1';
        const { rows } = await db.query(query, [id]);
        return rows[0];
    } catch (error) {
        throw error;
    }
};

module.exports = Material;
