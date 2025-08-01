const db = require('../config/db');
const logger = require('../utils/logger');

const Assignment = {};

Assignment.create = async (assignmentData) => {
    try {
        const {
            course_id,
            course_content_id = null,
            title,
            description,
            type,
            due_date,
            max_score,
            instructions = null,
            quiz_questions_json = null,
            allowed_file_types = null,
            max_file_size_mb = null,
            late_submission_penalty = 0,
            allow_late_submissions = true,
            max_late_days = 7,
            auto_release_grades = false,
            grade_release_date = null,
            multiple_attempts = false,
            max_attempts = 1,
            show_correct_answers = false,
            shuffle_questions = false,
            time_limit_minutes = null,
            require_webcam = false,
            plagiarism_check = false
        } = assignmentData;
        
        const query = `
            INSERT INTO assignments (
                course_id, course_content_id, title, description, type, due_date, max_score,
                instructions, quiz_questions_json, allowed_file_types, max_file_size_mb,
                late_submission_penalty, allow_late_submissions, max_late_days,
                auto_release_grades, grade_release_date, multiple_attempts, max_attempts,
                show_correct_answers, shuffle_questions, time_limit_minutes,
                require_webcam, plagiarism_check
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
            RETURNING *
        `;
        
        const values = [
            course_id,
            course_content_id,
            title,
            description,
            type,
            due_date,
            max_score,
            instructions,
            quiz_questions_json ? JSON.stringify(quiz_questions_json) : null,
            allowed_file_types,
            max_file_size_mb,
            late_submission_penalty,
            allow_late_submissions,
            max_late_days,
            auto_release_grades,
            grade_release_date,
            multiple_attempts,
            max_attempts,
            show_correct_answers,
            shuffle_questions,
            time_limit_minutes,
            require_webcam,
            plagiarism_check
        ];
        
        const { rows } = await db.query(query, values);
        return rows[0];
    } catch (error) {
        logger.error(`Failed to create assignment: ${error.message}`);
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
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');
        
        const { 
            title, description, type, due_date, max_score,
            quiz_questions_json, allowed_file_types, max_file_size_mb,
            instructions, late_submission_penalty, allow_late_submissions,
            max_late_days, auto_release_grades, grade_release_date,
            multiple_attempts, max_attempts, show_correct_answers,
            shuffle_questions, time_limit_minutes, require_webcam, plagiarism_check
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
                instructions = COALESCE($9, instructions),
                late_submission_penalty = COALESCE($10, late_submission_penalty),
                allow_late_submissions = COALESCE($11, allow_late_submissions),
                max_late_days = COALESCE($12, max_late_days),
                auto_release_grades = COALESCE($13, auto_release_grades),
                grade_release_date = COALESCE($14, grade_release_date),
                multiple_attempts = COALESCE($15, multiple_attempts),
                max_attempts = COALESCE($16, max_attempts),
                show_correct_answers = COALESCE($17, show_correct_answers),
                shuffle_questions = COALESCE($18, shuffle_questions),
                time_limit_minutes = COALESCE($19, time_limit_minutes),
                require_webcam = COALESCE($20, require_webcam),
                plagiarism_check = COALESCE($21, plagiarism_check),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $22
            RETURNING *
        `;
        
        const values = [
            title, description, type, due_date, max_score,
            quiz_questions_json ? JSON.stringify(quiz_questions_json) : null, 
            allowed_file_types, max_file_size_mb, instructions,
            late_submission_penalty, allow_late_submissions, max_late_days,
            auto_release_grades, grade_release_date, multiple_attempts, max_attempts,
            show_correct_answers, shuffle_questions, time_limit_minutes,
            require_webcam, plagiarism_check, id
        ];
        
        const { rows } = await client.query(query, values);
        const assignment = rows[0];
        
        // Update automated grading if quiz questions changed
        if (quiz_questions_json && type === 'quiz') {
            await Assignment.setupAutomatedGrading(id, quiz_questions_json);
        }
        
        await client.query('COMMIT');
        return assignment;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
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
        
        if (!question.type || !['multiple_choice', 'true_false', 'short_answer', 'essay'].includes(question.type)) {
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
        } else if (question.type === 'essay') {
            // Essay questions don't need correct answers for auto-grading
            if (!question.rubric && !question.sample_answer) {
                console.warn(`Essay question at index ${i} has no rubric or sample answer - manual grading required`);
            }
        }
    }

    return true;
};

/**
 * Set up automated grading for quiz questions
 */
Assignment.setupAutomatedGrading = async (assignmentId, questions) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');

        // Clear existing automated grading rules
        await client.query('DELETE FROM automated_grading WHERE assignment_id = $1', [assignmentId]);

        // Set up grading rules for objective questions
        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            
            // Only set up auto-grading for objective question types
            if (['multiple_choice', 'true_false', 'short_answer'].includes(question.type)) {
                const query = `
                    INSERT INTO automated_grading (
                        assignment_id, question_index, question_type, correct_answer,
                        answer_variations, points, case_sensitive, partial_credit_rules
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `;
                
                const values = [
                    assignmentId,
                    i,
                    question.type,
                    question.correct_answer,
                    question.answer_variations ? JSON.stringify(question.answer_variations) : null,
                    question.points,
                    question.case_sensitive || false,
                    question.partial_credit_rules ? JSON.stringify(question.partial_credit_rules) : null
                ];
                
                await client.query(query, values);
            }
        }

        await client.query('COMMIT');
        logger.info(`Set up automated grading for assignment ${assignmentId}`);
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Failed to set up automated grading: ${error.message}`);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Create assignment with enhanced validation
 */
Assignment.createEnhanced = async (assignmentData) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');

        // Validate assignment type
        const validTypes = ['essay', 'quiz', 'file_upload', 'mixed', 'coding'];
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
            quiz_questions_json, allowed_file_types, max_file_size_mb, instructions,
            template_id, late_submission_penalty, allow_late_submissions, max_late_days,
            auto_release_grades, grade_release_date, multiple_attempts, max_attempts,
            show_correct_answers, shuffle_questions, time_limit_minutes, require_webcam,
            plagiarism_check
        } = assignmentData;

        const query = `
            INSERT INTO assignments (
                course_id, course_content_id, title, description, type, due_date, max_score,
                quiz_questions_json, allowed_file_types, max_file_size_mb, instructions,
                template_id, late_submission_penalty, allow_late_submissions, max_late_days,
                auto_release_grades, grade_release_date, multiple_attempts, max_attempts,
                show_correct_answers, shuffle_questions, time_limit_minutes, require_webcam,
                plagiarism_check
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
            RETURNING *
        `;
        
        const values = [
            course_id, course_content_id, title, description, type, due_date, max_score,
            quiz_questions_json ? JSON.stringify(quiz_questions_json) : null,
            allowed_file_types, max_file_size_mb, instructions,
            template_id, late_submission_penalty || 0, allow_late_submissions !== false,
            max_late_days || 7, auto_release_grades || false, grade_release_date,
            multiple_attempts || false, max_attempts || 1, show_correct_answers || false,
            shuffle_questions || false, time_limit_minutes, require_webcam || false,
            plagiarism_check || false
        ];

        const { rows } = await client.query(query, values);
        const assignment = rows[0];

        // Set up automated grading for quiz questions if applicable
        if (type === 'quiz' && quiz_questions_json) {
            await Assignment.setupAutomatedGrading(assignment.id, quiz_questions_json);
        }

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

// =====================================================
// ASSIGNMENT TEMPLATES
// =====================================================

/**
 * Create assignment template
 */
Assignment.createTemplate = async (templateData) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');

        const {
            name, description, type, template_data, instructions,
            default_max_score, default_allowed_file_types, default_max_file_size_mb,
            quiz_template_json, rubric_template, created_by, is_public
        } = templateData;

        // Validate template data structure
        Assignment.validateTemplateData(template_data, type);

        const query = `
            INSERT INTO assignment_templates (
                name, description, type, template_data, instructions,
                default_max_score, default_allowed_file_types, default_max_file_size_mb,
                quiz_template_json, rubric_template, created_by, is_public
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `;

        const values = [
            name, description, type, JSON.stringify(template_data), instructions,
            default_max_score, default_allowed_file_types, default_max_file_size_mb,
            quiz_template_json ? JSON.stringify(quiz_template_json) : null,
            rubric_template ? JSON.stringify(rubric_template) : null,
            created_by, is_public
        ];

        const { rows } = await client.query(query, values);
        const template = rows[0];

        await client.query('COMMIT');
        logger.info(`Created assignment template: ${template.id}`);
        
        return template;
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Failed to create assignment template: ${error.message}`);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Get assignment templates with filters
 */
Assignment.getTemplates = async (filters = {}) => {
    try {
        let query = `
            SELECT t.*, u.name as creator_name
            FROM assignment_templates t
            LEFT JOIN users u ON t.created_by = u.id
            WHERE 1=1
        `;
        const values = [];
        let paramIndex = 1;

        if (filters.type) {
            query += ` AND t.type = $${paramIndex++}`;
            values.push(filters.type);
        }

        if (filters.created_by) {
            query += ` AND t.created_by = $${paramIndex++}`;
            values.push(filters.created_by);
        }

        if (filters.is_public !== undefined) {
            query += ` AND t.is_public = $${paramIndex++}`;
            values.push(filters.is_public);
        }

        if (filters.search) {
            query += ` AND (t.name ILIKE $${paramIndex++} OR t.description ILIKE $${paramIndex++})`;
            const searchTerm = `%${filters.search}%`;
            values.push(searchTerm, searchTerm);
        }

        query += ' ORDER BY t.usage_count DESC, t.created_at DESC';

        if (filters.limit) {
            query += ` LIMIT $${paramIndex++}`;
            values.push(filters.limit);
        }

        const { rows } = await db.query(query, values);
        return rows;
    } catch (error) {
        logger.error(`Failed to get assignment templates: ${error.message}`);
        throw error;
    }
};

/**
 * Create assignment from template
 */
Assignment.createFromTemplate = async (templateId, assignmentData) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');

        // Get template
        const templateQuery = 'SELECT * FROM assignment_templates WHERE id = $1';
        const { rows: templates } = await client.query(templateQuery, [templateId]);
        
        if (templates.length === 0) {
            throw new Error('Template not found');
        }

        const template = templates[0];
        
        // Parse template data
        const templateData = typeof template.template_data === 'string' 
            ? JSON.parse(template.template_data) 
            : template.template_data;

        // Merge template data with assignment data
        const mergedData = {
            ...templateData,
            ...assignmentData,
            template_id: templateId,
            type: template.type,
            instructions: assignmentData.instructions || template.instructions,
            max_score: assignmentData.max_score || template.default_max_score,
            allowed_file_types: assignmentData.allowed_file_types || template.default_allowed_file_types,
            max_file_size_mb: assignmentData.max_file_size_mb || template.default_max_file_size_mb,
            quiz_questions_json: assignmentData.quiz_questions_json || template.quiz_template_json
        };

        // Create assignment
        const assignment = await Assignment.createEnhanced(mergedData);

        // Update template usage count
        await client.query(
            'UPDATE assignment_templates SET usage_count = usage_count + 1 WHERE id = $1',
            [templateId]
        );

        await client.query('COMMIT');
        logger.info(`Created assignment ${assignment.id} from template ${templateId}`);
        
        return assignment;
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Failed to create assignment from template: ${error.message}`);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Validate template data structure
 */
Assignment.validateTemplateData = (templateData, type) => {
    if (!templateData || typeof templateData !== 'object') {
        throw new Error('Template data must be a valid object');
    }

    const requiredFields = ['title', 'description'];
    for (const field of requiredFields) {
        if (!templateData[field]) {
            throw new Error(`Template data missing required field: ${field}`);
        }
    }

    if (type === 'quiz' && templateData.quiz_questions) {
        Assignment.validateQuizQuestions(templateData.quiz_questions);
    }

    return true;
};

// =====================================================
// BULK OPERATIONS
// =====================================================

/**
 * Bulk create assignments
 */
Assignment.bulkCreate = async (assignmentsData) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');

        const results = [];
        
        for (const assignmentData of assignmentsData) {
            const assignment = await Assignment.createEnhanced(assignmentData);
            results.push(assignment);
        }

        await client.query('COMMIT');
        logger.info(`Bulk created ${results.length} assignments`);
        
        return results;
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Failed to bulk create assignments: ${error.message}`);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Bulk update assignments
 */
Assignment.bulkUpdate = async (updates) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');

        const results = [];
        
        for (const update of updates) {
            const { id, ...updateData } = update;
            const assignment = await Assignment.update(id, updateData);
            results.push(assignment);
        }

        await client.query('COMMIT');
        logger.info(`Bulk updated ${results.length} assignments`);
        
        return results;
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Failed to bulk update assignments: ${error.message}`);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Bulk delete assignments
 */
Assignment.bulkDelete = async (assignmentIds) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');

        const query = 'DELETE FROM assignments WHERE id = ANY($1) RETURNING id';
        const { rows } = await client.query(query, [assignmentIds]);
        
        await client.query('COMMIT');
        logger.info(`Bulk deleted ${rows.length} assignments`);
        
        return rows.map(row => row.id);
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Failed to bulk delete assignments: ${error.message}`);
        throw error;
    } finally {
        client.release();
    }
};

// =====================================================
// LATE SUBMISSION HANDLING
// =====================================================

/**
 * Apply late submission penalty
 */
Assignment.applyLatePenalty = async (submissionId) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');

        // Get submission and assignment details
        const query = `
            SELECT 
                s.*, a.due_date, a.late_submission_penalty, 
                a.allow_late_submissions, a.max_late_days
            FROM assignment_submissions s
            JOIN assignments a ON s.assignment_id = a.id
            WHERE s.id = $1
        `;
        
        const { rows } = await client.query(query, [submissionId]);
        
        if (rows.length === 0) {
            throw new Error('Submission not found');
        }

        const submission = rows[0];
        
        // Check if submission is late
        if (submission.created_at <= submission.due_date || !submission.allow_late_submissions) {
            return submission; // Not late or late submissions not allowed
        }

        // Calculate penalty using database function
        const penaltyQuery = `
            SELECT * FROM calculate_late_penalty($1, $2)
        `;
        
        const { rows: penaltyRows } = await client.query(penaltyQuery, [submissionId, submission.assignment_id]);
        const penalty = penaltyRows[0];

        if (penalty.days_late > 0) {
            // Record late submission
            const insertPenaltyQuery = `
                INSERT INTO late_submissions (
                    submission_id, days_late, penalty_percentage, 
                    original_grade, final_grade
                ) VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (submission_id) 
                DO UPDATE SET
                    days_late = EXCLUDED.days_late,
                    penalty_percentage = EXCLUDED.penalty_percentage,
                    original_grade = EXCLUDED.original_grade,
                    final_grade = EXCLUDED.final_grade,
                    penalty_applied_at = CURRENT_TIMESTAMP
                RETURNING *
            `;
            
            await client.query(insertPenaltyQuery, [
                submissionId, penalty.days_late, penalty.penalty_percentage,
                submission.grade, penalty.final_grade
            ]);

            // Update submission grade
            await client.query(
                'UPDATE assignment_submissions SET grade = $1 WHERE id = $2',
                [penalty.final_grade, submissionId]
            );
        }

        await client.query('COMMIT');
        logger.info(`Applied late penalty to submission ${submissionId}`);
        
        return { ...submission, grade: penalty.final_grade };
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Failed to apply late penalty: ${error.message}`);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Waive late submission penalty
 */
Assignment.waiveLatePenalty = async (submissionId, waivedBy, reason) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');

        // Get original grade
        const penaltyQuery = 'SELECT * FROM late_submissions WHERE submission_id = $1';
        const { rows: penalties } = await client.query(penaltyQuery, [submissionId]);
        
        if (penalties.length === 0) {
            throw new Error('No late penalty found for this submission');
        }

        const penalty = penalties[0];

        // Update penalty record
        await client.query(`
            UPDATE late_submissions 
            SET waived_by = $1, waived_reason = $2, waived_at = CURRENT_TIMESTAMP
            WHERE submission_id = $3
        `, [waivedBy, reason, submissionId]);

        // Restore original grade
        await client.query(
            'UPDATE assignment_submissions SET grade = $1 WHERE id = $2',
            [penalty.original_grade, submissionId]
        );

        await client.query('COMMIT');
        logger.info(`Waived late penalty for submission ${submissionId}`);
        
        return penalty;
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Failed to waive late penalty: ${error.message}`);
        throw error;
    } finally {
        client.release();
    }
};

// =====================================================
// ENHANCED ANALYTICS
// =====================================================

/**
 * Get comprehensive assignment analytics
 */
Assignment.getComprehensiveAnalytics = async (assignmentId) => {
    try {
        const query = `
            SELECT 
                a.*,
                aa.total_enrolled,
                aa.submissions_count,
                aa.on_time_submissions,
                aa.late_submissions,
                aa.average_grade,
                aa.median_grade,
                aa.grade_distribution,
                aa.time_spent_stats,
                COUNT(DISTINCT pr.id) as plagiarism_reports,
                AVG(pr.plagiarism_score) as avg_plagiarism_score
            FROM assignments a
            LEFT JOIN assignment_analytics aa ON a.id = aa.assignment_id 
                AND aa.analytics_date = CURRENT_DATE
            LEFT JOIN assignment_submissions s ON a.id = s.assignment_id
            LEFT JOIN plagiarism_reports pr ON s.id = pr.submission_id
            WHERE a.id = $1
            GROUP BY a.id, aa.total_enrolled, aa.submissions_count, 
                aa.on_time_submissions, aa.late_submissions, aa.average_grade, 
                aa.median_grade, aa.grade_distribution, aa.time_spent_stats
        `;
        
        const { rows } = await db.query(query, [assignmentId]);
        return rows[0];
    } catch (error) {
        logger.error(`Failed to get comprehensive analytics: ${error.message}`);
        throw error;
    }
};

/**
 * Update assignment analytics
 */
Assignment.updateAnalytics = async (assignmentId) => {
    try {
        // Use the database function to update analytics
        await db.query('SELECT update_assignment_analytics($1)', [assignmentId]);
        logger.info(`Updated analytics for assignment ${assignmentId}`);
        return true;
    } catch (error) {
        logger.error(`Failed to update assignment analytics: ${error.message}`);
        throw error;
    }
};

// =====================================================
// ASSIGNMENT DUPLICATION
// =====================================================

/**
 * Duplicate assignment
 */
Assignment.duplicate = async (assignmentId, newAssignmentData = {}) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');

        // Get original assignment
        const original = await Assignment.findById(assignmentId);
        if (!original) {
            throw new Error('Assignment not found');
        }

        // Prepare new assignment data
        const duplicateData = {
            ...original,
            ...newAssignmentData,
            title: newAssignmentData.title || `${original.title} (Copy)`,
            created_at: undefined,
            updated_at: undefined,
            id: undefined
        };

        // Create duplicate
        const duplicate = await Assignment.createEnhanced(duplicateData);

        // Copy rubric if exists
        const rubricQuery = 'SELECT * FROM grading_rubrics WHERE assignment_id = $1';
        const { rows: rubrics } = await client.query(rubricQuery, [assignmentId]);
        
        if (rubrics.length > 0) {
            const rubric = rubrics[0];
            const rubricData = {
                assignment_id: duplicate.id,
                name: rubric.name,
                total_points: rubric.total_points,
                criteria: typeof rubric.criteria === 'string' ? JSON.parse(rubric.criteria) : rubric.criteria
            };
            
            const GradingModel = require('./grading.model');
            await GradingModel.createRubric(rubricData);
        }

        await client.query('COMMIT');
        logger.info(`Duplicated assignment ${assignmentId} to ${duplicate.id}`);
        
        return duplicate;
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Failed to duplicate assignment: ${error.message}`);
        throw error;
    } finally {
        client.release();
    }
};

module.exports = Assignment;
