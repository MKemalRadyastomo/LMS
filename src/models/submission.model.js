const db = require('../config/db');

const Submission = {};

Submission.create = async (submissionData) => {
    try {
        const { assignment_id, student_id, submission_text, file_path, quiz_answers_json, grade, feedback, status, plagiarism_score } = submissionData;
        const query = `
            INSERT INTO assignment_submissions (
                assignment_id, student_id, submission_text, file_path,
                quiz_answers_json, grade, feedback, status, plagiarism_score
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        const values = [
            assignment_id, student_id, submission_text, file_path,
            quiz_answers_json, grade, feedback, status, plagiarism_score
        ];
        const { rows } = await db.query(query, values);
        return rows[0];
    } catch (error) {
        throw error;
    }
};

Submission.findById = async (id) => {
    try {
        const query = 'SELECT * FROM assignment_submissions WHERE id = $1';
        const { rows } = await db.query(query, [id]);
        return rows[0];
    } catch (error) {
        throw error;
    }
};

Submission.findByAssignmentAndStudent = async (assignmentId, studentId) => {
    try {
        const query = 'SELECT * FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2 ORDER BY submitted_at DESC LIMIT 1';
        const { rows } = await db.query(query, [assignmentId, studentId]);
        return rows[0];
    } catch (error) {
        throw error;
    }
};

Submission.update = async (id, submissionData) => {
    try {
        const { submission_text, file_path, quiz_answers_json, grade, feedback, status, plagiarism_score } = submissionData;
        const query = `
            UPDATE assignment_submissions
            SET
                submission_text = COALESCE($1, submission_text),
                file_path = COALESCE($2, file_path),
                quiz_answers_json = COALESCE($3, quiz_answers_json),
                grade = COALESCE($4, grade),
                feedback = COALESCE($5, feedback),
                status = COALESCE($6, status),
                plagiarism_score = COALESCE($7, plagiarism_score),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
            RETURNING *
        `;
        const values = [
            submission_text, file_path, quiz_answers_json, grade, feedback, status, plagiarism_score, id
        ];
        const { rows } = await db.query(query, values);
        return rows[0];
    } catch (error) {
        throw error;
    }
};

Submission.findByAssignmentId = async (assignmentId) => {
    try {
        const query = 'SELECT * FROM assignment_submissions WHERE assignment_id = $1';
        const { rows } = await db.query(query, [assignmentId]);
        return rows;
    } catch (error) {
        throw error;
    }
};

module.exports = Submission;
