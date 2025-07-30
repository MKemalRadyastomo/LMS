const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { ApiError } = require('../utils/ApiError');
const { assignmentTemplateService } = require('../services');

const createTemplate = catchAsync(async (req, res) => {
    const { id: userId, role } = req.user;

    // Ensure only teachers and admins can create templates
    if (role !== 'admin' && role !== 'guru') {
        throw new ApiError(httpStatus.FORBIDDEN, 'Only admins and teachers can create assignment templates.');
    }

    const templateData = {
        ...req.body,
        created_by: userId,
        is_public: role === 'admin' ? req.body.is_public : false // Only admins can create public templates
    };

    const template = await assignmentTemplateService.createTemplate(templateData);

    res.status(httpStatus.CREATED).send({
        success: true,
        message: 'Assignment template created successfully',
        data: template
    });
});

const getTemplates = catchAsync(async (req, res) => {
    const { id: userId, role } = req.user;
    const filters = { ...req.query };

    // Apply access controls based on role
    if (role === 'guru') {
        // Teachers can see their own templates and public ones
        filters.created_by = userId;
        if (req.query.include_public === 'true') {
            filters.include_public = true;
        }
    } else if (role === 'siswa') {
        // Students cannot access templates
        throw new ApiError(httpStatus.FORBIDDEN, 'Students cannot access assignment templates.');
    }
    // Admins can see all templates (no additional filters)

    const templates = await assignmentTemplateService.getTemplates(filters);

    res.send({
        success: true,
        data: templates,
        count: templates.length
    });
});

const getTemplate = catchAsync(async (req, res) => {
    const { templateId } = req.params;
    const { id: userId, role } = req.user;

    const template = await assignmentTemplateService.getTemplateById(templateId);
    
    if (!template) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Assignment template not found');
    }

    // Check access permissions
    if (role === 'guru' && template.created_by !== userId && !template.is_public) {
        throw new ApiError(httpStatus.FORBIDDEN, 'You can only access your own templates or public templates.');
    } else if (role === 'siswa') {
        throw new ApiError(httpStatus.FORBIDDEN, 'Students cannot access assignment templates.');
    }

    res.send({
        success: true,
        data: template
    });
});

const updateTemplate = catchAsync(async (req, res) => {
    const { templateId } = req.params;
    const { id: userId, role } = req.user;

    const template = await assignmentTemplateService.getTemplateById(templateId);
    
    if (!template) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Assignment template not found');
    }

    // Check permissions
    if (role === 'guru' && template.created_by !== userId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'You can only update your own templates.');
    }

    // Prevent non-admins from making templates public
    const updateData = { ...req.body };
    if (role !== 'admin' && updateData.is_public) {
        delete updateData.is_public;
    }

    const updatedTemplate = await assignmentTemplateService.updateTemplate(templateId, updateData);

    res.send({
        success: true,
        message: 'Assignment template updated successfully',
        data: updatedTemplate
    });
});

const deleteTemplate = catchAsync(async (req, res) => {
    const { templateId } = req.params;
    const { id: userId, role } = req.user;

    const template = await assignmentTemplateService.getTemplateById(templateId);
    
    if (!template) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Assignment template not found');
    }

    // Check permissions
    if (role === 'guru' && template.created_by !== userId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'You can only delete your own templates.');
    }

    await assignmentTemplateService.deleteTemplate(templateId);

    res.status(httpStatus.NO_CONTENT).send();
});

const createAssignmentFromTemplate = catchAsync(async (req, res) => {
    const { templateId } = req.params;
    const { id: userId, role } = req.user;

    if (role !== 'admin' && role !== 'guru') {
        throw new ApiError(httpStatus.FORBIDDEN, 'Only admins and teachers can create assignments from templates.');
    }

    const template = await assignmentTemplateService.getTemplateById(templateId);
    
    if (!template) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Assignment template not found');
    }

    // Check access permissions
    if (role === 'guru' && template.created_by !== userId && !template.is_public) {
        throw new ApiError(httpStatus.FORBIDDEN, 'You can only use your own templates or public templates.');
    }

    const assignmentData = req.body;
    const assignment = await assignmentTemplateService.createAssignmentFromTemplate(templateId, assignmentData);

    res.status(httpStatus.CREATED).send({
        success: true,
        message: 'Assignment created from template successfully',
        data: assignment
    });
});

const bulkDeleteTemplates = catchAsync(async (req, res) => {
    const { id: userId, role } = req.user;
    const { templateIds } = req.body;

    if (role !== 'admin') {
        throw new ApiError(httpStatus.FORBIDDEN, 'Only admins can perform bulk operations on templates.');
    }

    if (!Array.isArray(templateIds) || templateIds.length === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Template IDs array is required and cannot be empty.');
    }

    const deletedCount = await assignmentTemplateService.bulkDeleteTemplates(templateIds);

    res.send({
        success: true,
        message: `Successfully deleted ${deletedCount} templates`,
        data: { deleted_count: deletedCount }
    });
});

module.exports = {
    createTemplate,
    getTemplates,
    getTemplate,
    updateTemplate,
    deleteTemplate,
    createAssignmentFromTemplate,
    bulkDeleteTemplates
};