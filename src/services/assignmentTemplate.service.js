const Assignment = require('../models/assignment.model');
const logger = require('../utils/logger');
const { ApiError } = require('../utils/ApiError');
const { default: httpStatus } = require('http-status');

class AssignmentTemplateService {
    /**
     * Create a new assignment template
     */
    async createTemplate(templateData) {
        try {
            return await Assignment.createTemplate(templateData);
        } catch (error) {
            logger.error(`Error creating assignment template: ${error.message}`);
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create assignment template');
        }
    }

    /**
     * Get assignment templates with filters
     */
    async getTemplates(filters = {}) {
        try {
            return await Assignment.getTemplates(filters);
        } catch (error) {
            logger.error(`Error fetching assignment templates: ${error.message}`);
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch assignment templates');
        }
    }

    /**
     * Get assignment template by ID
     */
    async getTemplateById(templateId) {
        try {
            const template = await Assignment.getTemplateById(templateId);
            
            if (!template) {
                throw new ApiError(httpStatus.NOT_FOUND, 'Assignment template not found');
            }
            
            return template;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            logger.error(`Error fetching assignment template ${templateId}: ${error.message}`);
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch assignment template');
        }
    }

    /**
     * Update assignment template
     */
    async updateTemplate(templateId, updateData) {
        try {
            const template = await Assignment.updateTemplate(templateId, updateData);
            
            if (!template) {
                throw new ApiError(httpStatus.NOT_FOUND, 'Assignment template not found');
            }
            
            return template;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            logger.error(`Error updating assignment template ${templateId}: ${error.message}`);
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update assignment template');
        }
    }

    /**
     * Delete assignment template
     */
    async deleteTemplate(templateId) {
        try {
            const deleted = await Assignment.deleteTemplate(templateId);
            
            if (!deleted) {
                throw new ApiError(httpStatus.NOT_FOUND, 'Assignment template not found');
            }
            
            return deleted;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            logger.error(`Error deleting assignment template ${templateId}: ${error.message}`);
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete assignment template');
        }
    }

    /**
     * Create assignment from template
     */
    async createAssignmentFromTemplate(templateId, assignmentData) {
        try {
            return await Assignment.createFromTemplate(templateId, assignmentData);
        } catch (error) {
            logger.error(`Error creating assignment from template ${templateId}: ${error.message}`);
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create assignment from template');
        }
    }

    /**
     * Bulk delete templates
     */
    async bulkDeleteTemplates(templateIds) {
        try {
            let deletedCount = 0;
            const errors = [];
            
            for (const templateId of templateIds) {
                try {
                    await Assignment.deleteTemplate(templateId);
                    deletedCount++;
                } catch (error) {
                    errors.push({
                        templateId,
                        error: error.message
                    });
                }
            }
            
            if (errors.length > 0) {
                logger.warn(`Bulk delete templates completed with ${errors.length} errors:`, errors);
            }
            
            return deletedCount;
        } catch (error) {
            logger.error(`Error in bulk delete templates: ${error.message}`);
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to bulk delete templates');
        }
    }

    /**
     * Get popular templates (most used)
     */
    async getPopularTemplates(limit = 10) {
        try {
            return await Assignment.getTemplates({
                is_public: true,
                limit,
                sort_by: 'usage_count'
            });
        } catch (error) {
            logger.error(`Error fetching popular templates: ${error.message}`);
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to fetch popular templates');
        }
    }

    /**
     * Search templates
     */
    async searchTemplates(searchQuery, filters = {}) {
        try {
            return await Assignment.getTemplates({
                ...filters,
                search: searchQuery
            });
        } catch (error) {
            logger.error(`Error searching templates: ${error.message}`);
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to search templates');
        }
    }

    /**
     * Validate template data structure
     */
    validateTemplateData(templateData, type) {
        try {
            return Assignment.validateTemplateData(templateData, type);
        } catch (error) {
            throw new ApiError(httpStatus.BAD_REQUEST, error.message);
        }
    }
}

module.exports = new AssignmentTemplateService();