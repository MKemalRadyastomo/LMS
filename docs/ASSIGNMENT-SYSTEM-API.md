# Assignment System API Documentation

This document provides comprehensive API specifications for the enhanced LMS Assignment System. The system supports various assignment types, submission management with version tracking, automated grading, and detailed analytics.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Assignment Management](#assignment-management)
- [Assignment Templates](#assignment-templates)
- [Bulk Operations](#bulk-operations)
- [Submission Management](#submission-management)
- [Grading System](#grading-system)
- [Analytics & Reporting](#analytics--reporting)
- [Data Models](#data-models)
- [Error Handling](#error-handling)

## Overview

The Assignment System API provides endpoints for managing the complete assignment workflow from creation to grading and analytics. It supports role-based access control with three user types:

- **Admin**: Full system access
- **Guru (Teacher)**: Course and assignment management for owned courses
- **Siswa (Student)**: Assignment submission and viewing owned content

### Base URL
```
http://localhost:3000/api/v1
```

### API Version
```
Version: 1.0.0
Release Date: 2025-01-30
```

## Authentication

All API endpoints require authentication via JWT token in the Authorization header:

```http
Authorization: Bearer <jwt-token>
```

## Assignment Management

### Create Assignment

**Endpoint:** `POST /courses/{courseId}/assignments`

**Description:** Create a new assignment for a course

**Authorization:** Admin, Guru (course owner)

**Parameters:**
- `courseId` (path, integer): Course ID

**Request Body:**
```json
{
  \"title\": \"Assignment Title\",
  \"description\": \"Assignment description\",
  \"type\": \"essay|quiz|file_upload|mixed|coding\",
  \"due_date\": \"2025-02-15T23:59:59Z\",
  \"max_score\": 100,
  \"instructions\": \"Detailed instructions\",
  \"template_id\": 123, // Optional: Create from template
  \"late_submission_penalty\": 10, // Percentage per day
  \"allow_late_submissions\": true,
  \"max_late_days\": 7,
  \"auto_release_grades\": false,
  \"grade_release_date\": \"2025-02-20T10:00:00Z\",
  \"multiple_attempts\": false,
  \"max_attempts\": 1,
  \"show_correct_answers\": false,
  \"shuffle_questions\": false,
  \"time_limit_minutes\": 60,
  \"require_webcam\": false,
  \"plagiarism_check\": true,
  \"quiz_questions_json\": [/* Quiz questions for quiz type */],
  \"allowed_file_types\": \"pdf,doc,docx\",
  \"max_file_size_mb\": 10
}
```

**Response:**
```json
{
  \"success\": true,
  \"message\": \"Assignment created successfully\",
  \"data\": {
    \"id\": 123,
    \"title\": \"Assignment Title\",
    \"course_id\": 1,
    \"type\": \"essay\",
    \"created_at\": \"2025-01-30T10:00:00Z\",
    // ... other assignment fields
  }
}
```

### Get Assignments

**Endpoint:** `GET /courses/{courseId}/assignments`

**Description:** Get all assignments for a course

**Authorization:** Admin, Guru (course owner), Siswa (enrolled)

**Query Parameters:**
- `status` (string, optional): Filter by status
- `type` (string, optional): Filter by assignment type
- `limit` (integer, optional): Number of results per page (default: 20)
- `page` (integer, optional): Page number (default: 1)

**Response:**
```json
{
  \"success\": true,
  \"data\": {
    \"results\": [/* Array of assignments */],
    \"totalResults\": 15,
    \"totalPages\": 2,
    \"currentPage\": 1
  }
}
```

### Get Assignment Details

**Endpoint:** `GET /courses/{courseId}/assignments/{assignmentId}`

**Description:** Get detailed information about a specific assignment

**Authorization:** Admin, Guru (course owner), Siswa (enrolled)

**Response:**
```json
{
  \"success\": true,
  \"data\": {
    \"id\": 123,
    \"title\": \"Assignment Title\",
    \"description\": \"Assignment description\",
    \"type\": \"essay\",
    \"due_date\": \"2025-02-15T23:59:59Z\",
    \"max_score\": 100,
    \"instructions\": \"Detailed instructions\",
    \"late_submission_penalty\": 10,
    \"allow_late_submissions\": true,
    \"created_at\": \"2025-01-30T10:00:00Z\",
    \"updated_at\": \"2025-01-30T10:00:00Z\"
  }
}
```

### Update Assignment

**Endpoint:** `PUT /courses/{courseId}/assignments/{assignmentId}`

**Description:** Update an existing assignment

**Authorization:** Admin, Guru (course owner)

**Request Body:** Similar to create assignment (all fields optional)

### Delete Assignment

**Endpoint:** `DELETE /courses/{courseId}/assignments/{assignmentId}`

**Description:** Delete an assignment

**Authorization:** Admin, Guru (course owner)

**Response:** `204 No Content`

### Duplicate Assignment

**Endpoint:** `POST /courses/{courseId}/assignments/{assignmentId}/duplicate`

**Description:** Create a copy of an existing assignment

**Authorization:** Admin, Guru (course owner)

**Request Body:**
```json
{
  \"title\": \"New Assignment Title\",
  \"due_date\": \"2025-03-15T23:59:59Z\",
  \"course_id\": 2 // Optional: Copy to different course
}
```

## Assignment Templates

### Create Template

**Endpoint:** `POST /assignment-templates`

**Description:** Create a reusable assignment template

**Authorization:** Admin, Guru

**Request Body:**
```json
{
  \"name\": \"Essay Template\",
  \"description\": \"Standard essay assignment template\",
  \"type\": \"essay\",
  \"template_data\": {
    \"title\": \"Essay Assignment\",
    \"description\": \"Write an essay on...\",
    \"instructions\": \"Detailed instructions\"
  },
  \"default_max_score\": 100,
  \"default_allowed_file_types\": \"pdf,doc,docx\",
  \"default_max_file_size_mb\": 10,
  \"is_public\": false // Only admins can set to true
}
```

### Get Templates

**Endpoint:** `GET /assignment-templates`

**Description:** Get assignment templates

**Authorization:** Admin, Guru

**Query Parameters:**
- `type` (string, optional): Filter by template type
- `search` (string, optional): Search in name/description
- `include_public` (boolean, optional): Include public templates (for Guru)
- `limit` (integer, optional): Results per page
- `page` (integer, optional): Page number

### Create Assignment from Template

**Endpoint:** `POST /assignment-templates/{templateId}/assignments`

**Description:** Create assignment using a template

**Authorization:** Admin, Guru

**Request Body:**
```json
{
  \"course_id\": 1,
  \"title\": \"Custom Title\", // Override template data
  \"due_date\": \"2025-02-15T23:59:59Z\",
  \"max_score\": 100
}
```

## Bulk Operations

### Bulk Create Assignments

**Endpoint:** `POST /assignments/bulk/create`

**Description:** Create multiple assignments at once

**Authorization:** Admin, Guru

**Request Body:**
```json
{
  \"courseId\": 1,
  \"assignments\": [
    {
      \"title\": \"Assignment 1\",
      \"description\": \"Description 1\",
      \"type\": \"essay\",
      \"due_date\": \"2025-02-15T23:59:59Z\",
      \"max_score\": 100
    },
    {
      \"title\": \"Assignment 2\",
      \"description\": \"Description 2\",
      \"type\": \"quiz\",
      \"due_date\": \"2025-02-20T23:59:59Z\",
      \"max_score\": 50
    }
  ]
}
```

### Bulk Grade Submissions

**Endpoint:** `POST /assignments/bulk/grade`

**Description:** Grade multiple submissions at once

**Authorization:** Admin, Guru

**Request Body:**
```json
{
  \"grades\": [
    {
      \"submission_id\": 101,
      \"grade\": 85,
      \"feedback\": \"Good work!\"
    },
    {
      \"submission_id\": 102,
      \"grade\": 92,
      \"feedback\": \"Excellent!\"
    }
  ]
}
```

### Export Assignments

**Endpoint:** `POST /assignments/bulk/export`

**Description:** Export assignment data

**Authorization:** Admin, Guru

**Request Body:**
```json
{
  \"courseId\": 1,
  \"assignmentIds\": [1, 2, 3],
  \"format\": \"csv|json|excel\"
}
```

## Submission Management

### Enhanced Submission

**Endpoint:** `POST /assignments/{assignmentId}/submit/enhanced`

**Description:** Submit assignment with version tracking and multiple files

**Authorization:** Siswa (enrolled)

**Content-Type:** `multipart/form-data`

**Form Data:**
- `submission_text` (string, optional): Text content
- `quiz_answers` (JSON, optional): Quiz answers
- `is_draft` (boolean): Whether this is a draft
- `files` (file[], optional): Multiple files

**Response:**
```json
{
  \"success\": true,
  \"message\": \"Submission created successfully\",
  \"data\": {
    \"id\": 201,
    \"assignment_id\": 123,
    \"student_id\": 456,
    \"status\": \"submitted\",
    \"version\": {
      \"version_number\": 1,
      \"is_draft\": false,
      \"submitted_at\": \"2025-01-30T15:30:00Z\"
    }
  }
}
```

### Auto-save Draft

**Endpoint:** `POST /assignments/{assignmentId}/autosave`

**Description:** Auto-save submission as draft

**Authorization:** Siswa (enrolled)

**Request Body:**
```json
{
  \"text\": \"Draft content...\",
  \"quiz_answers\": {/* Quiz answers */},
  \"files\": [/* File data */]
}
```

### Submit Final Version

**Endpoint:** `POST /assignments/{assignmentId}/submissions/{submissionId}/submit`

**Description:** Convert draft to final submission

**Authorization:** Siswa (owner)

**Response:**
```json
{
  \"success\": true,
  \"message\": \"Assignment submitted successfully\",
  \"data\": {
    \"id\": 201,
    \"status\": \"submitted\",
    \"submitted_at\": \"2025-01-30T15:30:00Z\"
  }
}
```

### Get Submission with Versions

**Endpoint:** `GET /assignments/{assignmentId}/submissions/{submissionId}/versions`

**Description:** Get submission with complete version history

**Authorization:** Admin, Guru (course owner), Siswa (owner)

**Response:**
```json
{
  \"success\": true,
  \"data\": {
    \"id\": 201,
    \"assignment_id\": 123,
    \"student_id\": 456,
    \"current_status\": \"submitted\",
    \"versions\": [
      {
        \"version_number\": 2,
        \"submission_text\": \"Final version\",
        \"is_draft\": false,
        \"submitted_at\": \"2025-01-30T15:30:00Z\",
        \"files\": [/* File data */]
      },
      {
        \"version_number\": 1,
        \"submission_text\": \"Draft version\",
        \"is_draft\": true,
        \"submitted_at\": \"2025-01-30T14:00:00Z\",
        \"files\": []
      }
    ]
  }
}
```

### Get Latest Submission

**Endpoint:** `GET /assignments/{assignmentId}/submission/latest`

**Description:** Get student's latest submission version

**Authorization:** Siswa (enrolled)

## Grading System

### Create Rubric

**Endpoint:** `POST /grading/assignments/{assignmentId}/rubrics`

**Description:** Create grading rubric for assignment

**Authorization:** Admin, Guru (course owner)

**Request Body:**
```json
{
  \"name\": \"Essay Rubric\",
  \"total_points\": 100,
  \"criteria\": [
    {
      \"name\": \"Content Quality\",
      \"description\": \"Quality and depth of content\",
      \"maxPoints\": 40,
      \"weight\": 1.0,
      \"levels\": [
        {
          \"name\": \"Excellent\",
          \"description\": \"Outstanding content\",
          \"points\": 40
        },
        {
          \"name\": \"Good\",
          \"description\": \"Good content\",
          \"points\": 30
        }
      ]
    }
  ]
}
```

### Grade with Detailed Rubric

**Endpoint:** `POST /assignments/{assignmentId}/submissions/{submissionId}/grade/detailed`

**Description:** Grade submission using detailed rubric

**Authorization:** Admin, Guru (course owner)

**Request Body:**
```json
{
  \"grade\": 85,
  \"feedback\": \"Good work overall\",
  \"rubric_id\": 123,
  \"criterion_scores\": {
    \"1\": {
      \"points\": 35,
      \"comments\": \"Good content depth\"
    },
    \"2\": {
      \"points\": 40,
      \"comments\": \"Excellent writing style\"
    }
  },
  \"additional_points\": 5,
  \"deductions\": 0
}
```

### Automated Grading

**Endpoint:** `POST /assignments/{assignmentId}/submissions/{submissionId}/grade/auto`

**Description:** Apply automated grading to objective questions

**Authorization:** Admin, Guru (course owner)

**Response:**
```json
{
  \"success\": true,
  \"message\": \"Automated grading applied successfully\",
  \"data\": {
    \"auto_grade\": 75,
    \"total_questions\": 10,
    \"correct_answers\": 7.5,
    \"details\": {
      \"multiple_choice\": {\"correct\": 5, \"total\": 6},
      \"true_false\": {\"correct\": 2, \"total\": 2},
      \"short_answer\": {\"correct\": 0.5, \"total\": 2}
    }
  }
}
```

### Export Grades

**Endpoint:** `GET /grading/assignments/{assignmentId}/export/{format}`

**Description:** Export grades in various formats

**Authorization:** Admin, Guru (course owner)

**Parameters:**
- `format` (path): csv, excel, json

**Query Parameters:**
- `include_feedback` (boolean): Include feedback text
- `include_late_penalties` (boolean): Include penalty information

## Analytics & Reporting

### Assignment Analytics

**Endpoint:** `GET /courses/{courseId}/assignments/{assignmentId}/analytics`

**Description:** Get basic assignment analytics

**Authorization:** Admin, Guru (course owner)

**Response:**
```json
{
  \"success\": true,
  \"data\": {
    \"assignment_id\": 123,
    \"assignment_title\": \"Essay Assignment\",
    \"total_submissions\": 25,
    \"submitted_count\": 20,
    \"graded_count\": 15,
    \"average_grade\": 78.5,
    \"grade_distribution\": {
      \"A\": 3, \"B\": 8, \"C\": 3, \"D\": 1, \"F\": 0
    },
    \"late_submissions\": 3,
    \"submission_timeline\": [/* Time-series data */]
  }
}
```

### Comprehensive Analytics

**Endpoint:** `GET /courses/{courseId}/assignments/{assignmentId}/analytics/comprehensive`

**Description:** Get detailed assignment analytics with advanced metrics

**Authorization:** Admin, Guru (course owner)

**Response:**
```json
{
  \"success\": true,
  \"data\": {
    \"basic_stats\": {/* Basic analytics */},
    \"advanced_metrics\": {
      \"median_grade\": 80,
      \"standard_deviation\": 12.3,
      \"percentile_distribution\": {
        \"25th\": 70,
        \"50th\": 80,
        \"75th\": 90
      }
    },
    \"time_analysis\": {
      \"average_time_spent\": 120, // minutes
      \"submission_patterns\": [/* Hourly/daily patterns */]
    },
    \"question_analysis\": [/* Per-question statistics for quizzes */],
    \"plagiarism_summary\": {
      \"total_reports\": 20,
      \"average_score\": 5.2,
      \"high_risk_submissions\": 2
    }
  }
}
```

### Student Analytics

**Endpoint:** `GET /assignments/{assignmentId}/analytics/student`

**Description:** Get student's own performance analytics

**Authorization:** Siswa

**Query Parameters:**
- `courseId` (integer, optional): Limit to specific course

**Response:**
```json
{
  \"success\": true,
  \"data\": {
    \"total_submissions\": 15,
    \"graded_submissions\": 12,
    \"average_grade\": 82.5,
    \"on_time_submissions\": 13,
    \"late_submissions\": 2,
    \"draft_submissions\": 1,
    \"grade_trend\": [/* Historical grade data */],
    \"performance_by_type\": {
      \"essay\": {\"average\": 85, \"count\": 5},
      \"quiz\": {\"average\": 78, \"count\": 7},
      \"file_upload\": {\"average\": 88, \"count\": 3}
    }
  }
}
```

## Data Models

### Assignment Model

```json
{
  \"id\": 123,
  \"course_id\": 1,
  \"template_id\": 456, // Optional
  \"title\": \"Assignment Title\",
  \"description\": \"Assignment description\",
  \"instructions\": \"Detailed instructions\",
  \"type\": \"essay|quiz|file_upload|mixed|coding\",
  \"due_date\": \"2025-02-15T23:59:59Z\",
  \"max_score\": 100,
  \"quiz_questions_json\": [/* Quiz questions */],
  \"allowed_file_types\": \"pdf,doc,docx\",
  \"max_file_size_mb\": 10,
  \"late_submission_penalty\": 10,
  \"allow_late_submissions\": true,
  \"max_late_days\": 7,
  \"auto_release_grades\": false,
  \"grade_release_date\": \"2025-02-20T10:00:00Z\",
  \"multiple_attempts\": false,
  \"max_attempts\": 1,
  \"show_correct_answers\": false,
  \"shuffle_questions\": false,
  \"time_limit_minutes\": 60,
  \"require_webcam\": false,
  \"plagiarism_check\": true,
  \"status\": \"active|inactive|archived\",
  \"created_at\": \"2025-01-30T10:00:00Z\",
  \"updated_at\": \"2025-01-30T10:00:00Z\"
}
```

### Submission Model

```json
{
  \"id\": 201,
  \"assignment_id\": 123,
  \"student_id\": 456,
  \"submission_text\": \"Student's submission text\",
  \"quiz_answers_json\": {/* Quiz answers */},
  \"grade\": 85,
  \"feedback\": \"Good work!\",
  \"status\": \"draft|submitted|graded|late\",
  \"plagiarism_score\": 5.2,
  \"graded_at\": \"2025-01-30T16:00:00Z\",
  \"graded_by\": 789,
  \"created_at\": \"2025-01-30T15:30:00Z\",
  \"updated_at\": \"2025-01-30T16:00:00Z\",
  \"versions\": [/* Version history */],
  \"files\": [/* Uploaded files */]
}
```

### Rubric Model

```json
{
  \"id\": 301,
  \"assignment_id\": 123,
  \"name\": \"Essay Rubric\",
  \"total_points\": 100,
  \"criteria\": [
    {
      \"id\": 401,
      \"name\": \"Content Quality\",
      \"description\": \"Quality and depth of content\",
      \"max_points\": 40,
      \"weight\": 1.0,
      \"order_index\": 0,
      \"performance_levels\": [/* Performance levels */]
    }
  ],
  \"created_at\": \"2025-01-30T10:00:00Z\"
}
```

## Error Handling

The API uses standard HTTP status codes and returns consistent error responses:

### Error Response Format

```json
{
  \"success\": false,
  \"error\": \"Error type\",
  \"message\": \"Human-readable error message\",
  \"code\": \"ERROR_CODE\",
  \"details\": {/* Additional error details */}
}
```

### Common HTTP Status Codes

- `200 OK` - Successful request
- `201 Created` - Resource created successfully
- `204 No Content` - Successful request with no response body
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate submission)
- `413 Payload Too Large` - File size exceeds limit
- `415 Unsupported Media Type` - Invalid file type
- `422 Unprocessable Entity` - Validation errors
- `500 Internal Server Error` - Server error

### Validation Errors

```json
{
  \"success\": false,
  \"error\": \"Validation Error\",
  \"message\": \"Request validation failed\",
  \"code\": \"VALIDATION_ERROR\",
  \"details\": {
    \"field_errors\": {
      \"title\": \"Title is required\",
      \"due_date\": \"Due date must be in the future\"
    }
  }
}
```

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **General endpoints**: 100 requests per minute per user
- **File upload endpoints**: 20 requests per minute per user
- **Bulk operations**: 10 requests per minute per user

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1643558400
```

## Pagination

List endpoints support pagination with the following parameters:

- `page` (integer, default: 1): Page number
- `limit` (integer, default: 20, max: 100): Items per page

Paginated responses include metadata:

```json
{
  \"success\": true,
  \"data\": {
    \"results\": [/* Array of items */],
    \"pagination\": {
      \"total_results\": 150,
      \"total_pages\": 8,
      \"current_page\": 2,
      \"per_page\": 20,
      \"has_next\": true,
      \"has_prev\": true
    }
  }
}
```

## Webhooks (Future Enhancement)

The system supports webhooks for real-time notifications:

### Events
- `assignment.created`
- `assignment.updated`
- `assignment.due_soon`
- `submission.created`
- `submission.graded`
- `plagiarism.detected`

### Webhook Payload
```json
{
  \"event\": \"submission.graded\",
  \"timestamp\": \"2025-01-30T16:00:00Z\",
  \"data\": {
    \"submission_id\": 201,
    \"assignment_id\": 123,
    \"student_id\": 456,
    \"grade\": 85
  }
}
```

---

**Note:** This API is designed to be RESTful and follows HTTP best practices. All timestamps are in ISO 8601 format (UTC). File uploads support multiple formats with configurable size limits and type restrictions.