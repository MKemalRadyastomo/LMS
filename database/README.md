# LMS Database Setup Guide

This guide explains how to set up the database for the LMS project with the simplified, consolidated approach.

## Quick Setup (Recommended)

The database has been streamlined to use only 2 SQL files for easy setup:

```bash
# Create your PostgreSQL database
createdb lms_development

# Initialize complete schema
psql -d lms_development -f database/init_complete.sql

# Load comprehensive test data
psql -d lms_development -f database/create_test_data.sql

# Or run both commands together
psql -d lms_development -f database/init_complete.sql && psql -d lms_development -f database/create_test_data.sql
```

## What's Included

### 🗄️ **File Structure**
```
database/
├── init_complete.sql        # 🎯 Complete database schema
├── create_test_data.sql     # 🎯 Comprehensive test data  
└── README.md                # This documentation
```

### 📊 **Complete Database Schema** (`init_complete.sql`)

**Core Tables:**
- ✅ `users` - Role-based users (admin, guru, siswa) 
- ✅ `courses` - Course management with status tracking
- ✅ `course_enrollments` - Student enrollment management
- ✅ `materials` - Rich course materials with file support
- ✅ `assignments` - Multi-type assignments (essay, quiz, file upload, mixed)
- ✅ `assignment_submissions` - Student submissions with versioning
- ✅ `grading_rubrics` - Detailed rubric-based grading system

**Enhanced Features:**
- ✅ `assignment_templates` - Reusable assignment templates
- ✅ `notifications` - Comprehensive notification system
- ✅ `notification_preferences` - User notification settings
- ✅ `user_statistics` - Learning analytics and gamification
- ✅ `course_analytics` - Course performance metrics
- ✅ `system_analytics` - System-wide usage tracking
- ✅ `activity_logs` - Complete audit trail
- ✅ `user_sessions` - Session management
- ✅ `failed_login_attempts` - Security lockout system

**Performance & Search:**
- ✅ **Full-text search indexes** across all content
- ✅ **Optimized indexes** for fast queries
- ✅ **Database functions** for automated calculations
- ✅ **Triggers** for timestamp and analytics updates
- ✅ **Views** for complex analytics queries

### 🧪 **Comprehensive Test Data** (`create_test_data.sql`)

**Test Users (18 total):**
- **2 Admins** - System administrators
- **4 Teachers (Guru)** - Course instructors  
- **12 Students (Siswa)** - Enrolled learners

**Rich Test Content:**
- **7 Courses** - Various subjects and statuses
- **4 Assignment Templates** - Reusable templates
- **11+ Assignments** - Different types and complexity
- **Course Materials** - PDFs, videos, documents
- **Student Enrollments** - Realistic enrollment patterns
- **Assignment Submissions** - Sample student work with grades
- **Grading Rubrics** - Detailed assessment criteria
- **Notifications** - System and user notifications
- **Activity Logs** - User interaction history
- **Analytics Data** - Course and user statistics

## 🔐 **Default Login Credentials**

**All test accounts use the same password: `password123`**

| Role | Email Examples | Password |
|------|----------------|----------|
| **Admin** | admin@lms.edu<br>admin.system@lms.edu | password123 |
| **Teachers** | teacher.math@lms.edu<br>teacher.science@lms.edu<br>teacher.english@lms.edu<br>teacher.history@lms.edu | password123 |
| **Students** | student1@lms.edu<br>student2@lms.edu<br>...<br>student12@lms.edu | password123 |

## 🔧 **Environment Configuration**

Ensure your `.env` file contains:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lms_development
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# JWT Configuration  
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=30m

# Development settings
NODE_ENV=development
PORT=3000
```

## 🚀 **Complete Development Setup**

For new team members or fresh setup:

```bash
# 1. Clone repository
git clone your-repo-url
cd lms-backend

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your database credentials

# 4. Create PostgreSQL database
createdb lms_development

# 5. Initialize database schema
psql -d lms_development -f database/init_complete.sql

# 6. Load test data
psql -d lms_development -f database/create_test_data.sql

# 7. Start development server
npm run dev

# 8. Run tests (optional)
npm test
```

## 📋 **Verification Commands**

After setup, verify everything is working:

```sql
-- Check user counts by role
SELECT role, COUNT(*) FROM users GROUP BY role;

-- Check course enrollment summary  
SELECT c.name, COUNT(ce.id) as enrollments 
FROM courses c 
LEFT JOIN course_enrollments ce ON c.id = ce.course_id 
GROUP BY c.id, c.name;

-- Check assignment types
SELECT type, COUNT(*) FROM assignments GROUP BY type;

-- Check notification system
SELECT COUNT(*) FROM notifications;
```

Expected results:
- **Users**: 2 admin, 4 guru, 12 siswa
- **Courses**: 7 courses with varying enrollment
- **Assignments**: Multiple types (essay, quiz, file_upload, mixed)
- **Notifications**: Sample notifications loaded

## 🛠️ **Troubleshooting**

### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready

# macOS with Homebrew
brew services start postgresql

# Ubuntu/Debian  
sudo systemctl start postgresql
```

### Permission Issues
```bash
# Grant permissions to your user
sudo -u postgres createuser --interactive your_username
```

### Schema Issues
```bash
# Reset database completely
dropdb lms_development
createdb lms_development
psql -d lms_development -f database/init_complete.sql
psql -d lms_development -f database/create_test_data.sql
```

### Test Data Issues
```bash
# Reload only test data
psql -d lms_development -c "DELETE FROM users WHERE email LIKE '%@lms.edu';"
psql -d lms_development -f database/create_test_data.sql
```

## 🎯 **Key Benefits of This Approach**

- ✅ **Simple Setup** - Only 2 files to run
- ✅ **No Migration Complexity** - Single initialization
- ✅ **Complete Feature Set** - All enhancements included
- ✅ **Realistic Test Data** - Comprehensive scenarios
- ✅ **Consistent Passwords** - Easy testing with `password123`
- ✅ **Fresh Start** - Clean database every time
- ✅ **Team Friendly** - Easy for new developers
- ✅ **Production Ready** - Complete schema with optimizations

## 📈 **What's Next?**

After setup, you can:

1. **Test the API** using the Postman collection in `/docs`
2. **Login** with any test account using `password123`
3. **Explore Features** - courses, assignments, notifications
4. **Run Tests** with `npm test`
5. **Start Development** - all tables and test data ready!

**Your LMS database is now ready for development! 🚀**