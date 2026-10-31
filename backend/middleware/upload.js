const multer = require('multer');
const path = require('path');

// Files are held in memory (no disk writes – Vercel's filesystem is read-only/ephemeral) and the
// route handlers then push the buffer to Supabase Storage (see config/storage.js).
// Vercel rejects request bodies larger than ~4.5 MB, so limits are lowered there; large videos
// use the direct-to-Supabase signed upload instead (POST /api/settings/hero-video/upload-url).
const IS_VERCEL = !!process.env.VERCEL;
const MB = 1024 * 1024;
const storage = multer.memoryStorage();

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

const upload = multer({ storage, fileFilter: imageFilter, limits: { fileSize: (IS_VERCEL ? 4 : 5) * MB } });
upload.video = multer({ storage, fileFilter: videoFilter, limits: { fileSize: (IS_VERCEL ? 4 : 100) * MB } });

module.exports = upload;
