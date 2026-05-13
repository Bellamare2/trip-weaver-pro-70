
-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- handle new user trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end; $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- guests
create table public.guests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  room_number text,
  preferences text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.guests enable row level security;
create policy "own guests select" on public.guests for select using (auth.uid() = owner_id);
create policy "own guests insert" on public.guests for insert with check (auth.uid() = owner_id);
create policy "own guests update" on public.guests for update using (auth.uid() = owner_id);
create policy "own guests delete" on public.guests for delete using (auth.uid() = owner_id);
create index guests_owner_idx on public.guests(owner_id);

-- itineraries
create table public.itineraries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  title text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.itineraries enable row level security;
create policy "own itineraries select" on public.itineraries for select using (auth.uid() = owner_id);
create policy "own itineraries insert" on public.itineraries for insert with check (auth.uid() = owner_id);
create policy "own itineraries update" on public.itineraries for update using (auth.uid() = owner_id);
create policy "own itineraries delete" on public.itineraries for delete using (auth.uid() = owner_id);
create index itineraries_guest_idx on public.itineraries(guest_id);
create index itineraries_owner_idx on public.itineraries(owner_id);

-- events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  itinerary_id uuid not null references public.itineraries(id) on delete cascade,
  title text not null,
  event_type text not null default 'activity',
  start_time timestamptz not null,
  end_time timestamptz,
  location_name text,
  address text,
  phone text,
  website text,
  latitude double precision,
  longitude double precision,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.events enable row level security;
create policy "own events select" on public.events for select using (auth.uid() = owner_id);
create policy "own events insert" on public.events for insert with check (auth.uid() = owner_id);
create policy "own events update" on public.events for update using (auth.uid() = owner_id);
create policy "own events delete" on public.events for delete using (auth.uid() = owner_id);
create index events_itinerary_idx on public.events(itinerary_id);
create index events_owner_idx on public.events(owner_id);

-- updated_at triggers
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger touch_profiles before update on public.profiles for each row execute function public.touch_updated_at();
create trigger touch_guests before update on public.guests for each row execute function public.touch_updated_at();
create trigger touch_itineraries before update on public.itineraries for each row execute function public.touch_updated_at();
create trigger touch_events before update on public.events for each row execute function public.touch_updated_at();
