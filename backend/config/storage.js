// Supabase Storage helpers. Vercel serverless functions have a read-only, ephemeral filesystem,
// so every upload goes to Supabase Storage instead of the local disk.
const path = require('path');
const crypto = require('crypto');
const supabase = require('./supabase');

const IMAGE_BUCKET = 'site-uploads'; // images + PDFs (products, solutions, industries, banners, brands, resources)
const VIDEO_BUCKET = 'hero-media';   // hero videos (bucket already used by the existing code)

const BUCKET_OPTIONS = {
  [IMAGE_BUCKET]: { public: true, allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf'] },
  [VIDEO_BUCKET]: { public: true, allowedMimeTypes: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'] }
};

// Safe, unique object name: timestamp + random hex + sanitised extension. Never uses the client's name.
function uniqueName(originalName, prefix = '') {
  const ext = path.extname(originalName || '').toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 10);
  return `${prefix}${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
}

const isBucketMissing = (error) =>
  !!error && (/bucket not found/i.test(error.message || '') || String(error.statusCode || error.status) === '404');

const ensured = new Set();
async function ensureBucket(bucket) {
  if (ensured.has(bucket)) return;
  const { error } = await supabase.storage.createBucket(bucket, BUCKET_OPTIONS[bucket] || { public: true });
  if (error && !/already exists|duplicate/i.test(error.message || '')) {
    throw new Error(`Storage bucket "${bucket}" does not exist and could not be created: ${error.message}. Create it (Public) in Supabase → Storage.`);
  }
  ensured.add(bucket);
}

// Run a storage operation; if the bucket is missing, create it once and retry.
async function withBucket(bucket, op) {
  let res = await op();
  if (isBucketMissing(res.error)) {
    await ensureBucket(bucket);
    res = await op();
  }
  return res;
}

async function uploadBuffer({ bucket, filePath, buffer, contentType }) {
  const { error } = await withBucket(bucket, () =>
    supabase.storage.from(bucket).upload(filePath, buffer, { contentType, upsert: false, cacheControl: '31536000' })
  );
  if (error) throw new Error(`Upload to storage failed: ${error.message}`);
  return { bucket, path: filePath, url: publicUrl(bucket, filePath) };
}

function publicUrl(bucket, filePath) {
  return supabase.storage.from(bucket).getPublicUrl(filePath).data.publicUrl;
}

// Used by routes that accept an image/PDF via multer.memoryStorage().
function saveImage(file, folder) {
  return uploadBuffer({
    bucket: IMAGE_BUCKET,
    filePath: `${folder}/${uniqueName(file.originalname)}`,
    buffer: file.buffer,
    contentType: file.mimetype
  });
}

// Best-effort cleanup (used when the database write fails after a successful upload).
async function removeObject(obj) {
  if (!obj) return;
  try { await supabase.storage.from(obj.bucket).remove([obj.path]); }
  catch (e) { console.error('[storage] cleanup failed:', e.message); }
}

// Signed upload URL so the browser can send large files straight to Supabase Storage
// (bypasses Vercel's ~4.5 MB request-body limit). No privileged key is exposed to the browser.
async function createSignedUpload(bucket, filePath) {
  const { data, error } = await withBucket(bucket, () => supabase.storage.from(bucket).createSignedUploadUrl(filePath));
  if (error) throw new Error(`Could not create upload URL: ${error.message}`);
  return { signedUrl: data.signedUrl, token: data.token, path: data.path || filePath, publicUrl: publicUrl(bucket, filePath) };
}

module.exports = { IMAGE_BUCKET, VIDEO_BUCKET, uniqueName, uploadBuffer, saveImage, removeObject, createSignedUpload, publicUrl };
