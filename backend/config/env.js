// Helpers for clear, actionable errors when required environment variables are missing.
// Only variable NAMES are ever reported – never values.

function missingEnv(names) {
  return names.filter(n => !process.env[n] || !String(process.env[n]).trim());
}

function envError(missing) {
  const err = new Error(
    `Server misconfigured: missing environment variable(s): ${missing.join(', ')}. ` +
    'Add them in Vercel → Project → Settings → Environment Variables (Production), then redeploy.'
  );
  err.code = 'ENV_MISSING';
  err.status = 500;
  return err;
}

function requireEnv(...names) {
  const missing = missingEnv(names);
  if (missing.length) throw envError(missing);
}

// HTTP status for an error: configuration problems are always 500, others use the fallback.
function statusFor(err, fallback) {
  return err && err.code === 'ENV_MISSING' ? 500 : fallback;
}

module.exports = { missingEnv, envError, requireEnv, statusFor };
