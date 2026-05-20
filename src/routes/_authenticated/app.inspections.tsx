import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, ClipboardCheck, Printer } from "lucide-react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { INSPECTION_TYPES, INSPECTION_CATEGORIES, PRIORITY_LEVELS } from "@/lib/domain";
import { PageHeader, PageShell, EmptyState } from "@/components/page-shell";

export const Route = createFileRoute("/_authenticated/app/inspections")({
  component: InspectionsPage,
});

interface Inspection {
  id: string; property_id: string; type: string; date: string; overall_status: string;
  summary: string | null; inspector_name: string | null;
  property: { name: string } | null;
}

function InspectionsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: inspections } = useQuery({
    queryKey: ["inspections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspections")
        .select("id, property_id, type, date, overall_status, summary, inspector_name, property:properties(name)")
        .order("date", { ascending: false });
      if (error) throw error;
      return data as unknown as Inspection[];
    },
  });

  return (
    <PageShell>
      <PageHeader eyebrow="Quality assurance" title="Inspections"
        action={<Button onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> New inspection</Button>} />

      <div className="mt-6 grid gap-3">
        {(!inspections || inspections.length === 0) && <EmptyState>No inspections recorded yet.</EmptyState>}
        {inspections?.map((i) => (
          <div key={i.id} className="rounded-lg border border-border bg-card p-5 shadow-elegant">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-gold">{i.type} · {format(parseISO(i.date), "MMM d, yyyy")}</p>
                <h3 className="mt-1 font-display text-lg text-primary">{i.property?.name ?? "—"}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Inspector · {i.inspector_name ?? "—"} · Overall {i.overall_status}</p>
                {i.summary && <p className="mt-2 text-sm text-muted-foreground">{i.summary}</p>}
              </div>
              <Button variant="outline" size="sm" onClick={() => setActiveId(i.id)}><ClipboardCheck className="mr-1.5 h-4 w-4" /> Open report</Button>
            </div>
          </div>
        ))}
      </div>

      <InspectionDialog open={open} onOpenChange={setOpen} onSaved={(id) => { qc.invalidateQueries({ queryKey: ["inspections"] }); setActiveId(id); }} />
      {activeId && <ReportDialog id={activeId} onClose={() => setActiveId(null)} />}
    </PageShell>
  );
}

function InspectionDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: (id: string) => void }) {
  const [form, setForm] = useState({
    property_id: "", type: "Weekly" as string, date: format(new Date(), "yyyy-MM-dd"),
    inspector_name: "", overall_status: "Good", summary: "",
  });
  const { data: properties } = useQuery({
    queryKey: ["properties", "lite"], enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("id, name").order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });
  const save = useMutation({
    mutationFn: async () => {
      if (!form.property_id) throw new Error("Property required");
      const { data, error } = await supabase.from("inspections").insert({
        property_id: form.property_id, type: form.type, date: form.date,
        inspector_name: form.inspector_name || null, overall_status: form.overall_status,
        summary: form.summary || null,
      }).select("id").single();
      if (error) throw new Error(error.message);
      return data.id as string;
    },
    onSuccess: (id) => { toast.success("Inspection created"); onSaved(id); onOpenChange(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">New inspection</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <FF label="Property">
            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })}>
              <option value="">Select…</option>
              {properties?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </FF>
          <FF label="Type">
            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {INSPECTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </FF>
          <FF label="Date"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></FF>
          <FF label="Inspector"><Input value={form.inspector_name} onChange={(e) => setForm({ ...form, inspector_name: e.target.value })} /></FF>
          <FF label="Overall status">
            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.overall_status} onChange={(e) => setForm({ ...form, overall_status: e.target.value })}>
              {["Excellent", "Good", "Needs Attention", "Critical"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </FF>
          <div className="sm:col-span-2"><FF label="Summary"><Textarea rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></FF></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Create & add findings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface Finding { id: string; category: string; description: string; priority: string; status: string }

function ReportDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: inspection } = useQuery({
    queryKey: ["inspection", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("inspections").select("*, property:properties(name, address)").eq("id", id).single();
      if (error) throw error;
      return data as unknown as Inspection & { property: { name: string; address: string | null } | null };
    },
  });
  const { data: findings } = useQuery({
    queryKey: ["findings", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("inspection_findings").select("id, category, description, priority, status").eq("inspection_id", id).order("created_at");
      if (error) throw error;
      return data as Finding[];
    },
  });
  const [nf, setNf] = useState({ category: INSPECTION_CATEGORIES[0] as string, description: "", priority: "Low" });
  const addFinding = useMutation({
    mutationFn: async () => {
      if (!nf.description.trim()) throw new Error("Description required");
      const { error } = await supabase.from("inspection_findings").insert({ inspection_id: id, ...nf, description: nf.description.trim() });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["findings", id] }); setNf({ ...nf, description: "" }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center justify-between">
            <span>Inspection Report</span>
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-1.5 h-4 w-4" /> Print</Button>
          </DialogTitle>
        </DialogHeader>
        {inspection && (
          <div className="print-page space-y-4">
            <div className="border-b border-border pb-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-gold">{inspection.type} Inspection</p>
              <h2 className="mt-1 font-display text-2xl text-primary">{inspection.property?.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{inspection.property?.address}</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div><span className="uppercase tracking-wider">Date</span><p className="text-primary">{format(parseISO(inspection.date), "MMM d, yyyy")}</p></div>
                <div><span className="uppercase tracking-wider">Inspector</span><p className="text-primary">{inspection.inspector_name ?? "—"}</p></div>
                <div><span className="uppercase tracking-wider">Status</span><p className="text-primary">{inspection.overall_status}</p></div>
              </div>
              {inspection.summary && <p className="mt-3 text-sm text-foreground">{inspection.summary}</p>}
            </div>

            <div>
              <h3 className="font-display text-lg text-primary">Findings</h3>
              <div className="mt-3 space-y-2">
                {(findings ?? []).length === 0 && <p className="text-sm text-muted-foreground">No findings recorded.</p>}
                {findings?.map((f) => (
                  <div key={f.id} className="rounded-md border border-border bg-card p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gold">{f.category} · {f.priority}</p>
                        <p className="mt-1 text-sm text-foreground">{f.description}</p>
                      </div>
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{f.status}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="no-print mt-4 rounded-md border border-dashed border-border bg-card/40 p-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Add finding</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-4">
                  <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={nf.category} onChange={(e) => setNf({ ...nf, category: e.target.value })}>
                    {INSPECTION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={nf.priority} onChange={(e) => setNf({ ...nf, priority: e.target.value })}>
                    {PRIORITY_LEVELS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <div className="sm:col-span-2 flex gap-2">
                    <Input placeholder="Description" value={nf.description} onChange={(e) => setNf({ ...nf, description: e.target.value })} />
                    <Button onClick={() => addFinding.mutate()}><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label><div className="mt-1">{children}</div></div>;
}
