const db = require('../config/db');
const logger = require('../utils/logger');

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
            quiz_questions_json ? JSON.stringify(quiz_questions_json) : null, allowed_file_types, max_file_size_mb
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
            query += ` AND status = ${paramIndex++}`;
            values.push(filters.status);
        }
        if (filters.due_date_before) {
            query += ` AND due_date <= ${paramIndex++}`;
            values.push(filters.due_date_before);
        }
        if (filters.due_date_after) {
            query += ` AND due_date >= ${paramIndex++}`;
            values.push(filters.due_date_after);
        }

        const { rows } = await db.query(query, values);
        return rows;
    } catch (error) {
        throw error;
    }
};

Assignment.update = async (id, assignmentData) => {
    try {
        const { 
            title, description, type, due_date, max_score,
            quiz_questions_json, allowed_file_types, max_file_size_mb 
        } = assignmentData;
        
        const query = `
            UPDATE assignments
            SET
                title = COALESCE($1, title),
                description = COALESCE($2, description),
                type = COALESCE($3, type),
                due_date = COALESCE($4, due_date),
                max_score = COALESCE($5, max_score),
                quiz_questions_json = COALESCE($6, quiz_questions_json),
                allowed_file_types = COALESCE($7, allowed_file_types),
                max_file_size_mb = COALESCE($8, max_file_size_mb),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $9
            RETURNING *
        `;
        
        const values = [
            title, description, type, due_date, max_score,
            quiz_questions_json ? JSON.stringify(quiz_questions_json) : null, allowed_file_types, max_file_size_mb, id
        ];
        
        const { rows } = await db.query(query, values);
        return rows[0];
    } catch (error) {
        throw error;
    }
};

Assignment.delete = async (id) => {
    try {
        const query = 'DELETE FROM assignments WHERE id = $1';
        await db.query(query, [id]);
    } catch (error) {
        throw error;
    }
};

/**
 * Get assignment analytics including submission statistics
 */
Assignment.getAnalytics = async (assignmentId) => {
    try {
        const query = `
            SELECT 
                a.*,
                COUNT(DISTINCT s.id) as total_submissions,
                COUNT(DISTINCT CASE WHEN s.status = 'submitted' THEN s.id END) as submitted_count,
                COUNT(DISTINCT CASE WHEN s.grade IS NOT NULL THEN s.id END) as graded_count,
                ROUND(AVG(s.grade), 2) as average_grade,
                MAX(s.grade) as highest_grade,
                MIN(s.grade) as lowest_grade,
                COUNT(DISTINCT CASE WHEN s.created_at > a.due_date THEN s.id END) as late_submissions
            FROM assignments a
            LEFT JOIN assignment_submissions s ON a.id = s.assignment_id
            WHERE a.id = $1
            GROUP BY a.id
        `;
        
        const { rows } = await db.query(query, [assignmentId]);
        return rows[0];
    } catch (error) {
        logger.error(`Failed to get assignment analytics: ${error.message}`);
        throw error;
    }
};

/**
 * Get assignments by type with filters
 */
Assignment.findByType = async (type, filters = {}) => {
    try {
        let query = 'SELECT * FROM assignments WHERE type = $1';
        const values = [type];
        let paramIndex = 2;

        if (filters.course_id) {
            query += ` AND course_id = $${paramIndex++}`;
            values.push(filters.course_id);
        }

        if (filters.status) {
            query += ` AND status = $${paramIndex++}`;
            values.push(filters.status);
        }

        if (filters.due_date_range) {
            if (filters.due_date_range.start) {
                query += ` AND due_date >= $${paramIndex++}`;
                values.push(filters.due_date_range.start);
            }
            if (filters.due_date_range.end) {
                query += ` AND due_date <= $${paramIndex++}`;
                values.push(filters.due_date_range.end);
            }
        }

        query += ' ORDER BY created_at DESC';

        const { rows } = await db.query(query, values);
        return rows;
    } catch (error) {
        logger.error(`Failed to find assignments by type: ${error.message}`);
        throw error;
    }
};

/**
 * Get assignment submissions with student details
 */
Assignment.getSubmissionsWithStudents = async (assignmentId) => {
    try {
        const query = `
            SELECT 
                s.*,
                u.name as student_name,
                u.email as student_email,
                ce.enrollment_date
            FROM assignment_submissions s
            JOIN users u ON s.student_id = u.id
            LEFT JOIN course_enrollments ce ON ce.user_id = u.id AND ce.course_id = (
                SELECT course_id FROM assignments WHERE id = $1
            )
            WHERE s.assignment_id = $1
            ORDER BY s.created_at DESC
        `;
        
        const { rows } = await db.query(query, [assignmentId]);
        return rows;
    } catch (error) {
        logger.error(`Failed to get submissions with students: ${error.message}`);
        throw error;
    }
};

/**
 * Validate quiz questions structure
 */
Assignment.validateQuizQuestions = (questions) => {
    if (!Array.isArray(questions)) {
        throw new Error('Quiz questions must be an array');
    }

    for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        
        if (!question.type || !['multiple_choice', 'true_false', 'short_answer'].includes(question.type)) {
            throw new Error(`Invalid question type at index ${i}: ${question.type}`);
        }

        if (!question.question || question.question.trim().length === 0) {
            throw new Error(`Question text is required at index ${i}`);
        }

        if (typeof question.points !== 'number' || question.points <= 0) {
            throw new Error(`Invalid points value at index ${i}: must be a positive number`);
        }

        // Validate type-specific requirements
        if (question.type === 'multiple_choice') {
            if (!Array.isArray(question.options) || question.options.length < 2) {
                throw new Error(`Multiple choice question at index ${i} must have at least 2 options`);
            }
            if (!question.correct_answer || !question.options.includes(question.correct_answer)) {
                throw new Error(`Correct answer for multiple choice question at index ${i} must be one of the options`);
            }
        } else if (question.type === 'true_false') {
            if (!['true', 'false'].includes(question.correct_answer)) {
                throw new Error(`True/false question at index ${i} must have 'true' or 'false' as correct answer`);
            }
        } else if (question.type === 'short_answer') {
            if (!question.correct_answer || question.correct_answer.trim().length === 0) {
                throw new Error(`Short answer question at index ${i} must have a correct answer`);
            }
        }
    }

    return true;
};

/**
 * Create assignment with enhanced validation
 */
Assignment.createEnhanced = async (assignmentData) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');

        // Validate assignment type
        const validTypes = ['essay', 'quiz', 'file_upload', 'mixed'];
        if (!validTypes.includes(assignmentData.type)) {
            throw new Error(`Invalid assignment type: ${assignmentData.type}`);
        }

        // Validate quiz questions if it's a quiz assignment
        if (assignmentData.type === 'quiz' && assignmentData.quiz_questions_json) {
            Assignment.validateQuizQuestions(assignmentData.quiz_questions_json);
        }

        // Validate file upload settings if it's a file upload assignment
        if (assignmentData.type === 'file_upload') {
            if (!assignmentData.allowed_file_types) {
                throw new Error('File upload assignments must specify allowed file types');
            }
            if (!assignmentData.max_file_size_mb || assignmentData.max_file_size_mb <= 0) {
                throw new Error('File upload assignments must specify maximum file size');
            }
        }

        const { 
            course_id, course_content_id, title, description, type, due_date, max_score,
            quiz_questions_json, allowed_file_types, max_file_size_mb, instructions
        } = assignmentData;

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
            quiz_questions_json ? JSON.stringify(quiz_questions_json) : null,
            allowed_file_types, max_file_size_mb
        ];

        const { rows } = await client.query(query, values);
        const assignment = rows[0];

        await client.query('COMMIT');
        logger.info(`Created enhanced assignment: ${assignment.id}`);
        
        return assignment;
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Failed to create enhanced assignment: ${error.message}`);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Get upcoming assignments for a course
 */
Assignment.getUpcoming = async (courseId, daysAhead = 7) => {
    try {
        const query = `
            SELECT * FROM assignments 
            WHERE course_id = $1 
                AND due_date > NOW() 
                AND due_date <= NOW() + INTERVAL '${daysAhead} days'
                AND status = 'active'
            ORDER BY due_date ASC
        `;
        
        const { rows } = await db.query(query, [courseId]);
        return rows;
    } catch (error) {
        logger.error(`Failed to get upcoming assignments: ${error.message}`);
        throw error;
    }
};

/**
 * Get overdue assignments for a course
 */
Assignment.getOverdue = async (courseId) => {
    try {
        const query = `
            SELECT a.*, 
                   COUNT(s.id) as submission_count,
                   COUNT(ce.user_id) as enrolled_count
            FROM assignments a
            LEFT JOIN assignment_submissions s ON a.id = s.assignment_id
            LEFT JOIN course_enrollments ce ON a.course_id = ce.course_id AND ce.status = 'active'
            WHERE a.course_id = $1 
                AND a.due_date < NOW() 
                AND a.status = 'active'
            GROUP BY a.id
            ORDER BY a.due_date DESC
        `;
        
        const { rows } = await db.query(query, [courseId]);
        return rows;
    } catch (error) {
        logger.error(`Failed to get overdue assignments: ${error.message}`);
        throw error;
    }
};

module.exports = Assignment;
