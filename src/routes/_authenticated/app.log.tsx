import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { History, User, Plus, Pencil, Trash2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { PageHeader, PageShell } from "@/components/page-shell";
import { fieldLabel } from "@/hooks/use-audit-log";

export const Route = createFileRoute("/_authenticated/app/log")({
  component: LogPage,
});

interface LogEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  changed_by: string | null;
  changed_by_name: string | null;
  changes: Record<string, unknown>;
  created_at: string;
}

const TABLE_LABELS: Record<string, string> = {
  activities: "Activity",
  guests: "Guest",
  reservations: "Reservation",
  stay_checklists: "Checklist",
  maintenance_tickets: "Maintenance",
  expenses: "Expense",
  inspections: "Inspection",
  properties: "Property",
  vendors: "Vendor",
};

const ACTION_STYLES = {
  INSERT: { icon: Plus, color: "text-success", label: "Created" },
  UPDATE: { icon: Pencil, color: "text-gold", label: "Updated" },
  DELETE: { icon: Trash2, color: "text-destructive", label: "Deleted" },
};

function LogPage() {
  const [q, setQ] = useState("");

  const { data: entries, isLoading } = useQuery({
    queryKey: ["audit-log", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, table_name, record_id, action, changed_by, changed_by_name, changes, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as LogEntry[];
    },
  });

  const filtered = (entries ?? []).filter((e) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      (e.changed_by_name ?? "").toLowerCase().includes(s) ||
      (TABLE_LABELS[e.table_name] ?? e.table_name).toLowerCase().includes(s) ||
      e.action.toLowerCase().includes(s)
    );
  });

  return (
    <PageShell>
      <PageHeader eyebrow="Workspace" title="Activity Log" />

      <div className="relative mt-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by user, table or action…"
          className="pl-9"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card">
        {isLoading && <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && filtered.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">No log entries yet.</p>
        )}

        {filtered.map((e) => {
          const act = ACTION_STYLES[e.action];
          const Icon = act.icon;
          const diffs = e.action === "UPDATE"
            ? Object.entries(e.changes as Record<string, { from: unknown; to: unknown }>)
                .filter(([col]) => !["created_at", "updated_at", "created_by", "updated_by"].includes(col))
            : [];

          return (
            <div key={e.id} className="flex items-start gap-4 border-b border-border px-5 py-4 last:border-b-0">
              {/* Icon */}
              <div className={`mt-0.5 shrink-0 ${act.color}`}>
                <Icon className="h-4 w-4" />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className={`text-sm font-medium ${act.color}`}>{act.label}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                    {TABLE_LABELS[e.table_name] ?? e.table_name}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    {e.changed_by_name ?? "Unknown"}
                  </span>
                </div>

                {diffs.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {diffs.map(([col, val]) => {
                      const { from: f, to: t } = val as { from: unknown; to: unknown };
                      return (
                        <li key={col} className="text-xs text-muted-foreground">
                          <span className="font-medium text-primary">{fieldLabel(col)}</span>
                          {f !== null && f !== undefined && f !== "" && (
                            <> <span className="line-through">{String(f)}</span> →</>
                          )}{" "}
                          <span className="text-foreground">{String(t ?? "—")}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Time */}
              <time className="shrink-0 text-[11px] text-muted-foreground">
                {format(parseISO(e.created_at), "MMM d, h:mm a")}
              </time>
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
