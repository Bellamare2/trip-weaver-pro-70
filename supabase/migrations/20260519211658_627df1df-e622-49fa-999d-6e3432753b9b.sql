
-- Drop old domain
drop table if exists public.events cascade;
drop table if exists public.itineraries cascade;

-- Extend guests
alter table public.guests
  add column if not exists nationality text,
  add column if not exists whatsapp text,
  add column if not exists language text,
  add column if not exists property text,
  add column if not exists check_in date,
  add column if not exists check_out date,
  add column if not exists party_size int,
  add column if not exists tags text[] not null default '{}',
  add column if not exists dietary text,
  add column if not exists room_prefs text,
  add column if not exists favorite_activities text,
  add column if not exists allergies text,
  add column if not exists vip_notes text,
  add column if not exists special_notes text;

-- Activities (per guest)
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests(id) on delete cascade,
  name text not null,
  category text not null default 'Other',
  date date not null,
  start_time time,
  duration_minutes int,
  vendor text,
  location text,
  notes text,
  price_usd numeric(10,2),
  confirmation_number text,
  status text not null default 'Requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index activities_guest_idx on public.activities(guest_id);
create index activities_date_idx on public.activities(date);

alter table public.activities enable row level security;
create policy "public activities all" on public.activities for all using (true) with check (true);

create trigger touch_activities before update on public.activities
  for each row execute function public.touch_updated_at();

-- Properties (for settings)
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
alter table public.properties enable row level security;
create policy "public properties all" on public.properties for all using (true) with check (true);

insert into public.properties (name) values
  ('Casa Bellamare'), ('Villa Coral'), ('Hacienda del Mar'), ('Punta Vista')
on conflict (name) do nothing;
