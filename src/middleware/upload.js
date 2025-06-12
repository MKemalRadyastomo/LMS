const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Multer storage (in memory for processing with sharp)
const storage = multer.memoryStorage();

// File filter for PDF only (for course content and submissions)
const fileFilter = (req, file, cb) => {
    const allowedMimeType = 'application/pdf';
    const allowedExtension = '.pdf';
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.mimetype !== allowedMimeType || ext !== allowedExtension) {
        return cb(new Error('Only PDF files are allowed'), false);
    }
    cb(null, true);
};

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter,
});

// Middleware to compress and save image
const compressAndSaveImage = async (req, res, next) => {
    if (!req.file) return next();
    try {
        const ext = path.extname(req.file.originalname).toLowerCase();
        const filename = `profile_${req.user.id}_${Date.now()}${ext}`;
        const outputPath = path.join(__dirname, '../../public/profile_pictures', filename);
        // Ensure directory exists
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        // Compress and save
        await sharp(req.file.buffer)
            .resize(256, 256, { fit: 'cover' })
            .toFormat(ext === '.png' ? 'png' : ext === '.gif' ? 'gif' : 'jpeg')
            .jpeg({ quality: 80 })
            .toFile(outputPath);
        req.compressedImagePath = `/profile_pictures/${filename}`;
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = {
    upload: upload,
    compressAndSaveImage,
};

// NOTE: When using this middleware for file uploads (multipart/form-data),
// DO NOT manually set the 'Content-Type' header in your client (e.g., Postman or frontend).
// Let the browser or HTTP client set it automatically, as it must include the boundary.
// Setting it manually will cause 'Header name must be a valid HTTP token' errors.
