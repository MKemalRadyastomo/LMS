const db = require('../config/db');
const logger = require('../utils/logger');

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
        const query = 'SELECT * FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2 ORDER BY id DESC LIMIT 1';
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

Submission.findByAssignmentIds = async (assignmentIds) => {
    try {
        if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
            return [];
        }
        const query = `SELECT * FROM assignment_submissions WHERE assignment_id = ANY($1::int[])`;
        const { rows } = await db.query(query, [assignmentIds]);
        return rows;
    } catch (error) {
        throw error;
    }
};

// =====================================================
// ENHANCED SUBMISSION MANAGEMENT
// =====================================================

/**
 * Create enhanced submission with version tracking
 */
Submission.createEnhanced = async (submissionData) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');

        const {
            assignment_id, student_id, submission_text, file_data,
            quiz_answers_json, is_draft, auto_saved
        } = submissionData;

        // Check if submission already exists
        const existingQuery = 'SELECT * FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2';
        const { rows: existing } = await client.query(existingQuery, [assignment_id, student_id]);

        let submission;
        let versionNumber = 1;

        if (existing.length > 0) {
            // Update existing submission
            submission = existing[0];
            
            // Get next version number
            const versionQuery = 'SELECT MAX(version_number) as max_version FROM submission_versions WHERE submission_id = $1';
            const { rows: versions } = await client.query(versionQuery, [submission.id]);
            versionNumber = (versions[0].max_version || 0) + 1;

            // Update main submission record if not a draft
            if (!is_draft) {
                const updateQuery = `
                    UPDATE assignment_submissions 
                    SET 
                        submission_text = COALESCE($1, submission_text),
                        quiz_answers_json = COALESCE($2, quiz_answers_json),
                        status = CASE WHEN $3 = false THEN 'submitted' ELSE status END,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $4
                    RETURNING *
                `;
                
                const { rows: updated } = await client.query(updateQuery, [
                    submission_text,
                    quiz_answers_json ? JSON.stringify(quiz_answers_json) : null,
                    is_draft,
                    submission.id
                ]);
                
                submission = updated[0];
            }
        } else {
            // Create new submission
            const createQuery = `
                INSERT INTO assignment_submissions (
                    assignment_id, student_id, submission_text, quiz_answers_json,
                    status
                ) VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `;
            
            const { rows: created } = await client.query(createQuery, [
                assignment_id,
                student_id,
                submission_text,
                quiz_answers_json ? JSON.stringify(quiz_answers_json) : null,
                is_draft ? 'draft' : 'submitted'
            ]);
            
            submission = created[0];
        }

        // Create version record
        const versionQuery = `
            INSERT INTO submission_versions (
                submission_id, version_number, submission_text, file_data,
                quiz_answers_json, is_draft, auto_saved
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        
        const { rows: versionRows } = await client.query(versionQuery, [
            submission.id,
            versionNumber,
            submission_text,
            file_data ? JSON.stringify(file_data) : null,
            quiz_answers_json ? JSON.stringify(quiz_answers_json) : null,
            is_draft || false,
            auto_saved || false
        ]);

        const version = versionRows[0];

        // Handle file uploads if present
        if (file_data && file_data.length > 0) {
            await Submission.handleFileUploads(submission.id, version.id, file_data);
        }

        // Apply automated grading if not a draft and it's a quiz
        if (!is_draft && quiz_answers_json) {
            await Submission.applyAutomatedGrading(submission.id);
        }

        await client.query('COMMIT');
        logger.info(`Created/updated submission ${submission.id} version ${versionNumber}`);
        
        return { ...submission, version };
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Failed to create enhanced submission: ${error.message}`);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Handle multiple file uploads for submission
 */
Submission.handleFileUploads = async (submissionId, versionId, fileData) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');

        for (let i = 0; i < fileData.length; i++) {
            const file = fileData[i];
            
            const query = `
                INSERT INTO submission_files (
                    submission_id, version_id, original_filename, stored_filename,
                    file_path, file_size, mime_type, file_hash, upload_order
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `;
            
            const values = [
                submissionId,
                versionId,
                file.original_filename,
                file.stored_filename,
                file.file_path,
                file.file_size,
                file.mime_type,
                file.file_hash,
                i + 1
            ];
            
            await client.query(query, values);
        }

        await client.query('COMMIT');
        logger.info(`Uploaded ${fileData.length} files for submission ${submissionId}`);
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Failed to handle file uploads: ${error.message}`);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Get submission with version history
 */
Submission.getWithVersions = async (submissionId) => {
    try {
        const submissionQuery = 'SELECT * FROM assignment_submissions WHERE id = $1';
        const { rows: submissions } = await db.query(submissionQuery, [submissionId]);
        
        if (submissions.length === 0) {
            return null;
        }

        const submission = submissions[0];

        // Get versions
        const versionsQuery = `
            SELECT sv.*, 
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'id', sf.id,
                               'original_filename', sf.original_filename,
                               'stored_filename', sf.stored_filename,
                               'file_path', sf.file_path,
                               'file_size', sf.file_size,
                               'mime_type', sf.mime_type,
                               'upload_order', sf.upload_order,
                               'uploaded_at', sf.uploaded_at
                           ) ORDER BY sf.upload_order
                       ) FILTER (WHERE sf.id IS NOT NULL), '[]'
                   ) as files
            FROM submission_versions sv
            LEFT JOIN submission_files sf ON sv.id = sf.version_id
            WHERE sv.submission_id = $1
            GROUP BY sv.id
            ORDER BY sv.version_number DESC
        `;
        
        const { rows: versions } = await db.query(versionsQuery, [submissionId]);

        return {
            ...submission,
            versions
        };
    } catch (error) {
        logger.error(`Failed to get submission with versions: ${error.message}`);
        throw error;
    }
};

/**
 * Get latest version of submission
 */
Submission.getLatestVersion = async (assignmentId, studentId) => {
    try {
        const query = `
            SELECT 
                s.*,
                sv.version_number,
                sv.submission_text as version_text,
                sv.file_data as version_file_data,
                sv.quiz_answers_json as version_quiz_answers,
                sv.is_draft,
                sv.auto_saved,
                sv.submitted_at as version_submitted_at
            FROM assignment_submissions s
            LEFT JOIN submission_versions sv ON s.id = sv.submission_id
            WHERE s.assignment_id = $1 AND s.student_id = $2
                AND (sv.version_number = (
                    SELECT MAX(version_number) 
                    FROM submission_versions 
                    WHERE submission_id = s.id
                ) OR sv.version_number IS NULL)
        `;
        
        const { rows } = await db.query(query, [assignmentId, studentId]);
        return rows[0] || null;
    } catch (error) {
        logger.error(`Failed to get latest submission version: ${error.message}`);
        throw error;
    }
};

/**
 * Auto-save submission draft
 */
Submission.autoSave = async (assignmentId, studentId, content) => {
    try {
        const submissionData = {
            assignment_id: assignmentId,
            student_id: studentId,
            submission_text: content.text,
            quiz_answers_json: content.quiz_answers,
            file_data: content.files,
            is_draft: true,
            auto_saved: true
        };

        return await Submission.createEnhanced(submissionData);
    } catch (error) {
        logger.error(`Failed to auto-save submission: ${error.message}`);
        throw error;
    }
};

/**
 * Submit final version (convert from draft)
 */
Submission.submitFinal = async (submissionId) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');

        // Update submission status
        const updateQuery = `
            UPDATE assignment_submissions 
            SET status = 'submitted', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        
        const { rows } = await client.query(updateQuery, [submissionId]);
        const submission = rows[0];

        if (!submission) {
            throw new Error('Submission not found');
        }

        // Mark latest version as final
        await client.query(`
            UPDATE submission_versions 
            SET is_draft = false, submitted_at = CURRENT_TIMESTAMP
            WHERE submission_id = $1 
                AND version_number = (
                    SELECT MAX(version_number) 
                    FROM submission_versions 
                    WHERE submission_id = $1
                )
        `, [submissionId]);

        // Apply automated grading if applicable
        await Submission.applyAutomatedGrading(submissionId);

        // Check for late submission and apply penalty
        const Assignment = require('./assignment.model');
        await Assignment.applyLatePenalty(submissionId);

        await client.query('COMMIT');
        logger.info(`Submitted final version for submission ${submissionId}`);
        
        return submission;
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Failed to submit final version: ${error.message}`);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Apply automated grading to submission
 */
Submission.applyAutomatedGrading = async (submissionId) => {
    try {
        // Use the database function for auto-grading
        const query = 'SELECT auto_grade_submission($1) as auto_grade';
        const { rows } = await db.query(query, [submissionId]);
        
        const autoGrade = rows[0].auto_grade;
        
        if (autoGrade !== null) {
            // Update submission with auto-graded score
            await db.query(
                'UPDATE assignment_submissions SET grade = $1 WHERE id = $2',
                [autoGrade, submissionId]
            );
            
            logger.info(`Applied auto-grade ${autoGrade} to submission ${submissionId}`);
        }
        
        return autoGrade;
    } catch (error) {
        logger.error(`Failed to apply automated grading: ${error.message}`);
        throw error;
    }
};

/**
 * Get submission files
 */
Submission.getFiles = async (submissionId, versionId = null) => {
    try {
        let query = `
            SELECT * FROM submission_files 
            WHERE submission_id = $1
        `;
        const values = [submissionId];
        
        if (versionId) {
            query += ' AND version_id = $2';
            values.push(versionId);
        } else {
            // Get files from latest version
            query += ` AND version_id = (
                SELECT id FROM submission_versions 
                WHERE submission_id = $1 
                ORDER BY version_number DESC 
                LIMIT 1
            )`;
        }
        
        query += ' ORDER BY upload_order ASC';
        
        const { rows } = await db.query(query, values);
        return rows;
    } catch (error) {
        logger.error(`Failed to get submission files: ${error.message}`);
        throw error;
    }
};

/**
 * Delete submission file
 */
Submission.deleteFile = async (fileId) => {
    try {
        const query = 'DELETE FROM submission_files WHERE id = $1 RETURNING *';
        const { rows } = await db.query(query, [fileId]);
        
        if (rows.length > 0) {
            logger.info(`Deleted submission file ${fileId}`);
            return rows[0];
        }
        
        return null;
    } catch (error) {
        logger.error(`Failed to delete submission file: ${error.message}`);
        throw error;
    }
};

/**
 * Get submission analytics for student
 */
Submission.getStudentAnalytics = async (studentId, courseId = null) => {
    try {
        let query = `
            SELECT 
                COUNT(*) as total_submissions,
                COUNT(CASE WHEN s.grade IS NOT NULL THEN 1 END) as graded_submissions,
                ROUND(AVG(s.grade), 2) as average_grade,
                COUNT(CASE WHEN s.created_at <= a.due_date THEN 1 END) as on_time_submissions,
                COUNT(CASE WHEN s.created_at > a.due_date THEN 1 END) as late_submissions,
                COUNT(CASE WHEN s.status = 'draft' THEN 1 END) as draft_submissions
            FROM assignment_submissions s
            JOIN assignments a ON s.assignment_id = a.id
            WHERE s.student_id = $1
        `;
        
        const values = [studentId];
        
        if (courseId) {
            query += ' AND a.course_id = $2';
            values.push(courseId);
        }
        
        const { rows } = await db.query(query, values);
        return rows[0];
    } catch (error) {
        logger.error(`Failed to get student analytics: ${error.message}`);
        throw error;
    }
};

/**
 * Bulk grade submissions
 */
Submission.bulkGrade = async (grades) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');

        const results = [];
        
        for (const gradeData of grades) {
            const { submission_id, grade, feedback } = gradeData;
            
            const updateQuery = `
                UPDATE assignment_submissions 
                SET 
                    grade = $1,
                    feedback = $2,
                    status = 'graded',
                    graded_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING *
            `;
            
            const { rows } = await client.query(updateQuery, [grade, feedback, submission_id]);
            results.push(rows[0]);
        }

        await client.query('COMMIT');
        logger.info(`Bulk graded ${results.length} submissions`);
        
        return results;
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Failed to bulk grade submissions: ${error.message}`);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Get plagiarism report for submission
 */
Submission.getPlagiarismReport = async (submissionId) => {
    try {
        const query = 'SELECT * FROM plagiarism_reports WHERE submission_id = $1 ORDER BY created_at DESC LIMIT 1';
        const { rows } = await db.query(query, [submissionId]);
        return rows[0] || null;
    } catch (error) {
        logger.error(`Failed to get plagiarism report: ${error.message}`);
        throw error;
    }
};

/**
 * Create plagiarism report
 */
Submission.createPlagiarismReport = async (reportData) => {
    try {
        const {
            submission_id, plagiarism_score, report_data,
            sources_found, report_url, status
        } = reportData;

        const query = `
            INSERT INTO plagiarism_reports (
                submission_id, plagiarism_score, report_data,
                sources_found, report_url, status, processed_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        
        const values = [
            submission_id,
            plagiarism_score,
            report_data ? JSON.stringify(report_data) : null,
            sources_found ? JSON.stringify(sources_found) : null,
            report_url,
            status || 'completed',
            new Date()
        ];
        
        const { rows } = await db.query(query, values);
        logger.info(`Created plagiarism report for submission ${submission_id}`);
        
        return rows[0];
    } catch (error) {
        logger.error(`Failed to create plagiarism report: ${error.message}`);
        throw error;
    }
};

module.exports = Submission;
