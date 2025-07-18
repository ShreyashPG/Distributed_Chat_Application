const router = require('express').Router();
const authenticateToken = require('../middleware/authentication'); 
const multer = require('multer');
const path = require('path'); 
const fs = require('fs');
 
 // Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

 const upload = multer({
   storage: storage,
   limits: {
     fileSize: 5 * 1024 * 1024, // 5MB limit
   },
   fileFilter: (req, file, cb) => {
     const allowedTypes = /jpeg|jpg|png|gif|webp/;
     const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
     const mimetype = allowedTypes.test(file.mimetype);
     
     if (mimetype && extname) {
       return cb(null, true);
     } else {
       cb(new Error('Only image files are allowed!'));
     }
   }
 });


 // Image upload endpoint
    router.post('/upload', authenticateToken, upload.single('image'), (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'No image file provided' });
        }

        const imageUrl = `/uploads/${req.file.filename}`;
        
        res.json({
          message: 'Image uploaded successfully',
          imageUrl: imageUrl,
          filename: req.file.filename
        });
      } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ error: 'Failed to upload image' });
      }
    });

    module.exports = router;