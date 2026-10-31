const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const { requireEnv } = require('../config/env');

module.exports = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    requireEnv('JWT_SECRET');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { data, error } = await supabase
      .from('admins')
      .select('id, name, email, role')
      .eq('id', decoded.id)
      .single();
    if (error || !data) return res.status(401).json({ error: 'Admin not found' });
    req.admin = data;
    next();
  } catch (err) {
    if (err && err.code === 'ENV_MISSING') return res.status(500).json({ error: err.message });
    res.status(401).json({ error: 'Invalid token' });
  }
};
