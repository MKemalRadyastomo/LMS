const assignmentService = require('./assignment.service');
const assignmentTemplateService = require('./assignmentTemplate.service');
const assignmentBulkService = require('./assignmentBulk.service');
const authService = require('./auth.service');
const submissionService = require('./submission.service');
const courseContentService = require('./courseContent.service');

module.exports = {
    assignmentService,
    assignmentTemplateService,
    assignmentBulkService,
    authService,
    submissionService,
    courseContentService,
};
