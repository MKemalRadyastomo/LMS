const Assignment = require('../models/assignment.model');
const Submission = require('../models/submission.model');
const Course = require('../models/course.model');
const logger = require('../utils/logger');
const { ApiError } = require('../utils/ApiError');
const { default: httpStatus } = require('http-status');

class AssignmentBulkService {
    /**
     * Bulk create assignments
     */
    async bulkCreateAssignments(assignmentsData) {
        try {
            return await Assignment.bulkCreate(assignmentsData);
        } catch (error) {
            logger.error(`Error in bulk create assignments: ${error.message}`);
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to bulk create assignments');
        }
    }

    /**
     * Bulk update assignments
     */
    async bulkUpdateAssignments(updates) {
        try {
            return await Assignment.bulkUpdate(updates);
        } catch (error) {
            logger.error(`Error in bulk update assignments: ${error.message}`);
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to bulk update assignments');
        }
    }

    /**
     * Bulk delete assignments
     */
    async bulkDeleteAssignments(assignmentIds) {
        try {
            return await Assignment.bulkDelete(assignmentIds);
        } catch (error) {
            logger.error(`Error in bulk delete assignments: ${error.message}`);
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to bulk delete assignments');
        }
    }

    /**
     * Bulk grade submissions
     */
    async bulkGradeSubmissions(grades) {
        try {
            return await Submission.bulkGrade(grades);
        } catch (error) {
            logger.error(`Error in bulk grade submissions: ${error.message}`);
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to bulk grade submissions');
        }
    }

    /**
     * Bulk update analytics for assignments
     */
    async bulkUpdateAnalytics(assignmentIds) {
        try {
            const results = [];
            
            for (const assignmentId of assignmentIds) {
                try {
                    const result = await Assignment.updateAnalytics(assignmentId);
                    results.push({
                        assignmentId,
                        success: true,
                        result
                    });
                } catch (error) {
                    results.push({
                        assignmentId,
                        success: false,
                        error: error.message
                    });
                }
            }
            
            return results;
        } catch (error) {
            logger.error(`Error in bulk update analytics: ${error.message}`);
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to bulk update analytics');
        }
    }

    /**
     * Export assignments data
     */
    async exportAssignments(assignmentIds, format = 'json') {
        try {
            const assignments = [];
            
            for (const assignmentId of assignmentIds) {
                const assignment = await Assignment.findById(assignmentId);
                if (assignment) {
                    assignments.push(assignment);
                }
            }
            
            if (format === 'csv') {
                return this.convertToCSV(assignments);
            } else if (format === 'excel') {
                return this.convertToExcel(assignments);
            }
            
            return assignments;
        } catch (error) {
            logger.error(`Error exporting assignments: ${error.message}`);
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to export assignments');
        }
    }

    /**
     * Import assignments data
     */
    async importAssignments(assignments, courseId, overwrite = false) {
        try {
            let created = 0;
            let updated = 0;
            let skipped = 0;
            const errors = [];
            
            for (const assignmentData of assignments) {
                try {
                    const data = {
                        ...assignmentData,
                        course_id: courseId
                    };
                    
                    // Check if assignment with same title exists
                    const existing = await this.findAssignmentByTitle(data.title, courseId);
                    
                    if (existing && !overwrite) {
                        skipped++;
                        continue;
                    }
                    
                    if (existing && overwrite) {
                        await Assignment.update(existing.id, data);
                        updated++;
                    } else {
                        await Assignment.createEnhanced(data);
                        created++;
                    }
                } catch (error) {
                    errors.push({
                        assignment: assignmentData.title || 'Unknown',
                        error: error.message
                    });
                }
            }
            
            return {
                created,
                updated,
                skipped,
                errors
            };
        } catch (error) {
            logger.error(`Error importing assignments: ${error.message}`);
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to import assignments');
        }
    }

    /**
     * Verify teacher has access to assignments
     */
    async verifyTeacherAssignmentAccess(teacherId, assignmentIds) {
        try {
            for (const assignmentId of assignmentIds) {
                const assignment = await Assignment.findById(assignmentId);
                if (!assignment) {
                    return false;
                }
                
                const course = await Course.findById(assignment.course_id);
                if (!course || course.teacher_id !== teacherId) {
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            logger.error(`Error verifying teacher assignment access: ${error.message}`);
            return false;
        }
    }

    /**
     * Verify teacher has grading access to submissions
     */
    async verifyTeacherGradingAccess(teacherId, submissionIds) {
        try {
            for (const submissionId of submissionIds) {
                const submission = await Submission.findById(submissionId);
                if (!submission) {
                    return false;
                }
                
                const assignment = await Assignment.findById(submission.assignment_id);
                if (!assignment) {
                    return false;
                }
                
                const course = await Course.findById(assignment.course_id);
                if (!course || course.teacher_id !== teacherId) {
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            logger.error(`Error verifying teacher grading access: ${error.message}`);
            return false;
        }
    }

    /**
     * Find assignment by title in course
     */
    async findAssignmentByTitle(title, courseId) {
        try {
            const assignments = await Assignment.findByCourseId(courseId);
            return assignments.find(a => a.title === title);
        } catch (error) {
            logger.error(`Error finding assignment by title: ${error.message}`);
            return null;
        }
    }

    /**
     * Convert assignments to CSV format
     */
    convertToCSV(assignments) {
        const headers = [
            'ID', 'Title', 'Description', 'Type', 'Due Date', 'Max Score',
            'Late Penalty', 'Allow Late', 'Max Late Days', 'Created At'
        ];
        
        const csvData = [headers.join(',')];
        
        assignments.forEach(assignment => {
            const row = [
                assignment.id,
                `\"${assignment.title}\"`,
                `\"${(assignment.description || '').replace(/\"/g, '\"\"')}\"`,
                assignment.type,
                assignment.due_date,
                assignment.max_score,
                assignment.late_submission_penalty || 0,
                assignment.allow_late_submissions,
                assignment.max_late_days || 0,
                assignment.created_at
            ];
            csvData.push(row.join(','));
        });
        
        return csvData.join('\
');
    }

    /**
     * Convert assignments to Excel format (placeholder)
     */
    convertToExcel(assignments) {
        // This would require a library like 'exceljs' to implement properly
        // For now, return JSON format as placeholder
        return {
            format: 'excel',
            data: assignments,
            note: 'Excel export requires additional implementation'
        };
    }

    /**
     * Batch process assignments with progress tracking
     */
    async batchProcessAssignments(assignmentIds, operation, batchSize = 10) {
        try {
            const results = [];
            const total = assignmentIds.length;
            let processed = 0;
            
            for (let i = 0; i < assignmentIds.length; i += batchSize) {
                const batch = assignmentIds.slice(i, i + batchSize);
                const batchResults = await Promise.allSettled(
                    batch.map(id => operation(id))
                );
                
                batchResults.forEach((result, index) => {
                    const assignmentId = batch[index];
                    if (result.status === 'fulfilled') {
                        results.push({
                            assignmentId,
                            success: true,
                            result: result.value
                        });
                    } else {
                        results.push({
                            assignmentId,
                            success: false,
                            error: result.reason.message
                        });
                    }
                });
                
                processed += batch.length;
                logger.info(`Batch processed: ${processed}/${total} assignments`);
            }
            
            return results;
        } catch (error) {
            logger.error(`Error in batch processing: ${error.message}`);
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to batch process assignments');
        }
    }
}

module.exports = new AssignmentBulkService();