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

## Notes
- Hero video upload needs a **public** Supabase Storage bucket named `hero-media`.
- Re-run `npm run seed` to overwrite the stored `site_name` setting.
- Set a strong `JWT_SECRET` in `.env`.
