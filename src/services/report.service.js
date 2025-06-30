const Report = require('../models/report.model');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');

const ReportService = {};

ReportService.getCourseProgressReport = async (courseId) => {
    const progressData = await Report.getCourseProgress(courseId);
    if (!progressData || progressData.length === 0) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Progress report not found for this course.');
    }
    return {
        course_id: courseId,
        students: progressData,
    };
};

ReportService.getCourseGradebook = async (courseId) => {
    const gradebookData = await Report.getGradebook(courseId);
    if (!gradebookData || gradebookData.length === 0) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Gradebook not found for this course.');
    }
    return {
        course_id: courseId,
        gradebook: gradebookData,
    };
};

ReportService.updateCourseGradebook = async (courseId, updateData) => {
    // In a real implementation, you would have a Report.updateGrade method
    // in your report.model.js to update the database.
    console.log(`Updating gradebook for course ${courseId} with data:`, updateData);
    return { success: true, message: 'Gradebook updated successfully.' };
};

ReportService.getCourseLearningAnalytics = async (courseId) => {
    // This would call a function in report.model.js to get analytics data.
    // Returning mock data for now.
    return {
        course_id: courseId,
        analytics: {
            material_difficulty: [{ material_id: 1, average_score: 88, completion_rate: 0.9 }],
            time_spent: [{ student_id: 1, material_id: 1, time_spent_minutes: 120 }],
            class_comparison: { current_course_avg: 89, other_courses_avg: 85 },
        },
    };
};

ReportService.getStudentPerformanceReport = async (studentId) => {
    // This would call a function in report.model.js to get a student's report.
    // Returning mock data for now.
    return {
        student_id: studentId,
        report: {
            courses: [
                {
                    course_id: 1,
                    course_name: 'Mathematics 101',
                    assignments: [{ assignment_id: 1, grade: 85 }],
                    final_grade: 85,
                    performance_trend: [75, 80, 85],
                    class_average_comparison: { my_average: 85, class_average: 88 },
                },
            ],
        },
    };
};

module.exports = ReportService;