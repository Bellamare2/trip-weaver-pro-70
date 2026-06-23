import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import { ArrowLeft, Plus, Printer, Mail, Phone, MessageCircle, Globe, BedDouble, Users as UsersIcon, Calendar as CalIcon, History, BookOpen, Pencil, Trash2 } from "lucide-react";
import { ReservationDialog, type ReservationRow } from "@/components/reservation-dialog";
import { ItineraryDialog } from "@/components/itinerary-dialog";
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
  const [reservationOpen, setReservationOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<ReservationRow | undefined>();
  const [itineraryReservation, setItineraryReservation] = useState<ReservationRow | null>(null);

  const { data: guest } = useQuery({
    queryKey: ["guest", guestId],
    queryFn: async () => {
      const { data, error } = await supabase.from("guests").select("*").eq("id", guestId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: reservations } = useQuery({
    queryKey: ["reservations", guestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations").select("*").eq("guest_id", guestId)
        .order("check_in", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as ReservationRow[];
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
          <TabsTrigger value="reservations">Reservations</TabsTrigger>
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

        <TabsContent value="reservations" className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-primary">Reservations</h2>
            <Button onClick={() => { setEditingReservation(undefined); setReservationOpen(true); }}>
              <Plus className="mr-1.5 h-4 w-4" /> New reservation
            </Button>
          </div>

          {(!reservations || reservations.length === 0) ? (
            <p className="mt-6 rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No reservations yet. Create the first one.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {reservations.map((r) => (
                <ReservationCard
                  key={r.id}
                  reservation={r}
                  guestName={guest.full_name}
                  onEdit={() => { setEditingReservation(r); setReservationOpen(true); }}
                  onItinerary={() => setItineraryReservation(r)}
                  onDeleted={() => qc.invalidateQueries({ queryKey: ["reservations", guestId] })}
                />
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

      <ReservationDialog
        open={reservationOpen}
        onOpenChange={setReservationOpen}
        guestId={guestId}
        guestName={guest.full_name}
        initial={editingReservation}
      />

      {itineraryReservation && (
        <ItineraryDialog
          open={!!itineraryReservation}
          onOpenChange={(v) => { if (!v) setItineraryReservation(null); }}
          reservation={itineraryReservation}
          guestName={guest.full_name}
          guestId={guestId}
        />
      )}

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
              <Select
                value={form.property}
                onValueChange={(v) => {
                  if (v === "__custom__") { setCustomOpen(true); return; }
                  setForm({ ...form, property: v });
                }}
              >
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {(properties ?? []).map((p) => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
                  <SelectItem value="__custom__">+ Add custom…</SelectItem>
                </SelectContent>
              </Select>
              {customOpen && (
                <div className="flex gap-2 pt-1">
                  <Input
                    autoFocus
                    placeholder="New property name"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomProperty(); } }}
                  />
                  <Button type="button" size="sm" onClick={addCustomProperty}>Add</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => { setCustomOpen(false); setCustomName(""); }}>Cancel</Button>
                </div>
              )}
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

// ── ReservationCard ──────────────────────────────────────────────────────────
function ReservationCard({
  reservation, guestName, onEdit, onItinerary, onDeleted,
}: {
  reservation: ReservationRow;
  guestName: string;
  onEdit: () => void;
  onItinerary: () => void;
  onDeleted: () => void;
}) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reservations").delete().eq("id", reservation.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Reservation deleted"); onDeleted(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const stayLine = [
    reservation.check_in && reservation.check_out
      ? `${format(parseISO(reservation.check_in), "MMM d")} – ${format(parseISO(reservation.check_out), "MMM d, yyyy")}`
      : reservation.check_in
      ? `Check-in ${format(parseISO(reservation.check_in), "MMM d, yyyy")}`
      : reservation.check_out
      ? `Check-out ${format(parseISO(reservation.check_out), "MMM d, yyyy")}`
      : "Dates pending",
  ].join("");

  const isCancelled = reservation.status === "Cancelled";

  return (
    <div
      className={`rounded-lg border bg-card p-4 shadow-elegant cursor-pointer hover:border-primary/40 transition-colors ${isCancelled ? "border-destructive/30 opacity-70" : "border-border"}`}
      onClick={onEdit}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold">Reservation</p>
            {isCancelled && (
              <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-destructive/15 text-destructive border border-destructive/30">
                CXL
              </span>
            )}
          </div>
          <h3 className="mt-1 font-display text-lg text-primary">{reservation.property ?? "No property"}</h3>
          <p className="text-sm text-muted-foreground">{stayLine}</p>
          {reservation.notes && <p className="mt-1 text-xs text-muted-foreground">{reservation.notes}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {!isCancelled && (
            <Button size="sm" variant="outline" onClick={onItinerary} className="gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> Itinerary
            </Button>
          )}
          <button onClick={onEdit} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-primary">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { if (confirm("Delete this reservation?")) del.mutate(); }}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
