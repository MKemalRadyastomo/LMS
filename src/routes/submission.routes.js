const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const submissionValidation = require('../middleware/validation/submission.validation');
const submissionController = require('../controllers/submission.controller');

const router = express.Router({ mergeParams: true });

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../uploads/assignments');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename: timestamp-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        const fileName = `${uniqueSuffix}${fileExtension}`;
        cb(null, fileName);
    }
});

// File filter for security
const fileFilter = (req, file, cb) => {
    // Get allowed file types from assignment or use defaults
    const allowedTypes = req.assignment?.allowed_file_types || 
        ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'zip', 'rar'];
    
    const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);
    
    if (allowedTypes.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error(`File type .${fileExtension} not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB default, can be overridden by assignment settings
    }
});

// Essay submission route
router.post('/submit/essay',
    authenticate,
    authorize(['student', 'siswa']), // Allow both English and Indonesian role names
    validate(submissionValidation.submitEssay),
    submissionController.submitEssay
);

// File submission route with enhanced error handling
router.post('/submit/file',
    authenticate,
    authorize(['student', 'siswa']),
    (req, res, next) => {
        upload.single('submitted_file')(req, res, (err) => {
            if (err) {
                // Handle multer-specific errors
                if (err instanceof multer.MulterError) {
                    if (err.code === 'LIMIT_FILE_SIZE') {
                        return res.status(413).json({
                            error: 'File size too large',
                            message: 'File size exceeds the 10MB limit',
                            code: 'FILE_TOO_LARGE'
                        });
                    }
                    return res.status(400).json({
                        error: 'File upload error',
                        message: err.message,
                        code: 'UPLOAD_ERROR'
                    });
                }
                // Handle custom file filter errors
                return res.status(415).json({
                    error: 'Unsupported file type',
                    message: err.message,
                    code: 'INVALID_FILE_TYPE'
                });
            }
            next();
        });
    },
    validate(submissionValidation.submitFile),
    submissionController.submitFile
);

// Quiz submission route
router.post('/submit/quiz',
    authenticate,
    authorize(['student', 'siswa']),
    validate(submissionValidation.submitQuiz),
    submissionController.submitQuiz
);

// Get student's own submission for an assignment
router.get('/submission',
    authenticate,
    authorize(['student', 'siswa']),
    validate(submissionValidation.getStudentSubmission),
    submissionController.getStudentSubmission
);

// Get all submissions for an assignment (teachers only)
router.get('/submissions',
    authenticate,
    authorize(['admin', 'guru', 'teacher']),
    validate(submissionValidation.getSubmissionsByAssignment),
    submissionController.getSubmissionsByAssignment
);

// Update submission (for drafts)
router.put('/submissions/:submissionId',
    authenticate,
    authorize(['student', 'siswa']),
    validate(submissionValidation.updateSubmission),
    submissionController.updateSubmission
);

// Grade submission (teachers only)
router.patch('/submissions/:submissionId/grade',
    authenticate,
    authorize(['admin', 'guru']),
    validate(submissionValidation.gradeSubmission),
    submissionController.gradeSubmission
);

module.exports = router;
