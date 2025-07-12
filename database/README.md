# LMS Database Setup Guide

This guide explains how to set up the database for the LMS project, both for development with teammates and for production.

## Quick Setup (Recommended for Development)

For development with your friend, use the **single consolidated script** approach:

```bash
# Make sure PostgreSQL is running
# Then run the setup script
./database/setup.sh development
```

This will:
- Create a fresh database named `lms_development`
- Run the complete schema initialization
- Insert test data with default admin/teacher/student accounts

## Manual Setup

If you prefer manual setup:

```bash
# Create database
createdb lms_development

# Run the complete initialization script
psql -d lms_development -f database/init_complete.sql
```

## Init vs Migration Approach

### 🟢 Init Approach (Current - Good for Development)
- **File**: `init_complete.sql`
- **Use case**: Development, new setups, team collaboration
- **Pros**: 
  - Single file to run
  - No confusion about order
  - Fresh start every time
  - Easy for new team members
- **Cons**: 
  - Destroys existing data
  - Not suitable for production updates

### 🟡 Migration Approach (Future - Good for Production)
- **Files**: `migrations/001_*.sql`, `migrations/002_*.sql`, etc.
- **Use case**: Production, incremental updates, preserving data
- **Pros**: 
  - Preserves existing data
  - Version controlled changes
  - Can rollback changes
  - Production safe
- **Cons**: 
  - More complex setup
  - Must run in correct order
  - Can be confusing for new developers

## File Structure

```
database/
├── init_complete.sql        # 🎯 USE THIS - Complete schema setup
├── setup.sh                 # 🎯 USE THIS - Automated setup script
├── README.md                # This file
├── migrations/              # 📁 Future production migrations
│   ├── 001_add_rbac_security_tables.sql
│   ├── 002_add_search_indexes.sql
│   └── 003_add_analytics_tables.sql
└── old_files/              # 📁 Legacy files (moved for reference)
    ├── init.sql            # Original init script
    ├── grading_enhancement.sql
    ├── rbac_enhancement.sql
    └── ...
```

## What's Included in the Complete Schema

The `init_complete.sql` includes everything your LMS needs:

### Core Tables
- ✅ `users` - Admin, teachers (guru), students (siswa) with RBAC
- ✅ `courses` - Course management with teacher assignment
- ✅ `course_enrollments` - Student enrollment with status tracking
- ✅ `materials` - Rich content materials with file uploads
- ✅ `assignments` - Essays, quizzes, file uploads with due dates
- ✅ `assignment_submissions` - Student submissions with grading

### Enhanced Features
- ✅ `grading_rubrics` - Detailed rubric-based grading
- ✅ `grading_details` - Comprehensive grading breakdown
- ✅ `user_sessions` - Session timeout management
- ✅ `failed_login_attempts` - Account lockout security
- ✅ `activity_logs` - Audit trail for user actions
- ✅ `user_statistics` - Student progress tracking
- ✅ `course_analytics` - Course performance metrics
- ✅ `system_analytics` - System-wide usage analytics

### Performance & Search
- ✅ **Indexes** - Optimized for fast queries
- ✅ **Full-text Search** - PostgreSQL search across all content
- ✅ **Triggers** - Automatic timestamp updates
- ✅ **Functions** - Grade calculation and session cleanup
- ✅ **Views** - Pre-built analytics queries

## Default Test Accounts

After setup, you can login with these accounts:

| Role    | Email               | Password   |
|---------|---------------------|------------|
| Admin   | admin@example.com   | adminadmin |
| Teacher | teacher@example.com | adminadmin |
| Student | student@example.com | adminadmin |

## Environment Variables

Make sure your `.env` file has these database settings:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lms_development
DB_USER=postgres
DB_PASSWORD=your_password

# For production
DB_SSL=false
```

## For Your Friend

Tell your friend to simply run:

```bash
git pull
./database/setup.sh development
npm install
npm run dev
```

That's it! No confusion about which SQL files to run or in what order.

## Troubleshooting

### "Database exists" error
```bash
# Drop and recreate
./database/setup.sh development
```

### Permission denied on setup.sh
```bash
chmod +x database/setup.sh
```

### PostgreSQL not running
```bash
# macOS with Homebrew
brew services start postgresql

# Ubuntu/Debian
sudo systemctl start postgresql

# Windows
# Start PostgreSQL service from Services panel
```

### Connection refused
Check your PostgreSQL configuration:
- Is PostgreSQL running?
- Are the host/port correct?
- Is the user allowed to connect?

## Production Migration (Future)

When you're ready for production, you'll switch to the migration approach:

1. Create migration files for new features
2. Run migrations in sequence
3. Use tools like `node-pg-migrate` or `sequelize` for automation

But for now, the consolidated init approach is perfect for development! 🚀