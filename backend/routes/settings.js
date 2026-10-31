const router = require('express').Router();
const supabase = require('../config/supabase');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const storage = require('../config/storage');
const { statusFor } = require('../config/env');
const path = require('path');

const VIDEO_EXT = /^\.(mp4|webm|ogg|mov)$/;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // same 100 MB ceiling as before (Supabase plan limit may be lower)
const settingKeyFor = (slot) => (slot === 1 ? 'hero_video_url' : `hero_video_url_${slot}`);

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('settings').select('key, value');
    if (error) throw error;
    const obj = {};
    (data || []).forEach(r => { obj[r.key] = r.value; });
    res.json(obj);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/', auth, async (req, res) => {
  try {
    const rows = Object.entries(req.body).map(([key, value]) => ({ key, value }));
    const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' });
    if (error) throw error;
    res.json({ message: 'Settings saved' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Step 1 of the large-video flow: returns a signed URL so the browser uploads the file directly to
// Supabase Storage (Vercel functions cannot receive bodies over ~4.5 MB). Then the browser calls
// POST /hero-video with { url } (below) to save the resulting public URL.
router.post('/hero-video/upload-url', auth, async (req, res) => {
  try {
    const { filename, contentType, size } = req.body || {};
    const slot = parseInt((req.body && req.body.slot) || req.query.slot || '1', 10) || 1;
    const ext = path.extname(String(filename || '')).toLowerCase();
    if (!VIDEO_EXT.test(ext) || !/^video\//.test(String(contentType || ''))) {
      return res.status(400).json({ error: 'Only video files are allowed' });
    }
    if (Number(size) > MAX_VIDEO_BYTES) {
      return res.status(400).json({ error: 'Video is too large (max 100 MB)' });
    }
    const filePath = storage.uniqueName(`video${ext}`, `hero-video-slot${slot}-`);
    const signed = await storage.createSignedUpload(storage.VIDEO_BUCKET, filePath);
    res.json({ ...signed, bucket: storage.VIDEO_BUCKET, slot });
  } catch (err) {
    console.error('[hero-video] upload-url error:', err);
    res.status(statusFor(err, 500)).json({ error: err.message });
  }
});

router.post('/hero-video', auth, (req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('multipart/form-data')) {
    upload.video.single('hero_video')(req, res, (err) => {
      if (err) {
        console.error('[hero-video] multer error:', err.message);
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  } else {
    next();
  }
}, async (req, res) => {
  let uploaded = null;
  try {
    let publicUrl = null;
    const slot = parseInt(req.body.slot || req.query.slot || '1', 10) || 1;
    const settingKey = settingKeyFor(slot);

    if (req.file) {
      // Small files only on Vercel (see middleware/upload.js); the admin UI uses the direct upload for files.
      console.log('[hero-video] file received:', req.file.originalname, req.file.size, 'bytes', 'slot', slot);
      const ext = path.extname(req.file.originalname).toLowerCase();
      uploaded = await storage.uploadBuffer({
        bucket: storage.VIDEO_BUCKET,
        filePath: storage.uniqueName(`video${ext}`, `hero-video-slot${slot}-`),
        buffer: req.file.buffer,
        contentType: req.file.mimetype
      });
      publicUrl = uploaded.url;
      console.log('[hero-video] public URL:', publicUrl);
    } else if (req.body && req.body.url) {
      publicUrl = req.body.url;
    } else {
      return res.status(400).json({ error: 'No file or URL provided' });
    }

    const { error: dbError } = await supabase
      .from('settings')
      .upsert([{ key: settingKey, value: publicUrl }], { onConflict: 'key' });

    if (dbError) {
      console.error('[hero-video] DB upsert error:', dbError);
      throw dbError;
    }

    res.json({ url: publicUrl, slot });
  } catch (err) {
    await storage.removeObject(uploaded); // avoid an orphaned file if saving the setting failed
    console.error('[hero-video] 500 error:', err);
    res.status(statusFor(err, 500)).json({ error: err.message });
  }
});

router.delete('/hero-video', auth, async (req, res) => {
  try {
    const slot = parseInt(req.body.slot || req.query.slot || '1', 10) || 1;
    const settingKey = settingKeyFor(slot);
    const { error } = await supabase
      .from('settings')
      .upsert([{ key: settingKey, value: '' }], { onConflict: 'key' });
    if (error) throw error;
    res.json({ message: 'Hero video removed', slot });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
