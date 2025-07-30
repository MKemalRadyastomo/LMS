const Joi = require('joi');

/**
 * Validation schema for bulk assignment creation
 */
const bulkCreateAssignments = {
  body: Joi.object({
    assignments: Joi.array().items(
      Joi.object({
        course_id: Joi.number().integer().positive().required(),
        course_content_id: Joi.number().integer().positive().optional(),
        title: Joi.string().trim().min(1).max(255).required(),
        description: Joi.string().trim().min(1).max(2000).required(),
        type: Joi.string().valid('essay', 'quiz', 'file_upload', 'mixed', 'coding').required(),
        due_date: Joi.date().iso().greater('now').required(),
        max_score: Joi.number().positive().max(1000).required(),
        instructions: Joi.string().trim().max(10000).optional(),
        template_id: Joi.number().integer().positive().optional(),
        
        // Quiz-specific fields
        quiz_questions_json: Joi.when('type', {
          is: 'quiz',
          then: Joi.array().items(
            Joi.object({
              type: Joi.string().valid('multiple_choice', 'true_false', 'short_answer', 'essay').required(),
              question: Joi.string().trim().min(1).max(1000).required(),
              points: Joi.number().positive().max(100).required(),
              options: Joi.when('type', {
                is: 'multiple_choice',
                then: Joi.array().items(Joi.string().trim().min(1).max(500)).min(2).max(10).required(),
                otherwise: Joi.optional()
              }),
              correct_answer: Joi.when('type', {
                is: Joi.string().valid('multiple_choice', 'true_false', 'short_answer'),
                then: Joi.string().trim().min(1).max(500).required(),
                otherwise: Joi.optional()
              }),
              answer_variations: Joi.array().items(Joi.string().trim().max(500)).optional(),
              case_sensitive: Joi.boolean().optional(),
              partial_credit_rules: Joi.object().optional(),
              rubric: Joi.object().optional(),
              sample_answer: Joi.string().trim().max(2000).optional()
            })
          ).min(1).max(100).required(),
          otherwise: Joi.optional()
        }),
        
        // File upload specific fields
        allowed_file_types: Joi.when('type', {
          is: Joi.string().valid('file_upload', 'mixed'),
          then: Joi.array().items(Joi.string().trim().max(20)).min(1).max(20).required(),
          otherwise: Joi.optional()
        }),
        max_file_size_mb: Joi.when('type', {
          is: Joi.string().valid('file_upload', 'mixed'),
          then: Joi.number().positive().max(500).required(),
          otherwise: Joi.optional()
        }),
        
        // Advanced settings
        late_submission_penalty: Joi.number().min(0).max(100).default(0),
        allow_late_submissions: Joi.boolean().default(true),
        max_late_days: Joi.number().integer().min(0).max(365).default(7),
        auto_release_grades: Joi.boolean().default(false),
        grade_release_date: Joi.date().iso().greater('now').optional(),
        multiple_attempts: Joi.boolean().default(false),
        max_attempts: Joi.number().integer().min(1).max(10).default(1),
        show_correct_answers: Joi.boolean().default(false),
        shuffle_questions: Joi.boolean().default(false),
        time_limit_minutes: Joi.number().integer().min(1).max(600).optional(),
        require_webcam: Joi.boolean().default(false),
        plagiarism_check: Joi.boolean().default(false)
      })
    ).min(1).max(50).required()
  })
};

/**
 * Validation schema for bulk assignment updates
 */
const bulkUpdateAssignments = {
  body: Joi.object({
    updates: Joi.array().items(
      Joi.object({
        id: Joi.number().integer().positive().required(),
        title: Joi.string().trim().min(1).max(255).optional(),
        description: Joi.string().trim().min(1).max(2000).optional(),
        due_date: Joi.date().iso().greater('now').optional(),
        max_score: Joi.number().positive().max(1000).optional(),
        instructions: Joi.string().trim().max(10000).optional(),
        
        // Advanced settings updates
        late_submission_penalty: Joi.number().min(0).max(100).optional(),
        allow_late_submissions: Joi.boolean().optional(),
        max_late_days: Joi.number().integer().min(0).max(365).optional(),
        auto_release_grades: Joi.boolean().optional(),
        grade_release_date: Joi.date().iso().greater('now').optional(),
        multiple_attempts: Joi.boolean().optional(),
        max_attempts: Joi.number().integer().min(1).max(10).optional(),
        show_correct_answers: Joi.boolean().optional(),
        shuffle_questions: Joi.boolean().optional(),
        time_limit_minutes: Joi.number().integer().min(1).max(600).optional(),
        require_webcam: Joi.boolean().optional(),
        plagiarism_check: Joi.boolean().optional()
      })
    ).min(1).max(50).required()
  })
};

/**
 * Validation schema for bulk assignment deletion
 */
const bulkDeleteAssignments = {
  body: Joi.object({
    assignment_ids: Joi.array().items(
      Joi.number().integer().positive()
    ).min(1).max(50).required()
  })
};

/**
 * Validation schema for assignment import
 */
const importAssignments = {
  body: Joi.object({
    course_id: Joi.number().integer().positive().required(),
    assignments_data: Joi.array().items(
      Joi.object({
        title: Joi.string().trim().min(1).max(255).required(),
        description: Joi.string().trim().min(1).max(2000).required(),
        type: Joi.string().valid('essay', 'quiz', 'file_upload', 'mixed', 'coding').required(),
        due_date: Joi.string().trim().required(), // Will be parsed to date
        max_score: Joi.alternatives().try(
          Joi.number().positive().max(1000),
          Joi.string().trim().regex(/^\d+(\.\d+)?$/) // Allow string numbers
        ).required(),
        instructions: Joi.string().trim().max(10000).optional(),
        allowed_file_types: Joi.alternatives().try(
          Joi.array().items(Joi.string().trim().max(20)),
          Joi.string().trim() // Comma-separated string
        ).optional(),
        max_file_size_mb: Joi.alternatives().try(
          Joi.number().positive().max(500),
          Joi.string().trim().regex(/^\d+(\.\d+)?$/)
        ).optional()
      })
    ).min(1).max(100).required(),
    template_id: Joi.number().integer().positive().optional(),
    apply_template_settings: Joi.boolean().default(false)
  })
};

/**
 * Validation schema for assignment export
 */
const exportAssignments = {
  query: Joi.object({
    course_id: Joi.number().integer().positive().optional(),
    assignment_ids: Joi.alternatives().try(
      Joi.array().items(Joi.number().integer().positive()),
      Joi.string().trim() // Comma-separated string
    ).optional(),
    format: Joi.string().valid('csv', 'json', 'excel').default('csv'),
    include_submissions: Joi.boolean().default(false),
    include_grades: Joi.boolean().default(false),
    date_range: Joi.object({
      start: Joi.date().iso().optional(),
      end: Joi.date().iso().min(Joi.ref('start')).optional()
    }).optional()
  })
};

/**
 * Validation schema for assignment duplication
 */
const duplicateAssignments = {
  body: Joi.object({
    assignment_ids: Joi.array().items(
      Joi.number().integer().positive()
    ).min(1).max(20).required(),
    target_course_id: Joi.number().integer().positive().required(),
    title_suffix: Joi.string().trim().min(1).max(50).default(' (Copy)'),
    adjust_due_dates: Joi.boolean().default(false),
    due_date_offset_days: Joi.when('adjust_due_dates', {
      is: true,
      then: Joi.number().integer().min(-365).max(365).required(),
      otherwise: Joi.optional()
    }),
    copy_submissions: Joi.boolean().default(false),
    copy_grades: Joi.boolean().default(false)
  })
};

module.exports = {
  bulkCreateAssignments,
  bulkUpdateAssignments,
  bulkDeleteAssignments,
  importAssignments,
  exportAssignments,
  duplicateAssignments
};