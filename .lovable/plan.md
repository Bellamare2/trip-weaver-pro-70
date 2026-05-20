
# Bellamare Property OS — build plan

Transforms the current guest-itinerary app into a full property management operating system for luxury Los Cabos homes. This is a large multi-phase rebuild; I'll ship it in clearly-scoped phases so each phase is reviewable and the app stays usable between them.

## 1. Architecture & access model

Three roles backed by a `user_roles` table (`manager`, `owner`, `vendor`):
- **Manager** — full access to everything.
- **Owner** — read-only portal scoped to their properties only.
- **Vendor** — read/update only on maintenance tickets assigned to them.

Auth: enable email/password + Google sign-in (currently no auth). Use the standard `profiles` + `user_roles` + `has_role()` security-definer pattern. RLS policies on every new table keyed off role + property ownership.

Sidebar reorganizes into sections: **Operations** (Dashboard, Calendar, Inspections, Maintenance, Arrivals/Departures), **Catalog** (Properties, Vendors, Vehicles, Guests), **Finance** (Expenses, Reports), **Settings**. Owner role sees a slimmed sidebar (Dashboard, My Properties, Reports, Messages).

## 2. Data model (new tables)

Keep existing `guests` + `activities` (concierge module stays). Add:

- `properties` (expand existing) — add address, community, gps, photos[], wifi_ssid, wifi_password, gate_codes, alarm_code, alarm_company, utility_providers (jsonb), insurance (jsonb), property_tax (jsonb), floor_plan_url, owner_user_id, emergency_contacts (jsonb)
- `property_documents` — property_id, type, name, file_url, expires_at
- `property_service_providers` — property_id, vendor_id, role (pool/landscape/etc.)
- `vendors` — name, category, contact_name, phone, email, insurance_status, insurance_expires_at, notes
- `inspections` — property_id, inspector_id, type, date, overall_status, summary, pdf_url
- `inspection_findings` — inspection_id, category, description, priority, photos[], status
- `maintenance_tickets` — property_id, title, description, photos[], vendor_id, status, priority, cost_estimate, invoice_url, owner_approval_status, created_at
- `maintenance_comments` — ticket_id, author_id, body
- `expenses` — property_id, date, vendor_id, category, amount_usd, invoice_url, description
- `arrival_departure_checklists` — property_id, type (arrival/departure), scheduled_date, items (jsonb of {label, done, done_at, done_by})
- `vehicles` — property_id, name, make, model, year, vin, insurance_expires_at, registration_expires_at, last_inspection_at, battery_status, fuel_level
- `calendar_events` — virtual view aggregating arrivals, departures, inspections, maintenance, vendor visits (built client-side from existing tables; no new table)
- `owner_messages` — property_id, from_user_id, to_user_id, body, read_at

All tables get RLS: managers full access; owners select-only scoped via `properties.owner_user_id = auth.uid()`; vendors select/update on their assigned tickets only.

## 3. Modules & routes

```
/app                            Dashboard (KPIs)
/app/properties                 List + filters
/app/properties/$id             Tabs: Overview · Access · Providers · Documents · Vehicles · History
/app/inspections                List + new
/app/inspections/$id            Detailed report + PDF export
/app/maintenance                Kanban by status
/app/maintenance/$id            Ticket detail w/ owner approval + comments
/app/arrivals                   Arrival/departure checklists per stay
/app/vendors                    Vendor directory
/app/vehicles                   Fleet list w/ reminders
/app/expenses                   Ledger + monthly summary
/app/calendar                   Unified calendar (extended from existing)
/app/reports                    Report generator (PDF)
/app/guests                     Existing concierge (kept)
/app/settings                   Properties tags, role management

/owner                          Owner dashboard
/owner/properties/$id           Read-only property view
/owner/reports                  Inspection + expense reports
/owner/approvals                Pending maintenance approvals
/owner/messages                 Messages
```

## 4. Key features

- **KPI dashboard cards** with sparkline trends.
- **PDF reports** via browser print + dedicated print stylesheet (already scaffolded for guests) — extended to inspections, monthly owner statements, maintenance history.
- **File uploads** via Supabase Storage buckets: `property-photos`, `inspection-photos`, `documents`, `invoices`.
- **Owner approval workflow** — maintenance ticket > cost threshold triggers `Waiting Owner Approval`; owner approves/rejects from portal; notifies manager.
- **Reminders** — derived client-side: vehicle insurance/registration expiring in <30 days, inspection overdue, document expirations.
- **Activity feed** per property — union of inspections, maintenance, expenses, arrivals.

## 5. Visual design

Keep current Playfair Display + Inter, navy/sand/gold palette. Add:
- Soft shadow scale (`shadow-elegant-sm/md/lg`) tokens in `styles.css`.
- Recharts for finance/expense charts (line + donut), styled with theme tokens.
- Status pill system extended (Open/Scheduled/In Progress/Completed/Waiting Approval).
- Timeline component for property history & activity feed.
- Empty states with line-art illustrations.

## 6. Phased delivery

Given the scope, I'll ship in 4 phases. Each phase ends with a working app.

**Phase 1 — Foundation (this turn)**
- Auth (email/password + Google) + roles table + role-based routing.
- Schema migration for all new tables + RLS + storage buckets.
- New sidebar with role-aware nav.
- Properties module (full): list, detail tabs, all access/provider/document data.
- Vendors module.
- Dashboard KPIs (real data where available, zero-states otherwise).

**Phase 2**
- Inspections (form + report + PDF) + findings.
- Maintenance tickets (kanban + detail + owner approval flow).
- File upload integration across both.

**Phase 3**
- Arrival/Departure checklists.
- Vehicles.
- Expenses + monthly summaries + charts.
- Unified calendar (extends existing).

**Phase 4**
- Owner portal (separate `/owner` layout) with scoped RLS.
- Reports module (multi-report PDF export).
- Messages.
- Sample seed data for demo.

## Technical notes (skip if non-technical)

- Roles: standard `app_role` enum + `user_roles` table + `has_role(uuid, app_role)` security-definer function. No role on profiles.
- RLS for owner scope: `EXISTS (SELECT 1 FROM properties WHERE id = <tbl>.property_id AND owner_user_id = auth.uid())`.
- Storage policies scoped by `(storage.foldername(name))[1] = property_id::text`; managers full; owners read-only on their property folders.
- PDF = browser-native print + `@media print` stylesheet (cheap, no server runtime).
- Calendar stays client-aggregated; no new table needed.
- Charts: add `recharts` (already common in shadcn ecosystem).
- Sample data: a single SQL seed inserted via `supabase--insert` after schema lands, gated on empty tables.

---

This is roughly 4 phases of work. I'd like to start Phase 1 now (auth + schema + properties + vendors + dashboard shell). **Reply "go" to proceed with Phase 1**, or tell me to re-scope (e.g. skip auth/owner portal for an MVP, change role model, etc.).
