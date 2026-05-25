import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Plus, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { ActivityDialog, type ActivityDraft } from "@/components/activity-dialog";
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

  const { data: activities, isFetching } = useQuery({
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

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[440px] overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">
              {date ? format(parseISO(date), "EEEE, MMMM d") : ""}
            </SheetTitle>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {(activities?.length ?? 0)} item{(activities?.length ?? 0) === 1 ? "" : "s"} · chronological order
            </p>
          </SheetHeader>

          <div className="mt-4">
            <Button onClick={() => setCreating(true)} className="w-full">
              <Plus className="mr-1.5 h-4 w-4" /> Add to this day
            </Button>
          </div>

          <div className="mt-5 space-y-3">
            {isFetching && !activities?.length && (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
            )}
            {activities && activities.length === 0 && (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 py-10 text-center">
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
    </>
  );
}
