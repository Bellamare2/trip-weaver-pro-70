
-- Drop FKs to auth.users and make owner_id nullable so unauthenticated use works
alter table public.guests drop constraint if exists guests_owner_id_fkey;
alter table public.itineraries drop constraint if exists itineraries_owner_id_fkey;
alter table public.events drop constraint if exists events_owner_id_fkey;

alter table public.guests alter column owner_id drop not null;
alter table public.itineraries alter column owner_id drop not null;
alter table public.events alter column owner_id drop not null;

-- Replace per-owner policies with public access
drop policy if exists "own guests select" on public.guests;
drop policy if exists "own guests insert" on public.guests;
drop policy if exists "own guests update" on public.guests;
drop policy if exists "own guests delete" on public.guests;
create policy "public guests all" on public.guests for all using (true) with check (true);

drop policy if exists "own itineraries select" on public.itineraries;
drop policy if exists "own itineraries insert" on public.itineraries;
drop policy if exists "own itineraries update" on public.itineraries;
drop policy if exists "own itineraries delete" on public.itineraries;
create policy "public itineraries all" on public.itineraries for all using (true) with check (true);

drop policy if exists "own events select" on public.events;
drop policy if exists "own events insert" on public.events;
drop policy if exists "own events update" on public.events;
drop policy if exists "own events delete" on public.events;
create policy "public events all" on public.events for all using (true) with check (true);
