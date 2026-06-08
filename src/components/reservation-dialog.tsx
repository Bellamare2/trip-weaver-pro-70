import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PropertySelector } from "@/components/property-selector";
import { FileText, History } from "lucide-react";

export interface ReservationRow {
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
  status?: string;
  created_at: string;
}

const DEFAULT_INTRO = "Please find below your personalized itinerary for your upcoming stay at Bellamare.";
const DEFAULT_CLOSING = "If there is anything we can do to make your stay more memorable, please do not hesitate to contact us.\n\nWarm regards,\nBellamare Concierge Team";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  guestId: string;
  guestName: string;
  initial?: ReservationRow;
  onSaved?: (res: ReservationRow) => void;
  /** Called when the user clicks the Itinerary button inside the edit dialog */
  onOpenItinerary?: () => void;
  /** Show a star on the Itinerary button if activities are already booked */
  hasActivities?: boolean;
}

export function ReservationDialog({ open, onOpenChange, guestId, guestName, initial, onSaved, onOpenItinerary, hasActivities }: Props) {
  const qc = useQueryClient();
  const isEdit = !!initial?.id;
  const [showLog, setShowLog] = useState(false);

  // Refs for auto-advance focus
  const checkInRef = useRef<HTMLInputElement>(null);
  const checkOutRef = useRef<HTMLInputElement>(null);
  const adultsRef = useRef<HTMLInputElement>(null);
  const kidsRef = useRef<HTMLInputElement>(null);

  function openDatePicker(ref: React.RefObject<HTMLInputElement | null>) {
    setTimeout(() => {
      try { ref.current?.showPicker(); } catch { ref.current?.focus(); }
    }, 80);
  }

  const [form, setForm] = useState({
    property: initial?.property ?? "",
    check_in: initial?.check_in ?? "",
    check_out: initial?.check_out ?? "",
    adults: initial?.adults?.toString() ?? "",
    kids: initial?.kids?.toString() ?? "",
    notes: initial?.notes ?? "",
    itinerary_intro: initial?.itinerary_intro ?? DEFAULT_INTRO,
    itinerary_closing: initial?.itinerary_closing ?? DEFAULT_CLOSING,
  });

  useEffect(() => {
    if (open) {
      setForm({
        property: initial?.property ?? "",
        check_in: initial?.check_in ?? "",
        check_out: initial?.check_out ?? "",
        adults: initial?.adults?.toString() ?? "",
        kids: initial?.kids?.toString() ?? "",
        notes: initial?.notes ?? "",
        itinerary_intro: initial?.itinerary_intro ?? DEFAULT_INTRO,
        itinerary_closing: initial?.itinerary_closing ?? DEFAULT_CLOSING,
      });
    }
  }, [open, initial]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.property) throw new Error("Property is required");
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        guest_id: guestId,
        property: form.property,
        check_in: form.check_in || null,
        check_out: form.check_out || null,
        adults: form.adults ? Number(form.adults) : null,
        kids: form.kids ? Number(form.kids) : null,
        notes: form.notes || null,
        itinerary_intro: form.itinerary_intro || DEFAULT_INTRO,
        itinerary_closing: form.itinerary_closing || DEFAULT_CLOSING,
      };
      if (isEdit && initial?.id) {
        const { data, error } = await supabase.from("reservations").update(payload).eq("id", initial.id).select().single();
        if (error) throw new Error(error.message);
        return data as ReservationRow;
      } else {
        const { data, error } = await supabase.from("reservations").insert({ ...payload, created_by: user?.id ?? null }).select().single();
        if (error) throw new Error(error.message);
        return data as ReservationRow;
      }
    },
    onSuccess: (res) => {
      toast.success(isEdit ? "Reservation updated" : "Reservation created");
      qc.invalidateQueries({ queryKey: ["reservations", guestId] });
      qc.invalidateQueries({ queryKey: ["guest", guestId] });
      qc.invalidateQueries({ queryKey: ["dashboard", "reservations"] });
      onSaved?.(res);
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isEdit ? "Edit reservation" : "New reservation"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{guestName}</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Property — mandatory, auto-opens on new reservation */}
          <div className="space-y-1.5">
            <Label>Property / Villa <span className="text-destructive">*</span></Label>
            <PropertySelector
              value={form.property}
              autoOpen={!isEdit}
              onChange={(v) => {
                setForm((f) => ({ ...f, property: v }));
                if (v) openDatePicker(checkInRef);
              }}
            />
            {!form.property && save.isError && (
              <p className="text-xs text-destructive">Property is required</p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Check-in</Label>
              <Input
                ref={checkInRef}
                type="date"
                value={form.check_in}
                onChange={(e) => {
                  setForm((f) => ({ ...f, check_in: e.target.value }));
                  if (e.target.value) openDatePicker(checkOutRef);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Check-out</Label>
              <Input
                ref={checkOutRef}
                type="date"
                value={form.check_out}
                onChange={(e) => {
                  setForm((f) => ({ ...f, check_out: e.target.value }));
                  if (e.target.value) setTimeout(() => adultsRef.current?.focus(), 80);
                }}
              />
            </div>
          </div>

          {/* Party size */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Adults</Label>
              <Input
                ref={adultsRef}
                type="number" min={0} placeholder="0"
                value={form.adults}
                onChange={(e) => setForm((f) => ({ ...f, adults: e.target.value }))}
                onBlur={() => { if (form.adults) setTimeout(() => kidsRef.current?.focus(), 80); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kids</Label>
              <Input
                ref={kidsRef}
                type="number" min={0} placeholder="0"
                value={form.kids}
                onChange={(e) => setForm((f) => ({ ...f, kids: e.target.value }))}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>

          {/* Itinerary messages */}
          <details className="rounded-md border border-border bg-muted/30 px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium text-primary">Itinerary messages</summary>
            <div className="mt-3 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Introduction</Label>
                <Textarea rows={3} value={form.itinerary_intro} onChange={(e) => setForm((f) => ({ ...f, itinerary_intro: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Closing</Label>
                <Textarea rows={4} value={form.itinerary_closing} onChange={(e) => setForm((f) => ({ ...f, itinerary_closing: e.target.value }))} />
              </div>
            </div>
          </details>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {/* Left-side actions — only in edit mode */}
          {isEdit ? (
            <div className="flex gap-2">
              {onOpenItinerary && (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1.5 border-gold/40 text-primary hover:bg-gold/10 cursor-pointer"
                  onClick={onOpenItinerary}
                >
                  <FileText className="h-4 w-4" />
                  Itinerary
                  {hasActivities && <span className="text-gold text-sm leading-none">★</span>}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                className="gap-1.5 cursor-pointer"
                onClick={() => setShowLog(true)}
              >
                <History className="h-4 w-4" />
                Log
              </Button>
            </div>
          ) : <span />}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Create reservation"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Reservation change log */}
    {isEdit && initial?.id && (
      <ReservationLogDialog
        open={showLog}
        onOpenChange={setShowLog}
        reservationId={initial.id}
        guestName={guestName}
      />
    )}
    </>
  );
}

// ── Reservation Log Dialog ────────────────────────────────────────────────────
interface LogEntry {
  id: string;
  action: string;
  changed_by_name: string | null;
  changes: Record<string, unknown>;
  created_at: string;
}

// Human-readable field labels
const FIELD_LABELS: Record<string, string> = {
  property: "Property",
  check_in: "Check-in",
  check_out: "Check-out",
  adults: "Adults",
  kids: "Kids",
  notes: "Notes",
  status: "Status",
  itinerary_intro: "Itinerary intro",
  itinerary_closing: "Itinerary closing",
};

function formatFieldValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if ((field === "check_in" || field === "check_out") && typeof value === "string") {
    try { return format(parseISO(value), "EEE, MMM d, yyyy"); } catch { return String(value); }
  }
  return String(value);
}

function ReservationLogDialog({
  open, onOpenChange, reservationId, guestName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reservationId: string;
  guestName: string;
}) {
  const { data: entries, isLoading } = useQuery({
    queryKey: ["reservation-log", reservationId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, changed_by_name, changes, created_at")
        .eq("table_name", "reservations")
        .eq("record_id", reservationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as LogEntry[];
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Reservation log</DialogTitle>
          <p className="text-sm text-muted-foreground">{guestName}</p>
        </DialogHeader>

        {isLoading && (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        )}

        {!isLoading && (!entries || entries.length === 0) && (
          <p className="py-6 text-center text-sm text-muted-foreground">No log entries found.</p>
        )}

        {entries && entries.length > 0 && (
          <div className="space-y-3">
            {entries.map((e) => {
              const who = e.changed_by_name ?? "Unknown user";
              const when = format(parseISO(e.created_at), "EEE, MMM d yyyy · h:mm a");

              if (e.action === "INSERT") {
                // Extract key fields from the 'after' object
                const after = (e.changes as { after?: Record<string, unknown> })?.after ?? {};
                const highlights = ["property", "check_in", "check_out", "adults", "kids", "status"]
                  .filter((f) => after[f] != null && after[f] !== "")
                  .map((f) => `${FIELD_LABELS[f] ?? f}: ${formatFieldValue(f, after[f])}`);
                return (
                  <div key={e.id} className="rounded-md border border-border bg-card px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary font-medium">Created</span>
                      <span className="text-[11px] text-muted-foreground shrink-0">{when}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">by <span className="font-medium text-primary">{who}</span></p>
                    {highlights.length > 0 && (
                      <ul className="mt-2 space-y-0.5">
                        {highlights.map((h) => (
                          <li key={h} className="text-xs text-foreground/80">{h}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              }

              if (e.action === "UPDATE") {
                const diffs = e.changes as Record<string, { from: unknown; to: unknown }>;
                const changedFields = Object.keys(diffs).filter((f) => FIELD_LABELS[f]);
                if (changedFields.length === 0) return null;
                return (
                  <div key={e.id} className="rounded-md border border-border bg-card px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gold font-medium">Updated</span>
                      <span className="text-[11px] text-muted-foreground shrink-0">{when}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">by <span className="font-medium text-primary">{who}</span></p>
                    <ul className="mt-2 space-y-1">
                      {changedFields.map((f) => (
                        <li key={f} className="text-xs">
                          <span className="font-medium text-foreground/70">{FIELD_LABELS[f]}</span>
                          <span className="text-muted-foreground"> · </span>
                          <span className="line-through text-muted-foreground/60">{formatFieldValue(f, diffs[f].from)}</span>
                          <span className="text-muted-foreground"> → </span>
                          <span className="text-primary font-medium">{formatFieldValue(f, diffs[f].to)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              }

              return null;
            })}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
