import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import { ArrowLeft, Plus, Printer, Mail, Phone, MessageCircle, Globe, BedDouble, Users as UsersIcon, Calendar as CalIcon, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ActivityCard, type ActivityRow, dateLabel } from "@/components/activity-card";
import { ActivityDialog } from "@/components/activity-dialog";
import { GuestTagPill } from "@/components/guest-tag-pill";
import { GUEST_TAGS, type GuestTag } from "@/lib/domain";
import { AuditLogDrawer } from "@/components/audit-log-drawer";

export const Route = createFileRoute("/_authenticated/app/guests/$guestId")({
  component: GuestDetail,
});

function GuestDetail() {
  const { guestId } = Route.useParams();
  const qc = useQueryClient();
  const [activityOpen, setActivityOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityRow | undefined>();
  const [guestLogOpen, setGuestLogOpen] = useState(false);

  const { data: guest } = useQuery({
    queryKey: ["guest", guestId],
    queryFn: async () => {
      const { data, error } = await supabase.from("guests").select("*").eq("id", guestId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: activities } = useQuery({
    queryKey: ["guest-activities", guestId],
    queryFn: async () => {
      const { data, error } = await supabase.from("activities")
        .select("*").eq("guest_id", guestId)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as ActivityRow[];
    },
  });

  const today = startOfDay(new Date());
  const upcoming = (activities ?? []).filter((a) => !isBefore(parseISO(a.date), today));
  const past = (activities ?? []).filter((a) => isBefore(parseISO(a.date), today));

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityRow[]>();
    upcoming.forEach((a) => {
      const arr = map.get(a.date) ?? [];
      arr.push(a);
      map.set(a.date, arr);
    });
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : 1));
  }, [upcoming]);

  if (!guest) return <div className="p-10 text-sm text-muted-foreground">Loading…</div>;

  const openEdit = (a: ActivityRow) => { setEditingActivity(a); setActivityOpen(true); };
  const openNew = () => { setEditingActivity(undefined); setActivityOpen(true); };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
      <div className="no-print">
        <Link to="/app/guests" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Guests
        </Link>
      </div>

      <div className="mt-4 no-print">
        <p className="text-[10px] uppercase tracking-[0.25em] text-gold">Guest profile</p>
        <div className="flex items-start justify-between gap-3">
          <h1 className="mt-1 font-display text-4xl text-primary">{guest.full_name}</h1>
          <button
            onClick={() => setGuestLogOpen(true)}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-gold/60 hover:text-gold"
          >
            <History className="h-3.5 w-3.5" /> Log
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {((guest.tags as GuestTag[]) ?? []).map((t) => <GuestTagPill key={t} tag={t} />)}
        </div>
      </div>

      <Tabs defaultValue="overview" className="mt-6 no-print">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Contact">
              <InfoRow icon={Mail}>{guest.email ?? "—"}</InfoRow>
              <InfoRow icon={MessageCircle}>{guest.whatsapp ?? "—"}</InfoRow>
              <InfoRow icon={Phone}>{guest.phone ?? "—"}</InfoRow>
              <InfoRow icon={Globe}>{guest.nationality ?? "—"}{guest.language ? ` · ${guest.language}` : ""}</InfoRow>
            </Card>
            <Card title="Stay">
              <InfoRow icon={BedDouble}>{guest.property ?? "—"}</InfoRow>
              <InfoRow icon={CalIcon}>
                {guest.check_in && guest.check_out
                  ? `${format(parseISO(guest.check_in), "MMM d, yyyy")} – ${format(parseISO(guest.check_out), "MMM d, yyyy")}`
                  : "Dates pending"}
              </InfoRow>
              <InfoRow icon={UsersIcon}>{guest.party_size ? `Party of ${guest.party_size}` : "—"}</InfoRow>
            </Card>
          </div>
          <div className="mt-4">
            <EditGuestPanel guest={guest} onSaved={() => qc.invalidateQueries({ queryKey: ["guest", guestId] })} />
          </div>
        </TabsContent>

        <TabsContent value="preferences" className="mt-6">
          <PreferencesEditor guest={guest} onSaved={() => qc.invalidateQueries({ queryKey: ["guest", guestId] })} />
        </TabsContent>

        <TabsContent value="itinerary" className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-primary">Upcoming itinerary</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="mr-1.5 h-4 w-4" /> Print / PDF
              </Button>
              <Button onClick={openNew}><Plus className="mr-1.5 h-4 w-4" /> Add activity</Button>
            </div>
          </div>

          {grouped.length === 0 ? (
            <p className="mt-6 rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No upcoming activities. Add the first one.
            </p>
          ) : (
            <div className="mt-6 space-y-6">
              {grouped.map(([date, items]) => (
                <section key={date}>
                  <h3 className="mb-2 border-b border-border pb-1.5 font-display text-lg text-primary">{dateLabel(date)}</h3>
                  <div className="space-y-3">
                    {items.map((a) => <ActivityCard key={a.id} activity={a} onEdit={() => openEdit(a)} />)}
                  </div>
                </section>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <h2 className="font-display text-xl text-primary">Past activities</h2>
          {past.length === 0 ? (
            <p className="mt-3 rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No history yet.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {past.slice().reverse().map((a) => (
                <ActivityCard key={a.id} activity={a} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Print layout */}
      <PrintLayout guest={guest} groups={grouped} />

      <ActivityDialog
        open={activityOpen}
        onOpenChange={(o) => { setActivityOpen(o); if (!o) setEditingActivity(undefined); }}
        fixedGuestId={guestId}
        initial={editingActivity}
        defaultDate={guest.check_in ?? undefined}
      />

      <AuditLogDrawer
        open={guestLogOpen}
        onOpenChange={setGuestLogOpen}
        tableName="guests"
        recordId={guestId}
        recordTitle={guest.full_name}
      />
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{title}</p>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-sm text-foreground/90">
      <Icon className="h-3.5 w-3.5 text-gold" /> {children}
    </p>
  );
}

function EditGuestPanel({ guest, onSaved }: { guest: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    full_name: guest.full_name ?? "",
    nationality: guest.nationality ?? "",
    email: guest.email ?? "",
    phone: guest.phone ?? "",
    whatsapp: guest.whatsapp ?? "",
    property: guest.property ?? "",
    check_in: guest.check_in ?? "",
    check_out: guest.check_out ?? "",
    party_size: guest.party_size ?? "",
    language: guest.language ?? "",
  });
  const [tags, setTags] = useState<GuestTag[]>((guest.tags as GuestTag[]) ?? []);
  const qc = useQueryClient();
  const { data: properties } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("name").order("name");
      if (error) throw error;
      return data as { name: string }[];
    },
  });
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");

  async function addCustomProperty() {
    const name = customName.trim();
    if (!name) return;
    if (!(properties ?? []).some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      const { error } = await supabase.from("properties").insert({ name });
      if (error) { toast.error(error.message); return; }
      await qc.invalidateQueries({ queryKey: ["properties"] });
    }
    setForm((f) => ({ ...f, property: name }));
    setCustomName("");
    setCustomOpen(false);
    toast.success("Property added");
  }

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("guests").update({
        ...form,
        party_size: form.party_size ? Number(form.party_size) : null,
        check_in: form.check_in || null,
        check_out: form.check_out || null,
        tags,
      }).eq("id", guest.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Guest updated"); onSaved(); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-left text-sm font-medium text-primary"
      >
        Edit guest details
        <span className="text-xs text-muted-foreground">{open ? "Close" : "Open"}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-border p-5">
          <div className="grid grid-cols-2 gap-3">
            <LabeledInput label="Full name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
            <LabeledInput label="Nationality" value={form.nationality} onChange={(v) => setForm({ ...form, nationality: v })} />
            <LabeledInput label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <LabeledInput label="WhatsApp" value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} />
            <LabeledInput label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <LabeledInput label="Language" value={form.language} onChange={(v) => setForm({ ...form, language: v })} />
            <div className="space-y-1.5">
              <Label className="text-xs">Property</Label>
              <Select value={form.property} onValueChange={(v) => setForm({ ...form, property: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {(properties ?? []).map((p) => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <LabeledInput label="Party size" type="number" value={String(form.party_size)} onChange={(v) => setForm({ ...form, party_size: v })} />
            <LabeledInput label="Check-in" type="date" value={form.check_in} onChange={(v) => setForm({ ...form, check_in: v })} />
            <LabeledInput label="Check-out" type="date" value={form.check_out} onChange={(v) => setForm({ ...form, check_out: v })} />
          </div>
          <div>
            <Label className="text-xs">Tags</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {GUEST_TAGS.map((t) => (
                <button
                  key={t} type="button"
                  onClick={() => setTags((arr) => (arr.includes(t) ? arr.filter((x) => x !== t) : [...arr, t]))}
                  className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wider ${
                    tags.includes(t) ? "border-gold bg-gold/15 text-[oklch(0.45_0.13_80)]" : "border-border text-muted-foreground"
                  }`}
                >{t}</button>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PreferencesEditor({ guest, onSaved }: { guest: any; onSaved: () => void }) {
  const [form, setForm] = useState({
    dietary: guest.dietary ?? "",
    allergies: guest.allergies ?? "",
    room_prefs: guest.room_prefs ?? "",
    favorite_activities: guest.favorite_activities ?? "",
    vip_notes: guest.vip_notes ?? "",
    special_notes: guest.special_notes ?? "",
  });
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("guests").update(form).eq("id", guest.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Preferences saved"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-5">
      <Pref label="Dietary restrictions" value={form.dietary} onChange={(v) => setForm({ ...form, dietary: v })} />
      <Pref label="Allergies" value={form.allergies} onChange={(v) => setForm({ ...form, allergies: v })} />
      <Pref label="Room preferences" value={form.room_prefs} onChange={(v) => setForm({ ...form, room_prefs: v })} />
      <Pref label="Favorite activities" value={form.favorite_activities} onChange={(v) => setForm({ ...form, favorite_activities: v })} />
      <Pref label="VIP notes" value={form.vip_notes} onChange={(v) => setForm({ ...form, vip_notes: v })} />
      <Pref label="Special notes" value={form.special_notes} onChange={(v) => setForm({ ...form, special_notes: v })} />
      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save preferences"}</Button>
      </div>
    </div>
  );
}

function Pref({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function LabeledInput({
  label, value, onChange, type = "text",
}: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function PrintLayout({ guest, groups }: { guest: any; groups: [string, ActivityRow[]][] }) {
  return (
    <div className="print-only print-page mt-8">
      <div className="border-b-2 pb-4" style={{ borderColor: "oklch(0.76 0.13 80)" }}>
        <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "oklch(0.76 0.13 80)" }}>Bellamare Concierge · Los Cabos</p>
        <h1 className="mt-2 font-display text-4xl" style={{ color: "oklch(0.22 0.06 250)" }}>Itinerary — {guest.full_name}</h1>
        <p className="mt-1 text-sm" style={{ color: "oklch(0.48 0.03 250)" }}>
          {guest.property ?? ""} {guest.check_in && guest.check_out ? `· ${format(parseISO(guest.check_in), "MMM d")} – ${format(parseISO(guest.check_out), "MMM d, yyyy")}` : ""}
        </p>
      </div>
      {groups.map(([date, items]) => (
        <section key={date} className="mt-6">
          <h2 className="font-display text-xl" style={{ color: "oklch(0.22 0.06 250)" }}>{dateLabel(date)}</h2>
          <ul className="mt-2 space-y-2">
            {items.map((a) => (
              <li key={a.id} className="border-b pb-2" style={{ borderColor: "oklch(0.90 0.012 80)" }}>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: "oklch(0.76 0.13 80)" }}>{a.category} · {a.status}</p>
                <p className="font-medium" style={{ color: "oklch(0.22 0.06 250)" }}>
                  {a.start_time ? a.start_time + " — " : ""}{a.name}
                </p>
                <p className="text-xs" style={{ color: "oklch(0.48 0.03 250)" }}>
                  {[a.vendor, a.location, a.confirmation_number ? `Conf #${a.confirmation_number}` : null].filter(Boolean).join(" · ")}
                </p>
                {a.notes && <p className="text-xs italic" style={{ color: "oklch(0.48 0.03 250)" }}>{a.notes}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
