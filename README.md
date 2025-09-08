# LMS Backend API

A comprehensive RESTful API for an Online Learning Management System built with Express.js and PostgreSQL. This system provides complete functionality for educational institutions including course management, assignment handling, user authentication, and analytics.

## 🚀 Features

### Core Features
- **Authentication & Authorization** - JWT-based with role-based access control (RBAC)
- **User Management** - Admin, teacher, and student account management
- **Course Management** - Complete CRUD operations with enrollment system
- **Assignment System** - Multiple assignment types (essay, quiz, file upload)
- **Submission & Grading** - Student submissions with rubric-based grading
- **Content Management** - Course materials and resource management
- **Analytics & Reporting** - Course performance and user statistics
- **Search Functionality** - Global search across courses and content

### Security Features
- JWT token authentication with session management
- Role-based permissions (admin, guru/teacher, siswa/student)
- Rate limiting and request validation
- File upload security with type validation
- Activity logging and audit trails
- Account lockout protection

### Advanced Features
- WebSocket real-time notifications
- Bulk operations for mass enrollment
- Assignment templates and reusable configurations
- Excel/PDF export functionality
- Image processing for course materials

## 🛠 Prerequisites

- **Node.js** (v16 or higher)
- **PostgreSQL** (v12 or higher)
- **npm** or **yarn** package manager

## ⚡ Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd lms-backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup

#### Create PostgreSQL Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE test_project;

# Create user (optional)
CREATE USER lms_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE test_project TO lms_user;

# Exit psql
\q
```

#### Initialize Database Schema & Data
```bash
# Initialize complete database schema
psql -d test_project -f database/init_complete.sql

# Create test data (includes sample users, courses, and assignments)
psql -d test_project -f database/create_test_data.sql

# Or run both commands together
psql -d test_project -f database/init_complete.sql && psql -d test_project -f database/create_test_data.sql
```

### 4. Environment Configuration
```bash
# Copy the .env file (already exists in project)
cp .env .env.local  # Optional: create a local copy

# Edit .env with your database configuration
```

**Key Environment Variables:**
```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password123
DB_NAME=test_project

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRATION=1d
JWT_SESSION_TIMEOUT=30m

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 5. Start the Application
```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 🧪 API Testing with Postman

### Import Collections
1. Open Postman
2. Import the following files from the `docs/` directory:
   - `LMS-API-Enhanced.postman_collection.json` - Main API collection
   - `LMS-Test-Workflows.postman_collection.json` - End-to-end test workflows
   - `LMS-Development.postman_environment.json` - Development environment
   - `LMS-Production.postman_environment.json` - Production environment

### Default Test Accounts
After running the test data script, you can use these accounts:

```bash
# Admin Account
Email: admin@example.com
Password: adminadmin

# Teacher Account
Email: teacher@example.com
Password: teacher123

# Student Account
Email: student@example.com
Password: student123
```

### Quick Testing Workflow
1. **Authentication**: Run the login request to get JWT token
2. **Teacher Workflow**: Create courses, assignments, and materials
3. **Student Workflow**: Enroll in courses and submit assignments
4. **Admin Workflow**: Manage users and system settings

For detailed API documentation, see `docs/README-Postman-Collections.md`

## 📚 Project Structure

```
lms-backend/
├── src/
│   ├── config/           # Configuration files (database, JWT, etc.)
│   ├── controllers/      # Route handlers (auth, courses, users, etc.)
│   ├── middleware/       # Express middleware (auth, validation, RBAC)
│   ├── models/          # Database models and queries
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic layer
│   ├── utils/           # Utility functions and helpers
│   ├── app.js           # Express application setup
│   └── index.js         # Application entry point
├── database/
│   ├── init_complete.sql    # Complete database schema
│   └── create_test_data.sql # Sample data for testing
├── docs/
│   ├── LMS-API-Enhanced.postman_collection.json
│   ├── LMS-Test-Workflows.postman_collection.json
│   ├── LMS-Development.postman_environment.json
│   └── README-Postman-Collections.md
├── tests/               # Jest test files
├── logs/                # Application logs
└── public/              # Static files and uploads
```

## 🔧 Development Commands

```bash
# Start development server with hot reload
npm run dev

# Start production server
npm start

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate test coverage report
npm run test:coverage

# Database initialization (if needed)
npm run db:init
```

## 🌐 API Endpoints Overview

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh JWT token

### User Management
- `GET /api/users` - List users (admin)
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/statistics` - User statistics

### Course Management
- `GET /api/courses` - List courses
- `POST /api/courses` - Create course (teacher/admin)
- `GET /api/courses/:id` - Get course details
- `PUT /api/courses/:id` - Update course
- `POST /api/courses/:id/enroll` - Enroll in course
- `GET /api/courses/:id/analytics` - Course analytics

### Assignment System
- `GET /api/assignments` - List assignments
- `POST /api/assignments` - Create assignment
- `POST /api/assignments/:id/submit` - Submit assignment
- `POST /api/assignments/:id/grade` - Grade assignment

For complete API documentation, import the Postman collections or refer to `docs/README-Postman-Collections.md`.

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | No |
| `PORT` | Server port | `3000` | No |
| `DB_HOST` | PostgreSQL host | `localhost` | Yes |
| `DB_PORT` | PostgreSQL port | `5432` | Yes |
| `DB_USER` | Database user | `postgres` | Yes |
| `DB_PASSWORD` | Database password | - | Yes |
| `DB_NAME` | Database name | `test_project` | Yes |
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `JWT_EXPIRATION` | JWT token expiration | `1d` | No |
| `JWT_SESSION_TIMEOUT` | Session timeout | `30m` | No |
| `RATE_LIMIT_WINDOW` | Rate limit window (minutes) | `15` | No |
| `RATE_LIMIT_MAX` | Max requests per window | `100` | No |

### Database Configuration
Additional database settings for connection pooling and timeouts:
- `DB_MAX_CONNECTIONS` - Maximum connections (default: 20)
- `DB_MIN_CONNECTIONS` - Minimum connections (default: 2)
- `DB_CONNECTION_TIMEOUT` - Connection timeout in ms (default: 10000)
- `DB_STATEMENT_TIMEOUT` - Statement timeout in ms (default: 30000)

## 🔐 Authentication & Roles

The system uses JWT-based authentication with three user roles:

### Roles & Permissions
- **Admin (`admin`)** - Full system access, user management, system settings
- **Teacher (`guru`)** - Course creation, assignment management, grading, analytics
- **Student (`siswa`)** - Course enrollment, assignment submission, progress tracking

### Security Features
- JWT tokens with configurable expiration
- Session management with timeout
- Rate limiting per IP address
- Request validation and sanitization
- File upload security with type validation
- Activity logging and audit trails

## 🚨 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check PostgreSQL is running
sudo service postgresql status

# Check database exists
psql -U postgres -l | grep test_project

# Re-initialize database if needed
psql -d test_project -f database/init_complete.sql
```

**Authentication Issues**
```bash
# Check JWT_SECRET is set in .env
echo $JWT_SECRET

# Verify test users exist
psql -d test_project -c "SELECT email, role FROM users LIMIT 5;"
```

**Port Already in Use**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or change PORT in .env file
echo "PORT=3001" >> .env
```

### Debug Mode
Enable detailed logging by setting environment variables:
```bash
NODE_ENV=development
DEBUG=app:*
```

## 🧪 Testing

The project includes comprehensive test coverage with Jest:

```bash
# Run all tests
npm test

# Run specific test file
npm test auth.test.js

# Run tests with specific pattern
npm test -- --testNamePattern="login"

# Generate coverage report
npm run test:coverage
```

### Test Database
Tests use a separate test database that's automatically set up and torn down. The test configuration is in `jest.config.js`.

## 📊 Performance & Monitoring

### Logging
- Application logs are stored in the `logs/` directory
- Winston logger with different log levels
- Request logging with Morgan middleware

### Performance Features
- Connection pooling for database
- Rate limiting to prevent abuse
- Request timeout middleware
- Efficient SQL queries with proper indexing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style and patterns
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

## 📄 License

[MIT](LICENSE)
