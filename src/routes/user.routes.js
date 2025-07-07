const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');
const { upload, compressAndSaveImage } = require('../middleware/upload');

// Admin routes
router.get('/', authenticate, userController.listUsers); // GET /users - List all users (admin only)
router.post('/', authenticate, userController.createUser); // POST /users - Create new user (admin only)
router.delete('/:id', authenticate, userController.deleteUser); // DELETE /users/:id - Delete user (admin only)

// User profile routes
router.get('/:id', authenticate, userController.getProfile);
router.put('/:id', authenticate, userController.updateProfile);
router.post('/:id/profile-picture', authenticate, upload.single('profile_picture'), compressAndSaveImage, userController.updateProfilePicture);
router.put('/:id/password', authenticate, userController.changePassword);
router.get('/:id/stats', authenticate, userController.getUserStats);

module.exports = router;
