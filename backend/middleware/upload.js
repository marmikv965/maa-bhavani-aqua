const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, crypto.randomBytes(12).toString('hex') + ext);
  }
});

const imageFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|pdf|svg/;
  const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
  ok ? cb(null, true) : cb(new Error('Only images and PDFs are allowed'));
};

const videoFilter = (req, file, cb) => {
  const extOk = /mp4|webm|ogg|mov/.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = /video\//.test(file.mimetype);
  (extOk && mimeOk) ? cb(null, true) : cb(new Error('Only video files are allowed'));
};

const upload = multer({ storage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });
upload.video = multer({ storage, fileFilter: videoFilter, limits: { fileSize: 100 * 1024 * 1024 } });

module.exports = upload;
