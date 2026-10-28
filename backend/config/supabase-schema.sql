-- Run this in Supabase SQL Editor

create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  password_hash text not null,
  role text default 'editor' check (role in ('superadmin','editor')),
  last_login timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  category text not null check (category in ('membranes','chemicals','antiscalants','resins','filter-cartridges','industrial-spares')),
  icon text default '💧',
  short_desc text,
  description text,
  tags text[],
  image text,
  is_active boolean default true,
  sort_order int default 0,
  meta_title text,
  meta_desc text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists solutions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  icon text default '💧',
  number text,
  short_desc text,
  description text,
  image text,
  is_active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists industries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  icon text default '🏭',
  gradient_from text default '#0a4f8f',
  gradient_to text default '#1ba0d8',
  short_desc text,
  description text,
  image text,
  is_active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  badge text,
  image text,
  cta1_label text default 'Request Quote',
  cta1_link text default '/pages/contact.html',
  cta2_label text default 'Contact Us',
  cta2_link text default '/pages/contact.html',
  is_active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo text,
  description text,
  website text,
  is_active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  icon text default '📄',
  description text,
  file_url text,
  category text default 'guide' check (category in ('guide','datasheet','calculator','checklist','procedure')),
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  phone text not null,
  email text not null,
  product text,
  message text,
  status text default 'new' check (status in ('new','read','replied','closed')),
  ip text,
  created_at timestamptz default now()
);

create index if not exists idx_products_category on products(category, is_active);
create index if not exists idx_enquiries_status on enquiries(status, created_at desc);

-- Row Level Security: disable for service role (backend uses service key)
alter table admins enable row level security;
alter table products enable row level security;
alter table solutions enable row level security;
alter table industries enable row level security;
alter table banners enable row level security;
alter table brands enable row level security;
alter table resources enable row level security;
alter table settings enable row level security;
alter table enquiries enable row level security;

-- Allow service role full access (backend uses SUPABASE_SERVICE_KEY)
create policy "service_all" on admins for all using (true);
create policy "service_all" on products for all using (true);
create policy "service_all" on solutions for all using (true);
create policy "service_all" on industries for all using (true);
create policy "service_all" on banners for all using (true);
create policy "service_all" on brands for all using (true);
create policy "service_all" on resources for all using (true);
create policy "service_all" on settings for all using (true);
create policy "service_all" on enquiries for all using (true);
