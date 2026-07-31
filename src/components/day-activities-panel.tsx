import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Plus, Clock, BedDouble, LogIn, LogOut, Users, Baby, FileText, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { ActivityDialog, type ActivityDraft } from "@/components/activity-dialog";
import { ReservationDialog, type ReservationRow } from "@/components/reservation-dialog";
import { ItineraryDialog } from "@/components/itinerary-dialog";
import { categoryAccent } from "@/lib/domain";

interface DayActivity {
  id: string;
  guest_id: string;
  service_type: string | null;
  name: string;
  category: string;
  date: string;
  start_time: string | null;
  duration_minutes: number | null;
  vendor: string | null;
  location: string | null;
  notes: string | null;
  internal_notes: string | null;
  assigned_to: string | null;
  confirmed_with: string | null;
  price_usd: number | null;
  confirmation_number: string | null;
  status: "Requested" | "Confirmed" | "Cancelled";
  roll_over: boolean | null;
  is_internal: boolean | null;
  details: Record<string, unknown> | null;
  guests: { full_name: string; property: string | null } | null;
}

interface DayReservation {
  id: string;
  guest_id: string;
  property: string | null;
  check_in: string | null;
  check_out: string | null;
  adults: number | null;
  kids: number | null;
  notes: string | null;
  itinerary_intro: string;
  itinerary_closing: string;
  status: "Pre-Arrival" | "In House" | "Out" | "Cancelled";
  guests: { full_name: string; property: string | null } | null;
}

function fmtTime(t: string | null) {
  if (!t) return "All day";
  const [h, m] = t.split(":");
  const d = new Date();
  d.setHours(Number(h), Number(m));
  return format(d, "h:mm a");
}

export function DayActivitiesPanel({
  date, open, onOpenChange,
}: { date: string | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [editing, setEditing] = useState<Partial<ActivityDraft> & { id?: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingRes, setEditingRes] = useState<DayReservation | null>(null);
  const [itinRes, setItinRes] = useState<DayReservation | null>(null);

  const { data: activities, isFetching: activitiesLoading } = useQuery({
    queryKey: ["activities", "day", date],
    queryFn: async () => {
      if (!date) return [];
      const { data, error } = await supabase
        .from("activities")
        .select("*, guests(full_name, property)")
        .eq("date", date)
        .order("start_time", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as unknown as DayActivity[];
    },
    enabled: open && !!date,
  });

  const { data: reservations, isFetching: reservationsLoading } = useQuery({
    queryKey: ["reservations", "day", date],
    queryFn: async () => {
      if (!date) return [];
      // Reservations that overlap this day in any way:
      // check-in on this day, check-out on this day, or staying through it.
      const { data, error } = await supabase
        .from("reservations")
        .select("id, guest_id, property, check_in, check_out, adults, kids, notes, itinerary_intro, itinerary_closing, status, guests(full_name, property)")
        .or(`check_in.eq.${date},check_out.eq.${date},and(check_in.lt.${date},check_out.gt.${date})`);
      if (error) throw error;
      return data as unknown as DayReservation[];
    },
    enabled: open && !!date,
  });

  const { arriving, departing, inHouse } = useMemo(() => {
    const arr: DayReservation[] = [];
    const dep: DayReservation[] = [];
    const house: DayReservation[] = [];
    if (!date) return { arriving: arr, departing: dep, inHouse: house };
    (reservations ?? []).forEach((r) => {
      if (r.status === "Cancelled" || r.status === "Out") return;
      if (r.check_in === date) {
        arr.push(r);
      } else if (r.check_out === date) {
        dep.push(r);
      } else if (r.check_in && r.check_out && r.check_in < date && r.check_out > date) {
        house.push(r);
      }
    });
    return { arriving: arr, departing: dep, inHouse: house };
  }, [reservations, date]);

  const reservationIds = useMemo(
    () => new Set((reservations ?? []).map((r) => r.id)),
    [reservations],
  );

  const resHasItinerary = (res: DayReservation) => {
    return (activities ?? []).some(
      (a) => a.guest_id === res.guest_id && a.date >= (res.check_in ?? a.date) && a.date <= (res.check_out ?? a.date),
    );
  };

  const isFetching = activitiesLoading || reservationsLoading;
  const totalItems = (activities?.length ?? 0) + arriving.length + departing.length + inHouse.length;

  const ReservationCard = ({ res, badge }: { res: DayReservation; badge: React.ReactNode }) => {
    const hasActs = resHasItinerary(res);
    return (
      <button
        key={res.id}
        onClick={() => setEditingRes(res)}
        className="block w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-gold/60"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {badge}
              <p className="font-display text-base leading-tight text-primary">{res.guests?.full_name ?? "Guest"}</p>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{res.property ?? "—"}</p>
            {(res.adults || res.kids) && (
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                {res.adults != null && res.adults > 0 && (
                  <span className="flex items-center gap-0.5"><Users className="h-3 w-3" /> {res.adults} adult{res.adults !== 1 ? "s" : ""}</span>
                )}
                {res.kids != null && res.kids > 0 && (
                  <span className="flex items-center gap-0.5"><Baby className="h-3 w-3" /> {res.kids} kid{res.kids !== 1 ? "s" : ""}</span>
                )}
              </div>
            )}
            {res.notes && <p className="mt-1 text-xs text-foreground/70 line-clamp-2">{res.notes}</p>}
          </div>
          <div
            className="shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setItinRes(res);
            }}
          >
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-[10px] border-gold/40 text-primary hover:bg-gold/10 cursor-pointer"
            >
              <FileText className="h-3 w-3" />
              Itinerary
              {hasActs && <Star className="h-3 w-3 fill-gold text-gold" />}
            </Button>
          </div>
        </div>
      </button>
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[440px] overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">
              {date ? format(parseISO(date), "EEEE, MMMM d") : ""}
            </SheetTitle>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {totalItems} item{totalItems === 1 ? "" : "s"} · chronological order
            </p>
          </SheetHeader>

          <div className="mt-4">
            <Button onClick={() => setCreating(true)} className="w-full">
              <Plus className="mr-1.5 h-4 w-4" /> Add to this day
            </Button>
          </div>

          <div className="mt-5 space-y-5">
            {isFetching && !totalItems && (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
            )}

            {/* Arrivals */}
            {arriving.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-success">
                  <LogIn className="h-4 w-4" /> Arriving
                </div>
                {arriving.map((res) => (
                  <ReservationCard
                    key={res.id}
                    res={res}
                    badge={<span className="rounded bg-success/15 px-1.5 py-0.5 text-[10px] text-success-foreground">Arrival</span>}
                  />
                ))}
              </div>
            )}

            {/* Departures */}
            {departing.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-destructive">
                  <LogOut className="h-4 w-4" /> Departing
                </div>
                {departing.map((res) => (
                  <ReservationCard
                    key={res.id}
                    res={res}
                    badge={<span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive">Departure</span>}
                  />
                ))}
              </div>
            )}

            {/* In House */}
            {inHouse.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
                  <BedDouble className="h-4 w-4" /> In House
                </div>
                {inHouse.map((res) => (
                  <ReservationCard
                    key={res.id}
                    res={res}
                    badge={<span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">In House</span>}
                  />
                ))}
              </div>
            )}

            {/* Activities */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <Clock className="h-4 w-4" /> Activities
              </div>
              {(activities ?? []).length === 0 && !isFetching && (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 py-8 text-center">
                  <Clock className="mx-auto h-6 w-6 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">No activities planned</p>
                </div>
              )}
              {(activities ?? []).map((a) => (
                <button
                  key={a.id}
                  onClick={() => setEditing(a as unknown as ActivityDraft)}
                  className="block w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-gold/60"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-16 shrink-0">
                      <p className="font-display text-base leading-tight text-primary">{fmtTime(a.start_time)}</p>
                      {a.duration_minutes ? (
                        <p className="text-[10px] text-muted-foreground">{a.duration_minutes}m</p>
                      ) : null}
                    </div>
                    <div className="flex-1 border-l border-gold/30 pl-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className={`text-[10px] uppercase tracking-widest ${categoryAccent[a.category] ?? "text-muted-foreground"}`}>
                            {a.service_type ?? a.category}
                          </p>
                          <p className="font-display text-base leading-tight text-primary">{a.name}</p>
                          {a.guests && (
                            <p className="mt-0.5 text-xs text-muted-foreground">{a.guests.full_name}{a.guests.property ? ` · ${a.guests.property}` : ""}</p>
                          )}
                          {a.vendor && <p className="mt-0.5 text-xs text-foreground/70">{a.vendor}</p>}
                        </div>
                        <StatusBadge status={a.status} activityId={a.id} size="sm" />
                      </div>
                      {a.location && <p className="mt-1 text-xs text-muted-foreground">{a.location}</p>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ActivityDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        initial={editing ?? undefined}
      />
      <ActivityDialog
        open={creating}
        onOpenChange={setCreating}
        defaultDate={date ?? undefined}
      />

      {editingRes && (
        <ReservationDialog
          open={!!editingRes}
          onOpenChange={(o) => !o && setEditingRes(null)}
          guestId={editingRes.guest_id}
          guestName={editingRes.guests?.full_name ?? "Guest"}
          initial={{
            id: editingRes.id,
            guest_id: editingRes.guest_id,
            property: editingRes.property,
            check_in: editingRes.check_in,
            check_out: editingRes.check_out,
            adults: editingRes.adults,
            kids: editingRes.kids,
            notes: editingRes.notes,
            itinerary_intro: editingRes.itinerary_intro,
            itinerary_closing: editingRes.itinerary_closing,
            status: editingRes.status,
            created_at: "",
          }}
          onOpenItinerary={() => setItinRes(editingRes)}
          hasActivities={resHasItinerary(editingRes)}
        />
      )}

      {itinRes && (
        <ItineraryDialog
          open={!!itinRes}
          onOpenChange={(o) => !o && setItinRes(null)}
          reservation={{
            id: itinRes.id,
            guest_id: itinRes.guest_id,
            property: itinRes.property,
            check_in: itinRes.check_in,
            check_out: itinRes.check_out,
            adults: itinRes.adults,
            kids: itinRes.kids,
            notes: itinRes.notes,
            itinerary_intro: itinRes.itinerary_intro,
            itinerary_closing: itinRes.itinerary_closing,
            status: itinRes.status,
            created_at: "",
          }}
          guestName={itinRes.guests?.full_name ?? "Guest"}
          guestId={itinRes.guest_id}
        />
      )}
    </>
  );
}
