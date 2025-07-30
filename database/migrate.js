#!/usr/bin/env node

/**
 * Database Migration Script for LMS Assignment System Enhancements
 * 
 * This script runs the assignment system enhancement migration
 * Usage: node database/migrate.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'lms_db',
    port: process.env.DB_PORT || 5432,
});

async function runMigration(migrationFile) {
    console.log(`Running migration: ${migrationFile}`);
    
    try {
        const migrationPath = path.join(__dirname, 'migrations', migrationFile);
        const sql = fs.readFileSync(migrationPath, 'utf8');
        
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            await client.query(sql);
            await client.query('COMMIT');
            console.log(`✅ Migration ${migrationFile} completed successfully`);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error(`❌ Migration ${migrationFile} failed:`, error.message);
        throw error;
    }
}

async function checkMigrationStatus() {
    try {
        const client = await pool.connect();
        
        // Check if migrations table exists
        const migrationTableExists = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'schema_migrations'
            )
        `);
        
        if (!migrationTableExists.rows[0].exists) {
            // Create migrations table
            await client.query(`
                CREATE TABLE schema_migrations (
                    id SERIAL PRIMARY KEY,
                    version VARCHAR(255) NOT NULL UNIQUE,
                    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('📝 Created schema_migrations table');
        }
        
        client.release();
    } catch (error) {
        console.error('❌ Failed to check migration status:', error.message);
        throw error;
    }
}

async function markMigrationAsExecuted(migrationFile) {
    try {
        const client = await pool.connect();
        await client.query(
            'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING',
            [migrationFile]
        );
        client.release();
    } catch (error) {
        console.error(`❌ Failed to mark migration ${migrationFile} as executed:`, error.message);
        throw error;
    }
}

async function isMigrationExecuted(migrationFile) {
    try {
        const client = await pool.connect();
        const result = await client.query(
            'SELECT COUNT(*) FROM schema_migrations WHERE version = $1',
            [migrationFile]
        );
        client.release();
        return parseInt(result.rows[0].count) > 0;
    } catch (error) {
        console.error(`❌ Failed to check if migration ${migrationFile} was executed:`, error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 Starting LMS Assignment System Migration...');
    
    try {
        // Check and setup migration tracking
        await checkMigrationStatus();
        
        // List of migrations to run in order
        const migrations = [
            '005_assignment_system_enhancements.sql'
        ];
        
        for (const migration of migrations) {
            const migrationPath = path.join(__dirname, 'migrations', migration);
            
            // Check if migration file exists
            if (!fs.existsSync(migrationPath)) {
                console.log(`⚠️  Migration file ${migration} not found, skipping...`);
                continue;
            }
            
            // Check if already executed
            if (await isMigrationExecuted(migration)) {
                console.log(`⏭️  Migration ${migration} already executed, skipping...`);
                continue;
            }
            
            // Run the migration
            await runMigration(migration);
            await markMigrationAsExecuted(migration);
        }
        
        console.log('✅ All migrations completed successfully!');
        console.log('\n📊 Assignment System Enhancement Features:');
        console.log('  • Assignment templates for reusable content');
        console.log('  • Enhanced submission management with version tracking');
        console.log('  • Late submission penalties and automated handling');
        console.log('  • Multiple file uploads per submission');
        console.log('  • Enhanced grading features with detailed rubrics');
        console.log('  • Automated grading for objective questions');
        console.log('  • Comprehensive analytics and reporting');
        console.log('  • Plagiarism detection integration (placeholder)');
        console.log('  • Assignment-related notifications');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the migration if this script is executed directly
if (require.main === module) {
    main();
}

module.exports = {
    runMigration,
    checkMigrationStatus,
    markMigrationAsExecuted,
    isMigrationExecuted
};