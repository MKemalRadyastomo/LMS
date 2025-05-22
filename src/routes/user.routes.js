const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');
const { upload, compressAndSaveImage } = require('../middleware/upload');

// Get user profile
router.get('/:id', authenticate, userController.getProfile);
// Update user profile
router.put('/:id', authenticate, userController.updateProfile);
// Update profile picture
router.post('/:id/profile-picture', authenticate, upload.single('profile_picture'), compressAndSaveImage, userController.updateProfilePicture);

module.exports = router;
