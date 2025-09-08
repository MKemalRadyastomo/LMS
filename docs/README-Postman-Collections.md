# LMS Backend API - Documentation & Postman Collections

This directory contains comprehensive API documentation, Postman collections, and environment configurations for testing and interacting with the Enhanced LMS Backend API.

## 📁 File Structure

### 📚 API Documentation
- **`API-Reference.md`** - Complete API reference with all endpoints, examples, and authentication details

### 🧪 Postman Collections
- **`LMS-API-Enhanced.postman_collection.json`** - Main collection with all API endpoints organized by feature
- **`LMS-Test-Workflows.postman_collection.json`** - Test workflows and user journey scenarios

### 🔧 Environment Files
- **`LMS-Development.postman_environment.json`** - Development environment configuration
- **`LMS-Production.postman_environment.json`** - Production environment configuration

## 🚀 Quick Start Guide

### 1. Import Collections
1. Open Postman
2. Import both collection files and environment files
3. Select the appropriate environment (Development or Production)

### 2. Authentication Setup
1. Run the **Login** request in the "🔐 Authentication & Security" folder
2. The JWT token will be automatically stored in environment variables
3. All subsequent requests will use this token automatically

### 3. Test Complete Workflows
Use the **Test Workflows** collection for end-to-end testing scenarios:
- Admin user management
- Teacher course creation and management  
- Student enrollment and assignment submission
- Grading and analytics workflows

## 🔐 Authentication & Roles

The API uses JWT tokens with three role levels:
- **`admin`** - Full system access
- **`guru`** - Teacher/instructor capabilities  
- **`siswa`** - Student access and submissions

### Default Test Users
**Development Environment:**
- Admin: `admin@example.com` / `adminadmin`
- Teacher: `teacher@example.com` / `teacher123`
- Student: `student@example.com` / `student123`

## 📋 API Features Covered

### Core Features
- ✅ **Authentication & Authorization** - JWT with RBAC
- ✅ **User Management** - Profile, settings, statistics
- ✅ **Course Management** - CRUD, enrollment, analytics
- ✅ **Assignment System** - Multiple types (essay, quiz, file upload)
- ✅ **Submission & Grading** - Student submissions with rubric grading
- ✅ **Content Management** - Course materials and resources
- ✅ **Search & Discovery** - Global and filtered search
- ✅ **Analytics & Reporting** - Course, user, and system analytics
- ✅ **Notifications** - System notifications and alerts

### Advanced Features  
- ✅ **Assignment Templates** - Reusable assignment configurations
- ✅ **Bulk Operations** - Mass enrollment and content management
- ✅ **File Upload Handling** - Secure file management with validation
- ✅ **Rate Limiting & Security** - Protection against abuse
- ✅ **Activity Logging** - Comprehensive audit trails

## 🎯 Testing Workflows

### Complete Teacher Workflow
Run the **"🎯 Complete Teacher Workflow"** folder in sequence:
1. **Login as Teacher** - Authenticates and sets teacher token
2. **Create Course** - Creates a new course and saves course ID
3. **Create Course Material** - Adds course content
4. **Create Quiz Assignment** - Creates quiz with multiple question types
5. **Create Essay Assignment** - Creates essay assignment with word limit

### Complete Student Workflow
Run the **"🎓 Complete Student Workflow"** folder in sequence:
1. **Login as Student** - Authenticates student
2. **Enroll in Course** - Uses enrollment code to join course
3. **View Course Materials** - Accesses course content
4. **Submit Quiz** - Submits quiz answers
5. **Submit Essay** - Submits essay assignment

### Teacher Grading Workflow
Run the **"✅ Teacher Grading Workflow"** folder in sequence:
1. **Auto-Grade Quiz** - Automatically grades quiz submission
2. **Grade Essay with Rubric** - Manually grades essay using rubric
3. **View Course Analytics** - Reviews course performance data

## 🛠️ Environment Variables

The environments include all necessary variables for testing:

### Development Environment
- `baseUrl`: `http://localhost:3000`
- Test user credentials (admin, teacher, student)
- All feature-specific variables (courseId, assignmentId, etc.)
- System configuration values

### Production Environment
- `baseUrl`: Update to your production API URL
- Production-safe credentials
- Same variable structure as development

## 🔄 CI/CD Integration

### Newman (Postman CLI)
Run collections via command line:

```bash
# Install Newman
npm install -g newman

# Run main collection
newman run LMS-API-Enhanced.postman_collection.json \
  -e LMS-Development.postman_environment.json \
  --reporters cli,json

# Run test workflows
newman run LMS-Test-Workflows.postman_collection.json \
  -e LMS-Development.postman_environment.json \
  --bail
```

## 🛠️ Troubleshooting

### Common Issues

1. **Authentication Failed (401)**
   - Re-run login request 
   - Check if token expired (30 min limit)

2. **Access Denied (403)**
   - Verify user role permissions
   - Check if using correct user token for endpoint

3. **Environment Variables Missing**
   - Ensure correct environment is selected
   - Re-import environment file if needed

### Debug Tips
- Enable Postman Console (View → Show Postman Console)
- Check Tests tab for validation results
- Verify variables in Environment tab

## 📞 Support

For issues with:
- **API Functionality**: Check `API-Reference.md`
- **Collection Issues**: Review this README
- **Environment Setup**: Verify variable configuration

## 🎉 Success Metrics

A fully functional setup should achieve:
- ✅ All workflow tests passing
- ✅ RBAC security validations passing  
- ✅ File uploads working correctly
- ✅ Search functionality returning results
- ✅ Analytics data displaying properly

**Happy Testing! 🚀**