const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer storage for course materials
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../public/course_materials');
        fs.mkdirSync(uploadPath, { recursive: true }); // Ensure directory exists
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const materialUpload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for materials
    // No fileFilter here to allow various file types.
    // Specific file type validation can be done in the controller if needed.
});

module.exports = materialUpload;
