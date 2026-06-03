import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, Save, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { PROVIDER_ROLES, DOCUMENT_TYPES } from "@/lib/domain";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/_authenticated/app/properties/$propertyId")({
  component: PropertyDetail,
});

interface PropertyDetailRow {
  id: string;
  name: string; community: string | null; address: string | null; gps: string | null;
  owner_name: string | null; owner_email: string | null; owner_phone: string | null;
  emergency_contacts: Array<{ name: string; phone: string }>;
  wifi_ssid: string | null; wifi_password: string | null;
  gate_codes: string | null; alarm_code: string | null; alarm_company: string | null;
  utility_providers: Array<{ type: string; provider: string; account?: string }>;
  insurance: { carrier?: string; policy?: string; expires?: string };
  property_tax: { account?: string; annual?: string };
  notes: string | null;
}

function PropertyDetail() {
  const { propertyId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: p, isLoading } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").eq("id", propertyId).single();
      if (error) throw error;
      return data as unknown as PropertyDetailRow;
    },
  });

  const [form, setForm] = useState<Partial<PropertyDetailRow> | null>(null);
  const current = form ?? p ?? null;

  const save = useMutation({
    mutationFn: async () => {
      if (!current) return;
      const { error } = await supabase.from("properties").update({
        name: current.name, community: current.community, address: current.address, gps: current.gps,
        owner_name: current.owner_name, owner_email: current.owner_email, owner_phone: current.owner_phone,
        emergency_contacts: current.emergency_contacts ?? [],
        wifi_ssid: current.wifi_ssid, wifi_password: current.wifi_password,
        gate_codes: current.gate_codes, alarm_code: current.alarm_code, alarm_company: current.alarm_company,
        utility_providers: current.utility_providers ?? [],
        insurance: current.insurance ?? {},
        property_tax: current.property_tax ?? {},
        notes: current.notes,
      }).eq("id", propertyId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["property", propertyId] }); setForm(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteProperty = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("properties").delete().eq("id", propertyId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Property deleted");
      qc.invalidateQueries({ queryKey: ["properties"] });
      navigate({ to: "/app/properties" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !current) return <PageShell><p className="text-sm text-muted-foreground">Loading…</p></PageShell>;

  const update = (patch: Partial<PropertyDetailRow>) => setForm({ ...(current as PropertyDetailRow), ...patch });

  return (
    <PageShell>
      <Link to="/app/properties" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> Properties
      </Link>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-gold">{current.community ?? "Residence"}</p>
          <h1 className="mt-1 font-display text-3xl text-primary md:text-4xl">{current.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          {form && <Button onClick={() => save.mutate()} disabled={save.isPending}><Save className="mr-1.5 h-4 w-4" /> Save changes</Button>}
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 className="mr-1.5 h-4 w-4" /> Delete</Button>
        </div>
      </div>

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        propertyName={current.name}
        onConfirm={() => deleteProperty.mutate()}
        isPending={deleteProperty.isPending}
      />

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="bg-card">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="access">Access</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <Card title="Property">
            <Two>
              <F label="Name"><Input value={current.name ?? ""} onChange={(e) => update({ name: e.target.value })} /></F>
              <F label="Community"><Input value={current.community ?? ""} onChange={(e) => update({ community: e.target.value })} /></F>
              <F label="Address"><Input value={current.address ?? ""} onChange={(e) => update({ address: e.target.value })} /></F>
              <F label="GPS"><Input value={current.gps ?? ""} placeholder="lat,lng" onChange={(e) => update({ gps: e.target.value })} /></F>
            </Two>
          </Card>
          <Card title="Owner">
            <Two>
              <F label="Name"><Input value={current.owner_name ?? ""} onChange={(e) => update({ owner_name: e.target.value })} /></F>
              <F label="Email"><Input value={current.owner_email ?? ""} onChange={(e) => update({ owner_email: e.target.value })} /></F>
              <F label="Phone"><Input value={current.owner_phone ?? ""} onChange={(e) => update({ owner_phone: e.target.value })} /></F>
            </Two>
          </Card>
          <Card title="Emergency contacts">
            <JsonList
              items={current.emergency_contacts ?? []}
              fields={[{ key: "name", label: "Name" }, { key: "phone", label: "Phone" }]}
              onChange={(items) => update({ emergency_contacts: items as PropertyDetailRow["emergency_contacts"] })}
            />
          </Card>
          <Card title="Notes">
            <Textarea rows={4} value={current.notes ?? ""} onChange={(e) => update({ notes: e.target.value })} />
          </Card>
        </TabsContent>

        <TabsContent value="access" className="mt-4 space-y-4">
          <Card title="Wi-Fi">
            <Two>
              <F label="SSID"><Input value={current.wifi_ssid ?? ""} onChange={(e) => update({ wifi_ssid: e.target.value })} /></F>
              <F label="Password"><Input value={current.wifi_password ?? ""} onChange={(e) => update({ wifi_password: e.target.value })} /></F>
            </Two>
          </Card>
          <Card title="Gate & alarm">
            <Two>
              <F label="Gate codes"><Input value={current.gate_codes ?? ""} onChange={(e) => update({ gate_codes: e.target.value })} /></F>
              <F label="Alarm code"><Input value={current.alarm_code ?? ""} onChange={(e) => update({ alarm_code: e.target.value })} /></F>
              <F label="Alarm company"><Input value={current.alarm_company ?? ""} onChange={(e) => update({ alarm_company: e.target.value })} /></F>
            </Two>
          </Card>
          <Card title="Utilities">
            <JsonList
              items={current.utility_providers ?? []}
              fields={[
                { key: "type", label: "Type" },
                { key: "provider", label: "Provider" },
                { key: "account", label: "Account #" },
              ]}
              onChange={(items) => update({ utility_providers: items as PropertyDetailRow["utility_providers"] })}
            />
          </Card>
          <Card title="Insurance & tax">
            <Two>
              <F label="Insurance carrier"><Input value={current.insurance?.carrier ?? ""} onChange={(e) => update({ insurance: { ...(current.insurance ?? {}), carrier: e.target.value } })} /></F>
              <F label="Policy #"><Input value={current.insurance?.policy ?? ""} onChange={(e) => update({ insurance: { ...(current.insurance ?? {}), policy: e.target.value } })} /></F>
              <F label="Insurance expires"><Input type="date" value={current.insurance?.expires ?? ""} onChange={(e) => update({ insurance: { ...(current.insurance ?? {}), expires: e.target.value } })} /></F>
              <F label="Tax account #"><Input value={current.property_tax?.account ?? ""} onChange={(e) => update({ property_tax: { ...(current.property_tax ?? {}), account: e.target.value } })} /></F>
              <F label="Annual tax (USD)"><Input value={current.property_tax?.annual ?? ""} onChange={(e) => update({ property_tax: { ...(current.property_tax ?? {}), annual: e.target.value } })} /></F>
            </Two>
          </Card>
        </TabsContent>

        <TabsContent value="providers" className="mt-4">
          <Providers propertyId={propertyId} />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Documents propertyId={propertyId} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-elegant">
      <h2 className="font-display text-lg text-primary">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
function Two({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function JsonList({
  items, fields, onChange,
}: {
  items: Array<Record<string, string>>;
  fields: { key: string; label: string }[];
  onChange: (items: Array<Record<string, string>>) => void;
}) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2">
          {fields.map((f) => (
            <div key={f.key} className="flex-1 min-w-[140px]">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.label}</Label>
              <Input
                value={it[f.key] ?? ""}
                onChange={(e) => {
                  const copy = [...items]; copy[i] = { ...copy[i], [f.key]: e.target.value }; onChange(copy);
                }}
              />
            </div>
          ))}
          <Button variant="ghost" size="icon" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...items, Object.fromEntries(fields.map((f) => [f.key, ""])) as Record<string, string>])}>
        <Plus className="mr-1 h-4 w-4" /> Add
      </Button>
    </div>
  );
}

function Providers({ propertyId }: { propertyId: string }) {
  const qc = useQueryClient();
  const [vendorId, setVendorId] = useState(""); const [role, setRole] = useState(PROVIDER_ROLES[0]);

  const { data: links } = useQuery({
    queryKey: ["property_providers", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_service_providers")
        .select("id, role, vendor:vendors(id, name, category, phone)")
        .eq("property_id", propertyId);
      if (error) throw error;
      return data as Array<{ id: string; role: string; vendor: { id: string; name: string; category: string; phone: string | null } | null }>;
    },
  });
  const { data: vendors } = useQuery({
    queryKey: ["vendors", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendors").select("id, name").order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!vendorId) throw new Error("Pick a vendor");
      const { error } = await supabase.from("property_service_providers").insert({ property_id: propertyId, vendor_id: vendorId, role });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Linked"); qc.invalidateQueries({ queryKey: ["property_providers", propertyId] }); setVendorId(""); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("property_service_providers").delete().eq("id", id); if (error) throw new Error(error.message); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["property_providers", propertyId] }),
  });

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-elegant">
      <h2 className="font-display text-lg text-primary">Service providers</h2>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[180px]">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Vendor</Label>
          <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
            <option value="">Select…</option>
            {vendors?.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div className="min-w-[140px]">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Role</Label>
          <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
            {PROVIDER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <Button onClick={() => add.mutate()}><Plus className="mr-1.5 h-4 w-4" /> Link</Button>
      </div>

      <div className="mt-4 divide-y divide-border rounded-md border border-border">
        {(!links || links.length === 0) && <p className="p-5 text-center text-sm text-muted-foreground">No providers linked yet.</p>}
        {links?.map((l) => (
          <div key={l.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <p className="text-primary">{l.vendor?.name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{l.role}{l.vendor?.phone ? ` · ${l.vendor.phone}` : ""}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => del.mutate(l.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function Documents({ propertyId }: { propertyId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", type: DOCUMENT_TYPES[0] as string, file_url: "", expires_at: "" });
  const { data: docs } = useQuery({
    queryKey: ["property_docs", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("property_documents").select("*").eq("property_id", propertyId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Array<{ id: string; name: string; type: string; file_url: string | null; expires_at: string | null }>;
    },
  });
  const add = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Name is required");
      const { error } = await supabase.from("property_documents").insert({
        property_id: propertyId, name: form.name.trim(), type: form.type,
        file_url: form.file_url.trim() || null, expires_at: form.expires_at || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Document added"); setForm({ name: "", type: DOCUMENT_TYPES[0], file_url: "", expires_at: "" }); qc.invalidateQueries({ queryKey: ["property_docs", propertyId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("property_documents").delete().eq("id", id); if (error) throw new Error(error.message); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["property_docs", propertyId] }),
  });
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-elegant">
      <h2 className="font-display text-lg text-primary">Documents</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <Input placeholder="URL (optional)" value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} />
        <div className="flex gap-2">
          <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          <Button onClick={() => add.mutate()}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="mt-4 divide-y divide-border rounded-md border border-border">
        {(!docs || docs.length === 0) && <p className="p-5 text-center text-sm text-muted-foreground">No documents yet.</p>}
        {docs?.map((d) => (
          <div key={d.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <p className="text-primary">{d.file_url ? <a className="hover:underline" href={d.file_url} target="_blank" rel="noreferrer">{d.name}</a> : d.name}</p>
              <p className="text-xs text-muted-foreground">{d.type}{d.expires_at ? ` · expires ${d.expires_at}` : ""}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => del.mutate(d.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </section>
  );
}
