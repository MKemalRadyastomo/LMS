const db = require('../config/db');
const { hashPassword } = require('../utils/password');
const logger = require('../utils/logger');

/**
 * User Model
 */
class User {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user
   */
  static async create(userData) {
    try {
      const { email, password, name, role = 'siswa', profileImage = null } = userData;
      
      // Hash the password
      const passwordHash = await hashPassword(password);
      
      const query = `
        INSERT INTO users (email, password_hash, name, role, profile_image)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, name, role, profile_image, created_at
      `;
      
      const values = [email, passwordHash, name, role, profileImage];
      const result = await db.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      logger.error(`Error creating user: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Find a user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} Found user or null
   */
  static async findByEmail(email) {
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await db.query(query, [email]);
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error finding user by email: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Find a user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} Found user or null
   */
  static async findById(id) {
    try {
      const query = 'SELECT id, email, name, role, profile_image, created_at FROM users WHERE id = $1';
      const result = await db.query(query, [id]);
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error finding user by ID: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Update a user
   * @param {number} id - User ID
   * @param {Object} userData - User data to update
   * @returns {Promise<Object|null>} Updated user or null
   */
  static async update(id, userData) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      let query = 'UPDATE users SET ';
      const values = [];
      const updates = [];
      let paramCount = 1;
      
      // Dynamically build the query based on provided fields
      for (const [key, value] of Object.entries(userData)) {
        // Handle password specially
        if (key === 'password') {
          const passwordHash = await hashPassword(value);
          updates.push(`password_hash = $${paramCount}`);
          values.push(passwordHash);
        } else {
          // Map model fields to database columns
          const dbField = key === 'profileImage' ? 'profile_image' : key;
          updates.push(`${dbField} = $${paramCount}`);
          values.push(value);
        }
        paramCount++;
      }
      
      // If no fields to update
      if (updates.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }
      
      query += updates.join(', ');
      query += ` WHERE id = $${paramCount} RETURNING id, email, name, role, profile_image as "profileImage", created_at`;
      values.push(id);
      
      const result = await client.query(query, values);
      await client.query('COMMIT');
      
      return result.rows[0] || null;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Error updating user: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Delete a user
   * @param {number} id - User ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    try {
      const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
      const result = await db.query(query, [id]);
      
      return result.rowCount > 0;
    } catch (error) {
      logger.error(`Error deleting user: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * List all users with pagination and filtering
   * @param {Object} options - List options (page, limit, role, search)
   * @returns {Promise<Object>} List of users and pagination info
   */
  static async list({ page = 1, limit = 20, role, search }) {
    try {
      const offset = (page - 1) * limit;
      let query = `
        SELECT
          id, email, name, role, profile_image, created_at
        FROM
          users
      `;
      
      const countQuery = 'SELECT COUNT(*) FROM users';
      const params = [];
      const countParams = [];
      let whereClause = '';
      
      // Add filters if provided
      if (role || search) {
        whereClause = ' WHERE';
        
        if (role) {
          whereClause += ' role = $1';
          params.push(role);
          countParams.push(role);
        }
        
        if (search) {
          if (role) {
            whereClause += ' AND';
            params.push(`%${search}%`);
            countParams.push(`%${search}%`);
          } else {
            params.push(`%${search}%`);
            countParams.push(`%${search}%`);
          }
          
          whereClause += ` (name ILIKE $${params.length} OR email ILIKE $${params.length})`;
        }
      }
      
      // Complete the queries
      query += whereClause + ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);
      
      const countQueryWithWhere = countQuery + whereClause;
      
      // Execute queries
      const [usersResult, countResult] = await Promise.all([
        db.query(query, params),
        db.query(countQueryWithWhere, countParams)
      ]);
      
      const total = parseInt(countResult.rows[0].count, 10);
      
      return {
        data: usersResult.rows,
        pagination: {
          total,
          per_page: limit,
          current_page: page,
          last_page: Math.ceil(total / limit),
          from: offset + 1,
          to: offset + usersResult.rows.length
        }
      };
    } catch (error) {
      logger.error(`Error listing users: ${error.message}`);
      throw error;
    }
  }
}

module.exports = User;
