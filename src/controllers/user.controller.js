const User = require('../models/user.model');
const path = require('path');

// GET /users - List users (admin only)
exports.listUsers = async (req, res, next) => {
    try {
        // Only admin can list users
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Admin access required' });
        }

        const { page = 1, limit = 20, role, search } = req.query;
        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            role,
            search
        };

        const result = await User.list(options);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

// POST /users - Create new user (admin only)
exports.createUser = async (req, res, next) => {
    try {
        // Only admin can create users
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Admin access required' });
        }

        const { email, password, name, role } = req.body;
        
        // Validate required fields
        if (!email || !password || !role) {
            return res.status(400).json({ message: 'Email, password, and role are required' });
        }

        // Check if user already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        const userData = {
            email,
            password,
            name: name || email.split('@')[0], // Use email prefix if no name provided
            role
        };

        const newUser = await User.create(userData);
        res.status(201).json(newUser);
    } catch (err) {
        next(err);
    }
};

// DELETE /users/:id - Delete user (admin only)
exports.deleteUser = async (req, res, next) => {
    try {
        // Only admin can delete users
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Admin access required' });
        }

        const userId = parseInt(req.params.id);
        
        // Prevent admin from deleting themselves
        if (req.user.id === userId) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const deleted = await User.delete(userId);
        if (!deleted) {
            return res.status(400).json({ message: 'Failed to delete user' });
        }

        res.status(204).send();
    } catch (err) {
        next(err);
    }
};

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
