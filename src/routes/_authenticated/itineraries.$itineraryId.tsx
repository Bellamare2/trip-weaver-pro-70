import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { format, eachDayOfInterval, parseISO, isSameDay } from "date-fns";
import {
  ArrowLeft, Plus, Printer, MapPin, Phone, Globe, Search, Trash2, Calendar as CalIcon, ListOrdered,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { searchPlaces, type PlaceResult } from "@/lib/places.functions";

export const Route = createFileRoute("/_authenticated/itineraries/$itineraryId")({
  component: ItineraryDetail,
});

interface EventRow {
  id: string;
  title: string;
  event_type: string;
  start_time: string;
  end_time: string | null;
  location_name: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
}

const TYPES = ["dining", "activity", "transport", "spa", "checkin", "other"] as const;
const TYPE_LABEL: Record<string, string> = {
  dining: "Dining", activity: "Activity", transport: "Transport",
  spa: "Spa", checkin: "Check-in", other: "Other",
};

function ItineraryDetail() {
  const { itineraryId } = Route.useParams();
  const [view, setView] = useState<"timeline" | "calendar">("timeline");
  const [open, setOpen] = useState(false);

  const { data: itinerary } = useQuery({
    queryKey: ["itinerary", itineraryId],
    queryFn: async () => {
      const { data, error } = await supabase.from("itineraries")
        .select("*, guests(full_name, room_number, email, phone)")
        .eq("id", itineraryId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: events, refetch: refetchEvents } = useQuery({
    queryKey: ["events", itineraryId],
    queryFn: async () => {
      const { data, error } = await supabase.from("events")
        .select("*").eq("itinerary_id", itineraryId).order("start_time");
      if (error) throw error;
      return data as EventRow[];
    },
  });

  const days = useMemo(() => {
    if (!itinerary) return [];
    return eachDayOfInterval({
      start: parseISO(itinerary.start_date), end: parseISO(itinerary.end_date),
    });
  }, [itinerary]);

  if (!itinerary) return <div className="p-10 text-sm text-muted-foreground">Loading…</div>;

  const guest = itinerary.guests;

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <div className="no-print">
        <Link to="/app" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Itineraries
        </Link>

        <div className="mt-6 flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold">Itinerary</p>
            <h1 className="mt-1 font-display text-4xl text-primary">{itinerary.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {guest && (
                <Link to="/app/guests/$guestId" params={{ guestId: itinerary.guest_id }} className="hover:underline">
                  {guest.full_name}{guest.room_number ? ` · Room ${guest.room_number}` : ""}
                </Link>
              )}
              {" · "}
              {format(parseISO(itinerary.start_date), "MMM d")} – {format(parseISO(itinerary.end_date), "MMM d, yyyy")}
            </p>
          </div>
          <div className="flex gap-2">
            <div className="flex rounded-md border border-border p-0.5">
              <button
                onClick={() => setView("timeline")}
                className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs ${view === "timeline" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              ><ListOrdered className="h-3.5 w-3.5" /> Timeline</button>
              <button
                onClick={() => setView("calendar")}
                className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs ${view === "calendar" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              ><CalIcon className="h-3.5 w-3.5" /> Calendar</button>
            </div>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print / PDF
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Add event</Button>
              </DialogTrigger>
              <EventDialog itineraryId={itineraryId} defaultDate={itinerary.start_date} onSaved={() => { setOpen(false); refetchEvents(); }} />
            </Dialog>
          </div>
        </div>
      </div>

      <div className="no-print mt-8">
        {view === "timeline" ? (
          <TimelineView days={days} events={events ?? []} onChange={refetchEvents} />
        ) : (
          <CalendarView days={days} events={events ?? []} />
        )}
      </div>

      <PrintLayout itinerary={itinerary} guest={guest} days={days} events={events ?? []} />
    </div>
  );
}

function TimelineView({ days, events, onChange }: { days: Date[]; events: EventRow[]; onChange: () => void }) {
  return (
    <div className="space-y-8">
      {days.map((day, idx) => {
        const dayEvents = events.filter((e) => isSameDay(parseISO(e.start_time), day));
        return (
          <section key={day.toISOString()}>
            <div className="mb-3 flex items-baseline gap-3 border-b border-border pb-2">
              <span className="font-display text-2xl text-primary">Day {idx + 1}</span>
              <span className="text-sm text-muted-foreground">{format(day, "EEEE, MMM d")}</span>
            </div>
            {dayEvents.length === 0 ? (
              <p className="py-4 text-sm italic text-muted-foreground">Nothing scheduled.</p>
            ) : (
              <ul className="space-y-3">
                {dayEvents.map((ev) => <EventCard key={ev.id} event={ev} onChange={onChange} />)}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function EventCard({ event, onChange }: { event: EventRow; onChange: () => void }) {
  const remove = async () => {
    if (!confirm("Delete this event?")) return;
    const { error } = await supabase.from("events").delete().eq("id", event.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); onChange(); }
  };
  return (
    <li className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-gold">
      <div className="flex items-start gap-5">
        <div className="w-20 shrink-0 text-right">
          <p className="font-display text-xl text-primary">{format(parseISO(event.start_time), "h:mm a")}</p>
          {event.end_time && (
            <p className="text-xs text-muted-foreground">to {format(parseISO(event.end_time), "h:mm a")}</p>
          )}
        </div>
        <div className="flex-1 border-l border-gold/40 pl-5">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-gold">{TYPE_LABEL[event.event_type] ?? event.event_type}</span>
              <h4 className="mt-0.5 font-display text-lg text-primary">{event.title}</h4>
              {event.location_name && <p className="text-sm text-foreground">{event.location_name}</p>}
            </div>
            <button onClick={remove} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          {(event.address || event.phone || event.website) && (
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              {event.address && <p className="flex items-start gap-1.5"><MapPin className="mt-0.5 h-3 w-3 shrink-0" /> {event.address}</p>}
              {event.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {event.phone}</p>}
              {event.website && <p className="flex items-center gap-1.5"><Globe className="h-3 w-3" /> {event.website}</p>}
            </div>
          )}
          {event.notes && <p className="mt-2 text-sm italic text-muted-foreground">{event.notes}</p>}
        </div>
      </div>
    </li>
  );
}

function CalendarView({ days, events }: { days: Date[]; events: EventRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <div className="grid min-w-[800px]" style={{ gridTemplateColumns: `60px repeat(${days.length}, 1fr)` }}>
        <div className="border-b border-r border-border bg-muted/40" />
        {days.map((d) => (
          <div key={d.toISOString()} className="border-b border-r border-border bg-muted/40 px-3 py-2 last:border-r-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{format(d, "EEE")}</p>
            <p className="font-display text-lg text-primary">{format(d, "MMM d")}</p>
          </div>
        ))}
        {Array.from({ length: 14 }, (_, i) => i + 7).map((hour) => (
          <div key={hour} className="contents">
            <div className="border-b border-r border-border px-2 py-1 text-right text-[10px] text-muted-foreground">
              {format(new Date(2000, 0, 1, hour), "h a")}
            </div>
            {days.map((d) => {
              const slotEvents = events.filter((e) => {
                const t = parseISO(e.start_time);
                return isSameDay(t, d) && t.getHours() === hour;
              });
              return (
                <div key={d.toISOString() + hour} className="min-h-[48px] border-b border-r border-border p-1 last:border-r-0">
                  {slotEvents.map((e) => (
                    <div key={e.id} className="mb-1 rounded bg-primary px-2 py-1 text-[11px] text-primary-foreground">
                      <p className="truncate font-medium">{e.title}</p>
                      <p className="text-primary-foreground/70">{format(parseISO(e.start_time), "h:mm a")}</p>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function EventDialog({ itineraryId, defaultDate, onSaved }: { itineraryId: string; defaultDate: string; onSaved: () => void }) {
  const search = useServerFn(searchPlaces);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>("dining");
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("19:00");
  const [endTime, setEndTime] = useState("");
  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);

  const doSearch = async () => {
    if (query.length < 2) return;
    setSearching(true);
    const r = await search({ data: { query } });
    setSearching(false);
    if (r.error) toast.error(r.error);
    setResults(r.results);
  };

  const pick = (p: PlaceResult) => {
    setLocationName(p.name);
    setAddress(p.address);
    if (p.phone) setPhone(p.phone);
    if (p.website) setWebsite(p.website);
    if (!title) setTitle(p.name);
    setResults([]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const start = new Date(`${date}T${startTime}`).toISOString();
    const end = endTime ? new Date(`${date}T${endTime}`).toISOString() : null;
    const { error } = await supabase.from("events").insert({
      itinerary_id: itineraryId, title, event_type: type,
      start_time: start, end_time: end,
      location_name: locationName || null, address: address || null,
      phone: phone || null, website: website || null, notes: notes || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Event added");
    onSaved();
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle className="font-display text-2xl">Add event</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-lg border border-gold/40 bg-accent/30 p-3">
          <Label className="text-xs uppercase tracking-wider text-gold">Search a place</Label>
          <div className="mt-2 flex gap-2">
            <Input
              value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Le Bernardin New York"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); doSearch(); } }}
            />
            <Button type="button" variant="outline" onClick={doSearch} disabled={searching}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
          {results.length > 0 && (
            <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto">
              {results.map((p, i) => (
                <li key={i}>
                  <button type="button" onClick={() => pick(p)} className="w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-background">
                    <p className="font-medium text-primary">{p.name}</p>
                    <p className="truncate text-muted-foreground">{p.address}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Start</Label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>End</Label>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Location name</Label>
          <Input value={locationName} onChange={(e) => setLocationName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Address</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Add to itinerary"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function PrintLayout({ itinerary, guest, days, events }: {
  itinerary: { title: string; start_date: string; end_date: string; notes: string | null };
  guest: { full_name: string; room_number: string | null; email: string | null; phone: string | null } | null;
  days: Date[];
  events: EventRow[];
}) {
  return (
    <div className="print-only print-page">
      <div className="border-b-2 border-[oklch(0.74_0.13_80)] pb-6">
        <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "oklch(0.74 0.13 80)" }}>Concierge · Itinerary</p>
        <h1 className="mt-2 font-display text-5xl" style={{ color: "oklch(0.22 0.07 260)" }}>{itinerary.title}</h1>
        {guest && (
          <p className="mt-3 text-sm" style={{ color: "oklch(0.22 0.07 260)" }}>
            Prepared for <strong>{guest.full_name}</strong>
            {guest.room_number && ` · Room ${guest.room_number}`}
          </p>
        )}
        <p className="mt-1 text-sm" style={{ color: "oklch(0.50 0.03 260)" }}>
          {format(parseISO(itinerary.start_date), "MMMM d")} – {format(parseISO(itinerary.end_date), "MMMM d, yyyy")}
        </p>
      </div>

      {days.map((day, idx) => {
        const dayEvents = events.filter((e) => isSameDay(parseISO(e.start_time), day));
        if (dayEvents.length === 0) return null;
        return (
          <section key={day.toISOString()} className="mt-8" style={{ pageBreakInside: "avoid" }}>
            <h2 className="font-display text-2xl" style={{ color: "oklch(0.22 0.07 260)" }}>
              Day {idx + 1} <span className="text-base font-normal" style={{ color: "oklch(0.50 0.03 260)" }}>· {format(day, "EEEE, MMMM d")}</span>
            </h2>
            <div className="mt-3 space-y-3">
              {dayEvents.map((e) => (
                <div key={e.id} className="flex gap-5 border-l-2 pl-4" style={{ borderColor: "oklch(0.74 0.13 80)" }}>
                  <div className="w-20 shrink-0 text-right">
                    <p className="font-display text-base" style={{ color: "oklch(0.22 0.07 260)" }}>
                      {format(parseISO(e.start_time), "h:mm a")}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] uppercase tracking-widest" style={{ color: "oklch(0.74 0.13 80)" }}>{TYPE_LABEL[e.event_type] ?? e.event_type}</p>
                    <p className="font-display text-lg" style={{ color: "oklch(0.22 0.07 260)" }}>{e.title}</p>
                    {e.location_name && <p className="text-sm">{e.location_name}</p>}
                    {e.address && <p className="text-xs" style={{ color: "oklch(0.50 0.03 260)" }}>{e.address}</p>}
                    {e.phone && <p className="text-xs" style={{ color: "oklch(0.50 0.03 260)" }}>{e.phone}</p>}
                    {e.notes && <p className="mt-1 text-xs italic" style={{ color: "oklch(0.50 0.03 260)" }}>{e.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {itinerary.notes && (
        <div className="mt-10 border-t pt-4" style={{ borderColor: "oklch(0.91 0.01 250)" }}>
          <p className="text-[10px] uppercase tracking-widest" style={{ color: "oklch(0.74 0.13 80)" }}>Notes</p>
          <p className="mt-1 text-sm">{itinerary.notes}</p>
        </div>
      )}
    </div>
  );
}
