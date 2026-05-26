import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  format, parseISO, addDays, addMonths, isSameDay, isSameMonth, startOfDay,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
} from "date-fns";
import {
  Plus, Search, CalendarCheck, Clock, Users, BedDouble,
  ChevronLeft, ChevronRight, Sparkles, ClipboardList,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ActivityCard, type ActivityRow } from "@/components/activity-card";
import { GuestTagPill } from "@/components/guest-tag-pill";
import { ActivityDialog, type ActivityDraft } from "@/components/activity-dialog";
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

interface DashActivity extends ActivityRow {
  guests: { full_name: string; property: string | null } | null;
}

function Dashboard() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [guestRequestOpen, setGuestRequestOpen] = useState(false);
  const [internalRequestOpen, setInternalRequestOpen] = useState(false);
  const [editing, setEditing] = useState<(Partial<ActivityDraft> & { id?: string }) | null>(null);

  const today = startOfDay(new Date());
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

  const activeToday = useMemo(
    () => (guests ?? []).filter((g) =>
      g.check_in && g.check_out &&
      parseISO(g.check_in) <= today && parseISO(g.check_out) >= today),
    [guests, today],
  );
  const upcomingCheckins = useMemo(
    () => (guests ?? []).filter((g) =>
      g.check_in && parseISO(g.check_in) >= today && parseISO(g.check_in) <= addDays(today, 7))
      .sort((a, b) => (a.check_in! < b.check_in! ? -1 : 1)),
    [guests, today],
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
        <Button onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> Add activity</Button>
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
        <StatTile label="In-residence today" value={activeToday.length} icon={Users} />
        <StatTile label="Check-ins · 7 days" value={upcomingCheckins.length} icon={BedDouble} />
        <StatTile label="Pending confirmation" value={pending.length} icon={Clock} accent />
        <StatTile label="Today · confirmed" value={todayConfirmed.length} icon={CalendarCheck} />
      </div>

      {/* Two-column lists */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="font-display text-xl text-primary">Today's schedule</h2>
          <div className="mt-3 space-y-3">
            {todayConfirmed.length === 0 && (
              <p className="rounded-md border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
                Nothing confirmed for today.
              </p>
            )}
            {todayConfirmed.map((a) => (
              <ActivityCard key={a.id} activity={a} guestLabel={a.guests?.full_name ?? undefined} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl text-primary">Pending requests</h2>
          <div className="mt-3 space-y-3">
            {pending.length === 0 && (
              <p className="rounded-md border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
                All caught up.
              </p>
            )}
            {pending.slice(0, 8).map((a) => (
              <ActivityCard key={a.id} activity={a} guestLabel={a.guests?.full_name ?? undefined} />
            ))}
          </div>
        </section>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="font-display text-xl text-primary">Upcoming check-ins</h2>
          <div className="mt-3 divide-y divide-border rounded-md border border-border bg-card">
            {upcomingCheckins.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">None in the next 7 days.</p>
            )}
            {upcomingCheckins.map((g) => (
              <Link
                key={g.id}
                to="/app/guests/$guestId"
                params={{ guestId: g.id }}
                className="flex items-center justify-between px-4 py-3 hover:bg-accent/40"
              >
                <div className="min-w-0">
                  <p className="font-medium text-primary truncate">{g.full_name}</p>
                  <p className="text-xs text-muted-foreground">{g.property ?? "—"} · {format(parseISO(g.check_in!), "MMM d")}</p>
                </div>
                <div className="flex gap-1">
                  {(g.tags as GuestTag[]).map((t) => <GuestTagPill key={t} tag={t} size="sm" />)}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl text-primary">In-residence today</h2>
          <div className="mt-3 divide-y divide-border rounded-md border border-border bg-card">
            {activeToday.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">No active guests.</p>
            )}
            {activeToday.map((g) => (
              <Link
                key={g.id}
                to="/app/guests/$guestId"
                params={{ guestId: g.id }}
                className="flex items-center justify-between px-4 py-3 hover:bg-accent/40"
              >
                <div className="min-w-0">
                  <p className="font-medium text-primary truncate">{g.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {g.property ?? "—"} · until {g.check_out ? format(parseISO(g.check_out), "MMM d") : "—"}
                  </p>
                </div>
                <div className="flex gap-1">
                  {(g.tags as GuestTag[]).map((t) => <GuestTagPill key={t} tag={t} size="sm" />)}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <ActivityDialog open={open} onOpenChange={setOpen} defaultDate={todayIso} />
      <p className="sr-only">{inSevenDays}</p>
    </div>
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
