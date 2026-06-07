const multer = require('multer');
const path = require('path');

// Use memory storage so we can process and compress the image before saving
const storage = multer.memoryStorage();

// Strict image file filter
const fileFilter = (req, file, cb) => {
  // Allowed mime types
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  // Allowed extensions
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

  const fileMime = file.mimetype;
  const fileExt = path.extname(file.originalname).toLowerCase();

  // 1. Validate MIME type
  if (!allowedMimeTypes.includes(fileMime)) {
    return cb(new Error('Invalid file type. Only JPG, JPEG, PNG, and WEBP formats are supported.'), false);
  }

  // 2. Validate file extension (detect bypass attempts)
  if (!allowedExtensions.includes(fileExt)) {
    return cb(new Error('Invalid file extension. Only JPG, JPEG, PNG, and WEBP formats are supported.'), false);
  }

  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB limit
  }
});

module.exports = upload;

