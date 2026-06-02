import { format, parseISO } from "date-fns";
import { History, User, Plus, Pencil, Trash2 } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { useAuditLog, fieldLabel, type AuditEntry } from "@/hooks/use-audit-log";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tableName: string;
  recordId: string | undefined;
  recordTitle?: string;
}

export function AuditLogDrawer({ open, onOpenChange, tableName, recordId, recordTitle }: Props) {
  const { data: entries, isLoading } = useAuditLog(tableName, recordId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-md flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="flex items-center gap-2 font-display text-lg">
            <History className="h-4 w-4 text-gold" />
            {recordTitle ? `Log · ${recordTitle}` : "Change log"}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {!isLoading && (!entries || entries.length === 0) && (
            <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
          )}
          {entries && entries.length > 0 && (
            <ol className="relative border-l border-border pl-5">
              {entries.map((e) => (
                <AuditEntry key={e.id} entry={e} />
              ))}
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AuditEntry({ entry }: { entry: AuditEntry }) {
  const who = entry.changed_by_name ?? "Unknown";
  const when = format(parseISO(entry.created_at), "MMM d, yyyy · h:mm a");

  const ActionIcon =
    entry.action === "INSERT" ? Plus :
    entry.action === "DELETE" ? Trash2 :
    Pencil;

  const actionColor =
    entry.action === "INSERT" ? "text-success" :
    entry.action === "DELETE" ? "text-destructive" :
    "text-gold";

  const actionLabel =
    entry.action === "INSERT" ? "Created" :
    entry.action === "DELETE" ? "Deleted" :
    "Updated";

  // For UPDATE entries, build a human-readable diff list
  const diffs = entry.action === "UPDATE"
    ? Object.entries(entry.changes as Record<string, { from: unknown; to: unknown }>)
        .filter(([col]) => !["created_at", "updated_at", "created_by", "updated_by"].includes(col))
        .map(([col, { from: f, to: t }]) => ({
          label: fieldLabel(col),
          from: formatValue(f),
          to: formatValue(t),
        }))
    : [];

  return (
    <li className="mb-5 ml-1">
      {/* Timeline dot */}
      <span className={`absolute -left-1.5 mt-1 flex h-3 w-3 items-center justify-center rounded-full border border-background bg-border`} />

      <div className="rounded-md border border-border bg-card p-3 shadow-sm">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2">
          <span className={`flex items-center gap-1.5 text-xs font-medium ${actionColor}`}>
            <ActionIcon className="h-3 w-3" />
            {actionLabel}
          </span>
          <time className="text-[10px] text-muted-foreground">{when}</time>
        </div>

        {/* Who */}
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <User className="h-3 w-3" /> {who}
        </p>

        {/* Diffs */}
        {diffs.length > 0 && (
          <ul className="mt-2 space-y-1">
            {diffs.map(({ label, from, to }) => (
              <li key={label} className="text-[11px]">
                <span className="font-medium text-primary">{label}:</span>{" "}
                {from !== "" && from !== null && (
                  <span className="text-muted-foreground line-through">{from}</span>
                )}
                {from !== "" && from !== null && " → "}
                <span className="text-foreground">{to}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.join(", ") || "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
