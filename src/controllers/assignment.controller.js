const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { assignmentService } = require('../services');

const getAssignments = catchAsync(async (req, res) => {
    const filter = { ...req.query, course_id: req.params.courseId }; // Assuming courseId can be a filter
    const options = {
        limit: req.query.limit,
        page: req.query.page,
    };
    const result = await assignmentService.queryAssignments(filter, options);
    res.send(result);
});

const getAssignment = catchAsync(async (req, res) => {
    const assignment = await assignmentService.getAssignmentById(req.params.assignmentId);
    res.send(assignment);
});

module.exports = {
    getAssignments,
    getAssignment,
};
