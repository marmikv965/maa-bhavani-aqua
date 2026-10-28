const router = require('express').Router();
const supabase = require('../config/supabase');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const fs = require('fs');
const path = require('path');

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

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
  try {
    let publicUrl = null;
    const slot = parseInt(req.body.slot || req.query.slot || '1', 10) || 1;
    const settingKey = slot === 1 ? 'hero_video_url' : `hero_video_url_${slot}`;

    if (req.file) {
      console.log('[hero-video] file received:', req.file.originalname, req.file.size, 'bytes', 'slot', slot);
      const fileBuffer = fs.readFileSync(req.file.path);
      const ext = path.extname(req.file.originalname);
      const fileName = `hero-video-slot${slot}-${Date.now()}${ext}`;
      const bucket = 'hero-media';

      console.log('[hero-video] uploading to Supabase bucket:', bucket, 'as', fileName);
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, fileBuffer, { contentType: req.file.mimetype, upsert: true });

      fs.unlinkSync(req.file.path);

      if (uploadError) {
        console.error('[hero-video] Supabase upload error:', uploadError);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      publicUrl = urlData.publicUrl;
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
    console.error('[hero-video] 500 error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/hero-video', auth, async (req, res) => {
  try {
    const slot = parseInt(req.body.slot || req.query.slot || '1', 10) || 1;
    const settingKey = slot === 1 ? 'hero_video_url' : `hero_video_url_${slot}`;
    const { error } = await supabase
      .from('settings')
      .upsert([{ key: settingKey, value: '' }], { onConflict: 'key' });
    if (error) throw error;
    res.json({ message: 'Hero video removed', slot });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
