require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const supabase = require('./supabase');

async function seed() {
  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);

  const { error: ae } = await supabase.from('admins').upsert([{
    name: process.env.ADMIN_NAME || 'Site Administrator',
    email: process.env.ADMIN_EMAIL.toLowerCase(),
    password_hash: hash,
    role: 'superadmin'
  }], { onConflict: 'email' });
  if (ae) { console.error('Admin seed error:', ae.message); } else { console.log('✅ Admin seeded:', process.env.ADMIN_EMAIL); }

  const defaults = [
    { key: 'site_name', value: 'Maa Bhavani Aqua Solutions' },
    { key: 'tagline', value: 'Purity Powered by Trust' },
    { key: 'phone', value: '+91 99999 99999' },
    { key: 'email', value: 'info@maabhavaniaqua.com' },
    { key: 'address', value: 'India' },
    { key: 'whatsapp', value: '+91 99999 99999' },
    { key: 'meta_description', value: 'Leading supplier of RO membranes, water treatment chemicals, antiscalants, resins and industrial spares across India.' },
  ];

  const { error: se } = await supabase.from('settings').upsert(defaults, { onConflict: 'key' });
  if (se) { console.error('Settings seed error:', se.message); } else { console.log('✅ Settings seeded'); }

  console.log('Done.');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
