import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Car as CarIcon, AlertTriangle, Trash2 } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader, PageShell, EmptyState } from "@/components/page-shell";

export const Route = createFileRoute("/_authenticated/app/vehicles")({
  component: VehiclesPage,
});

interface Vehicle {
  id: string; name: string; make: string | null; model: string | null; year: number | null;
  vin: string | null;
  insurance_expires_at: string | null; registration_expires_at: string | null;
  last_inspection_at: string | null; battery_status: string | null; fuel_level: string | null;
  property: { name: string } | null;
}

function VehiclesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: vehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*, property:properties(name)")
        .order("name");
      if (error) throw error;
      return data as unknown as Vehicle[];
    },
  });

  return (
    <PageShell>
      <PageHeader eyebrow="Fleet" title="Vehicles"
        action={<Button onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> New vehicle</Button>} />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(!vehicles || vehicles.length === 0) && <div className="sm:col-span-2 lg:col-span-3"><EmptyState>No vehicles tracked.</EmptyState></div>}
        {vehicles?.map((v) => {
          const insDays = v.insurance_expires_at ? differenceInDays(parseISO(v.insurance_expires_at), new Date()) : null;
          const regDays = v.registration_expires_at ? differenceInDays(parseISO(v.registration_expires_at), new Date()) : null;
          const alert = (insDays !== null && insDays < 30) || (regDays !== null && regDays < 30);
          return (
            <div key={v.id} className="group rounded-lg border border-border bg-card p-5 shadow-elegant">
              <div className="flex items-start justify-between">
                <div className="rounded-md bg-sand/60 p-2 text-primary"><CarIcon className="h-5 w-5" /></div>
                {alert && <AlertTriangle className="h-4 w-4 text-warning" />}
              </div>
              <h3 className="mt-3 font-display text-lg text-primary">{v.name}</h3>
              <p className="text-xs text-muted-foreground">
                {[v.year, v.make, v.model].filter(Boolean).join(" ") || "—"}
                {v.property ? ` · ${v.property.name}` : ""}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                <Stat label="Insurance" v={v.insurance_expires_at} />
                <Stat label="Registration" v={v.registration_expires_at} />
                <Stat label="Last inspection" v={v.last_inspection_at} />
                <div><dt className="uppercase tracking-wider">Battery / Fuel</dt><dd className="text-primary">{v.battery_status ?? "—"} · {v.fuel_level ?? "—"}</dd></div>
              </dl>
              <button onClick={async () => {
                if (!confirm(`Remove ${v.name}?`)) return;
                const { error } = await supabase.from("vehicles").delete().eq("id", v.id);
                if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["vehicles"] });
              }} className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive">
                <Trash2 className="h-3 w-3" /> Remove
              </button>
            </div>
          );
        })}
      </div>

      <VehicleDialog open={open} onOpenChange={setOpen} onSaved={() => qc.invalidateQueries({ queryKey: ["vehicles"] })} />
    </PageShell>
  );
}

function Stat({ label, v }: { label: string; v: string | null }) {
  return <div><dt className="uppercase tracking-wider">{label}</dt><dd className="text-primary">{v ?? "—"}</dd></div>;
}

function VehicleDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: "", property_id: "", make: "", model: "", year: "", vin: "",
    insurance_expires_at: "", registration_expires_at: "", last_inspection_at: "",
    battery_status: "", fuel_level: "",
  });
  const { data: properties } = useQuery({
    queryKey: ["properties", "lite"], enabled: open,
    queryFn: async () => { const { data } = await supabase.from("properties").select("id, name").order("name"); return data ?? []; },
  });
  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Name required");
      const { error } = await supabase.from("vehicles").insert({
        name: form.name.trim(), property_id: form.property_id || null,
        make: form.make || null, model: form.model || null, year: form.year ? Number(form.year) : null,
        vin: form.vin || null,
        insurance_expires_at: form.insurance_expires_at || null,
        registration_expires_at: form.registration_expires_at || null,
        last_inspection_at: form.last_inspection_at || null,
        battery_status: form.battery_status || null, fuel_level: form.fuel_level || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Vehicle added"); onSaved(); onOpenChange(false);
      setForm({ name: "", property_id: "", make: "", model: "", year: "", vin: "", insurance_expires_at: "", registration_expires_at: "", last_inspection_at: "", battery_status: "", fuel_level: "" }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="font-display">New vehicle</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <FF label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FF>
          <FF label="Property">
            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })}>
              <option value="">—</option>
              {properties?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </FF>
          <FF label="Make"><Input value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} /></FF>
          <FF label="Model"><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></FF>
          <FF label="Year"><Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></FF>
          <FF label="VIN"><Input value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} /></FF>
          <FF label="Insurance expires"><Input type="date" value={form.insurance_expires_at} onChange={(e) => setForm({ ...form, insurance_expires_at: e.target.value })} /></FF>
          <FF label="Registration expires"><Input type="date" value={form.registration_expires_at} onChange={(e) => setForm({ ...form, registration_expires_at: e.target.value })} /></FF>
          <FF label="Last inspection"><Input type="date" value={form.last_inspection_at} onChange={(e) => setForm({ ...form, last_inspection_at: e.target.value })} /></FF>
          <FF label="Battery / Fuel"><Input value={form.battery_status} placeholder="e.g. Good" onChange={(e) => setForm({ ...form, battery_status: e.target.value })} /></FF>
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
