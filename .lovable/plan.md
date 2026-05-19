
# Bellamare Concierge — build plan

Rebuilds the existing app to match the new brief. Keeps Lovable Cloud as the database, no auth (single-user internal tool as specified).

## 1. Rebrand

- App name everywhere: **Bellamare Concierge** (Los Cabos, Mexico).
- Palette: deep navy + warm sand + subtle gold accent. Refresh tokens in `src/styles.css`.
- Typography: **Playfair Display** (headings) + **Inter** (body). Load via Google Fonts in `__root.tsx` head.
- New landing page copy reflecting luxury property management.

## 2. Data model changes

The current schema has separate `itineraries` and `events` tables. The brief treats an itinerary as **the guest's collection of activity cards** — no wrapper entity. We collapse to a single `activities` table per guest.

Migration:

- **Extend `guests`** with new columns:
  - `nationality text`, `email text` (exists), `whatsapp text`, `phone text` (exists), `language text`
  - `property text` (free-text property name)
  - `check_in date`, `check_out date`, `party_size int`
  - `tags text[]` — values: `VIP | Returning | First Stay | Corporate`
  - `dietary text`, `room_prefs text`, `favorite_activities text`, `allergies text`, `vip_notes text`, `special_notes text`
- **Create `activities`** table replacing the role of `events`:
  - `id`, `guest_id` (FK → guests, cascade)
  - `name text`, `category text` (Dining/Transportation/Excursion/Spa/Private Chef/Grocery/Housekeeping/Other)
  - `date date`, `start_time time`, `duration_minutes int`
  - `vendor text`, `location text`, `notes text`
  - `price_usd numeric`, `confirmation_number text`
  - `status text default 'Requested'` (Requested/Confirmed/Cancelled)
  - `created_at`, `updated_at`
- **Drop** `itineraries` and `events` tables (no production data — empty per recent query).
- RLS: keep public access policies (no auth).

## 3. Routes & navigation

New structure under `_authenticated` layout (kept as a generic app layout, no auth check):

```
src/routes/_authenticated/
  app.index.tsx                  -> /app          Dashboard (home)
  app.guests.index.tsx           -> /app/guests   Guest list
  app.guests.$guestId.tsx        -> /app/guests/:id  Tabs: Overview | Preferences | Itinerary | History
  app.calendar.tsx               -> /app/calendar Month/week calendar
  app.settings.tsx               -> /app/settings Properties + tag colors
```

Sidebar (desktop) + collapsible top nav (mobile) with icons: Dashboard, Guests, Calendar, Settings. Sidebar uses shadcn `Sidebar` so it can collapse.

## 4. Pages

### Dashboard (`/app`)
- Top global search bar (guest name or activity name).
- 4 stat tiles: Active guests today, Upcoming check-ins (next 7 days), Pending confirmations, Today's confirmed activities.
- Two columns: "Today's schedule" list + "Pending requests" list (one-click confirm/cancel).

### Guests (`/app/guests`)
- Filterable list (search, tag chip filter).
- "New guest" dialog with all new fields and tag multi-select.

### Guest detail (`/app/guests/:id`)
- Tabs: Overview · Preferences · Itinerary · History.
  - **Overview**: contact, property, stay dates, party size, tag badges.
  - **Preferences**: dietary, room, favorites, allergies, language, VIP notes, special notes — inline-editable.
  - **Itinerary**: timeline grouped by day; add/edit/delete activity cards; status toggle; Print/PDF button (browser print with print-only stylesheet).
  - **History**: past activities (date < today) and previous stays.

### Calendar (`/app/calendar`)
- Month and week views (custom grid; reuse existing day-grid logic).
- Color-coded by status (gold = Requested, green = Confirmed, red = Cancelled).
- Filter bar: guest, property, status, category.
- Click event → side panel (Sheet) with full detail + status toggle + link to guest.
- "Add activity" button → dialog with guest dropdown so items can be created from anywhere.

### Settings (`/app/settings`)
- Manage property list (used in the guest "property" select).
- Tag legend.

## 5. Shared components

- `StatusBadge` — clickable, cycles Requested → Confirmed → Cancelled; instant optimistic update via TanStack Query mutation.
- `ActivityCard` — used in itinerary timeline and dashboard lists.
- `ActivityDialog` — create/edit; reused from itinerary tab, calendar, and global "Add Activity".
- `GuestTagPill` — colored per tag.

## 6. Implementation order

1. Migration (schema changes).
2. Tokens + fonts + sidebar shell + rebrand.
3. Guest list + guest dialog (with new fields) + guest detail tabs.
4. Activity model: dialog, card, status badge, itinerary timeline tab.
5. Dashboard (depends on activities + guests).
6. Global calendar with filters and side panel.
7. Settings (properties).
8. Print/PDF layout polish.

## Technical notes (skip if non-technical)

- Keep TanStack Start routing; all data via `supabase` client (RLS open).
- Use TanStack Query for caching + invalidation on mutations.
- No auth scaffolding remains; `_authenticated` folder kept only as a structural layout to preserve routes; rename optional later.
- PDF = browser-native print with `@media print` stylesheet (already partially scaffolded).
