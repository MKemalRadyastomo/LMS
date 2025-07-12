# LMS Backend API - Postman Collections & Documentation

This directory contains comprehensive Postman collections, environments, and documentation for testing and interacting with the Enhanced LMS Backend API.

## 📁 Files Overview

### Postman Collections

1. **`LMS-API-Enhanced.postman_collection.json`** - Main API Collection

   - Complete enhanced API endpoints
   - RBAC-protected routes
   - Advanced assignments (essays, quizzes, file uploads)
   - Grading system with rubrics
   - Analytics and reporting
   - Search functionality
   - Security features

2. **`LMS-Test-Workflows.postman_collection.json`** - Test Workflows
   - Complete user journey tests
   - Teacher workflow (course creation to grading)
   - Student workflow (enrollment to submission)
   - Security and RBAC testing
   - Performance validation tests

### Environment Files

3. **`LMS-Development.postman_environment.json`** - Development Environment

   - Local development server configuration
   - Test user credentials
   - Development-specific variables

4. **`LMS-Production.postman_environment.json`** - Production Environment
   - Production server configuration
   - Production environment variables
   - Security-focused settings

### Documentation

5. **`API-Documentation.md`** - Complete API Documentation

   - Comprehensive endpoint reference
   - Authentication and authorization guide
   - Request/response examples
   - Error handling
   - Security guidelines

6. **`README-Postman-Collections.md`** - This file
   - Setup and usage instructions
   - Collection organization
   - Testing workflows

## 🚀 Quick Start Guide

### 1. Import Collections and Environments

**In Postman:**

1. **Import Collections:**

   - File → Import
   - Select `LMS-API-Enhanced.postman_collection.json`
   - Select `LMS-Test-Workflows.postman_collection.json`

2. **Import Environments:**

   - Environment selector (top right) → Import
   - Select `LMS-Development.postman_environment.json`
   - Select `LMS-Production.postman_environment.json`

3. **Select Environment:**
   - Choose "LMS Development Environment" for local testing
   - Choose "LMS Production Environment" for production testing

### 2. Environment Setup

**Development Environment Variables:**

```
baseUrl: http://localhost:3000
adminEmail: admin@example.com
adminPassword: adminadmin
teacherEmail: teacher@example.com
teacherPassword: teacher123
studentEmail: student@example.com
studentPassword: student123
```

**Production Environment:**

- Update `baseUrl` to your production API URL
- Update email/password variables for production test accounts
- Ensure all secrets are properly configured

### 3. Basic Authentication Flow

1. **Login as Admin:**

   - Navigate to: `🔐 Authentication & Security → Login`
   - Use admin credentials
   - Token automatically saved to environment

2. **Login as Teacher:**

   - Navigate to: `🔐 Authentication & Security → Login as Teacher`
   - Use teacher credentials
   - Teacher token saved separately

3. **Login as Student:**
   - Navigate to: `🔐 Authentication & Security → Login as Student`
   - Use student credentials
   - Student token saved separately

## 🎯 Testing Workflows

### Complete Teacher Workflow

Run the **"🎯 Complete Teacher Workflow"** folder in sequence:

1. **Login as Teacher** - Authenticates and sets teacher token
2. **Create Course** - Creates a new course and saves course ID
3. **Generate Enrollment Code** - Creates student enrollment code
4. **Create Course Material** - Adds rich text material with video
5. **Create Quiz Assignment** - Creates quiz with multiple question types
6. **Create Essay Assignment** - Creates essay assignment with word limit
7. **Create Grading Rubric** - Sets up rubric for essay grading

**Expected Results:**

- All requests return 2xx status codes
- Environment variables populated with IDs
- Course ready for student enrollment

### Complete Student Workflow

Run the **"🎓 Complete Student Workflow"** folder in sequence:

1. **Login as Student** - Authenticates student
2. **Self-Enroll in Course** - Uses enrollment code to join course
3. **View Course Materials** - Accesses course content
4. **Submit Quiz** - Submits quiz answers
5. **Submit Essay** - Submits essay assignment
6. **View My Progress** - Checks progress analytics

**Expected Results:**

- Student successfully enrolled and can access content
- Submissions created with proper status
- Progress tracking functional

### Teacher Grading Workflow

Run the **"✅ Teacher Grading Workflow"** folder in sequence:

1. **Auto-Grade Quiz** - Automatically grades quiz submission
2. **Grade Essay with Rubric** - Manually grades essay using rubric
3. **View Course Analytics** - Reviews course performance data
4. **Export Grade Report** - Generates PDF grade report

**Expected Results:**

- Quiz automatically graded based on correct answers
- Essay graded with detailed rubric scores
- Analytics show updated grade data
- PDF report generated successfully

## 🧪 Comprehensive Testing

### Run All Test Workflows

To test the complete system:

1. **Run "🎯 Complete Teacher Workflow"** - Sets up test data
2. **Run "🎓 Complete Student Workflow"** - Tests student features
3. **Run "✅ Teacher Grading Workflow"** - Tests grading system
4. **Run "🔍 Search & Discovery Tests"** - Tests search functionality
5. **Run "🔒 Security & RBAC Tests"** - Validates security measures
6. **Run "⚡ Performance & Validation Tests"** - Checks system health

### Individual Feature Testing

**Course Management:**

- Navigate to: `📚 Course Management`
- Test course CRUD operations
- Test enrollment code generation

**Advanced Assignments:**

- Navigate to: `📝 Advanced Assignments`
- Test essay, quiz, and file upload assignments
- Verify question types and restrictions

**Grading System:**

- Navigate to: `📊 Grading & Rubrics`
- Test rubric creation and grading
- Test auto-grading and bulk operations

**Search Features:**

- Navigate to: `🔍 Search & Discovery`
- Test global search across content types
- Test search suggestions and filters

**Analytics:**

- Navigate to: `📈 Analytics & Reports`
- Test role-specific analytics
- Test report generation and export

## 🔐 Security Testing

### RBAC Validation

The **"🔒 Security & RBAC Tests"** folder validates:

1. **Unauthorized Access** - Ensures endpoints require authentication
2. **Role Restrictions** - Students cannot access admin endpoints
3. **Permission Boundaries** - Students cannot grade submissions
4. **Account Security** - Tests account lockout and security features

### Security Best Practices

- **Token Management**: Tokens automatically expire after 30 minutes
- **Role Validation**: Each endpoint validates user roles
- **Input Validation**: All inputs validated for security
- **Rate Limiting**: API calls are rate-limited to prevent abuse

## 📊 API Endpoint Coverage

### Main Collection Organization

```
🔐 Authentication & Security (5 endpoints)
├── Login flows for all user types
├── Password management
├── Account status checking
└── Security validation

👥 User Management (6 endpoints)
├── CRUD operations for users
├── Profile picture upload
└── User statistics

📚 Course Management (6 endpoints)
├── Course lifecycle management
├── Enrollment code generation
└── Course analytics

📄 Materials Management (6 endpoints)
├── Rich text content creation
├── File upload handling
└── Video URL embedding

📝 Advanced Assignments (6 endpoints)
├── Essay assignments with word limits
├── Quiz assignments with multiple question types
└── File upload assignments with restrictions

✍️ Student Submissions (6 endpoints)
├── Multi-type submissions (text, quiz, file)
├── Draft saving capability
└── Submission history tracking

📊 Grading & Rubrics (6 endpoints)
├── Rubric creation and management
├── Manual and automatic grading
└── Bulk operations and export

👥 Enrollment Management (5 endpoints)
├── Manual and self-enrollment
├── Bulk enrollment via CSV
└── Enrollment status management

🔍 Search & Discovery (4 endpoints)
├── Global search across content
├── Search suggestions
└── Advanced filtering

📈 Analytics & Reports (6 endpoints)
├── Role-specific dashboards
├── Progress tracking
└── Performance analytics

🔒 Security & Admin (5 endpoints)
├── Account management
├── Security monitoring
└── System health checks
```

**Total: 61 Enhanced API Endpoints**

## 🛠️ Troubleshooting

### Common Issues

1. **Authentication Failed (401)**

   - Check if you're logged in
   - Verify token hasn't expired (30 min limit)
   - Re-run login request

2. **Access Denied (403)**

   - Verify user role permissions
   - Check if using correct user token for endpoint
   - Admin/Teacher required for management operations

3. **Validation Errors (400)**

   - Check request body format
   - Verify required fields are included
   - Check data types match API requirements

4. **Environment Variables Missing**
   - Ensure correct environment is selected
   - Re-import environment file if needed
   - Check variable names match collection references

### Debug Tips

1. **Enable Console Logging:**

   - View → Show Postman Console
   - Monitor request/response details

2. **Check Test Results:**

   - Tests tab shows validation results
   - Console shows detailed error messages

3. **Variable Inspection:**
   - Environment tab shows current values
   - Verify IDs are properly saved between requests

## 📝 Customization

### Adding Custom Tests

Add custom test scripts in the **Tests** tab of any request:

```javascript
pm.test("Custom validation", function () {
  const responseJson = pm.response.json();
  pm.expect(responseJson.data).to.have.property("customField");
});
```

### Environment Variables

Add custom environment variables for your specific setup:

```json
{
  "key": "customBaseUrl",
  "value": "https://your-api.com",
  "type": "default"
}
```

### Collection Variables

Override default values by setting collection variables:

1. Collection → Variables tab
2. Add/modify variables as needed
3. Variables scope: Collection > Environment > Global

## 📈 Performance Monitoring

### Response Time Tracking

Global tests automatically track:

- Response times (should be < 5000ms)
- Content type validation
- Basic error checking

### Load Testing

For load testing:

1. Use Postman Runner with iterations
2. Monitor server logs during high load
3. Check rate limiting behavior
4. Validate database performance

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

### GitHub Actions Example

```yaml
name: API Tests
on: [push, pull_request]

jobs:
  api-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install Newman
        run: npm install -g newman
      - name: Run API Tests
        run: |
          newman run docs/LMS-Test-Workflows.postman_collection.json \
            -e docs/LMS-Development.postman_environment.json \
            --bail
```

## 📞 Support

For issues with:

- **API Functionality**: Check API-Documentation.md
- **Collection Issues**: Review this README
- **Environment Setup**: Verify variable configuration
- **Test Failures**: Check troubleshooting section

## 🎉 Success Metrics

A fully functional setup should achieve:

- ✅ All workflow tests passing
- ✅ RBAC security validations passing
- ✅ File uploads working correctly
- ✅ Search functionality returning results
- ✅ Analytics data displaying properly
- ✅ Grade exports generating successfully

**Happy Testing! 🚀**
