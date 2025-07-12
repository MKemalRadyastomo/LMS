#!/bin/bash

# =====================================================
# LMS Database Setup Script
# =====================================================
# This script helps set up the database easily for development
# Usage: ./database/setup.sh [environment]
# Example: ./database/setup.sh development

set -e  # Exit on any error

# Default values
ENVIRONMENT=${1:-development}
DB_NAME="lms_${ENVIRONMENT}"
DB_USER=${DB_USER:-postgres}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

echo "🚀 Setting up LMS Database for: $ENVIRONMENT"
echo "================================================"

# Check if PostgreSQL is running
if ! pg_isready -h $DB_HOST -p $DB_PORT >/dev/null 2>&1; then
    echo "❌ PostgreSQL is not running on $DB_HOST:$DB_PORT"
    echo "Please start PostgreSQL and try again"
    exit 1
fi

echo "✅ PostgreSQL is running"

# Function to run SQL commands
run_sql() {
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "$1" 2>/dev/null || true
}

# Function to run SQL file
run_sql_file() {
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$1"
}

echo "🗄️  Creating database: $DB_NAME"

# Drop database if exists (for clean setup)
run_sql "DROP DATABASE IF EXISTS $DB_NAME;"

# Create database
run_sql "CREATE DATABASE $DB_NAME;"

echo "✅ Database $DB_NAME created"

echo "📋 Running initialization script..."

# Run the complete initialization script
run_sql_file "database/init_complete.sql"

echo "✅ Database initialization completed"

echo "📊 Database setup summary:"
echo "  - Database: $DB_NAME"
echo "  - Host: $DB_HOST:$DB_PORT"
echo "  - User: $DB_USER"
echo ""
echo "🔐 Default login credentials:"
echo "  - Admin: admin@example.com / adminadmin"
echo "  - Teacher: teacher@example.com / adminadmin"  
echo "  - Student: student@example.com / adminadmin"
echo ""
echo "🎉 Setup complete! Your LMS database is ready to use."
echo ""
echo "💡 To connect to the database:"
echo "   psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"