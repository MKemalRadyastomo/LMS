# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm test` - Run all tests with Jest
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### Database
- Initialize database: `psql -d your_database -f database/init_complete.sql`
- Create test data: `psql -d your_database -f database/create_test_data.sql`
- Full setup: `psql -d your_database -f database/init_complete.sql && psql -d your_database -f database/create_test_data.sql`

### Testing
- Run single test: `npm test -- --testNamePattern="test name"`
- Run tests for specific file: `npm test auth.test.js`

## Architecture Overview

This is a Node.js/Express REST API for a Learning Management System with PostgreSQL database.

### Core Architecture Patterns

**MVC Pattern with Service Layer:**
- **Controllers** (`src/controllers/`) - Handle HTTP requests/responses
- **Services** (`src/services/`) - Business logic layer 
- **Models** (`src/models/`) - Database operations
- **Routes** (`src/routes/`) - API endpoint definitions

**Authentication & Authorization:**
- JWT-based authentication with session management
- Role-based access control (RBAC) with three roles: `admin`, `guru`, `siswa`
- Enhanced middleware in `src/middleware/rbac.js` with permission-based authorization
- Session timeout and account lockout features
- Activity logging and failed login attempt tracking

**Key Architectural Components:**

1. **Route Ordering in `src/routes/index.js`:**
   - Specific routes with parameters must come BEFORE general routes
   - Example: `/courses/:courseId/assignments` before `/courses`

2. **Dual Middleware System:**
   - Legacy auth middleware in `src/middleware/auth.js` (backward compatibility)
   - Enhanced RBAC middleware in `src/middleware/rbac.js` (recommended for new code)

3. **Database Management:**
   - PostgreSQL with connection pooling via `src/config/db.js`
   - Complete schema initialization via `database/init_complete.sql`
   - Comprehensive test data via `database/create_test_data.sql`

4. **Error Handling:**
   - Centralized error handling via `src/middleware/error.js`
   - Custom ApiError class in `src/utils/ApiError.js`
   - Winston logging to `logs/` directory

5. **Security Features:**
   - Rate limiting via `src/middleware/rateLimiter.js`
   - File upload handling with validation
   - Request timeout middleware
   - Helmet for security headers

### Permission System
```javascript
// Role permissions defined in src/middleware/rbac.js
admin: ['*'] // All permissions
guru: ['course:*', 'assignment:*', 'material:*', 'grade:*', 'analytics:read']
siswa: ['course:read', 'assignment:read', 'assignment:submit', 'material:read', 'grade:read']
```

### Database Schema
- Users with role-based access (`admin`, `guru`, `siswa`)
- Courses with enrollment system
- Assignments with submissions and grading
- Course materials and content management
- Analytics and user statistics tables
- Security tables for sessions, failed attempts, and activity logs

### File Structure Conventions
- All business logic in services layer
- Database queries in models layer
- Validation schemas in `src/middleware/validation/`
- Static files served from `public/` directory
- Course materials stored in `public/course_materials/`

### Testing Setup
- Jest configuration with global setup/teardown
- Test database isolation with single worker
- Global test utilities in `tests/setup.js`
- 20-second timeout for database operations

### Environment Configuration
Key environment variables managed via `src/config/config.js`:
- Database connection settings
- JWT configuration  
- Rate limiting settings
- Session timeout and security settings