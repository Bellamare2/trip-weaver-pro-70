import { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Pencil, Trash2, History, Printer, Mail, Copy, X,
  MapPin, DollarSign, Tag, Clock, User, Car, Users,
  FileText, MessageSquare, CheckCircle,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { AuditLogDrawer } from "@/components/audit-log-drawer";
import { ActivityDialog, type ActivityDraft } from "@/components/activity-dialog";
import { categoryAccent, STATUSES, type ActivityStatus } from "@/lib/domain";

interface FullActivity {
  id: string;
  guest_id: string | null;
  name: string;
  category: string;
  service_type: string;
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
  status: ActivityStatus;
  roll_over: boolean;
  is_internal: boolean;
  details: Record<string, unknown>;
  guests: { full_name: string; property: string | null } | null;
}

function fmtTime(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":");
  const d = new Date();
  d.setHours(Number(h), Number(m));
  return format(d, "h:mm a");
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-primary">{value}</p>
    </div>
  );
}

export function ActivityDetailDialog({
  activityId,
  open,
  onOpenChange,
  onDeleted,
}: {
  activityId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDeleted?: () => void;
}) {
  const qc = useQueryClient();
  const [logOpen, setLogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const { data: activity, isLoading } = useQuery({
    queryKey: ["activity-detail", activityId],
    enabled: !!activityId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*, guests(full_name, property)")
        .eq("id", activityId!)
        .single();
      if (error) throw error;
      return data as unknown as FullActivity;
    },
  });

  const setStatus = useMutation({
    mutationFn: async (status: ActivityStatus) => {
      const { error } = await supabase.from("activities").update({ status }).eq("id", activityId!);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activity-detail", activityId] });
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["guest-activities"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("activities").delete().eq("id", activityId!);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Activity deleted");
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["guest-activities"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onOpenChange(false);
      onDeleted?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleCopy() {
    if (!activity) return;
    const lines = [
      `${activity.name}`,
      `Guest: ${activity.guests?.full_name ?? "Internal"}`,
      activity.guests?.property ? `Property: ${activity.guests.property}` : "",
      `Date: ${format(parseISO(activity.date), "EEEE, MMM d yyyy")}${activity.start_time ? ` at ${fmtTime(activity.start_time)}` : ""}`,
      activity.vendor ? `Vendor: ${activity.vendor}` : "",
      activity.location ? `Location: ${activity.location}` : "",
      activity.price_usd != null ? `Price: $${activity.price_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD` : "",
      activity.confirmation_number ? `Confirmation #: ${activity.confirmation_number}` : "",
      activity.notes ? `Notes: ${activity.notes}` : "",
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(lines);
    toast.success("Copied to clipboard");
  }

  function handleEmail() {
    if (!activity) return;
    const subject = encodeURIComponent(`Bellamare — ${activity.name}`);
    const body = encodeURIComponent([
      `${activity.name}`,
      `Guest: ${activity.guests?.full_name ?? "Internal"}`,
      activity.guests?.property ? `Property: ${activity.guests.property}` : "",
      `Date: ${format(parseISO(activity.date), "EEEE, MMM d yyyy")}${activity.start_time ? ` at ${fmtTime(activity.start_time)}` : ""}`,
      activity.vendor ? `Vendor: ${activity.vendor}` : "",
      activity.location ? `Location: ${activity.location}` : "",
      activity.price_usd != null ? `Price: $${activity.price_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD` : "",
      activity.confirmation_number ? `Confirmation #: ${activity.confirmation_number}` : "",
      activity.notes ? `Special Info: ${activity.notes}` : "",
    ].filter(Boolean).join("\n"));
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }

  function handlePrint() {
    window.print();
  }

  const det = (activity?.details ?? {}) as Record<string, string | number | boolean | null | undefined>;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
          {isLoading || !activity ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <>
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-card px-5 py-4">
                <div className="min-w-0">
                  <p className={`text-[10px] uppercase tracking-widest ${categoryAccent[activity.category] ?? "text-muted-foreground"}`}>
                    {activity.service_type || activity.category}
                  </p>
                  <h2 className="font-display text-2xl leading-tight text-primary">{activity.name}</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {activity.guests?.full_name ?? "Internal request"}
                    {activity.guests?.property ? ` · ${activity.guests.property}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <StatusBadge status={activity.status} activityId={activity.id} />
                </div>
              </div>

              {/* Action toolbar */}
              <div className="flex items-center gap-1 border-b border-border bg-muted/30 px-4 py-2">
                <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5 text-xs">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setLogOpen(true)} className="gap-1.5 text-xs">
                  <History className="h-3.5 w-3.5" /> History
                </Button>
                <Button variant="ghost" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
                  <Printer className="h-3.5 w-3.5" /> Print
                </Button>
                <Button variant="ghost" size="sm" onClick={handleEmail} className="gap-1.5 text-xs">
                  <Mail className="h-3.5 w-3.5" /> Email
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
                  <Copy className="h-3.5 w-3.5" /> Copy
                </Button>
                <div className="flex-1" />
                <Button
                  variant="ghost" size="sm"
                  onClick={() => { if (confirm("Delete this activity?")) del.mutate(); }}
                  className="gap-1.5 text-xs text-destructive hover:text-destructive"
                  disabled={del.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>

              {/* Body */}
              <div className="space-y-5 px-5 py-5">
                {/* Date / time / duration */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Date</p>
                    <p className="mt-0.5 text-sm font-medium text-primary">
                      {format(parseISO(activity.date), "EEE, MMM d yyyy")}
                    </p>
                  </div>
                  {activity.start_time && (
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Time</p>
                      <p className="mt-0.5 text-sm font-medium text-primary flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {fmtTime(activity.start_time)}
                      </p>
                    </div>
                  )}
                  {activity.duration_minutes && (
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Duration</p>
                      <p className="mt-0.5 text-sm text-primary">{activity.duration_minutes} min</p>
                    </div>
                  )}
                </div>

                {/* Guest info */}
                {activity.guests && (
                  <div className="rounded-md border border-border bg-muted/20 p-3">
                    <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-gold">Guest</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {activity.guests.full_name}
                      </div>
                      {activity.guests.property && (
                        <div className="flex items-center gap-2 text-sm text-primary">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          {activity.guests.property}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Core details */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <InfoRow label="Vendor / Provider" value={activity.vendor} />
                  <InfoRow label="Location" value={activity.location} />
                  <InfoRow label="Assigned to" value={activity.assigned_to} />
                  <InfoRow label="Confirmed with" value={activity.confirmed_with} />
                  <InfoRow label="Confirmation #" value={activity.confirmation_number} />
                  {activity.price_usd != null && (
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Total Price</p>
                      <p className="mt-0.5 flex items-center gap-1 text-sm font-medium text-primary">
                        <DollarSign className="h-3.5 w-3.5" />
                        ${activity.price_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                      </p>
                    </div>
                  )}
                </div>

                {/* Transport details */}
                {(det.car_type || det.pickup || det.destination || det.flight_number) && (
                  <div className="rounded-md border border-border bg-muted/20 p-3">
                    <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-gold">Transportation</p>
                    <div className="grid grid-cols-2 gap-3">
                      {det.car_type && <InfoRow label="Car type" value={String(det.car_type)} />}
                      {det.pickup && <InfoRow label="Pick-up" value={String(det.pickup)} />}
                      {det.destination && <InfoRow label="Destination" value={String(det.destination)} />}
                      {det.flight_number && <InfoRow label="Flight #" value={String(det.flight_number)} />}
                      {det.flight_time && <InfoRow label="Flight time" value={String(det.flight_time)} />}
                      {det.tail_number && <InfoRow label="Tail #" value={String(det.tail_number)} />}
                      {det.adults && <InfoRow label="Adults" value={String(det.adults)} />}
                      {det.children && <InfoRow label="Children" value={String(det.children)} />}
                      {det.car_seat && <InfoRow label="Car seat" value={String(det.car_seat)} />}
                      {det.charge_type && <InfoRow label="Charge type" value={String(det.charge_type)} />}
                    </div>
                  </div>
                )}

                {/* Activity / Dining details */}
                {(det.activity_type || det.restaurant || det.party_size) && (
                  <div className="rounded-md border border-border bg-muted/20 p-3">
                    <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-gold">Details</p>
                    <div className="grid grid-cols-2 gap-3">
                      {det.activity_type && <InfoRow label="Activity type" value={String(det.activity_type)} />}
                      {det.public_private && <InfoRow label="Public / Private" value={String(det.public_private)} />}
                      {det.restaurant && <InfoRow label="Restaurant" value={String(det.restaurant)} />}
                      {det.party_size && (
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Party size</p>
                          <p className="mt-0.5 flex items-center gap-1 text-sm text-primary">
                            <Users className="h-3.5 w-3.5" /> {String(det.party_size)}
                          </p>
                        </div>
                      )}
                      {det.meeting_time && <InfoRow label="Meeting time" value={String(det.meeting_time)} />}
                      {det.meeting_location && <InfoRow label="Meeting location" value={String(det.meeting_location)} />}
                      {det.payment_method && <InfoRow label="Payment method" value={String(det.payment_method)} />}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {(activity.notes || activity.internal_notes) && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {activity.notes && (
                      <div className="rounded-md border border-border bg-muted/20 p-3">
                        <p className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-gold">
                          <FileText className="h-3 w-3" /> Special Info
                        </p>
                        <p className="text-sm text-primary">{activity.notes}</p>
                      </div>
                    )}
                    {activity.internal_notes && (
                      <div className="rounded-md border border-border bg-muted/20 p-3">
                        <p className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-gold">
                          <MessageSquare className="h-3 w-3" /> Internal Notes
                        </p>
                        <p className="text-sm text-primary">{activity.internal_notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Flags */}
                <div className="flex flex-wrap gap-2">
                  {activity.roll_over && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-gold">
                      Roll over
                    </span>
                  )}
                  {activity.is_internal && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-primary">
                      Internal
                    </span>
                  )}
                </div>
              </div>

              {/* Footer — status change */}
              <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/20 px-5 py-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Status</span>
                </div>
                <div className="flex gap-2">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus.mutate(s)}
                      disabled={activity.status === s || setStatus.isPending}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        activity.status === s
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-primary"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* History drawer */}
      <AuditLogDrawer
        open={logOpen}
        onOpenChange={setLogOpen}
        tableName="activities"
        recordId={activityId ?? undefined}
        recordTitle={activity?.name}
      />

      {/* Edit dialog */}
      {activity && (
        <ActivityDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          initial={activity as unknown as Partial<ActivityDraft> & { id: string }}
          fixedGuestId={activity.guest_id ?? undefined}
        />
      )}
    </>
  );
}
