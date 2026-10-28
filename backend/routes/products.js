const router = require('express').Router();
const supabase = require('../config/supabase');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', async (req, res) => {
  try {
    let q = supabase.from('products').select('*').eq('is_active', true).order('sort_order');
    if (req.query.category) q = q.eq('category', req.query.category);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/_all', auth, async (req, res) => {
  try {
    let q = supabase.from('products').select('*').order('sort_order');
    if (req.query.category) q = q.eq('category', req.query.category);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:slug', async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').select('*').eq('slug', req.params.slug).eq('is_active', true).single();
    if (error) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function toDbFields(input) {
  const d = { ...input };
  if ('shortDesc' in d) { d.short_desc = d.shortDesc; delete d.shortDesc; }
  if ('isActive' in d) { d.is_active = d.isActive; delete d.isActive; }
  return d;
}

router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    let d = JSON.parse(req.body.data || '{}');
    d = toDbFields(d);
    if (req.file) d.image = '/uploads/' + req.file.filename;
    if (d.is_active === undefined) d.is_active = true;
    const { data, error } = await supabase.from('products').insert([d]).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    let d = JSON.parse(req.body.data || '{}');
    d = toDbFields(d);
    ['id','created_at'].forEach(k => delete d[k]);
    d.updated_at = new Date().toISOString();
    if (req.file) d.image = '/uploads/' + req.file.filename;
    const { data, error } = await supabase.from('products').update(d).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const { error } = await supabase.from('products').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
