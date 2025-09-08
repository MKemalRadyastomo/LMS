# LMS Backend API Reference

## Overview

Complete API reference for the Enhanced Learning Management System (LMS) backend with role-based access control (RBAC), advanced assignment management, grading systems, analytics, search functionality, and security features.

## Base Configuration

- **Development**: `http://localhost:3000`
- **Production**: `https://api.lms.yourdomain.com`
- **API Version**: `v1`
- **All endpoints prefixed with**: `/api`

## Authentication

The API uses JWT (JSON Web Token) based authentication with role-based access control.

### Roles
- `admin` - Full system access
- `guru` - Teacher/instructor access 
- `siswa` - Student access

### Headers Required
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## API Endpoints

### 🔐 Authentication & Security
| Method | Endpoint | Access | Description |
|--------|----------|---------|-------------|
| POST | `/auth/login` | Public | User login |
| POST | `/auth/register` | Admin only | User registration |
| GET | `/auth/me` | Private | Get current user info |
| POST | `/auth/logout` | Private | User logout |
| POST | `/auth/refresh` | Public | Refresh JWT token |

### 👥 User Management
| Method | Endpoint | Access | Description |
|--------|----------|---------|-------------|
| GET | `/users` | Admin | List all users |
| POST | `/users` | Admin | Create new user |
| GET | `/users/:id` | Private | Get user profile |
| PUT | `/users/:id` | Private | Update user profile |
| DELETE | `/users/:id` | Admin | Delete user |
| PUT | `/users/:id/password` | Private | Change password |
| POST | `/users/:id/profile-picture` | Private | Upload profile picture |
| GET | `/users/:id/stats` | Private | Get user statistics |

### 📚 Course Management
| Method | Endpoint | Access | Description |
|--------|----------|---------|-------------|
| POST | `/courses` | Guru/Admin | Create new course |
| GET | `/courses` | Private | List courses |
| GET | `/courses/:id` | Private | Get course details |
| PUT | `/courses/:id` | Guru/Admin | Update course |
| GET | `/courses/search/suggestions` | Private | Search suggestions |
| GET | `/courses/search/advanced` | Private | Advanced search |
| GET | `/courses/code/:code` | Private | Find by class code |

### 📋 Course Enrollment
| Method | Endpoint | Access | Description |
|--------|----------|---------|-------------|
| POST | `/courses/:courseId/enrollments` | Guru/Admin | Enroll student |
| GET | `/courses/:courseId/enrollments` | Guru/Admin | Get enrollments |
| POST | `/courses/:courseId/enrollments/bulk` | Guru/Admin | Bulk enrollment |
| PATCH | `/courses/:courseId/enrollments/bulk-status` | Guru/Admin | Update enrollment status |
| GET | `/courses/:courseId/enrollments/analytics` | Guru/Admin | Enrollment analytics |

### 📝 Assignment Management
| Method | Endpoint | Access | Description |
|--------|----------|---------|-------------|
| POST | `/courses/:courseId/assignments` | Guru/Admin | Create assignment |
| GET | `/courses/:courseId/assignments` | Private | List assignments |
| GET | `/courses/:courseId/assignments/:id` | Private | Get assignment |
| PUT | `/courses/:courseId/assignments/:id` | Guru/Admin | Update assignment |
| DELETE | `/courses/:courseId/assignments/:id` | Guru/Admin | Delete assignment |

### 📄 Assignment Templates
| Method | Endpoint | Access | Description |
|--------|----------|---------|-------------|
| POST | `/assignment-templates` | Guru/Admin | Create template |
| GET | `/assignment-templates` | Guru/Admin | List templates |
| GET | `/assignment-templates/:id` | Guru/Admin | Get template |
| PUT | `/assignment-templates/:id` | Guru/Admin | Update template |
| DELETE | `/assignment-templates/:id` | Guru/Admin | Delete template |

### 🗂️ Assignment Submissions
| Method | Endpoint | Access | Description |
|--------|----------|---------|-------------|
| POST | `/assignments/:assignmentId/submissions` | Siswa | Submit assignment |
| GET | `/assignments/:assignmentId/submissions` | Private | List submissions |
| GET | `/assignments/:assignmentId/submissions/:id` | Private | Get submission |
| PUT | `/assignments/:assignmentId/submissions/:id` | Siswa/Guru | Update submission |
| DELETE | `/assignments/:assignmentId/submissions/:id` | Siswa/Guru | Delete submission |

### 📖 Course Content & Materials
| Method | Endpoint | Access | Description |
|--------|----------|---------|-------------|
| POST | `/courses/:courseId/content` | Guru/Admin | Add content |
| GET | `/courses/:courseId/content` | Private | List course content |
| GET | `/courses/:courseId/content/:contentId` | Private | Get specific content |
| PATCH | `/courses/:courseId/content/order` | Guru/Admin | Update content order |
| GET | `/materials/:id` | Private | Get material |
| POST | `/materials` | Guru/Admin | Create material |
| PUT | `/materials/:id` | Guru/Admin | Update material |
| DELETE | `/materials/:id` | Guru/Admin | Delete material |

### 🔍 Search
| Method | Endpoint | Access | Description |
|--------|----------|---------|-------------|
| GET | `/search/global` | Private | Global search |
| GET | `/search/courses` | Private | Search courses |
| GET | `/search/assignments` | Private | Search assignments |
| GET | `/search/materials` | Private | Search materials |
| GET | `/search/users` | Admin | Search users |

### 📊 Analytics & Reports
| Method | Endpoint | Access | Description |
|--------|----------|---------|-------------|
| GET | `/analytics/dashboard` | Guru/Admin | Dashboard analytics |
| GET | `/analytics/course/:id` | Guru/Admin | Course analytics |
| GET | `/analytics/assignment/:id` | Guru/Admin | Assignment analytics |
| GET | `/analytics/user/:id` | Guru/Admin | User analytics |
| GET | `/courses/:courseId/statistics` | Guru/Admin | Course statistics |
| GET | `/courses/:courseId/activities` | Guru/Admin | Course activities |
| GET | `/courses/:courseId/activities/summary` | Guru/Admin | Activity summary |

### 🔔 Notifications
| Method | Endpoint | Access | Description |
|--------|----------|---------|-------------|
| GET | `/notifications` | Private | Get notifications |
| POST | `/notifications` | Guru/Admin | Create notification |
| PUT | `/notifications/:id/read` | Private | Mark as read |
| DELETE | `/notifications/:id` | Private | Delete notification |

### 🏥 System Health
| Method | Endpoint | Access | Description |
|--------|----------|---------|-------------|
| GET | `/health` | Public | Health check |
| GET | `/api-version` | Public | API version info |

## Request/Response Examples

### Authentication
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "adminadmin"}'

# Response
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "role": "admin",
    "full_name": "Admin User"
  }
}
```

### Create Course
```bash
curl -X POST http://localhost:3000/api/courses \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Introduction to Programming",
    "description": "Basic programming concepts",
    "class_code": "PROG101",
    "semester": "Fall 2024"
  }'
```

### Submit Assignment
```bash
curl -X POST http://localhost:3000/api/assignments/1/submissions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "submission_type": "essay",
    "content": "My essay response...",
    "submitted_at": "2024-01-15T10:30:00Z"
  }'
```

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error information"],
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `429` - Rate Limited
- `500` - Internal Server Error

## Rate Limiting

Authentication endpoints have rate limiting:
- Login: 5 requests per 15 minutes per IP
- Register: 3 requests per hour per IP

## File Upload Limits

- Maximum file size: 50MB (52,428,800 bytes)
- Allowed file types: `pdf`, `doc`, `docx`, `ppt`, `pptx`, `jpg`, `jpeg`, `png`

## Security Features

- JWT token expiration: 30 minutes
- Maximum login attempts: 5 per account
- Account lockout duration: 30 minutes
- Session management and activity logging
- Rate limiting on sensitive endpoints