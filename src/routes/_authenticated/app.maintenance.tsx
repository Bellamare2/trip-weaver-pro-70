import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, AlertCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  MAINTENANCE_STATUSES, PRIORITY_LEVELS, maintenanceStatusStyles,
  type MaintenanceStatus,
} from "@/lib/domain";
import { PageHeader, PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/_authenticated/app/maintenance")({
  component: MaintenancePage,
});

interface Ticket {
  id: string; property_id: string; title: string; description: string | null;
  status: MaintenanceStatus; priority: string; cost_estimate: number | null;
  owner_approval_status: string;
  vendor: { name: string } | null;
  property: { name: string } | null;
  created_at: string;
}

function MaintenancePage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: tickets } = useQuery({
    queryKey: ["maintenance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_tickets")
        .select("id, property_id, title, description, status, priority, cost_estimate, owner_approval_status, created_at, vendor:vendors(name), property:properties(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Ticket[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MaintenanceStatus }) => {
      const { error } = await supabase.from("maintenance_tickets").update({ status }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenance"] }),
  });

  return (
    <PageShell>
      <PageHeader eyebrow="Operations" title="Maintenance"
        action={<Button onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> New ticket</Button>} />

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {MAINTENANCE_STATUSES.map((s) => {
          const items = (tickets ?? []).filter((t) => t.status === s);
          return (
            <div key={s} className="rounded-lg border border-border bg-card/60 p-3">
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{s}</p>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              <div className="mt-2 space-y-2">
                {items.length === 0 && <p className="rounded-md border border-dashed border-border bg-background/50 p-3 text-center text-[11px] text-muted-foreground">Empty</p>}
                {items.map((t) => (
                  <div key={t.id} className={`rounded-md border bg-card p-3 shadow-elegant ${maintenanceStatusStyles[s]}`}>
                    <p className="text-sm font-medium text-primary">{t.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {t.property?.name ?? "—"}{t.vendor ? ` · ${t.vendor.name}` : ""}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        {t.priority === "Urgent" || t.priority === "High" ? <AlertCircle className="h-3 w-3 text-destructive" /> : null}
                        {t.priority}{t.cost_estimate ? ` · $${t.cost_estimate}` : ""}
                      </span>
                      <select
                        className="rounded border border-border bg-background px-1 py-0.5 text-[10px]"
                        value={t.status} onChange={(e) => setStatus.mutate({ id: t.id, status: e.target.value as MaintenanceStatus })}
                      >
                        {MAINTENANCE_STATUSES.map((x) => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <TicketDialog open={open} onOpenChange={setOpen} onSaved={() => qc.invalidateQueries({ queryKey: ["maintenance"] })} />
    </PageShell>
  );
}

function TicketDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    property_id: "", title: "", description: "", vendor_id: "",
    priority: "Normal" as string, cost_estimate: "", owner_approval_status: "Not Required",
  });

  const { data: properties } = useQuery({
    queryKey: ["properties", "lite"], enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("id, name").order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });
  const { data: vendors } = useQuery({
    queryKey: ["vendors", "lite"], enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("vendors").select("id, name").order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.property_id) throw new Error("Property is required");
      if (!form.title.trim()) throw new Error("Title is required");
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("maintenance_tickets").insert({
        property_id: form.property_id, title: form.title.trim(),
        description: form.description || null,
        vendor_id: form.vendor_id || null,
        priority: form.priority,
        cost_estimate: form.cost_estimate ? Number(form.cost_estimate) : null,
        owner_approval_status: form.owner_approval_status,
        status: form.owner_approval_status === "Pending" ? "Waiting Owner Approval" : "Open",
        created_by: user?.id ?? null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Ticket created"); onSaved(); onOpenChange(false);
      setForm({ property_id: "", title: "", description: "", vendor_id: "", priority: "Normal", cost_estimate: "", owner_approval_status: "Not Required" }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="font-display">New maintenance ticket</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <FF label="Property">
            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })}>
              <option value="">Select…</option>
              {properties?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </FF>
          <FF label="Vendor">
            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.vendor_id} onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}>
              <option value="">Unassigned</option>
              {vendors?.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </FF>
          <div className="sm:col-span-2"><FF label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></FF></div>
          <div className="sm:col-span-2"><FF label="Description"><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FF></div>
          <FF label="Priority">
            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {PRIORITY_LEVELS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </FF>
          <FF label="Cost estimate (USD)"><Input type="number" value={form.cost_estimate} onChange={(e) => setForm({ ...form, cost_estimate: e.target.value })} /></FF>
          <FF label="Owner approval">
            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.owner_approval_status} onChange={(e) => setForm({ ...form, owner_approval_status: e.target.value })}>
              {["Not Required", "Pending", "Approved", "Rejected"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </FF>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label><div className="mt-1">{children}</div></div>;
}
