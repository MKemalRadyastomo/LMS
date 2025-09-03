# LMS Backend API Documentation

## Overview

This is the comprehensive API documentation for the Enhanced Learning Management System (LMS) backend. The API provides role-based access control (RBAC), advanced assignment management, grading systems, analytics, search functionality, and security features.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://api.lms.yourdomain.com`

## API Version

Current API version: `v1`

All endpoints are prefixed with `/api`

## Authentication

The API uses JWT (JSON Web Token) based authentication with role-based access control.

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "User Name",
    "role": "guru"
  }
}
```

### Authentication Header
Include the JWT token in the Authorization header for protected endpoints:
```http
Authorization: Bearer <your-jwt-token>
```

### Session Management
- **Token Expiry**: 30 minutes
- **Auto-logout**: On token expiration
- **Account Lockout**: 5 failed login attempts, 30-minute lockout

## User Roles

The system supports three user roles with specific permissions:

### 1. Admin (`admin`)
- Full system access
- User management (create, update, delete users)
- All course and assignment operations
- System analytics and reports
- Security logs and account management

### 2. Teacher/Guru (`guru`)
- Create and manage own courses
- Create materials and assignments
- Grade student submissions
- View student progress in their courses
- Course enrollment management
- Course-specific analytics

### 3. Student/Siswa (`siswa`)
- View enrolled courses and materials
- Submit assignments (essays, quizzes, file uploads)
- View own grades and progress
- Self-enroll via class codes
- Access course materials

## Core Entities

### Users
- **ID**: Unique identifier
- **Email**: Login credential (unique)
- **Name**: Display name
- **Role**: admin | guru | siswa
- **Profile Image**: Optional profile picture (max 2MB)
- **Created At**: Registration timestamp

### Courses
- **ID**: Unique identifier
- **Name**: Course title
- **Description**: Course description
- **Privacy**: public | private
- **Code**: 6-character unique course code
- **Teacher ID**: Reference to teacher user
- **Enrollment Code**: Generated code for student self-enrollment

### Materials
- **ID**: Unique identifier
- **Course ID**: Reference to course
- **Title**: Material title
- **Description**: Brief description
- **Content**: Rich text content (HTML)
- **File Path**: Uploaded file reference
- **Video URL**: YouTube/Vimeo embed URL
- **Publish Date**: When material becomes available

### Assignments
- **ID**: Unique identifier
- **Course ID**: Reference to course
- **Title**: Assignment title
- **Description**: Assignment instructions
- **Type**: essay | quiz | file_upload
- **Due Date**: Submission deadline
- **Max Score**: Maximum possible score
- **Questions**: Quiz questions (for quiz type)
- **File Restrictions**: Allowed file types and size limits

### Submissions
- **ID**: Unique identifier
- **Assignment ID**: Reference to assignment
- **Student ID**: Reference to student
- **Content**: Essay text or quiz answers
- **File Path**: Uploaded file reference
- **Grade**: Assigned score
- **Feedback**: Teacher feedback
- **Status**: draft | submitted | graded

## API Endpoints Reference

### Authentication Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | `/api/auth/login` | User login | Public |
| GET | `/api/auth/me` | Get current user | All |
| PUT | `/api/auth/change-password` | Change password | All |
| POST | `/api/auth/logout` | Logout | All |
| GET | `/api/auth/account-status` | Check account status | All |

### User Management

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | `/api/users` | Create user | Admin |
| GET | `/api/users` | List users | Admin |
| GET | `/api/users/{id}` | Get user details | Admin, Self |
| PUT | `/api/users/{id}` | Update user | Admin, Self |
| POST | `/api/users/{id}/profile-image` | Upload profile image | All |
| GET | `/api/users/{id}/statistics` | User statistics | Admin, Self |

### Course Management

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | `/api/courses` | Create course | Admin, Teacher |
| GET | `/api/courses` | List courses | All |
| GET | `/api/courses/{id}` | Get course details | All |
| PUT | `/api/courses/{id}` | Update course | Admin, Course Teacher |
| POST | `/api/courses/{id}/enrollment-code` | Generate enrollment code | Admin, Course Teacher |
| GET | `/api/courses/{id}/analytics` | Course analytics | Admin, Course Teacher |

### Materials Management

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | `/api/courses/{id}/materials` | Create material | Admin, Course Teacher |
| GET | `/api/courses/{id}/materials` | List course materials | Enrolled Users |
| GET | `/api/materials/{id}` | Get material details | Enrolled Users |
| PUT | `/api/materials/{id}` | Update material | Admin, Course Teacher |
| DELETE | `/api/materials/{id}` | Delete material | Admin, Course Teacher |

### Assignment Management

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | `/api/courses/{id}/assignments` | Create assignment | Admin, Course Teacher |
| GET | `/api/courses/{id}/assignments` | List course assignments | Enrolled Users |
| GET | `/api/assignments/{id}` | Get assignment details | Enrolled Users |
| PUT | `/api/assignments/{id}` | Update assignment | Admin, Course Teacher |
| DELETE | `/api/assignments/{id}` | Delete assignment | Admin, Course Teacher |

### Student Submissions

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | `/api/assignments/{id}/submit` | Submit assignment | Student |
| GET | `/api/assignments/{id}/submissions` | List submissions | Admin, Course Teacher |
| GET | `/api/users/{id}/submissions` | Student's submissions | Admin, Teacher, Self |

### Grading System

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | `/api/rubrics` | Create grading rubric | Admin, Teacher |
| POST | `/api/submissions/{id}/grade` | Grade submission | Admin, Course Teacher |
| POST | `/api/submissions/{id}/auto-grade` | Auto-grade quiz | Admin, Course Teacher |
| POST | `/api/assignments/{id}/bulk-grade` | Bulk grade submissions | Admin, Course Teacher |
| GET | `/api/courses/{id}/grades/export` | Export grades | Admin, Course Teacher |

### Enrollment Management

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | `/api/courses/{id}/enrollments` | Enroll student | Admin, Course Teacher |
| POST | `/api/enrollments/join` | Self-enroll with code | Student |
| GET | `/api/courses/{id}/enrollments` | List enrollments | Admin, Course Teacher |
| PUT | `/api/enrollments/{id}` | Update enrollment | Admin, Course Teacher |
| POST | `/api/courses/{id}/enrollments/bulk` | Bulk enroll via CSV | Admin, Course Teacher |

### Search & Discovery

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/search` | Global search | All |
| GET | `/api/search/suggestions` | Search suggestions | All |
| POST | `/api/search/advanced` | Advanced search | All |

### Analytics & Reports

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/analytics/dashboard` | Dashboard analytics | All |
| GET | `/api/analytics/courses/{id}` | Course analytics | Admin, Course Teacher |
| GET | `/api/analytics/students/{id}/progress` | Student progress | Admin, Teacher, Self |
| GET | `/api/analytics/assignments/{id}/performance` | Assignment performance | Admin, Course Teacher |
| GET | `/api/analytics/system` | System analytics | Admin |

### Security & Administration

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | `/api/admin/unlock-account` | Unlock user account | Admin |
| GET | `/api/admin/security-logs` | Security logs | Admin |
| GET | `/api/health` | System health check | Public |
| GET | `/api/version` | API version info | Public |

## Request/Response Examples

### Create Course
```http
POST /api/courses
Authorization: Bearer <teacher-token>
Content-Type: application/json

{
  "name": "Advanced Mathematics",
  "description": "Advanced mathematics covering calculus and statistics",
  "privacy": "public"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Advanced Mathematics",
    "description": "Advanced mathematics covering calculus and statistics",
    "privacy": "public",
    "code": "MATH01",
    "teacherId": 2,
    "createdAt": "2025-01-12T10:00:00Z"
  }
}
```

### Create Quiz Assignment
```http
POST /api/courses/1/assignments
Authorization: Bearer <teacher-token>
Content-Type: application/json

{
  "title": "Calculus Quiz 1",
  "description": "Quiz covering derivatives and limits",
  "type": "quiz",
  "dueDate": "2025-02-15T23:59:59Z",
  "maxScore": 30,
  "timeLimit": 45,
  "questions": [
    {
      "type": "multiple_choice",
      "question": "What is the derivative of x²?",
      "options": ["2x", "x", "2", "x²"],
      "correctAnswer": "2x",
      "points": 10
    }
  ]
}
```

### Submit Quiz
```http
POST /api/assignments/1/submit
Authorization: Bearer <student-token>
Content-Type: application/json

{
  "quizAnswers": {
    "1": "2x"
  },
  "timeSpent": 25,
  "completedAt": "2025-01-12T11:00:00Z"
}
```

### Search Content
```http
GET /api/search?q=calculus&types=course,material&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "type": "course",
      "id": 1,
      "title": "Advanced Calculus",
      "description": "Comprehensive calculus course",
      "relevanceScore": 0.95
    },
    {
      "type": "material",
      "id": 1,
      "title": "Introduction to Derivatives",
      "description": "Basic derivative concepts",
      "courseId": 1,
      "relevanceScore": 0.87
    }
  ],
  "total": 2,
  "query": "calculus"
}
```

## Error Handling

The API uses standard HTTP status codes and returns structured error responses:

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "name",
        "message": "Name is required"
      }
    ]
  }
}
```

### Common HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate resource) |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

## File Upload Guidelines

### Profile Pictures
- **Max Size**: 2MB
- **Formats**: JPG, PNG, GIF
- **Upload**: Multipart form data

### Course Materials
- **Max Size**: 50MB
- **Formats**: PDF, DOC, DOCX, PPT, PPTX
- **Upload**: Multipart form data

### Assignment Submissions
- **Max Size**: Configurable per assignment
- **Formats**: Configurable per assignment
- **Upload**: Multipart form data

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Default**: 100 requests per 15-minute window
- **Search**: 50 requests per 15-minute window
- **File Uploads**: 10 requests per 15-minute window

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642000000
```

## Security Features

### Input Validation
- All inputs are validated using Joi schemas
- SQL injection prevention
- XSS protection for rich text content

### Authentication Security
- JWT tokens with 30-minute expiry
- Account lockout after 5 failed attempts
- Password strength requirements

### File Security
- File type validation
- Size limit enforcement
- Virus scanning (recommended for production)

### HTTPS
- All production APIs must use HTTPS
- Secure cookie flags
- CORS configuration

## Testing with Postman

Import the provided Postman collections:

1. **Main Collection**: `LMS-API-Enhanced.postman_collection.json`
2. **Test Workflows**: `LMS-Test-Workflows.postman_collection.json`
3. **Development Environment**: `LMS-Development.postman_environment.json`
4. **Production Environment**: `LMS-Production.postman_environment.json`

### Quick Start Testing

1. Import collections and environment
2. Set environment to "LMS Development Environment"
3. Run "Complete Teacher Workflow" to set up test data
4. Run "Complete Student Workflow" to test student features
5. Run "Teacher Grading Workflow" to test grading features

## API Versioning

The API uses URL versioning with the `/api` prefix. Future versions will be available at `/api/v2`, etc.

### Backwards Compatibility
- Minor updates maintain backwards compatibility
- Deprecated features are marked and documented
- Major version changes may introduce breaking changes

## Support and Resources

- **API Documentation**: This document
- **Postman Collections**: Complete API testing suite
- **Environment Files**: Development and production configurations
- **Test Workflows**: Common user journey tests

For technical support or questions about the API, please refer to the backend development team or create an issue in the project repository.