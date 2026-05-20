import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Phone, Mail, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { VENDOR_CATEGORIES, INSURANCE_STATUSES } from "@/lib/domain";
import { PageHeader, PageShell, EmptyState } from "@/components/page-shell";

export const Route = createFileRoute("/_authenticated/app/vendors")({
  component: VendorsPage,
});

interface Vendor {
  id: string; name: string; category: string;
  contact_name: string | null; phone: string | null; email: string | null;
  insurance_status: string; insurance_expires_at: string | null; notes: string | null;
}

function VendorsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>("All");

  const { data } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendors").select("*").order("name");
      if (error) throw error;
      return data as Vendor[];
    },
  });

  const list = (data ?? []).filter((v) => filter === "All" || v.category === filter);

  return (
    <PageShell>
      <PageHeader eyebrow="Network" title="Vendors"
        action={<Button onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> New vendor</Button>} />

      <div className="mt-6 flex flex-wrap gap-1.5">
        {["All", ...VENDOR_CATEGORIES].map((c) => (
          <button key={c} onClick={() => setFilter(c)}
            className={`rounded-full border px-3 py-1 text-xs ${
              filter === c ? "border-gold bg-gold/15 text-primary" : "border-border bg-card text-muted-foreground hover:border-gold/40"
            }`}>{c}</button>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.length === 0 && <div className="sm:col-span-2 lg:col-span-3"><EmptyState>No vendors in this category.</EmptyState></div>}
        {list.map((v) => (
          <VendorCard key={v.id} v={v} onDelete={async () => {
            if (!confirm(`Remove ${v.name}?`)) return;
            const { error } = await supabase.from("vendors").delete().eq("id", v.id);
            if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["vendors"] });
          }} />
        ))}
      </div>

      <VendorDialog open={open} onOpenChange={setOpen} onSaved={() => qc.invalidateQueries({ queryKey: ["vendors"] })} />
    </PageShell>
  );
}

function VendorCard({ v, onDelete }: { v: Vendor; onDelete: () => void }) {
  const insOk = v.insurance_status === "Active";
  return (
    <div className="group rounded-lg border border-border bg-card p-5 shadow-elegant">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gold">{v.category}</p>
          <h3 className="mt-1 font-display text-lg text-primary">{v.name}</h3>
          {v.contact_name && <p className="text-xs text-muted-foreground">{v.contact_name}</p>}
        </div>
        <button onClick={onDelete} className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
        {v.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {v.phone}</p>}
        {v.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {v.email}</p>}
      </div>
      <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-3 text-xs">
        {insOk ? <ShieldCheck className="h-3.5 w-3.5 text-success" /> : <ShieldAlert className="h-3.5 w-3.5 text-warning" />}
        <span className="text-muted-foreground">Insurance · <span className={insOk ? "text-success" : "text-warning-foreground"}>{v.insurance_status}</span>
        {v.insurance_expires_at && <span className="text-muted-foreground"> · expires {v.insurance_expires_at}</span>}</span>
      </div>
    </div>
  );
}

function VendorDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: "", category: VENDOR_CATEGORIES[0] as string, contact_name: "", phone: "", email: "",
    insurance_status: "Unknown", insurance_expires_at: "", notes: "",
  });
  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Name is required");
      const { error } = await supabase.from("vendors").insert({
        name: form.name.trim(), category: form.category,
        contact_name: form.contact_name || null, phone: form.phone || null, email: form.email || null,
        insurance_status: form.insurance_status,
        insurance_expires_at: form.insurance_expires_at || null,
        notes: form.notes || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Vendor added"); onSaved(); onOpenChange(false);
      setForm({ name: "", category: VENDOR_CATEGORIES[0], contact_name: "", phone: "", email: "", insurance_status: "Unknown", insurance_expires_at: "", notes: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">New vendor</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <FF label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FF>
          <FF label="Category">
            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {VENDOR_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </FF>
          <FF label="Contact name"><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></FF>
          <FF label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></FF>
          <FF label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></FF>
          <FF label="Insurance status">
            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.insurance_status} onChange={(e) => setForm({ ...form, insurance_status: e.target.value })}>
              {INSURANCE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </FF>
          <FF label="Insurance expires"><Input type="date" value={form.insurance_expires_at} onChange={(e) => setForm({ ...form, insurance_expires_at: e.target.value })} /></FF>
          <div className="sm:col-span-2"><FF label="Notes"><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></FF></div>
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
  return (<div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label><div className="mt-1">{children}</div></div>);
}
