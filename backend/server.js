require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('combined'));
const allowedOrigins = (process.env.FRONTEND_URL || '*').split(',').map(o => o.trim());
app.use(cors({
  origin: allowedOrigins.includes('*') ? true : allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 2000 }));
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }));
app.post('/api/enquiries', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }));

// ── API ROUTES (must be before static) ──────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/products',   require('./routes/products'));
app.use('/api/solutions',  require('./routes/solutions'));
app.use('/api/industries', require('./routes/industries'));
app.use('/api/enquiries',  require('./routes/enquiries'));
app.use('/api/banners',    require('./routes/banners'));
app.use('/api/settings',   require('./routes/settings'));
app.use('/api/brands',     require('./routes/brands'));
app.use('/api/resources',  require('./routes/resources'));
app.get('/api/health', (req, res) => res.json({ status: 'ok', db: 'supabase', time: new Date() }));

// ── STATIC FILES ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
  let p = req.path;
  try { p = decodeURIComponent(p); } catch { return res.status(400).end(); }
  if (/^\/backend(\/|$)/i.test(p) || /(^|\/)\./.test(p)) return res.status(404).end();
  next();
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/admin',   express.static(path.join(__dirname, '../admin')));
app.use(express.static(path.join(__dirname, '..'), { dotfiles: 'deny' }));

// ── FALLBACK HTML ROUTES ─────────────────────────────────────────────────
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../admin/index.html')));
app.get('/admin/login', (req, res) => res.sendFile(path.join(__dirname, '../admin/login.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../index.html')));

app.use((err, req, res, next) => res.status(err.status || 500).json({ error: err.message || 'Server error' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`\n✅ Server running!\n\n  Website → http://localhost:${PORT}\n  Admin   → http://localhost:${PORT}/admin\n  Login   → http://localhost:${PORT}/admin/login.html\n`)
);
