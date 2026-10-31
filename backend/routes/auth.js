const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const { requireEnv } = require('../config/env');

const sign = (id) => requireEnv('JWT_SECRET') || jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const { data, error } = await supabase.from('admins').select('*').eq('email', email.toLowerCase()).single();
    if (error || !data) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, data.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    await supabase.from('admins').update({ last_login: new Date().toISOString() }).eq('id', data.id);
    res.json({ token: sign(data.id), admin: { id: data.id, name: data.name, email: data.email, role: data.role } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/me', authMiddleware, (req, res) => res.json(req.admin));

router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { current, newPassword } = req.body;
    const { data } = await supabase.from('admins').select('password_hash').eq('id', req.admin.id).single();
    const ok = await bcrypt.compare(current, data.password_hash);
    if (!ok) return res.status(400).json({ error: 'Current password incorrect' });
    const hash = await bcrypt.hash(newPassword, 12);
    await supabase.from('admins').update({ password_hash: hash }).eq('id', req.admin.id);
    res.json({ message: 'Password changed' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
