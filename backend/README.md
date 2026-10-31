# Maa Bhavani Backend – Supabase

## Setup

1. Create project at https://supabase.com
2. Run `backend/config/supabase-schema.sql` in Supabase SQL Editor
3. Copy keys from Supabase Dashboard → Settings → API

```bash
cd backend
cp .env.example .env
# Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
npm install
npm run seed
npm start
```

## Admin Panel
Open: `admin/login.html`
Default: `admin@maabhavaniaqua.com` / `Admin@2025!`

## API
- `POST /api/auth/login` `GET /api/auth/me` `POST /api/auth/change-password`
- `GET /api/products` `GET /api/products/_all` (auth) `POST PUT DELETE /api/products/:id` (auth)
- `POST /api/enquiries` (public) `GET PATCH DELETE /api/enquiries` (auth)
- Same pattern: `/api/solutions` `/api/industries` `/api/banners` `/api/brands` `/api/resources`
- `GET /api/settings` (public) `PUT /api/settings` (auth)

## Deploying on Vercel
- The static website and admin live in `public/` (served by Vercel directly). `api/index.js` exposes `backend/server.js`; `vercel.json` sends `/api/*` and legacy `/uploads/*` to it.
- Required env vars (Production): `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET`. Optional: `JWT_EXPIRES_IN`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `MAIL_TO`, `FRONTEND_URL`.
- Check `https://<your-domain>/api/health` – it lists the NAMES of any missing variables.
- The filesystem is read-only on Vercel: uploads go to Supabase Storage, never to `backend/uploads`.

## Notes
- Storage buckets (both **public**): `hero-media` (hero videos) and `site-uploads` (images/PDFs for products, solutions, industries, banners, brands, resources). Missing buckets are auto-created on first upload.
- Hero videos are uploaded straight from the browser to Supabase with a signed URL (`POST /api/settings/hero-video/upload-url`), then saved with `POST /api/settings/hero-video`.
- Old `/uploads/<file>` URLs in the database redirect to `site-uploads/<file>`.
- Re-run `npm run seed` to overwrite the stored `site_name` setting.
- Set a strong `JWT_SECRET` in `.env`.
