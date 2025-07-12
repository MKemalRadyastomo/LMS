const db = require('../config/db');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs').promises;

const Material = {};

/**
 * Create a new material with enhanced validation
 */
Material.create = async (materialData) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');

        const { 
            course_id, title, description, content, file_path, video_url, 
            publish_date, file_size, file_type, visibility = 'visible'
        } = materialData;

        // Validate required fields
        if (!course_id || !title) {
            throw new Error('Course ID and title are required');
        }

        // Validate video URL if provided
        if (video_url) {
            Material.validateVideoUrl(video_url);
        }

        // Validate file if provided
        if (file_path && file_size) {
            await Material.validateFile(file_path, file_size, file_type);
        }

        const query = `
            INSERT INTO materials (
                course_id, title, description, content, file_path, video_url, 
                publish_date, file_size, file_type, visibility, created_at, updated_at
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) 
            RETURNING *
        `;
        
        const values = [
            course_id, title, description, content, file_path, video_url, 
            publish_date, file_size, file_type, visibility
        ];
        
        const { rows } = await client.query(query, values);

        await client.query('COMMIT');
        logger.info(`Created material: ${rows[0].id} for course: ${course_id}`);
        
        return rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Failed to create material: ${error.message}`);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Find material by ID
 */
Material.findById = async (id) => {
    try {
        const query = 'SELECT * FROM materials WHERE id = $1';
        const { rows } = await db.query(query, [id]);
        return rows[0];
    } catch (error) {
        logger.error(`Failed to find material by ID: ${error.message}`);
        throw error;
    }
};

/**
 * Find materials by course ID
 */
Material.findByCourseId = async (courseId, filters = {}) => {
    try {
        let query = 'SELECT * FROM materials WHERE course_id = $1';
        const values = [courseId];
        let paramIndex = 2;

        if (filters.visibility) {
            query += ` AND visibility = $${paramIndex++}`;
            values.push(filters.visibility);
        }

        if (filters.published) {
            if (filters.published === 'true') {
                query += ` AND (publish_date IS NULL OR publish_date <= NOW())`;
            } else {
                query += ` AND publish_date > NOW()`;
            }
        }

        if (filters.file_type) {
            query += ` AND file_type = $${paramIndex++}`;
            values.push(filters.file_type);
        }

        query += ' ORDER BY created_at DESC';

        const { rows } = await db.query(query, values);
        return rows;
    } catch (error) {
        logger.error(`Failed to find materials by course ID: ${error.message}`);
        throw error;
    }
};

/**
 * Update material
 */
Material.update = async (id, materialData) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');

        const { 
            title, description, content, file_path, video_url, 
            publish_date, file_size, file_type, visibility
        } = materialData;

        // Validate video URL if provided
        if (video_url) {
            Material.validateVideoUrl(video_url);
        }

        // Validate file if provided
        if (file_path && file_size) {
            await Material.validateFile(file_path, file_size, file_type);
        }

        const query = `
            UPDATE materials 
            SET 
                title = COALESCE($1, title),
                description = COALESCE($2, description),
                content = COALESCE($3, content),
                file_path = COALESCE($4, file_path),
                video_url = COALESCE($5, video_url),
                publish_date = COALESCE($6, publish_date),
                file_size = COALESCE($7, file_size),
                file_type = COALESCE($8, file_type),
                visibility = COALESCE($9, visibility),
                updated_at = NOW()
            WHERE id = $10
            RETURNING *
        `;

        const values = [
            title, description, content, file_path, video_url, 
            publish_date, file_size, file_type, visibility, id
        ];

        const { rows } = await client.query(query, values);

        await client.query('COMMIT');
        
        if (rows.length > 0) {
            logger.info(`Updated material: ${id}`);
            return rows[0];
        }
        
        return null;
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Failed to update material: ${error.message}`);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Delete material
 */
Material.delete = async (id) => {
    const client = await db.getClient();
    
    try {
        await client.query('BEGIN');

        // Get material details first to clean up files
        const material = await Material.findById(id);
        
        if (material && material.file_path) {
            try {
                await Material.deleteFile(material.file_path);
            } catch (fileError) {
                logger.warn(`Failed to delete file: ${fileError.message}`);
                // Continue with database deletion even if file deletion fails
            }
        }

        const query = 'DELETE FROM materials WHERE id = $1 RETURNING id';
        const { rows } = await client.query(query, [id]);

        await client.query('COMMIT');
        
        if (rows.length > 0) {
            logger.info(`Deleted material: ${id}`);
            return true;
        }
        
        return false;
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Failed to delete material: ${error.message}`);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Search materials
 */
Material.search = async (searchQuery, filters = {}) => {
    try {
        let query = `
            SELECT m.*, c.name as course_name
            FROM materials m
            JOIN courses c ON m.course_id = c.id
            WHERE (
                m.title ILIKE $1 OR 
                m.description ILIKE $1 OR 
                m.content ILIKE $1 OR
                c.name ILIKE $1
            )
        `;
        
        const values = [`%${searchQuery}%`];
        let paramIndex = 2;

        if (filters.course_id) {
            query += ` AND m.course_id = $${paramIndex++}`;
            values.push(filters.course_id);
        }

        if (filters.file_type) {
            query += ` AND m.file_type = $${paramIndex++}`;
            values.push(filters.file_type);
        }

        if (filters.visibility) {
            query += ` AND m.visibility = $${paramIndex++}`;
            values.push(filters.visibility);
        }

        query += ' ORDER BY m.created_at DESC';

        if (filters.limit) {
            query += ` LIMIT $${paramIndex++}`;
            values.push(filters.limit);
        }

        const { rows } = await db.query(query, values);
        return rows;
    } catch (error) {
        logger.error(`Failed to search materials: ${error.message}`);
        throw error;
    }
};

/**
 * Get material analytics
 */
Material.getAnalytics = async (materialId) => {
    try {
        const query = `
            SELECT 
                m.*,
                COUNT(DISTINCT al.user_id) as view_count,
                COUNT(DISTINCT al.id) as total_views,
                MAX(al.created_at) as last_viewed
            FROM materials m
            LEFT JOIN activity_logs al ON al.resource_type = 'material' 
                AND al.resource_id = m.id 
                AND al.activity_type = 'view_material'
            WHERE m.id = $1
            GROUP BY m.id
        `;

        const { rows } = await db.query(query, [materialId]);
        return rows[0];
    } catch (error) {
        logger.error(`Failed to get material analytics: ${error.message}`);
        throw error;
    }
};

/**
 * Get course material statistics
 */
Material.getCourseStatistics = async (courseId) => {
    try {
        const query = `
            SELECT 
                COUNT(*) as total_materials,
                COUNT(CASE WHEN file_path IS NOT NULL THEN 1 END) as materials_with_files,
                COUNT(CASE WHEN video_url IS NOT NULL THEN 1 END) as materials_with_videos,
                COUNT(CASE WHEN content IS NOT NULL AND LENGTH(content) > 0 THEN 1 END) as materials_with_content,
                COALESCE(SUM(file_size), 0) as total_file_size,
                COUNT(CASE WHEN visibility = 'visible' THEN 1 END) as visible_materials,
                COUNT(CASE WHEN publish_date IS NULL OR publish_date <= NOW() THEN 1 END) as published_materials
            FROM materials 
            WHERE course_id = $1
        `;

        const { rows } = await db.query(query, [courseId]);
        return rows[0];
    } catch (error) {
        logger.error(`Failed to get course material statistics: ${error.message}`);
        throw error;
    }
};

/**
 * Validate video URL (YouTube, Vimeo, etc.)
 */
Material.validateVideoUrl = (url) => {
    const videoUrlPatterns = [
        /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/,
        /^https?:\/\/(www\.)?vimeo\.com\/.+/,
        /^https?:\/\/(www\.)?dailymotion\.com\/.+/,
        /^https?:\/\/(www\.)?twitch\.tv\/.+/
    ];

    const isValid = videoUrlPatterns.some(pattern => pattern.test(url));
    
    if (!isValid) {
        throw new Error('Invalid video URL. Supported platforms: YouTube, Vimeo, Dailymotion, Twitch');
    }

    return true;
};

/**
 * Validate file path and properties
 */
Material.validateFile = async (filePath, fileSize, fileType) => {
    // Check file size (50MB limit)
    const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 52428800; // 50MB
    
    if (fileSize > maxFileSize) {
        throw new Error(`File size ${fileSize} bytes exceeds maximum allowed size of ${maxFileSize} bytes`);
    }

    // Check file type
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx,ppt,pptx,jpg,jpeg,png').split(',');
    
    if (fileType && !allowedTypes.includes(fileType.toLowerCase())) {
        throw new Error(`File type ${fileType} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Check if file exists
    try {
        await fs.access(filePath);
    } catch (error) {
        throw new Error(`File not found: ${filePath}`);
    }

    return true;
};

/**
 * Delete file from filesystem
 */
Material.deleteFile = async (filePath) => {
    try {
        const fullPath = path.join(process.cwd(), 'public', filePath);
        await fs.unlink(fullPath);
        logger.info(`Deleted file: ${fullPath}`);
    } catch (error) {
        logger.error(`Failed to delete file ${filePath}: ${error.message}`);
        throw error;
    }
};

/**
 * Get recent materials for course
 */
Material.getRecent = async (courseId, limit = 10) => {
    try {
        const query = `
            SELECT * FROM materials 
            WHERE course_id = $1 
                AND visibility = 'visible'
                AND (publish_date IS NULL OR publish_date <= NOW())
            ORDER BY created_at DESC 
            LIMIT $2
        `;

        const { rows } = await db.query(query, [courseId, limit]);
        return rows;
    } catch (error) {
        logger.error(`Failed to get recent materials: ${error.message}`);
        throw error;
    }
};

/**
 * Get materials by file type
 */
Material.getByFileType = async (courseId, fileType) => {
    try {
        const query = `
            SELECT * FROM materials 
            WHERE course_id = $1 AND file_type = $2
            ORDER BY created_at DESC
        `;

        const { rows } = await db.query(query, [courseId, fileType]);
        return rows;
    } catch (error) {
        logger.error(`Failed to get materials by file type: ${error.message}`);
        throw error;
    }
};

module.exports = Material;
