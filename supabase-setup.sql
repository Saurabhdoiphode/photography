create extension if not exists "pgcrypto";

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  email text not null,
  phone text,
  event_type text not null,
  event_date date not null,
  status text not null default 'inquiry' check (status in ('inquiry', 'confirmed', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.galleries (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  access_code text not null unique,
  event_date date,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  storage_path text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.bookings enable row level security;
alter table public.galleries enable row level security;
alter table public.gallery_photos enable row level security;

create index if not exists bookings_event_date_idx on public.bookings(event_date);
create index if not exists gallery_photos_gallery_id_idx on public.gallery_photos(gallery_id);
