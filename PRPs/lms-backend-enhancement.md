name: "LMS Backend API Enhancement - Controller Implementation & Production Readiness"
description: |

## Purpose
Complete the implementation of controller logic and enhance the existing Node.js/Express.js LMS backend to production-ready state. The route structure and RBAC middleware are already implemented, but many controllers need actual business logic implementation.

## Core Principles
1. **Context is King**: Include ALL necessary documentation, examples, and caveats
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix
3. **Information Dense**: Use keywords and patterns from the codebase
4. **Progressive Success**: Start simple, validate, then enhance
5. **Global rules**: Be sure to follow all rules in CLAUDE.md

---

## Goal
Complete the controller implementations for the already-established route structure, ensuring all API endpoints have proper business logic, database integration, error handling, and performance optimization.

## Why
- **Business value**: Makes the comprehensive route structure functional with real implementations
- **Production readiness**: Ensures all endpoints work correctly with proper validation and error handling
- **Performance**: Optimizes database queries and implements caching where needed
- **Integration**: Provides fully functional REST API for the Next.js frontend
- **Maintainability**: Implements clean, testable controller patterns

## What
Implementation and enhancement of existing controller methods:
- Complete analytics controller implementation with real data aggregation
- Enhance grading controller with rubric calculations and export features
- Implement search controller with PostgreSQL full-text search
- Complete material controller with file processing and validation
- Implement user statistics controller with progress tracking
- Add export functionality for grades and analytics
- Optimize database queries and add caching
- Implement comprehensive error handling
- Add input validation and sanitization

### Success Criteria (Updated Based on Current State)
- [x] RBAC middleware enforces all permission requirements ✅ ALREADY IMPLEMENTED
- [x] Route structure for all major features ✅ ALREADY IMPLEMENTED
- [x] Database schema with proper relationships ✅ ALREADY IMPLEMENTED
- [x] Security features (session timeout, account lockout) ✅ ALREADY IMPLEMENTED
- [ ] Analytics controller returns real aggregated data
- [ ] Grading controller implements rubric calculations
- [ ] Search controller performs fast full-text search
- [ ] Material controller handles file uploads and processing
- [ ] User statistics controller tracks progress accurately
- [ ] Export functionality generates PDF/Excel reports
- [ ] All validation gates pass (lint, type-check, tests)
- [ ] Performance tests show <300ms API response times

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- url: https://node-postgres.com/features/queries
  why: PostgreSQL query patterns and performance optimization

- url: https://www.npmjs.com/package/sharp
  why: Image processing for file uploads (already installed)

- url: https://www.npmjs.com/package/pdf-lib
  why: PDF generation for reports and exports

- url: https://www.npmjs.com/package/xlsx
  why: Excel export functionality for grade reports

- file: src/middleware/rbac.js
  why: ALREADY IMPLEMENTED - comprehensive RBAC with session management

- file: src/routes/analytics.routes.js
  why: ALREADY IMPLEMENTED - complete route structure with validation

- file: src/routes/grading.routes.js
  why: ALREADY IMPLEMENTED - comprehensive grading API routes

- file: src/routes/search.routes.js
  why: ALREADY IMPLEMENTED - search routes with filtering

- file: database/grading_enhancement.sql
  why: ALREADY IMPLEMENTED - database schema for grading system

- file: database/rbac_enhancement.sql
  why: ALREADY IMPLEMENTED - session and activity tracking tables

- file: src/models/user.model.js
  why: Current model patterns to follow for new implementations
```

### Current Backend Architecture Analysis (UPDATED)

**FULLY IMPLEMENTED FEATURES:**
```bash
✅ Enhanced RBAC Middleware (src/middleware/rbac.js)
   - Role-based route protection (admin/guru/siswa)
   - Session timeout management (30 minutes)
   - Account lockout after 5 failed attempts
   - Activity logging and audit trail
   - Permission-based access control

✅ Complete Route Structure
   - Analytics routes with role-based access
   - Grading routes with rubric management
   - Search routes with advanced filtering
   - Material routes with file upload support
   - User statistics routes
   - All routes have proper validation schemas

✅ Database Schema
   - Enhanced with RBAC tables (user_sessions, failed_login_attempts, activity_logs)
   - Grading enhancement tables (grading_details, rubrics)
   - Full-text search indexes
   - Performance optimization indexes

✅ Security Infrastructure
   - JWT authentication with session tracking
   - Password hashing with bcrypt
   - Rate limiting middleware
   - Input validation with Joi schemas
   - CORS configuration
```

**PARTIALLY IMPLEMENTED (Need Controller Logic):**
```bash
⚠️ Analytics Controller (src/controllers/analytics.controller.js)
   - Routes exist but may need business logic implementation
   - Database aggregation queries need implementation
   - Role-specific data filtering needs implementation

⚠️ Grading Controller (src/controllers/grading.controller.js)
   - Basic structure exists but rubric calculations may be incomplete
   - Export functionality likely needs implementation
   - Bulk grading operations may need enhancement

⚠️ Search Controller (src/controllers/search.controller.js)
   - Routes exist but PostgreSQL full-text search needs implementation
   - Search ranking and relevance scoring needs work
   - Search history and analytics need implementation

⚠️ Material Controller (src/controllers/material.controller.js)
   - File upload handling needs enhancement
   - Rich text content processing needs implementation
   - Video URL validation needs implementation

⚠️ User Statistics Controller (src/controllers/userStats.controller.js)
   - Progress calculation algorithms need implementation
   - Performance metrics aggregation needs work
```

**MISSING FEATURES (Need Complete Implementation):**
```bash
❌ Export Services (PDF/Excel generation)
❌ Course Enrollment via Class Codes
❌ Rich Text Content Sanitization
❌ File Storage Optimization (cloud storage integration)
❌ Caching Layer (Redis implementation)
❌ Email Notification System
❌ Real-time Features (WebSocket support)
❌ API Documentation (Swagger/OpenAPI)
❌ Comprehensive Integration Tests
```

### Known Implementation Patterns from Existing Code
```javascript
// CRITICAL: Follow existing model patterns from src/models/user.model.js
// CRITICAL: Use existing error handling from src/utils/ApiError.js
// CRITICAL: Follow existing validation patterns from middleware/validate.js
// CRITICAL: Use existing database connection from src/config/db.js
// CRITICAL: Follow existing logging patterns from src/utils/logger.js
// CRITICAL: PostgreSQL JSONB queries for quiz_questions and rubric_scores
// CRITICAL: Use existing file upload patterns from middleware/upload.js
// CRITICAL: Follow existing transaction patterns in user.model.js update method
```

## Implementation Blueprint

### Enhanced Controller Implementations

```javascript
// Example: Analytics Controller Implementation Pattern
// src/controllers/analytics.controller.js

const db = require('../config/db');
const { ApiError } = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

const getDashboardAnalytics = catchAsync(async (req, res) => {
  const { user } = req;
  const { timeframe = 'month' } = req.query;
  
  let analytics = {};
  
  switch (user.role) {
    case 'admin':
      analytics = await getAdminDashboardData(timeframe);
      break;
    case 'guru':
      analytics = await getTeacherDashboardData(user.id, timeframe);
      break;
    case 'siswa':
      analytics = await getStudentDashboardData(user.id, timeframe);
      break;
    default:
      throw new ApiError(403, 'Invalid role');
  }
  
  res.json({
    success: true,
    data: analytics
  });
});

const getAdminDashboardData = async (timeframe) => {
  const timeCondition = getTimeCondition(timeframe);
  
  const query = `
    SELECT 
      (SELECT COUNT(*) FROM users WHERE role = 'siswa') as total_students,
      (SELECT COUNT(*) FROM users WHERE role = 'guru') as total_teachers,
      (SELECT COUNT(*) FROM courses) as total_courses,
      (SELECT COUNT(*) FROM assignments) as total_assignments,
      (SELECT ROUND(AVG(grade)::numeric, 2) FROM assignment_submissions WHERE grade IS NOT NULL) as avg_grade,
      (SELECT COUNT(*) FROM assignment_submissions ${timeCondition}) as recent_submissions
  `;
  
  const result = await db.query(query);
  return result.rows[0];
};

// Example: Search Controller Implementation Pattern
const searchContent = catchAsync(async (req, res) => {
  const { q, type, courseId, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  
  // Build search query with proper role-based filtering
  let searchQuery = buildSearchQuery(q, type, req.user.role, courseId);
  
  const results = await db.query(searchQuery, [q, limit, offset]);
  
  // Log search for analytics
  await logSearchQuery(req.user.id, q, type, results.rowCount);
  
  res.json({
    success: true,
    data: {
      results: results.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: results.rowCount
      }
    }
  });
});

const buildSearchQuery = (query, type, userRole, courseId) => {
  let baseQuery = `
    SELECT 
      'course' as type, id, name as title, description, NULL as course_id,
      ts_rank(to_tsvector('english', name || ' ' || COALESCE(description, '')), plainto_tsquery('english', $1)) as rank
    FROM courses 
    WHERE to_tsvector('english', name || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', $1)
  `;
  
  // Add role-based filtering
  if (userRole === 'siswa') {
    baseQuery += ` AND id IN (SELECT course_id FROM course_enrollments WHERE user_id = ${req.user.id})`;
  }
  
  // Add more UNION clauses for materials and assignments
  // Add type filtering if specified
  // Add course filtering if specified
  
  return baseQuery + ` ORDER BY rank DESC LIMIT $2 OFFSET $3`;
};
```

### List of Tasks to be Completed

```yaml
Task 1: Complete Analytics Controller Implementation
ENHANCE src/controllers/analytics.controller.js:
  - Implement real data aggregation for getDashboardAnalytics
  - Add role-specific filtering for getCourseAnalytics
  - Implement getAssignmentAnalytics with performance metrics
  - Add getStudentLearningInsights with progress calculations
  - Implement exportAnalyticsData with PDF/Excel generation

CREATE src/services/analytics.service.js:
  - Data aggregation utilities
  - Performance calculation algorithms
  - Report generation logic
  - Caching mechanisms

Task 2: Complete Grading Controller Implementation
ENHANCE src/controllers/grading.controller.js:
  - Implement rubric-based grade calculation
  - Add bulk grading operations
  - Implement grade export functionality
  - Add grade statistics calculations
  - Implement auto-grading for quiz assignments

CREATE src/services/grading.service.js:
  - Rubric calculation algorithms
  - Grade distribution analytics
  - Export formatting utilities
  - Performance optimization

Task 3: Complete Search Controller Implementation
ENHANCE src/controllers/search.controller.js:
  - Implement PostgreSQL full-text search
  - Add search ranking and relevance scoring
  - Implement search suggestions and autocomplete
  - Add search analytics and popular terms
  - Implement advanced search with multiple filters

CREATE src/services/search.service.js:
  - Search query building utilities
  - Result ranking algorithms
  - Search caching mechanisms
  - Performance optimization

Task 4: Complete Material Controller Implementation
ENHANCE src/controllers/material.controller.js:
  - Implement file upload validation and processing
  - Add rich text content handling
  - Implement video URL validation
  - Add material search and filtering
  - Implement material analytics

CREATE src/services/material.service.js:
  - File processing utilities
  - Content validation and sanitization
  - Video URL validation
  - Storage management

Task 5: Complete User Statistics Controller Implementation
ENHANCE src/controllers/userStats.controller.js:
  - Implement progress tracking calculations
  - Add performance metrics aggregation
  - Implement learning analytics
  - Add goal tracking and recommendations

CREATE src/services/userStats.service.js:
  - Progress calculation algorithms
  - Performance analytics
  - Recommendation engine
  - Data aggregation utilities

Task 6: Implement Export Services
CREATE src/services/export.service.js:
  - PDF report generation using pdf-lib
  - Excel export using xlsx
  - Report formatting and styling
  - Template management

CREATE src/controllers/export.controller.js:
  - Grade report exports
  - Analytics report exports
  - Student progress reports
  - Course performance reports

Task 7: Performance Optimization
ENHANCE existing models:
  - Add database query optimization
  - Implement result caching
  - Add connection pooling optimization
  - Implement query result pagination

CREATE src/services/cache.service.js:
  - Redis caching implementation
  - Cache invalidation strategies
  - Performance monitoring

Task 8: Integration and Testing
CREATE tests/ directory structure:
  - Unit tests for all controllers
  - Integration tests for API endpoints
  - Performance tests for database queries
  - Security tests for RBAC implementation

ENHANCE existing validation:
  - Add comprehensive input sanitization
  - Implement rate limiting per endpoint
  - Add request/response logging
  - Implement API versioning
```

### Integration Points
```yaml
ENVIRONMENT_UPDATES:
  - Redis connection for caching
  - File storage configuration (local vs cloud)
  - Email service configuration
  - Export service configuration

DEPENDENCY_ADDITIONS:
  - pdf-lib: PDF generation
  - xlsx: Excel export
  - redis: Caching layer
  - nodemailer: Email notifications
  - sharp: Image processing (already installed)

PERFORMANCE_MONITORING:
  - Query execution time logging
  - API response time monitoring
  - Cache hit rate tracking
  - Error rate monitoring
```

## Validation Loop

### Level 1: Controller Implementation Validation
```bash
# Test individual controller methods
npm test -- --grep "Analytics Controller"
npm test -- --grep "Grading Controller"
npm test -- --grep "Search Controller"

# Expected: All controller methods return proper responses
```

### Level 2: Integration Testing
```bash
# Test complete API workflows
npm test -- --grep "Integration"

# Test with real database operations
# Verify RBAC enforcement
# Check performance benchmarks
```

### Level 3: Performance Testing
```bash
# Load test key endpoints
# Measure database query performance
# Verify caching effectiveness
# Check memory usage under load
```

## Final Validation Checklist
- [ ] All controller methods implement real business logic
- [ ] Database queries are optimized with proper indexes
- [ ] Role-based access control works correctly
- [ ] Export functionality generates proper PDF/Excel files
- [ ] Search returns relevant results quickly (<300ms)
- [ ] Analytics calculations are accurate
- [ ] File upload handling is secure and efficient
- [ ] Error handling is comprehensive
- [ ] Input validation prevents security vulnerabilities
- [ ] Performance benchmarks meet requirements (<300ms response time)

---

## Anti-Patterns to Avoid
- ❌ Don't implement controller stubs that return empty responses
- ❌ Don't ignore existing RBAC middleware - it's already working
- ❌ Don't rebuild the route structure - it's already comprehensive
- ❌ Don't ignore the existing database schema - it's well designed
- ❌ Don't implement synchronous operations in controllers
- ❌ Don't skip input validation - use existing Joi patterns
- ❌ Don't ignore existing error handling patterns
- ❌ Don't implement without proper database transactions

## Confidence Score: 8.5/10

High confidence due to:
- Solid foundation with complete route structure and RBAC
- Well-designed database schema with proper relationships
- Existing patterns to follow for implementation
- Clear separation of concerns in current architecture
- Comprehensive validation and security already in place

Minor uncertainty on:
- Specific performance requirements for analytics calculations
- Exact export format requirements
- Integration complexity with frontend expectations