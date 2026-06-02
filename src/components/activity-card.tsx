import { format, parseISO } from "date-fns";
import { MapPin, Phone, FileText, DollarSign, Tag as TagIcon } from "lucide-react";
import { useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { type ActivityStatus, categoryAccent } from "@/lib/domain";
import { ActivityDetailDialog } from "@/components/activity-detail-dialog";

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
  guestLabel,
}: {
  activity: ActivityRow;
  onEdit?: () => void; // kept for API compat — editing is now via detail dialog
  guestLabel?: string;
}) {
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <>
      <article
        onClick={() => setDetailOpen(true)}
        className="group cursor-pointer rounded-lg border border-border bg-card p-4 transition-colors hover:border-gold/60 hover:shadow-elegant"
      >
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
              <StatusBadge status={activity.status} activityId={activity.id} />
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
      </article>

      <ActivityDetailDialog
        activityId={activity.id}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}

export function dateLabel(iso: string) {
  return format(parseISO(iso), "EEEE, MMM d");
}
