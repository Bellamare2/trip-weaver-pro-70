import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Check, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  ARRIVAL_CHECKLIST_DEFAULT, DEPARTURE_CHECKLIST_DEFAULT,
} from "@/lib/domain";
import { PageHeader, PageShell, EmptyState } from "@/components/page-shell";

export const Route = createFileRoute("/_authenticated/app/arrivals")({
  component: ArrivalsPage,
});

interface ChecklistItem { label: string; done: boolean }
interface Checklist {
  id: string; property_id: string; type: string; scheduled_date: string | null;
  items: ChecklistItem[];
  property: { name: string } | null;
}

function ArrivalsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: lists } = useQuery({
    queryKey: ["stay_checklists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stay_checklists")
        .select("id, property_id, type, scheduled_date, items, property:properties(name)")
        .order("scheduled_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as unknown as Checklist[];
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, items }: { id: string; items: ChecklistItem[] }) => {
      const { error } = await supabase.from("stay_checklists").update({ items: items as unknown as never }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stay_checklists"] }),
  });

  return (
    <PageShell>
      <PageHeader eyebrow="Operations" title="Arrivals & Departures"
        action={<Button onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> New checklist</Button>} />

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {(!lists || lists.length === 0) && <div className="md:col-span-2"><EmptyState>No checklists yet.</EmptyState></div>}
        {lists?.map((c) => {
          const done = c.items.filter((i) => i.done).length;
          const pct = c.items.length ? Math.round((done / c.items.length) * 100) : 0;
          return (
            <div key={c.id} className="rounded-lg border border-border bg-card p-5 shadow-elegant">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-gold">{c.type}</p>
                  <h3 className="mt-1 font-display text-lg text-primary">{c.property?.name ?? "—"}</h3>
                  <p className="text-xs text-muted-foreground">{c.scheduled_date ? format(parseISO(c.scheduled_date), "EEEE, MMM d") : "Unscheduled"}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl text-primary">{pct}%</p>
                  <p className="text-[10px] text-muted-foreground">{done}/{c.items.length}</p>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
              </div>
              <ul className="mt-3 space-y-1.5">
                {c.items.map((item, i) => (
                  <li key={i}>
                    <button
                      onClick={() => {
                        const items = c.items.map((x, idx) => idx === i ? { ...x, done: !x.done } : x);
                        toggle.mutate({ id: c.id, items });
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-accent/40"
                    >
                      <span className={`flex h-4 w-4 items-center justify-center rounded border ${item.done ? "border-success bg-success/20 text-success" : "border-border"}`}>
                        {item.done && <Check className="h-3 w-3" />}
                      </span>
                      <span className={item.done ? "text-muted-foreground line-through" : "text-primary"}>{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button onClick={async () => {
                if (!confirm("Delete checklist?")) return;
                const { error } = await supabase.from("stay_checklists").delete().eq("id", c.id);
                if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["stay_checklists"] });
              }} className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          );
        })}
      </div>

      <ChecklistDialog open={open} onOpenChange={setOpen} onSaved={() => qc.invalidateQueries({ queryKey: ["stay_checklists"] })} />
    </PageShell>
  );
}

function ChecklistDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const [form, setForm] = useState({ property_id: "", type: "Arrival" as "Arrival" | "Departure", scheduled_date: format(new Date(), "yyyy-MM-dd") });
  const { data: properties } = useQuery({
    queryKey: ["properties", "lite"], enabled: open,
    queryFn: async () => { const { data } = await supabase.from("properties").select("id, name").order("name"); return data ?? []; },
  });
  const save = useMutation({
    mutationFn: async () => {
      if (!form.property_id) throw new Error("Property required");
      const defaults = form.type === "Arrival" ? ARRIVAL_CHECKLIST_DEFAULT : DEPARTURE_CHECKLIST_DEFAULT;
      const items = defaults.map((label) => ({ label, done: false }));
      const { error } = await supabase.from("stay_checklists").insert({
        property_id: form.property_id, type: form.type, scheduled_date: form.scheduled_date, items,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Checklist created"); onSaved(); onOpenChange(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">New checklist</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <FF label="Property">
            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })}>
              <option value="">Select…</option>
              {properties?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </FF>
          <FF label="Type">
            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "Arrival" | "Departure" })}>
              <option value="Arrival">Arrival</option><option value="Departure">Departure</option>
            </select>
          </FF>
          <FF label="Date"><Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} /></FF>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label><div className="mt-1">{children}</div></div>;
}
