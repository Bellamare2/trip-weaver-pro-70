import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  format, parseISO, addDays, addMonths, isSameDay, isSameMonth, startOfDay,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
} from "date-fns";
import {
  Plus, Search, CalendarCheck, Clock, Users, BedDouble,
  ChevronLeft, ChevronRight, Sparkles, ClipboardList, BookOpen,
  LogIn, LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ActivityCard, type ActivityRow } from "@/components/activity-card";
import { GuestTagPill } from "@/components/guest-tag-pill";
import { ActivityDialog, type ActivityDraft } from "@/components/activity-dialog";
import { ReservationDialog } from "@/components/reservation-dialog";
import { StatusBadge } from "@/components/status-badge";
import { categoryAccent, type GuestTag } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

interface DashGuest {
  id: string;
  full_name: string;
  property: string | null;
  check_in: string | null;
  check_out: string | null;
  tags: string[];
}

type ReservationStatus = "Pre-Arrival" | "In House" | "Out";

interface DashReservation {
  id: string;
  guest_id: string;
  property: string | null;
  check_in: string | null;
  check_out: string | null;
  status: ReservationStatus;
  guests: { id: string; full_name: string; tags: string[] } | null;
}

interface DashActivity extends ActivityRow {
  service_type?: string | null;
  guests: { full_name: string; property: string | null } | null;
}

function Dashboard() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [guestRequestOpen, setGuestRequestOpen] = useState(false);
  const [internalRequestOpen, setInternalRequestOpen] = useState(false);
  const [editing, setEditing] = useState<(Partial<ActivityDraft> & { id?: string }) | null>(null);
  const [reservationOpen, setReservationOpen] = useState(false);
  // Quick-add reservation needs a guest — we open ReservationDialog with a guest picker
  const [reservationGuestId, setReservationGuestId] = useState<string | null>(null);

  // Stable reference — new Date() on every render would bust every useMemo below
  const today = useMemo(() => startOfDay(new Date()), []);
  const todayIso = format(today, "yyyy-MM-dd");
  const inSevenDays = format(addDays(today, 7), "yyyy-MM-dd");
  const [cursor, setCursor] = useState<Date>(today);
  const [selectedDay, setSelectedDay] = useState<Date>(today);
  const selectedIso = format(selectedDay, "yyyy-MM-dd");

  const { data: guests } = useQuery({
    queryKey: ["dashboard", "guests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guests")
        .select("id, full_name, property, check_in, check_out, tags");
      if (error) throw error;
      return data as DashGuest[];
    },
  });

  const { data: activities } = useQuery({
    queryKey: ["dashboard", "activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*, guests(full_name, property)")
        .order("date", { ascending: true })
        .order("start_time", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as unknown as DashActivity[];
    },
  });

  const { data: reservations } = useQuery({
    queryKey: ["dashboard", "reservations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("id, guest_id, property, check_in, check_out, status, guests(id, full_name, tags)")
        .neq("status", "Out")
        .order("check_in", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as unknown as DashReservation[];
    },
  });

  const setResStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ReservationStatus }) => {
      const { error } = await supabase.from("reservations").update({ status }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard", "reservations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // In House = reservations with status "In House"
  const inHouse = useMemo(
    () => (reservations ?? []).filter((r) => r.status === "In House"),
    [reservations],
  );

  // Upcoming = Pre-Arrival with check-in within 7 days
  const upcomingCheckins = useMemo(
    () => (reservations ?? [])
      .filter((r) => r.status === "Pre-Arrival" && r.check_in && parseISO(r.check_in) <= addDays(today, 7))
      .sort((a, b) => (a.check_in! < b.check_in! ? -1 : 1)),
    [reservations, today],
  );
  const pending = (activities ?? []).filter((a) => a.status === "Requested");
  const todayConfirmed = (activities ?? []).filter(
    (a) => a.status === "Confirmed" && isSameDay(parseISO(a.date), today),
  );

  // Calendar day-with-events set for visible month
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);
  const eventDays = useMemo(() => {
    const s = new Set<string>();
    (activities ?? []).forEach((a) => s.add(a.date));
    return s;
  }, [activities]);
  const selectedDayActivities = useMemo(
    () => (activities ?? [])
      .filter((a) => a.date === selectedIso)
      .sort((a, b) => (a.start_time ?? "99").localeCompare(b.start_time ?? "99")),
    [activities, selectedIso],
  );

  const search = q.trim().toLowerCase();
  const guestHits = search
    ? (guests ?? []).filter((g) => g.full_name.toLowerCase().includes(search)).slice(0, 5)
    : [];
  const activityHits = search
    ? (activities ?? []).filter((a) => a.name.toLowerCase().includes(search)).slice(0, 5)
    : [];


  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-gold">Today · {format(today, "EEEE, MMM d")}</p>
          <h1 className="mt-1 font-display text-3xl text-primary md:text-4xl">Bellamare desk</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setReservationOpen(true)}>
            <BookOpen className="mr-1.5 h-4 w-4" /> New reservation
          </Button>
          <Button onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> Add activity</Button>
        </div>
      </div>

      {/* Global search */}
      <div className="relative mt-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search guests or activities…"
          className="pl-9 h-11"
        />
        {search && (guestHits.length || activityHits.length) ? (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-elegant">
            {guestHits.length > 0 && (
              <div className="border-b border-border">
                <p className="px-3 pt-2 text-[10px] uppercase tracking-wider text-muted-foreground">Guests</p>
                {guestHits.map((g) => (
                  <Link key={g.id} to="/app/guests/$guestId" params={{ guestId: g.id }} onClick={() => setQ("")} className="block px-3 py-2 text-sm hover:bg-accent">
                    {g.full_name} <span className="text-muted-foreground">· {g.property ?? "—"}</span>
                  </Link>
                ))}
              </div>
            )}
            {activityHits.length > 0 && (
              <div>
                <p className="px-3 pt-2 text-[10px] uppercase tracking-wider text-muted-foreground">Activities</p>
                {activityHits.map((a) => (
                  <Link key={a.id} to="/app/guests/$guestId" params={{ guestId: a.guest_id }} onClick={() => setQ("")} className="block px-3 py-2 text-sm hover:bg-accent">
                    {a.name} <span className="text-muted-foreground">· {a.guests?.full_name ?? ""}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Stat tiles */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="In-residence" value={inHouse.length} icon={Users} />
        <StatTile label="Check-ins · 7 days" value={upcomingCheckins.length} icon={BedDouble} />
        <StatTile label="Pending confirmation" value={pending.length} icon={Clock} accent />
        <StatTile label="Today · confirmed" value={todayConfirmed.length} icon={CalendarCheck} />
      </div>

      {/* Calendar + day timeline */}
      <section className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Mini calendar */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-lg text-primary">{format(cursor, "MMMM yyyy")}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setCursor(addMonths(cursor, -1))} className="rounded p-1 hover:bg-accent"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => { setCursor(today); setSelectedDay(today); }} className="rounded px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:bg-accent">Today</button>
              <button onClick={() => setCursor(addMonths(cursor, 1))} className="rounded p-1 hover:bg-accent"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-y-1 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
            {["S","M","T","W","T","F","S"].map((d, i) => <div key={i}>{d}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-y-1">
            {monthDays.map((d) => {
              const iso = format(d, "yyyy-MM-dd");
              const inMonth = isSameMonth(d, cursor);
              const isSel = isSameDay(d, selectedDay);
              const isToday = isSameDay(d, today);
              const has = eventDays.has(iso);
              return (
                <button
                  key={iso}
                  onClick={() => setSelectedDay(d)}
                  className={`flex h-9 flex-col items-center justify-center rounded text-xs ${
                    isSel ? "bg-primary text-primary-foreground" :
                    isToday ? "bg-gold/20 text-primary" :
                    inMonth ? "text-primary hover:bg-accent" : "text-muted-foreground/50 hover:bg-accent/40"
                  }`}
                >
                  <span className="leading-none">{format(d, "d")}</span>
                  <span className={`mt-0.5 h-1 w-1 rounded-full ${has ? "bg-destructive" : "bg-transparent"}`} />
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <Button variant="outline" size="sm" onClick={() => setReservationOpen(true)} className="justify-start border-primary/30 text-primary hover:bg-primary/5">
              <BookOpen className="mr-1.5 h-4 w-4" /> New Reservation
            </Button>
            <Button variant="outline" size="sm" onClick={() => setGuestRequestOpen(true)} className="justify-start border-gold/50 text-primary hover:bg-gold/10">
              <Sparkles className="mr-1.5 h-4 w-4 text-gold" /> Guest Request
            </Button>
            <Button variant="outline" size="sm" onClick={() => setInternalRequestOpen(true)} className="justify-start">
              <ClipboardList className="mr-1.5 h-4 w-4" /> Internal Request
            </Button>
          </div>
        </div>

        {/* Day timeline */}
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-gold">Day schedule</p>
              <h2 className="font-display text-xl text-primary">{format(selectedDay, "EEEE, MMMM d")}</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedDayActivities.length} item{selectedDayActivities.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="max-h-[520px] overflow-y-auto p-3">
            {selectedDayActivities.length === 0 ? (
              <div className="rounded border border-dashed border-border bg-muted/20 py-12 text-center">
                <Clock className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">No activities planned</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDayActivities.map((a) => {
                  const t = a.start_time
                    ? (() => { const [h,m] = a.start_time!.split(":"); const d = new Date(); d.setHours(+h, +m); return format(d, "h:mm a"); })()
                    : "All day";
                  return (
                    <button
                      key={a.id}
                      onClick={() => setEditing(a as unknown as ActivityDraft)}
                      className="block w-full rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-gold/60"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-16 shrink-0">
                          <p className="font-display text-base leading-tight text-primary">{t}</p>
                          {a.duration_minutes ? <p className="text-[10px] text-muted-foreground">{a.duration_minutes}m</p> : null}
                        </div>
                        <div className="flex-1 border-l border-gold/30 pl-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className={`text-[10px] uppercase tracking-widest ${categoryAccent[a.category] ?? "text-muted-foreground"}`}>
                                {a.service_type ?? a.category}
                              </p>
                              <p className="font-display text-base leading-tight text-primary">{a.name}</p>
                              {a.guests && (
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {a.guests.full_name}{a.guests.property ? ` · ${a.guests.property}` : ""}
                                </p>
                              )}
                              {a.vendor && <p className="mt-0.5 text-xs text-foreground/70">{a.vendor}</p>}
                            </div>
                            <StatusBadge status={a.status} activityId={a.id} size="sm" />
                          </div>
                          {a.location && <p className="mt-1 text-xs text-muted-foreground">{a.location}</p>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Pending requests */}
      <section className="mt-8">
        <h2 className="font-display text-xl text-primary">Pending requests</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {pending.length === 0 && (
            <p className="rounded-md border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground md:col-span-2">
              All caught up.
            </p>
          )}
          {pending.slice(0, 8).map((a) => (
            <ActivityCard key={a.id} activity={a} guestLabel={a.guests?.full_name ?? undefined} />
          ))}
        </div>
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {/* Upcoming check-ins */}
        <section>
          <h2 className="font-display text-xl text-primary">Upcoming check-ins</h2>
          <div className="mt-3 divide-y divide-border rounded-md border border-border bg-card">
            {upcomingCheckins.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">None in the next 7 days.</p>
            )}
            {upcomingCheckins.map((r) => {
              const isToday = r.check_in ? isSameDay(parseISO(r.check_in), today) : false;
              return (
                <div key={r.id} className="flex items-center justify-between px-4 py-3">
                  <Link
                    to="/app/guests/$guestId"
                    params={{ guestId: r.guest_id }}
                    className="min-w-0 flex-1 hover:opacity-80"
                  >
                    <p className="font-medium text-primary truncate">{r.guests?.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.property ?? "—"}
                      {r.check_in ? ` · ${format(parseISO(r.check_in), "MMM d")}` : ""}
                    </p>
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="flex gap-1">
                      {((r.guests?.tags ?? []) as GuestTag[]).map((t) => <GuestTagPill key={t} tag={t} size="sm" />)}
                    </div>
                    {isToday && (
                      <Button
                        size="sm"
                        className="gap-1 bg-gold/20 text-gold hover:bg-gold/30 border border-gold/40 h-7 px-2 text-[11px]"
                        onClick={() => setResStatus.mutate({ id: r.id, status: "In House" })}
                        disabled={setResStatus.isPending}
                      >
                        <LogIn className="h-3 w-3" /> Check In
                      </Button>
                    )}
                    {!isToday && (
                      <ResBadge status="Pre-Arrival" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* In-residence */}
        <section>
          <h2 className="font-display text-xl text-primary">In-residence</h2>
          <div className="mt-3 divide-y divide-border rounded-md border border-border bg-card">
            {inHouse.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">No active guests.</p>
            )}
            {inHouse.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3">
                <Link
                  to="/app/guests/$guestId"
                  params={{ guestId: r.guest_id }}
                  className="min-w-0 flex-1 hover:opacity-80"
                >
                  <p className="font-medium text-primary truncate">{r.guests?.full_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.property ?? "—"}
                    {r.check_out ? ` · until ${format(parseISO(r.check_out), "MMM d")}` : ""}
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="flex gap-1">
                    {((r.guests?.tags ?? []) as GuestTag[]).map((t) => <GuestTagPill key={t} tag={t} size="sm" />)}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 h-7 px-2 text-[11px] text-muted-foreground hover:border-destructive/40 hover:text-destructive"
                    onClick={() => setResStatus.mutate({ id: r.id, status: "Out" })}
                    disabled={setResStatus.isPending}
                  >
                    <LogOut className="h-3 w-3" /> Check Out
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <ActivityDialog open={open} onOpenChange={setOpen} defaultDate={todayIso} />
      <ActivityDialog open={guestRequestOpen} onOpenChange={setGuestRequestOpen} defaultDate={selectedIso} />
      <ActivityDialog open={internalRequestOpen} onOpenChange={setInternalRequestOpen} defaultDate={selectedIso} defaultInternal />
      <ActivityDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} initial={editing ?? undefined} />

      {/* New reservation — needs a guest; show guest picker then open dialog */}
      {reservationOpen && (
        <NewReservationFlow
          guests={guests ?? []}
          open={reservationOpen}
          onOpenChange={setReservationOpen}
          onSaved={() => qc.invalidateQueries({ queryKey: ["dashboard", "reservations"] })}
        />
      )}

      <p className="sr-only">{inSevenDays}</p>
    </div>
  );
}

// ── Reservation status badge ─────────────────────────────────────────────────
function ResBadge({ status }: { status: ReservationStatus }) {
  const styles: Record<ReservationStatus, string> = {
    "Pre-Arrival": "bg-primary/10 text-primary border-primary/30",
    "In House":    "bg-success/15 border-success/40 text-[oklch(0.40_0.12_150)]",
    "Out":         "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${styles[status]}`}>
      {status}
    </span>
  );
}

// ── New Reservation flow ─────────────────────────────────────────────────────
// Step 1: pick a guest. Step 2: open ReservationDialog for that guest.
function NewReservationFlow({
  guests, open, onOpenChange, onSaved,
}: {
  guests: DashGuest[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [step, setStep] = useState<"pick" | "reserve">("pick");
  const [selectedGuest, setSelectedGuest] = useState<DashGuest | null>(null);
  const [q, setQ] = useState("");

  const hits = q.trim()
    ? guests.filter((g) => g.full_name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8)
    : guests.slice(0, 8);

  if (step === "reserve" && selectedGuest) {
    return (
      <ReservationDialog
        open
        onOpenChange={(v) => { if (!v) { onOpenChange(false); setStep("pick"); setSelectedGuest(null); } }}
        guestId={selectedGuest.id}
        guestName={selectedGuest.full_name}
        onSaved={() => { onSaved(); onOpenChange(false); setStep("pick"); setSelectedGuest(null); }}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">New reservation</DialogTitle>
          <p className="text-sm text-muted-foreground">Select a guest to continue</p>
        </DialogHeader>
        <Input
          placeholder="Search guest…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        <div className="mt-1 max-h-64 overflow-y-auto rounded-md border border-border">
          {hits.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">No guests found.</p>}
          {hits.map((g) => (
            <button
              key={g.id}
              onClick={() => { setSelectedGuest(g); setStep("reserve"); }}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent/50 border-b border-border last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-primary truncate">{g.full_name}</p>
                {g.property && <p className="text-xs text-muted-foreground">{g.property}</p>}
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-lg border bg-card p-4 ${accent ? "border-gold/50" : "border-border"}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${accent ? "text-gold" : "text-muted-foreground"}`} />
      </div>
      <p className="mt-2 font-display text-3xl text-primary">{value}</p>
    </div>
  );
}
