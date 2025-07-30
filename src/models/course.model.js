const db = require('../config/db');
const logger = require('../utils/logger');
const crypto = require('crypto');

class Course {
    /**
     * Generate a unique course code
     * @returns {string} - A 6-character unique code
     */
    static generateCourseCode() {
        // Generate a 6-character alphanumeric code
        return crypto.randomBytes(3).toString('hex').toUpperCase();
    }

    /**
     * Create a new course
     * @param {Object} courseData - Course data
     * @returns {Promise<Object>} Created course
     */
    static async create(courseData) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            const { name, description, privacy = 'private', teacherId } = courseData;
            
            // Validate required fields
            if (!name || !name.trim()) {
                throw new Error('Course name is required');
            }
            
            if (!teacherId) {
                throw new Error('Teacher ID is required');
            }
            
            let code;
            let attempts = 0;
            const maxAttempts = 5;

            // Generate unique code with retries
            do {
                code = this.generateCourseCode();
                const existing = await client.query(
                    'SELECT id FROM courses WHERE code = $1',
                    [code]
                );
                if (existing.rows.length === 0) break;
                attempts++;
            } while (attempts < maxAttempts);

            if (attempts >= maxAttempts) {
                throw new Error('Failed to generate unique course code');
            }

            const query = `
                INSERT INTO courses (name, description, privacy, code, teacher_id)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, name, description, privacy, code, teacher_id, created_at
            `;

            const values = [name, description, privacy, code, teacherId];
            const result = await client.query(query, values);

            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error(`Error creating course: ${error.message}`);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get a course by ID
     * @param {number} id - Course ID
     * @param {boolean} includeStats - Include enrollment and content statistics
     * @returns {Promise<Object|null>} Found course or null
     */
    static async findById(id, includeStats = false) {
        try {
            let query = `
                SELECT c.*, u.name as teacher_name, u.email as teacher_email
            `;

            if (includeStats) {
                query += `,
                    COALESCE(enrollment_stats.student_count, 0) as student_count,
                    COALESCE(enrollment_stats.active_count, 0) as active_student_count,
                    COALESCE(enrollment_stats.pending_count, 0) as pending_student_count,
                    COALESCE(material_stats.material_count, 0) as material_count,
                    COALESCE(assignment_stats.assignment_count, 0) as assignment_count,
                    COALESCE(recent_activity.last_activity, c.created_at) as last_activity,
                    COALESCE(completion_stats.avg_completion, 0) as avg_completion_rate
                `;
            }

            query += `
                FROM courses c
                LEFT JOIN users u ON c.teacher_id = u.id
            `;

            if (includeStats) {
                query += `
                    LEFT JOIN LATERAL (
                        SELECT 
                            COUNT(*) as student_count,
                            COUNT(*) FILTER (WHERE e.status = 'active') as active_count,
                            COUNT(*) FILTER (WHERE e.status = 'pending') as pending_count
                        FROM enrollments e
                        WHERE e.course_id = c.id
                    ) enrollment_stats ON true
                    LEFT JOIN LATERAL (
                        SELECT COUNT(*) as material_count
                        FROM course_contents cc
                        WHERE cc.course_id = c.id AND cc.content_type = 'material'
                    ) material_stats ON true
                    LEFT JOIN LATERAL (
                        SELECT COUNT(*) as assignment_count
                        FROM course_contents cc
                        WHERE cc.course_id = c.id AND cc.content_type = 'assignment'
                    ) assignment_stats ON true
                    LEFT JOIN LATERAL (
                        SELECT MAX(cc.created_at) as last_activity
                        FROM course_contents cc
                        WHERE cc.course_id = c.id
                    ) recent_activity ON true
                    LEFT JOIN LATERAL (
                        SELECT 
                            CASE 
                                WHEN COUNT(s.id) > 0 
                                THEN ROUND(
                                    (COUNT(*) FILTER (WHERE s.status = 'graded') * 100.0) / 
                                    COUNT(s.id), 2
                                )
                                ELSE 0 
                            END as avg_completion
                        FROM course_contents cc
                        LEFT JOIN assignments a ON cc.content_id = a.id AND cc.content_type = 'assignment'
                        LEFT JOIN submissions s ON a.id = s.assignment_id
                        WHERE cc.course_id = c.id
                    ) completion_stats ON true
                `;
            }

            query += ` WHERE c.id = $1`;

            const result = await db.query(query, [id]);
            return result.rows[0] || null;
        } catch (error) {
            logger.error(`Error finding course: ${error.message}`);
            throw error;
        }
    }

    /**
     * List all courses with pagination and filtering
     * @param {Object} options - List options
     * @returns {Promise<Object>} List of courses and pagination info
     */
    static async list({ page = 1, limit = 20, teacherId, search, privacy, includeStats = false }) {
        try {
            const offset = (page - 1) * limit;
            let query = `
                SELECT c.*, u.name as teacher_name,
                       COUNT(*) OVER() as total_count
            `;

            // Include additional stats for UI components if requested
            if (includeStats) {
                query += `,
                       COALESCE(enrollment_stats.student_count, 0) as student_count,
                       COALESCE(material_stats.material_count, 0) as material_count,
                       COALESCE(assignment_stats.assignment_count, 0) as assignment_count,
                       COALESCE(recent_activity.last_activity, c.created_at) as last_activity
                `;
            }

            query += `
                FROM courses c
                LEFT JOIN users u ON c.teacher_id = u.id
            `;

            if (includeStats) {
                query += `
                    LEFT JOIN LATERAL (
                        SELECT COUNT(*) as student_count
                        FROM enrollments e
                        WHERE e.course_id = c.id AND e.status = 'active'
                    ) enrollment_stats ON true
                    LEFT JOIN LATERAL (
                        SELECT COUNT(*) as material_count
                        FROM course_contents cc
                        WHERE cc.course_id = c.id AND cc.content_type = 'material'
                    ) material_stats ON true
                    LEFT JOIN LATERAL (
                        SELECT COUNT(*) as assignment_count
                        FROM course_contents cc
                        WHERE cc.course_id = c.id AND cc.content_type = 'assignment'
                    ) assignment_stats ON true
                    LEFT JOIN LATERAL (
                        SELECT MAX(created_at) as last_activity
                        FROM course_contents cc
                        WHERE cc.course_id = c.id
                    ) recent_activity ON true
                `;
            }

            const values = [];
            const conditions = [];

            if (teacherId) {
                conditions.push(`c.teacher_id = $${values.length + 1}`);
                values.push(teacherId);
            }

            if (search) {
                conditions.push(`(
                    c.name ILIKE $${values.length + 1} OR 
                    c.description ILIKE $${values.length + 1} OR
                    u.name ILIKE $${values.length + 1} OR
                    c.code ILIKE $${values.length + 1}
                )`);
                values.push(`%${search}%`);
            }

            if (privacy) {
                conditions.push(`c.privacy = $${values.length + 1}`);
                values.push(privacy);
            }

            if (conditions.length > 0) {
                query += ` WHERE ${conditions.join(' AND ')}`;
            }

            query += ` ORDER BY c.created_at DESC
                      LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;

            values.push(limit, offset);

            const result = await db.query(query, values);

            const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

            return {
                data: result.rows.map(row => {
                    const { total_count, ...courseData } = row;
                    return courseData;
                }),
                pagination: {
                    total: totalCount,
                    per_page: limit,
                    current_page: page,
                    last_page: Math.ceil(totalCount / limit),
                    from: offset + 1,
                    to: offset + result.rows.length
                }
            };
        } catch (error) {
            logger.error(`Error listing courses: ${error.message}`);
            throw error;
        }
    }

    /**
     * Update a course
     * @param {number} id - Course ID
     * @param {Object} courseData - Course data to update
     * @returns {Promise<Object|null>} Updated course or null
     */
    static async update(id, courseData) {
        try {
            const allowedFields = ['name', 'description', 'privacy', 'teacher_id'];
            const updates = [];
            const values = [];
            let paramCount = 1;

            for (const [key, value] of Object.entries(courseData)) {
                if (allowedFields.includes(key)) {
                    updates.push(`${key} = $${paramCount}`);
                    values.push(value);
                    paramCount++;
                }
            }

            if (updates.length === 0) return null;

            values.push(id);

            const query = `
                UPDATE courses
                SET ${updates.join(', ')}
                WHERE id = $${paramCount}
                RETURNING id, name, description, privacy, code, teacher_id, created_at
            `;

            const result = await db.query(query, values);
            return result.rows[0] || null;
        } catch (error) {
            logger.error(`Error updating course: ${error.message}`);
            throw error;
        }
    }

    /**
     * Advanced search with autocomplete support
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Search suggestions
     */
    static async searchSuggestions({ query, limit = 10, userId, userRole }) {
        try {
            let searchQuery = `
                SELECT DISTINCT
                    c.name as suggestion,
                    'course' as type,
                    c.id,
                    c.privacy
                FROM courses c
                LEFT JOIN users u ON c.teacher_id = u.id
                WHERE (
                    c.name ILIKE $1 OR 
                    c.description ILIKE $1 OR
                    u.name ILIKE $1 OR
                    c.code ILIKE $1
                )
            `;

            const values = [`%${query}%`];

            // Add privacy constraints for non-admin users
            if (userRole !== 'admin') {
                if (userRole === 'guru') {
                    // Teachers can see all courses (for now)
                } else {
                    searchQuery += ` AND c.privacy = 'public'`;
                }
            }

            searchQuery += ` 
                ORDER BY c.name
                LIMIT $${values.length + 1}
            `;
            values.push(limit);

            const result = await db.query(searchQuery, values);
            return result.rows;
        } catch (error) {
            logger.error(`Error in search suggestions: ${error.message}`);
            throw error;
        }
    }

    /**
     * Advanced filtering with multiple criteria
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Object>} Filtered courses with pagination
     */
    static async advancedFilter(filters) {
        try {
            const {
                page = 1,
                limit = 20,
                search,
                privacy,
                teacherId,
                hasAssignments,
                hasMaterials,
                minStudents,
                maxStudents,
                dateFrom,
                dateTo,
                sortBy = 'created_at',
                sortOrder = 'DESC',
                includeStats = false
            } = filters;

            const offset = (page - 1) * limit;
            
            let query = `
                SELECT c.*, u.name as teacher_name,
                       COUNT(*) OVER() as total_count
            `;

            if (includeStats) {
                query += `,
                    COALESCE(enrollment_stats.student_count, 0) as student_count,
                    COALESCE(material_stats.material_count, 0) as material_count,
                    COALESCE(assignment_stats.assignment_count, 0) as assignment_count
                `;
            }

            query += `
                FROM courses c
                LEFT JOIN users u ON c.teacher_id = u.id
            `;

            if (includeStats || hasAssignments || hasMaterials || minStudents || maxStudents) {
                if (includeStats || minStudents || maxStudents) {
                    query += `
                        LEFT JOIN LATERAL (
                            SELECT COUNT(*) as student_count
                            FROM enrollments e
                            WHERE e.course_id = c.id AND e.status = 'active'
                        ) enrollment_stats ON true
                    `;
                }

                if (includeStats || hasMaterials) {
                    query += `
                        LEFT JOIN LATERAL (
                            SELECT COUNT(*) as material_count
                            FROM course_contents cc
                            WHERE cc.course_id = c.id AND cc.content_type = 'material'
                        ) material_stats ON true
                    `;
                }

                if (includeStats || hasAssignments) {
                    query += `
                        LEFT JOIN LATERAL (
                            SELECT COUNT(*) as assignment_count
                            FROM course_contents cc
                            WHERE cc.course_id = c.id AND cc.content_type = 'assignment'
                        ) assignment_stats ON true
                    `;
                }
            }

            const values = [];
            const conditions = [];

            // Basic filters
            if (search) {
                conditions.push(`(
                    c.name ILIKE $${values.length + 1} OR 
                    c.description ILIKE $${values.length + 1} OR
                    u.name ILIKE $${values.length + 1} OR
                    c.code ILIKE $${values.length + 1}
                )`);
                values.push(`%${search}%`);
            }

            if (privacy) {
                conditions.push(`c.privacy = $${values.length + 1}`);
                values.push(privacy);
            }

            if (teacherId) {
                conditions.push(`c.teacher_id = $${values.length + 1}`);
                values.push(teacherId);
            }

            // Date range filters
            if (dateFrom) {
                conditions.push(`c.created_at >= $${values.length + 1}`);
                values.push(dateFrom);
            }

            if (dateTo) {
                conditions.push(`c.created_at <= $${values.length + 1}`);
                values.push(dateTo);
            }

            // Content filters
            if (hasAssignments) {
                conditions.push(`assignment_stats.assignment_count > 0`);
            }

            if (hasMaterials) {
                conditions.push(`material_stats.material_count > 0`);
            }

            // Student count filters
            if (minStudents) {
                conditions.push(`enrollment_stats.student_count >= $${values.length + 1}`);
                values.push(minStudents);
            }

            if (maxStudents) {
                conditions.push(`enrollment_stats.student_count <= $${values.length + 1}`);
                values.push(maxStudents);
            }

            if (conditions.length > 0) {
                query += ` WHERE ${conditions.join(' AND ')}`;
            }

            // Dynamic sorting
            const allowedSortFields = ['created_at', 'name', 'student_count', 'material_count', 'assignment_count'];
            const allowedSortOrders = ['ASC', 'DESC'];
            
            const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
            const safeSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

            query += ` ORDER BY ${safeSortBy} ${safeSortOrder}`;
            query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;

            values.push(limit, offset);

            const result = await db.query(query, values);
            const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

            return {
                data: result.rows.map(row => {
                    const { total_count, ...courseData } = row;
                    return courseData;
                }),
                pagination: {
                    total: totalCount,
                    per_page: limit,
                    current_page: page,
                    last_page: Math.ceil(totalCount / limit),
                    from: offset + 1,
                    to: offset + result.rows.length
                },
                filters: filters
            };
        } catch (error) {
            logger.error(`Error in advanced filter: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get course by class code for enrollment
     * @param {string} code - Course class code
     * @returns {Promise<Object|null>} Found course or null
     */
    static async findByCode(code) {
        try {
            const query = `
                SELECT c.*, u.name as teacher_name, u.email as teacher_email
                FROM courses c
                LEFT JOIN users u ON c.teacher_id = u.id
                WHERE UPPER(c.code) = UPPER($1)
            `;
            const result = await db.query(query, [code]);
            return result.rows[0] || null;
        } catch (error) {
            logger.error(`Error finding course by code: ${error.message}`);
            throw error;
        }
    }
}

module.exports = Course;
