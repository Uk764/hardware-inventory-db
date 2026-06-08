// multer.js
// Handles file uploads for Excel bulk import
// Multer = middleware that processes uploaded files

const multer = require('multer');
const path = require('path');

// Configure where to save uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Save to uploads folder
  },
  filename: (req, file, cb) => {
    // Give file a unique name using timestamp
    const uniqueName = `import-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Only allow Excel files
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true); // Accept file
  } else {
    cb(new Error('Only Excel files (.xls, .xlsx) are allowed!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // Max 10MB
  }
});

module.exports = upload;
