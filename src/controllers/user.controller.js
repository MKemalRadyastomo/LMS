const User = require('../models/user.model');
const path = require('path');

// GET /users/:id - Get user profile
exports.getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        // Only allow self or admin
        if (req.user.id !== user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }
        res.json(user);
    } catch (err) {
        next(err);
    }
};

// PUT /users/:id - Update user profile
exports.updateProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (req.user.id !== parseInt(req.params.id) && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const updateData = {};
        const { email, full_name, password } = req.body;

        if (email) updateData.email = email;
        if (full_name) updateData.name = full_name; // Match the database column name
        if (password) updateData.password = password; // Will be hashed by the model update method

        const updatedUser = await User.update(req.params.id, updateData);
        if (!updatedUser) {
            return res.status(400).json({ message: 'Update failed' });
        }
        res.json(updatedUser);
    } catch (err) {
        next(err);
    }
};

// POST /users/:id/profile-picture - Update profile picture
exports.updateProfilePicture = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (req.user.id !== parseInt(req.params.id) && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }
        if (!req.compressedImagePath) {
            return res.status(400).json({ message: 'No image uploaded or invalid file' });
        }

        const updatedUser = await User.update(req.params.id, {
            profileImage: req.compressedImagePath
        });
        if (!updatedUser) {
            return res.status(400).json({ message: 'Update failed' });
        }
        res.json({ profile_picture_url: updatedUser.profileImage });
    } catch (err) {
        next(err);
    }
};
