const { default: httpStatus } = require('http-status');
const catchAsync = require('../utils/catchAsync');
const Material = require('../models/material.model');
const Course = require('../models/course.model');
const { ApiError } = require('../utils/ApiError');
const { authenticate, requireRole, requirePermission, logUserActivity } = require('../middleware/rbac');
const { uploadMaterialFile, validateUploadPermissions } = require('../middleware/materialUpload');
const logger = require('../utils/logger');

/**
 * Create course material
 */
const createMaterial = catchAsync(async (req, res) => {
  const { courseId } = req.params;
  const { title, description, content, video_url, publish_date, visibility } = req.body;

  // Verify course exists and user has permission
  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }

  // Check permissions
  if (req.user.role === 'guru' && course.teacher_id !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to add materials to this course');
  } else if (req.user.role === 'siswa') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Students cannot create materials');
  }

  // Prepare material data
  const materialData = {
    course_id: courseId,
    title,
    description,
    content,
    video_url,
    publish_date,
    visibility: visibility || 'visible'
  };

  // Add file information if uploaded
  if (req.fileMetadata) {
    materialData.file_path = req.fileMetadata.relativePath;
    materialData.file_size = req.fileMetadata.size;
    materialData.file_type = req.fileMetadata.extension;
  }

  const material = await Material.create(materialData);

  // Log activity
  await logUserActivity(
    req.user.id,
    'create_material',
    'material',
    material.id,
    { title, course_id: courseId },
    req
  );

  res.status(httpStatus.CREATED).json({
    success: true,
    data: material
  });
});

/**
 * Get materials for a course
 */
const getCourseMaterials = catchAsync(async (req, res) => {
  const { courseId } = req.params;
  const { visibility, published, file_type, limit } = req.query;

  // Verify course exists
  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }

  // Check permissions
  if (req.user.role === 'siswa') {
    // Students can only see enrolled courses and visible materials
    const enrollment = await require('../models/enrollment.model').findByCourseAndStudent(courseId, req.user.id);
    if (!enrollment || enrollment.status !== 'active') {
      throw new ApiError(httpStatus.FORBIDDEN, 'You are not enrolled in this course');
    }
  } else if (req.user.role === 'guru' && course.teacher_id !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to view materials for this course');
  }

  const filters = { visibility, published, file_type };
  if (limit) {
    filters.limit = parseInt(limit);
  }

  // Students can only see visible and published materials
  if (req.user.role === 'siswa') {
    filters.visibility = 'visible';
    filters.published = 'true';
  }

  const materials = await Material.findByCourseId(courseId, filters);

  // Log activity for material access
  await logUserActivity(
    req.user.id,
    'view_course_materials',
    'course',
    courseId,
    { material_count: materials.length },
    req
  );

  res.json({
    success: true,
    data: materials
  });
});

/**
 * Get material by ID
 */
const getMaterial = catchAsync(async (req, res) => {
  const { materialId } = req.params;

  const material = await Material.findById(materialId);
  if (!material) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Material not found');
  }

  // Verify course access
  const course = await Course.findById(material.course_id);
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }

  // Check permissions
  if (req.user.role === 'siswa') {
    // Students can only see enrolled courses and visible materials
    const enrollment = await require('../models/enrollment.model').findByCourseAndStudent(material.course_id, req.user.id);
    if (!enrollment || enrollment.status !== 'active') {
      throw new ApiError(httpStatus.FORBIDDEN, 'You are not enrolled in this course');
    }

    if (material.visibility !== 'visible') {
      throw new ApiError(httpStatus.FORBIDDEN, 'Material is not visible');
    }

    if (material.publish_date && new Date(material.publish_date) > new Date()) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Material is not yet published');
    }
  } else if (req.user.role === 'guru' && course.teacher_id !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to view this material');
  }

  // Log activity
  await logUserActivity(
    req.user.id,
    'view_material',
    'material',
    material.id,
    { title: material.title, course_id: material.course_id },
    req
  );

  res.json({
    success: true,
    data: material
  });
});

/**
 * Update material
 */
const updateMaterial = catchAsync(async (req, res) => {
  const { materialId } = req.params;
  const { title, description, content, video_url, publish_date, visibility } = req.body;

  const material = await Material.findById(materialId);
  if (!material) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Material not found');
  }

  // Verify course access
  const course = await Course.findById(material.course_id);
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }

  // Check permissions
  if (req.user.role === 'guru' && course.teacher_id !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to update this material');
  } else if (req.user.role === 'siswa') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Students cannot update materials');
  }

  // Prepare update data
  const updateData = {
    title,
    description,
    content,
    video_url,
    publish_date,
    visibility
  };

  // Add file information if uploaded
  if (req.fileMetadata) {
    updateData.file_path = req.fileMetadata.relativePath;
    updateData.file_size = req.fileMetadata.size;
    updateData.file_type = req.fileMetadata.extension;
  }

  const updatedMaterial = await Material.update(materialId, updateData);

  // Log activity
  await logUserActivity(
    req.user.id,
    'update_material',
    'material',
    materialId,
    { title: updatedMaterial.title, course_id: material.course_id },
    req
  );

  res.json({
    success: true,
    data: updatedMaterial
  });
});

/**
 * Delete material
 */
const deleteMaterial = catchAsync(async (req, res) => {
  const { materialId } = req.params;

  const material = await Material.findById(materialId);
  if (!material) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Material not found');
  }

  // Verify course access
  const course = await Course.findById(material.course_id);
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }

  // Check permissions
  if (req.user.role === 'guru' && course.teacher_id !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to delete this material');
  } else if (req.user.role === 'siswa') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Students cannot delete materials');
  }

  await Material.delete(materialId);

  // Log activity
  await logUserActivity(
    req.user.id,
    'delete_material',
    'material',
    materialId,
    { title: material.title, course_id: material.course_id },
    req
  );

  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * Search materials
 */
const searchMaterials = catchAsync(async (req, res) => {
  const { q, course_id, file_type, visibility, limit } = req.query;

  if (!q || q.length < 3) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Search query must be at least 3 characters long');
  }

  const filters = {
    course_id,
    file_type,
    visibility,
    limit: limit ? parseInt(limit) : 50
  };

  // Students can only search visible materials
  if (req.user.role === 'siswa') {
    filters.visibility = 'visible';
  }

  const materials = await Material.search(q, filters);

  // Filter results based on user permissions
  let filteredMaterials = materials;
  
  if (req.user.role === 'siswa') {
    // Students can only see materials from courses they're enrolled in
    const enrollments = await require('../models/enrollment.model').findByStudentId(req.user.id);
    const enrolledCourseIds = enrollments.map(e => e.course_id);
    
    filteredMaterials = materials.filter(material => 
      enrolledCourseIds.includes(material.course_id) &&
      material.visibility === 'visible' &&
      (!material.publish_date || new Date(material.publish_date) <= new Date())
    );
  } else if (req.user.role === 'guru') {
    // Teachers can only see materials from their own courses
    filteredMaterials = materials.filter(material => 
      material.teacher_id === req.user.id
    );
  }

  // Log activity
  await logUserActivity(
    req.user.id,
    'search_materials',
    null,
    null,
    { query: q, result_count: filteredMaterials.length },
    req
  );

  res.json({
    success: true,
    data: filteredMaterials,
    meta: {
      query: q,
      total_results: filteredMaterials.length
    }
  });
});

/**
 * Get material analytics
 */
const getMaterialAnalytics = catchAsync(async (req, res) => {
  const { materialId } = req.params;

  const material = await Material.findById(materialId);
  if (!material) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Material not found');
  }

  // Verify course access
  const course = await Course.findById(material.course_id);
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }

  // Check permissions
  if (req.user.role === 'guru' && course.teacher_id !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to view analytics for this material');
  } else if (req.user.role === 'siswa') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Students cannot view material analytics');
  }

  const analytics = await Material.getAnalytics(materialId);

  res.json({
    success: true,
    data: analytics
  });
});

/**
 * Get course material statistics
 */
const getCourseStatistics = catchAsync(async (req, res) => {
  const { courseId } = req.params;

  // Verify course exists
  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }

  // Check permissions
  if (req.user.role === 'guru' && course.teacher_id !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to view statistics for this course');
  } else if (req.user.role === 'siswa') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Students cannot view course statistics');
  }

  const statistics = await Material.getCourseStatistics(courseId);

  res.json({
    success: true,
    data: statistics
  });
});

/**
 * Get recent materials for course
 */
const getRecentMaterials = catchAsync(async (req, res) => {
  const { courseId } = req.params;
  const { limit = 10 } = req.query;

  // Verify course exists
  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }

  // Check permissions
  if (req.user.role === 'siswa') {
    // Students can only see enrolled courses
    const enrollment = await require('../models/enrollment.model').findByCourseAndStudent(courseId, req.user.id);
    if (!enrollment || enrollment.status !== 'active') {
      throw new ApiError(httpStatus.FORBIDDEN, 'You are not enrolled in this course');
    }
  } else if (req.user.role === 'guru' && course.teacher_id !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to view materials for this course');
  }

  const materials = await Material.getRecent(courseId, parseInt(limit));

  res.json({
    success: true,
    data: materials
  });
});

/**
 * Get materials by file type
 */
const getMaterialsByType = catchAsync(async (req, res) => {
  const { courseId, fileType } = req.params;

  // Verify course exists
  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }

  // Check permissions
  if (req.user.role === 'siswa') {
    // Students can only see enrolled courses
    const enrollment = await require('../models/enrollment.model').findByCourseAndStudent(courseId, req.user.id);
    if (!enrollment || enrollment.status !== 'active') {
      throw new ApiError(httpStatus.FORBIDDEN, 'You are not enrolled in this course');
    }
  } else if (req.user.role === 'guru' && course.teacher_id !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to view materials for this course');
  }

  const materials = await Material.getByFileType(courseId, fileType);

  res.json({
    success: true,
    data: materials
  });
});

/**
 * Download material file
 */
const downloadMaterial = catchAsync(async (req, res) => {
  const { materialId } = req.params;

  const material = await Material.findById(materialId);
  if (!material) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Material not found');
  }

  if (!material.file_path) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Material has no file attached');
  }

  // Verify course access
  const course = await Course.findById(material.course_id);
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }

  // Check permissions
  if (req.user.role === 'siswa') {
    // Students can only download from enrolled courses and visible materials
    const enrollment = await require('../models/enrollment.model').findByCourseAndStudent(material.course_id, req.user.id);
    if (!enrollment || enrollment.status !== 'active') {
      throw new ApiError(httpStatus.FORBIDDEN, 'You are not enrolled in this course');
    }

    if (material.visibility !== 'visible') {
      throw new ApiError(httpStatus.FORBIDDEN, 'Material is not visible');
    }

    if (material.publish_date && new Date(material.publish_date) > new Date()) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Material is not yet published');
    }
  } else if (req.user.role === 'guru' && course.teacher_id !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to download this material');
  }

  const path = require('path');
  const fs = require('fs').promises;

  const filePath = path.join(process.cwd(), 'public', material.file_path);

  try {
    // Check if file exists
    await fs.access(filePath);

    // Log download activity
    await logUserActivity(
      req.user.id,
      'download_material',
      'material',
      material.id,
      { title: material.title, file_type: material.file_type },
      req
    );

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${material.title}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // Send file
    res.sendFile(filePath);
  } catch (error) {
    logger.error(`Failed to serve file ${filePath}: ${error.message}`);
    throw new ApiError(httpStatus.NOT_FOUND, 'File not found on server');
  }
});

module.exports = {
  createMaterial,
  getCourseMaterials,
  getMaterial,
  updateMaterial,
  deleteMaterial,
  searchMaterials,
  getMaterialAnalytics,
  getCourseStatistics,
  getRecentMaterials,
  getMaterialsByType,
  downloadMaterial
};