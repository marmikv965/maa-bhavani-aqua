const router = require('express').Router();
const supabase = require('../config/supabase');
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

router.post('/', async (req, res) => {
  try {
    const { name, company, phone, email, product, message } = req.body;
    if (!name || !phone || !email) return res.status(400).json({ error: 'Name, phone and email required' });
    const { data, error } = await supabase.from('enquiries')
      .insert([{ name, company, phone, email, product, message, status: 'new', ip: req.ip }])
      .select().single();
    if (error) throw error;
    try {
      await transporter.sendMail({
        from: `"Maa Bhavani Website" <${process.env.MAIL_FROM}>`,
        to: process.env.MAIL_TO,
        subject: `New Enquiry from ${name} – ${product || 'General'}`,
        html: `<h2>New Website Enquiry</h2><table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px;border:1px solid #ddd"><b>Name</b></td><td style="padding:8px;border:1px solid #ddd">${name}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd"><b>Company</b></td><td style="padding:8px;border:1px solid #ddd">${company||'-'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd"><b>Phone</b></td><td style="padding:8px;border:1px solid #ddd">${phone}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd"><b>Email</b></td><td style="padding:8px;border:1px solid #ddd">${email}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd"><b>Product</b></td><td style="padding:8px;border:1px solid #ddd">${product||'-'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd"><b>Message</b></td><td style="padding:8px;border:1px solid #ddd">${message||'-'}</td></tr>
        </table>`
      });
    } catch (e) { console.error('Mail error:', e.message); }
    res.status(201).json({ message: 'Enquiry submitted', id: data.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const from = (page - 1) * limit;
    let q = supabase.from('enquiries').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, from + limit - 1);
    if (req.query.status) q = q.eq('status', req.query.status);
    const { data, error, count } = await q;
    if (error) throw error;
    res.json({ enquiries: data, total: count, page, pages: Math.ceil(count / limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('enquiries').update({ status: req.body.status }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const { error } = await supabase.from('enquiries').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
