const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
const { envError } = require('./env');

let client = null;

// The client is created lazily (on first use) so a missing/invalid variable produces a clear
// error on the request that needs it, instead of crashing the whole function at import time
// with "supabaseUrl is required".
function getClient() {
  if (client) return client;

  const url = (process.env.SUPABASE_URL || '').trim();
  // SUPABASE_SERVICE_KEY is the name used by this project; SUPABASE_SERVICE_ROLE_KEY is accepted
  // as a fallback because Supabase's Vercel integration uses that name.
  const key = (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  const missing = [];
  if (!url) missing.push('SUPABASE_URL');
  if (!key) missing.push('SUPABASE_SERVICE_KEY');
  if (missing.length) throw envError(missing);

  try { new URL(url); } catch {
    const err = new Error('Server misconfigured: SUPABASE_URL is not a valid URL (expected https://<project-ref>.supabase.co).');
    err.code = 'ENV_MISSING';
    err.status = 500;
    throw err;
  }

  client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: ws }
  });
  return client;
}

// Keeps the original `const supabase = require('../config/supabase'); supabase.from(...)` usage working.
module.exports = new Proxy({}, {
  get(_, prop) {
    if (prop === 'getClient') return getClient;
    const c = getClient();
    const v = c[prop];
    return typeof v === 'function' ? v.bind(c) : v;
  }
});
