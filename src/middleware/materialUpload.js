const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { ApiError } = require('../utils/ApiError');
const logger = require('../utils/logger');
const sharp = require('sharp');

/**
 * Material Upload Middleware
 * Handles file uploads for course materials with validation and optimization
 */

// Create upload directory if it doesn't exist
const createUploadDir = async (dirPath) => {
  try {
    await fs.access(dirPath);
  } catch (error) {
    await fs.mkdir(dirPath, { recursive: true });
    logger.info(`Created upload directory: ${dirPath}`);
  }
};

// Configure storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const { courseId } = req.params;
      const uploadDir = path.join(process.cwd(), 'public', 'course_materials', `course_${courseId}`);
      
      await createUploadDir(uploadDir);
      cb(null, uploadDir);
    } catch (error) {
      logger.error(`Failed to create upload directory: ${error.message}`);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `file-${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  try {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx,ppt,pptx,jpg,jpeg,png,mp4,mp3').split(',');
    const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);
    
    // Check file type
    if (!allowedTypes.includes(fileExtension)) {
      const error = new ApiError(400, `File type .${fileExtension} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
      return cb(error, false);
    }

    // Additional MIME type validation
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'video/mp4',
      'audio/mp3',
      'audio/mpeg'
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      const error = new ApiError(400, `MIME type ${file.mimetype} is not allowed`);
      return cb(error, false);
    }

    cb(null, true);
  } catch (error) {
    logger.error(`File filter error: ${error.message}`);
    cb(error, false);
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800, // 50MB default
    files: 1 // Single file upload
  }
});

/**
 * Single file upload middleware
 */
const uploadSingle = upload.single('file');

/**
 * Multiple file upload middleware (max 5 files)
 */
const uploadMultiple = upload.array('files', 5);

/**
 * Enhanced upload middleware with post-processing
 */
const uploadMaterialFile = async (req, res, next) => {
  uploadSingle(req, res, async (err) => {
    try {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            throw new ApiError(400, `File too large. Maximum size is ${(parseInt(process.env.MAX_FILE_SIZE) || 52428800) / 1024 / 1024}MB`);
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            throw new ApiError(400, 'Too many files uploaded');
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            throw new ApiError(400, 'Unexpected field name. Use "file" as field name');
          }
        }
        throw err;
      }

      if (!req.file) {
        return next(); // No file uploaded, continue
      }

      // Process the uploaded file
      await processUploadedFile(req, req.file);
      next();
    } catch (error) {
      logger.error(`Upload error: ${error.message}`);
      
      // Clean up failed upload
      if (req.file && req.file.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          logger.warn(`Failed to clean up file: ${cleanupError.message}`);
        }
      }
      
      next(error);
    }
  });
};

/**
 * Process uploaded file (optimization, validation, metadata extraction)
 */
const processUploadedFile = async (req, file) => {
  try {
    const filePath = file.path;
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    // Get file stats
    const stats = await fs.stat(filePath);
    
    // Add file metadata to request
    req.fileMetadata = {
      originalName: file.originalname,
      filename: file.filename,
      size: stats.size,
      mimeType: file.mimetype,
      extension: fileExtension.slice(1),
      uploadDate: new Date().toISOString(),
      relativePath: path.relative(path.join(process.cwd(), 'public'), filePath)
    };

    // Process images (resize if too large)
    if (file.mimetype.startsWith('image/')) {
      await processImage(filePath, file.mimetype);
    }

    // Validate file integrity
    await validateFileIntegrity(filePath, file.mimetype);

    logger.info(`Processed uploaded file: ${file.filename} (${stats.size} bytes)`);
  } catch (error) {
    logger.error(`Failed to process uploaded file: ${error.message}`);
    throw error;
  }
};

/**
 * Process and optimize images
 */
const processImage = async (filePath, mimeType) => {
  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();

    // Resize if image is too large (max 2048x2048)
    const maxDimension = 2048;
    
    if (metadata.width > maxDimension || metadata.height > maxDimension) {
      await image
        .resize(maxDimension, maxDimension, {
          fit: 'inside',
          withoutEnlargement: false
        })
        .jpeg({ quality: 85 }) // Convert to JPEG for better compression
        .toFile(filePath + '.optimized');

      // Replace original file with optimized version
      await fs.rename(filePath + '.optimized', filePath);
      
      logger.info(`Optimized large image: ${path.basename(filePath)}`);
    }
  } catch (error) {
    logger.warn(`Failed to process image: ${error.message}`);
    // Continue without optimization if processing fails
  }
};

/**
 * Validate file integrity
 */
const validateFileIntegrity = async (filePath, mimeType) => {
  try {
    const stats = await fs.stat(filePath);
    
    // Check if file is not empty
    if (stats.size === 0) {
      throw new Error('Uploaded file is empty');
    }

    // Basic validation based on file type
    if (mimeType.startsWith('image/')) {
      // Validate image by trying to read it with sharp
      const image = sharp(filePath);
      await image.metadata();
    } else if (mimeType === 'application/pdf') {
      // Basic PDF validation (check PDF header)
      const buffer = await fs.readFile(filePath, { start: 0, end: 4 });
      const header = buffer.toString();
      if (!header.startsWith('%PDF')) {
        throw new Error('Invalid PDF file');
      }
    }

    return true;
  } catch (error) {
    throw new Error(`File validation failed: ${error.message}`);
  }
};

/**
 * Clean up temporary files
 */
const cleanupTempFiles = async (filePaths) => {
  for (const filePath of filePaths) {
    try {
      await fs.unlink(filePath);
      logger.info(`Cleaned up temp file: ${filePath}`);
    } catch (error) {
      logger.warn(`Failed to cleanup temp file ${filePath}: ${error.message}`);
    }
  }
};

/**
 * Get file information without uploading
 */
const getFileInfo = (req, res, next) => {
  if (!req.file) {
    return next();
  }

  // Add file info to response locals for easy access
  res.locals.fileInfo = {
    originalName: req.file.originalname,
    filename: req.file.filename,
    size: req.file.size,
    mimeType: req.file.mimetype,
    path: req.file.path
  };

  next();
};

/**
 * Validate upload permissions
 */
const validateUploadPermissions = (req, res, next) => {
  try {
    const { courseId } = req.params;
    const user = req.user;

    if (!user) {
      throw new ApiError(401, 'Authentication required for file upload');
    }

    // Only admins and teachers can upload materials
    if (!['admin', 'guru'].includes(user.role)) {
      throw new ApiError(403, 'Only administrators and teachers can upload course materials');
    }

    // For teachers, verify they own the course
    if (user.role === 'guru' && req.course && req.course.teacher_id !== user.id) {
      throw new ApiError(403, 'Teachers can only upload materials to their own courses');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Error handler for upload errors
 */
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    let message = 'File upload error';
    let statusCode = 400;

    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = `File too large. Maximum size is ${(parseInt(process.env.MAX_FILE_SIZE) || 52428800) / 1024 / 1024}MB`;
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files uploaded';
        break;
      case 'LIMIT_FIELD_KEY':
        message = 'Field name too long';
        break;
      case 'LIMIT_FIELD_VALUE':
        message = 'Field value too long';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Too many fields';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected field name';
        break;
    }

    return res.status(statusCode).json({
      success: false,
      error: message,
      code: error.code
    });
  }

  next(error);
};

module.exports = {
  uploadMaterialFile,
  uploadSingle,
  uploadMultiple,
  validateUploadPermissions,
  handleUploadError,
  getFileInfo,
  cleanupTempFiles,
  processUploadedFile
};