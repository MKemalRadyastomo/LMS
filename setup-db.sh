#!/bin/bash

# Setup script for LMS database

echo "Setting up LMS database..."

# Create database
echo "Creating database 'lms_database'..."
psql postgres -c "CREATE DATABASE lms_database;" 2>/dev/null || echo "Database may already exist"

# Grant privileges to current user
echo "Granting privileges..."
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE lms_database TO postgres;"

# Initialize database schema
echo "Initializing database schema..."
psql -d lms_database -f database/init.sql

echo "Database setup complete!"
echo "You can now run 'npm run dev' to start the application"
