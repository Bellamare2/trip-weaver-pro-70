import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO,
  startOfMonth, startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ActivityDialog } from "@/components/activity-dialog";
import { ActivityCard, type ActivityRow } from "@/components/activity-card";
import { CATEGORIES, STATUSES, statusDot, type ActivityStatus } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/app/calendar")({
  component: CalendarPage,
});

interface CalActivity extends ActivityRow {
  guests: { full_name: string; property: string | null } | null;
}

function CalendarPage() {
  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CalActivity | null>(null);

  const [fGuest, setFGuest] = useState<string>("all");
  const [fProperty, setFProperty] = useState<string>("all");
  const [fStatus, setFStatus] = useState<string>("all");
  const [fCategory, setFCategory] = useState<string>("all");

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
        .select("*, guests(full_name, property)")
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

  const filtered = (activities ?? []).filter((a) => {
    if (fGuest !== "all" && a.guest_id !== fGuest) return false;
    if (fProperty !== "all" && a.guests?.property !== fProperty) return false;
    if (fStatus !== "all" && a.status !== fStatus) return false;
    if (fCategory !== "all" && a.category !== fCategory) return false;
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
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border p-0.5">
            <button onClick={() => setView("month")} className={`px-3 py-1 text-xs ${view === "month" ? "bg-primary text-primary-foreground rounded" : "text-muted-foreground"}`}>Month</button>
            <button onClick={() => setView("week")} className={`px-3 py-1 text-xs ${view === "week" ? "bg-primary text-primary-foreground rounded" : "text-muted-foreground"}`}>Week</button>
          </div>
          <div className="flex">
            <button onClick={stepBack} className="rounded-l-md border border-border p-1.5 hover:bg-accent"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => setCursor(new Date())} className="border-y border-border px-3 py-1.5 text-xs">Today</button>
            <button onClick={stepFwd} className="rounded-r-md border border-border p-1.5 hover:bg-accent"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <Button onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> Activity</Button>
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
        <FilterSelect label="Category" value={fCategory} onValueChange={setFCategory}
          options={[{ value: "all", label: "All categories" }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]} />
      </div>

      {/* Grid */}
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
            return (
              <div
                key={d.toISOString()}
                className={`min-h-[110px] border-b border-r border-border p-1.5 last:border-r-0 ${inMonth ? "bg-card" : "bg-muted/30"}`}
              >
                <div className={`mb-1 flex items-center justify-between text-xs ${inMonth ? "text-primary" : "text-muted-foreground"}`}>
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${isToday ? "bg-gold text-gold-foreground font-semibold" : ""}`}>
                    {format(d, "d")}
                  </span>
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 4).map((a) => (
                    <button
                      key={a.id} onClick={() => setSelected(a)}
                      className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] hover:bg-accent"
                      title={`${a.name} · ${a.guests?.full_name ?? ""}`}
                    >
                      <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle ${statusDot[a.status]}`} />
                      <span className="text-primary">{a.start_time ? a.start_time.slice(0, 5) + " " : ""}{a.name}</span>
                    </button>
                  ))}
                  {dayEvents.length > 4 && (
                    <p className="px-1.5 text-[10px] text-muted-foreground">+{dayEvents.length - 4} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ActivityDialog open={open} onOpenChange={setOpen} defaultDate={format(cursor, "yyyy-MM-dd")} />

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-[400px] sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">Activity</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4 space-y-4">
              <ActivityCard activity={selected} guestLabel={selected.guests?.full_name ?? undefined} />
              {selected.guests && (
                <Link
                  to="/app/guests/$guestId" params={{ guestId: selected.guest_id }}
                  onClick={() => setSelected(null)}
                  className="block text-sm text-gold hover:underline"
                >
                  Open guest profile →
                </Link>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
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

// silence unused import lints
void ({} as ActivityStatus);
