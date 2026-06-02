import { format, parseISO } from "date-fns";
import { MapPin, Phone, FileText, Pencil, Trash2, DollarSign, Tag as TagIcon, History } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/status-badge";
import { type ActivityStatus, categoryAccent } from "@/lib/domain";
import { AuditLogDrawer } from "@/components/audit-log-drawer";

export interface ActivityRow {
  id: string;
  guest_id: string;
  name: string;
  category: string;
  date: string;
  start_time: string | null;
  duration_minutes: number | null;
  vendor: string | null;
  location: string | null;
  notes: string | null;
  price_usd: number | null;
  confirmation_number: string | null;
  status: ActivityStatus;
}

function fmtTime(t: string | null) {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const d = new Date();
  d.setHours(Number(h), Number(m));
  return format(d, "h:mm a");
}

export function ActivityCard({
  activity,
  onEdit,
  guestLabel,
}: {
  activity: ActivityRow;
  onEdit?: () => void;
  guestLabel?: string;
}) {
  const qc = useQueryClient();
  const [logOpen, setLogOpen] = useState(false);
  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("activities").delete().eq("id", activity.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Activity removed");
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["guest-activities"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <article className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-gold/60">
      <div className="flex items-start gap-4">
        <div className="w-16 shrink-0 text-right">
          <p className="font-display text-lg leading-tight text-primary">
            {activity.start_time ? fmtTime(activity.start_time) : "All day"}
          </p>
          {activity.duration_minutes && (
            <p className="text-[10px] text-muted-foreground">{activity.duration_minutes}m</p>
          )}
        </div>
        <div className="flex-1 border-l border-gold/30 pl-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={`text-[10px] uppercase tracking-widest ${categoryAccent[activity.category] ?? "text-muted-foreground"}`}>
                {activity.category}
              </p>
              <h4 className="font-display text-lg leading-tight text-primary">{activity.name}</h4>
              {guestLabel && (
                <p className="mt-0.5 text-xs text-muted-foreground">{guestLabel}</p>
              )}
              {activity.vendor && (
                <p className="mt-0.5 text-sm text-foreground/80">{activity.vendor}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <StatusBadge status={activity.status} activityId={activity.id} />
              <button
                onClick={() => setLogOpen(true)}
                className="rounded-md p-1.5 text-muted-foreground opacity-0 hover:bg-muted hover:text-gold group-hover:opacity-100"
                aria-label="Change log"
                title="Change log"
              >
                <History className="h-3.5 w-3.5" />
              </button>
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="rounded-md p-1.5 text-muted-foreground opacity-0 hover:bg-muted hover:text-primary group-hover:opacity-100"
                  aria-label="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => { if (confirm("Delete this activity?")) del.mutate(); }}
                className="rounded-md p-1.5 text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                aria-label="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {activity.location && (
              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{activity.location}</span>
            )}
            {activity.price_usd != null && (
              <span className="inline-flex items-center gap-1"><DollarSign className="h-3 w-3" />{activity.price_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            )}
            {activity.confirmation_number && (
              <span className="inline-flex items-center gap-1"><TagIcon className="h-3 w-3" />Conf #{activity.confirmation_number}</span>
            )}
          </div>
          {activity.notes && (
            <p className="mt-2 flex items-start gap-1.5 text-xs italic text-muted-foreground">
              <FileText className="mt-0.5 h-3 w-3 shrink-0" /> {activity.notes}
            </p>
          )}
        </div>
      </div>
      <span className="sr-only"><Phone /></span>

      <AuditLogDrawer
        open={logOpen}
        onOpenChange={setLogOpen}
        tableName="activities"
        recordId={activity.id}
        recordTitle={activity.name}
      />
    </article>
  );
}

export function dateLabel(iso: string) {
  return format(parseISO(iso), "EEEE, MMM d");
}
