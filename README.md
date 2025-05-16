# LMS Backend API

This is a RESTful API for an Online Learning Platform built with Express.js and PostgreSQL.

## Features

- Authentication (Login, Register)
- Role-based access control
- User management
- Course management
- Course content management
- Assignment handling
- Progress tracking
- Rate limiting
- Validation & error handling

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v10 or higher)

## Setup

1. Clone the repository
```bash
git clone <repository-url>
cd lms-backend
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
# Copy the example .env file
cp .env.example .env
# Edit the .env file with your specific configuration
```

4. Create database
```bash
# Using psql
psql -U postgres
CREATE DATABASE lms_database;
\q

# Or use your preferred PostgreSQL admin tool
```

5. Run database migrations (Note: Migrations to be added in the future)
```bash
# To be implemented
```

6. Start the server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Documentation

The API follows OpenAPI 3.0 specification. The API documentation is available at:

- `/api-docs` - Swagger UI documentation (To be implemented)

## Folder Structure

```
src/
  ├── config/         # Configuration files
  ├── controllers/    # Request handlers
  ├── middleware/     # Express middleware
  ├── models/         # Database models
  ├── routes/         # API routes
  ├── services/       # Business logic
  ├── utils/          # Utility functions
  ├── app.js          # Express app
  └── index.js        # Application entry point
```

## Environment Variables

| Variable          | Description                                       | Default     |
|-------------------|---------------------------------------------------|-------------|
| NODE_ENV          | Environment (development, production, test)       | development |
| PORT              | Port to run the server on                         | 3000        |
| DB_HOST           | PostgreSQL database host                          | localhost   |
| DB_PORT           | PostgreSQL database port                          | 5432        |
| DB_USER           | PostgreSQL database user                          | postgres    |
| DB_PASSWORD       | PostgreSQL database password                      | postgres    |
| DB_NAME           | PostgreSQL database name                          | lms_database|
| JWT_SECRET        | Secret key for JWT tokens                         | -           |
| JWT_EXPIRATION    | JWT token expiration                              | 1d          |
| RATE_LIMIT_WINDOW | Rate limiting window in minutes                   | 15          |
| RATE_LIMIT_MAX    | Maximum requests in the rate limiting window      | 100         |

## License

[MIT](LICENSE)
