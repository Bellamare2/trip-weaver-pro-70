import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO,
  startOfMonth, startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Sparkles, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ActivityDialog } from "@/components/activity-dialog";
import { DayActivitiesPanel } from "@/components/day-activities-panel";
import { CATEGORIES, STATUSES, statusDot, SERVICE_TYPES } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/app/calendar")({
  component: CalendarPage,
});

interface CalActivity {
  id: string;
  guest_id: string;
  name: string;
  category: string;
  service_type: string | null;
  date: string;
  start_time: string | null;
  status: "Requested" | "Confirmed" | "Cancelled";
  guests: { full_name: string; property: string | null } | null;
}

function CalendarPage() {
  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [guestRequestOpen, setGuestRequestOpen] = useState(false);
  const [internalRequestOpen, setInternalRequestOpen] = useState(false);
  const [activeDay, setActiveDay] = useState<string | null>(null);

  const [fGuest, setFGuest] = useState<string>("all");
  const [fProperty, setFProperty] = useState<string>("all");
  const [fStatus, setFStatus] = useState<string>("all");
  const [fService, setFService] = useState<string>("all");

  const range = useMemo(() => {
    if (view === "month") {
      const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
      const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
      return { start, end };
    }
    return { start: startOfWeek(cursor, { weekStartsOn: 0 }), end: endOfWeek(cursor, { weekStartsOn: 0 }) };
  }, [view, cursor]);

  const days = useMemo(() => eachDayOfInterval(range), [range]);

  const { data: activities } = useQuery({
    queryKey: ["activities", "cal", format(range.start, "yyyy-MM-dd"), format(range.end, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("id, guest_id, name, category, service_type, date, start_time, status, guests(full_name, property)")
        .gte("date", format(range.start, "yyyy-MM-dd"))
        .lte("date", format(range.end, "yyyy-MM-dd"))
        .order("start_time", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as unknown as CalActivity[];
    },
  });

  const { data: guests } = useQuery({
    queryKey: ["guests-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("guests").select("id, full_name, property").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: properties } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("name").order("name");
      if (error) throw error;
      return data as { name: string }[];
    },
  });

  const { data: reservations } = useQuery({
    queryKey: ["reservations", "cal", format(range.start, "yyyy-MM-dd"), format(range.end, "yyyy-MM-dd")],
    queryFn: async () => {
      const start = format(range.start, "yyyy-MM-dd");
      const end = format(range.end, "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("reservations")
        .select("id, check_in, check_out")
        .or(`and(check_in.gte.${start},check_in.lte.${end}),and(check_out.gte.${start},check_out.lte.${end})`);
      if (error) throw error;
      return data as { id: string; check_in: string; check_out: string }[];
    },
  });

  const arrivalSet = useMemo(() => new Set((reservations ?? []).map((r) => r.check_in)), [reservations]);
  const departureSet = useMemo(() => new Set((reservations ?? []).map((r) => r.check_out)), [reservations]);

  const filtered = (activities ?? []).filter((a) => {
    if (fGuest !== "all" && a.guest_id !== fGuest) return false;
    if (fProperty !== "all" && a.guests?.property !== fProperty) return false;
    if (fStatus !== "all" && a.status !== fStatus) return false;
    if (fService !== "all" && a.service_type !== fService && a.category !== fService) return false;
    return true;
  });

  const eventsByDay = (d: Date) => filtered.filter((a) => isSameDay(parseISO(a.date), d));

  const stepBack = () => setCursor(view === "month" ? addMonths(cursor, -1) : addWeeks(cursor, -1));
  const stepFwd = () => setCursor(view === "month" ? addMonths(cursor, 1) : addWeeks(cursor, 1));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-gold">Calendar</p>
          <h1 className="mt-1 font-display text-3xl text-primary md:text-4xl">
            {view === "month" ? format(cursor, "MMMM yyyy") : `${format(range.start, "MMM d")} – ${format(range.end, "MMM d, yyyy")}`}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setGuestRequestOpen(true)} className="border-gold/50 text-primary hover:bg-gold/10">
            <Sparkles className="mr-1.5 h-4 w-4 text-gold" /> Guest Request
          </Button>
          <Button variant="outline" onClick={() => setInternalRequestOpen(true)}>
            <ClipboardList className="mr-1.5 h-4 w-4" /> Internal Request
          </Button>
          <div className="flex rounded-md border border-border p-0.5">
            <button onClick={() => setView("month")} className={`px-3 py-1 text-xs ${view === "month" ? "bg-primary text-primary-foreground rounded" : "text-muted-foreground"}`}>Month</button>
            <button onClick={() => setView("week")} className={`px-3 py-1 text-xs ${view === "week" ? "bg-primary text-primary-foreground rounded" : "text-muted-foreground"}`}>Week</button>
          </div>
          <div className="flex">
            <button onClick={stepBack} className="rounded-l-md border border-border p-1.5 hover:bg-accent"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => setCursor(new Date())} className="border-y border-border px-3 py-1.5 text-xs">Today</button>
            <button onClick={stepFwd} className="rounded-r-md border border-border p-1.5 hover:bg-accent"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 grid gap-2 md:grid-cols-4">
        <FilterSelect label="Guest" value={fGuest} onValueChange={setFGuest}
          options={[{ value: "all", label: "All guests" }, ...(guests ?? []).map((g) => ({ value: g.id, label: g.full_name }))]} />
        <FilterSelect label="Property" value={fProperty} onValueChange={setFProperty}
          options={[{ value: "all", label: "All properties" }, ...(properties ?? []).map((p) => ({ value: p.name, label: p.name }))]} />
        <FilterSelect label="Status" value={fStatus} onValueChange={setFStatus}
          options={[{ value: "all", label: "All statuses" }, ...STATUSES.map((s) => ({ value: s, label: s }))]} />
        <FilterSelect label="Service" value={fService} onValueChange={setFService}
          options={[{ value: "all", label: "All services" }, ...SERVICE_TYPES.map((s) => ({ value: s, label: s })), ...CATEGORIES.map((c) => ({ value: c, label: c }))]} />
      </div>

      {/* Calendar grid */}
      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card">
        <div className="grid grid-cols-7 border-b border-border bg-muted/40">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="px-2 py-2 text-center text-[10px] uppercase tracking-wider text-muted-foreground">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const inMonth = view === "week" || isSameMonth(d, cursor);
            const dayEvents = eventsByDay(d);
            const isToday = isSameDay(d, new Date());
            const iso = format(d, "yyyy-MM-dd");
            return (
              <button
                key={d.toISOString()}
                onClick={() => setActiveDay(iso)}
                className={`group min-h-[110px] border-b border-r border-border p-1.5 text-left last:border-r-0 hover:bg-accent/40 ${inMonth ? "bg-card" : "bg-muted/30"}`}
              >
                <div className={`mb-1 flex flex-col items-center gap-0.5 ${inMonth ? "text-primary" : "text-muted-foreground"}`}>
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday ? "bg-gold text-gold-foreground font-semibold" : ""}`}>
                    {format(d, "d")}
                  </span>
                  {/* Red dot only if events exist */}
                  {dayEvents.length > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive" aria-label={`${dayEvents.length} events`} />
                  )}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((a) => (
                    <div
                      key={a.id}
                      className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[10px]"
                      title={`${a.name} · ${a.guests?.full_name ?? ""}`}
                    >
                      <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle ${statusDot[a.status]}`} />
                      <span className="text-primary">{a.start_time ? a.start_time.slice(0, 5) + " " : ""}{a.name}</span>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <p className="px-1.5 text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        <Plus className="mr-1 inline h-3 w-3" />
        Click any day to view & edit the timeline. Red dot indicates planned activities.
      </p>

      <ActivityDialog open={guestRequestOpen} onOpenChange={setGuestRequestOpen} defaultDate={format(cursor, "yyyy-MM-dd")} />
      <ActivityDialog open={internalRequestOpen} onOpenChange={setInternalRequestOpen} defaultDate={format(cursor, "yyyy-MM-dd")} defaultInternal />

      <DayActivitiesPanel
        date={activeDay}
        open={!!activeDay}
        onOpenChange={(o) => !o && setActiveDay(null)}
      />
    </div>
  );
}

function FilterSelect({
  label, value, onValueChange, options,
}: { label: string; value: string; onValueChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
