import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, MapPin, Home } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PageHeader, PageShell, EmptyState } from "@/components/page-shell";

export const Route = createFileRoute("/_authenticated/app/properties/")({
  component: PropertiesList,
});

interface PropertyRow {
  id: string;
  name: string;
  community: string | null;
  address: string | null;
  owner_name: string | null;
}

function PropertiesList() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["properties", "full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name, community, address, owner_name")
        .order("name");
      if (error) throw error;
      return data as PropertyRow[];
    },
  });

  const filtered = (data ?? []).filter((p) =>
    !q.trim() || p.name.toLowerCase().includes(q.toLowerCase()) ||
    (p.community ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <PageShell>
      <PageHeader
        eyebrow="Portfolio"
        title="Properties"
        action={<Button onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> New property</Button>}
      />

      <Input
        placeholder="Search by name or community…"
        value={q} onChange={(e) => setQ(e.target.value)}
        className="mt-6 max-w-md"
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && filtered.length === 0 && (
          <div className="sm:col-span-2 lg:col-span-3">
            <EmptyState>No properties yet. Add the first residence to get started.</EmptyState>
          </div>
        )}
        {filtered.map((p) => (
          <Link
            key={p.id}
            to="/app/properties/$propertyId"
            params={{ propertyId: p.id }}
            className="group block rounded-lg border border-border bg-card p-5 shadow-elegant transition-shadow hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-md bg-sand/60 p-2 text-primary"><Home className="h-5 w-5" /></div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Residence</span>
            </div>
            <h3 className="mt-4 font-display text-xl text-primary">{p.name}</h3>
            {p.community && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {p.community}
              </p>
            )}
            {p.address && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{p.address}</p>
            )}
            {p.owner_name && (
              <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                Owner · <span className="text-primary">{p.owner_name}</span>
              </p>
            )}
          </Link>
        ))}
      </div>

      <NewPropertyDialog open={open} onOpenChange={setOpen} onCreated={() => qc.invalidateQueries({ queryKey: ["properties"] })} />
    </PageShell>
  );
}

function NewPropertyDialog({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", community: "", address: "", owner_name: "" });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Name is required");
      const { error } = await supabase.from("properties").insert({
        name: form.name.trim(),
        community: form.community.trim() || null,
        address: form.address.trim() || null,
        owner_name: form.owner_name.trim() || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Property added");
      setForm({ name: "", community: "", address: "", owner_name: "" });
      onCreated();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">New property</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Community"><Input value={form.community} onChange={(e) => setForm({ ...form, community: e.target.value })} placeholder="Pedregal, Palmilla…" /></Field>
          <Field label="Address"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="Owner name"><Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} /></Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
