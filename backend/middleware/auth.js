const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

module.exports = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { data, error } = await supabase
      .from('admins')
      .select('id, name, email, role')
      .eq('id', decoded.id)
      .single();
    if (error || !data) return res.status(401).json({ error: 'Admin not found' });
    req.admin = data;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
