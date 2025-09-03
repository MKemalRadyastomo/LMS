const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const materialController = require('../controllers/material.controller');
const { uploadMaterialFile, validateUploadPermissions } = require('../middleware/materialUpload');

const router = express.Router();

// Apply authentication to all material routes
router.use(authenticate);

/**
 * Course Material Routes
 */

// Create material for course (with file upload)
router.post(
  '/courses/:courseId/materials',
  requireRole(['admin', 'guru']),
  validateUploadPermissions,
  uploadMaterialFile,
  materialController.createMaterial
);

// Get materials for course
router.get(
  '/courses/:courseId/materials',
  requireRole(['admin', 'guru', 'siswa']),
  materialController.getCourseMaterials
);

// Get recent materials for course
router.get(
  '/courses/:courseId/materials/recent',
  requireRole(['admin', 'guru', 'siswa']),
  materialController.getRecentMaterials
);

// Get materials by file type for course
router.get(
  '/courses/:courseId/materials/type/:fileType',
  requireRole(['admin', 'guru', 'siswa']),
  materialController.getMaterialsByType
);

// Get course material statistics
router.get(
  '/courses/:courseId/materials/statistics',
  requireRole(['admin', 'guru']),
  materialController.getCourseStatistics
);

/**
 * Individual Material Routes
 */

// Get material by ID
router.get(
  '/materials/:materialId',
  requireRole(['admin', 'guru', 'siswa']),
  materialController.getMaterial
);

// Update material (with file upload)
router.put(
  '/materials/:materialId',
  requireRole(['admin', 'guru']),
  validateUploadPermissions,
  uploadMaterialFile,
  materialController.updateMaterial
);

// Delete material
router.delete(
  '/materials/:materialId',
  requireRole(['admin', 'guru']),
  materialController.deleteMaterial
);

// Download material file
router.get(
  '/materials/:materialId/download',
  requireRole(['admin', 'guru', 'siswa']),
  materialController.downloadMaterial
);

// Get material analytics
router.get(
  '/materials/:materialId/analytics',
  requireRole(['admin', 'guru']),
  materialController.getMaterialAnalytics
);

/**
 * Search Routes
 */

// Search materials
router.get(
  '/materials/search',
  requireRole(['admin', 'guru', 'siswa']),
  materialController.searchMaterials
);

module.exports = router;