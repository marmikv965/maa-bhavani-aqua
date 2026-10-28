const express = require('express');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const supabase = require('../config/supabase');

const TABLES = {
  solutions:  { order: 'sort_order', file: 'image' },
  industries: { order: 'sort_order', file: 'image' },
  banners:    { order: 'sort_order', file: 'image' },
  brands:     { order: 'sort_order', file: 'logo' },
  resources:  { order: 'created_at', file: 'file_url' }
};
const RESERVED = ['id', 'created_at', 'updated_at'];

module.exports = function crudRouter(table) {
  const cfg = TABLES[table] || { order: 'created_at', file: 'image' };
  const router = express.Router();

  const parse = (req) => {
    const d = req.body && req.body.data ? JSON.parse(req.body.data) : { ...req.body };
    RESERVED.forEach(k => delete d[k]);
    if (req.file) d[cfg.file] = '/uploads/' + req.file.filename;
    return d;
  };

  router.get('/', async (req, res) => {
    try {
      const { data, error } = await supabase.from(table).select('*').eq('is_active', true).order(cfg.order);
      if (error) throw error;
      res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/_all', auth, async (req, res) => {
    try {
      const { data, error } = await supabase.from(table).select('*').order(cfg.order);
      if (error) throw error;
      res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/:id', async (req, res) => {
    try {
      const { data, error } = await supabase.from(table).select('*').eq('id', req.params.id).single();
      if (error) return res.status(404).json({ error: 'Not found' });
      res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/', auth, upload.single('image'), async (req, res) => {
    try {
      const d = parse(req);
      if (d.is_active === undefined) d.is_active = true;
      const { data, error } = await supabase.from(table).insert([d]).select().single();
      if (error) throw error;
      res.status(201).json(data);
    } catch (err) { res.status(400).json({ error: err.message }); }
  });

  router.put('/:id', auth, upload.single('image'), async (req, res) => {
    try {
      const d = parse(req);
      const { data, error } = await supabase.from(table).update(d).eq('id', req.params.id).select().single();
      if (error) throw error;
      res.json(data);
    } catch (err) { res.status(400).json({ error: err.message }); }
  });

  router.delete('/:id', auth, async (req, res) => {
    try {
      const { error } = await supabase.from(table).delete().eq('id', req.params.id);
      if (error) throw error;
      res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  return router;
};
