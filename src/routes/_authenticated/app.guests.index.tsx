import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Plus, Search, ChevronRight, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { GuestTagPill } from "@/components/guest-tag-pill";
import { GuestTypePill } from "@/components/guest-type-pill";
import { PropertySelector } from "@/components/property-selector";
import { GUEST_TAGS, GUEST_TYPES, type GuestTag, type GuestType } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/app/guests/")({
  component: GuestsPage,
});

interface Guest {
  id: string;
  full_name: string;
  nationality: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  property: string | null;
  check_in: string | null;
  check_out: string | null;
  party_size: number | null;
  tags: string[];
  language: string | null;
  guest_type: GuestType | null;
}

function GuestsPage() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [tagFilter, setTagFilter] = useState<GuestTag | "All">("All");
  const [typeFilter, setTypeFilter] = useState<GuestType | "All">("All");

  const { data: guests } = useQuery({
    queryKey: ["guests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guests")
        .select("id, full_name, nationality, email, phone, whatsapp, property, check_in, check_out, party_size, tags, language, guest_type")
        .order("full_name");
      if (error) throw error;
      return data as Guest[];
    },
  });

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (guests ?? []).filter((g) => {
      if (tagFilter !== "All" && !(g.tags ?? []).includes(tagFilter)) return false;
      if (typeFilter !== "All" && g.guest_type !== typeFilter) return false;
      if (!s) return true;
      return (
        g.full_name.toLowerCase().includes(s) ||
        (g.property ?? "").toLowerCase().includes(s) ||
        (g.email ?? "").toLowerCase().includes(s)
      );
    });
  }, [guests, q, tagFilter, typeFilter]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-gold">Bellamare</p>
          <h1 className="mt-1 font-display text-3xl text-primary md:text-4xl">Guests</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-1.5 h-4 w-4" /> New guest</Button>
          </DialogTrigger>
          {open && <NewGuestDialog onCreated={() => setOpen(false)} />}
        </Dialog>
      </div>

      <div className="mt-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, property, email…" className="pl-9" />
        </div>
        {/* Type filter */}
        <div className="flex flex-wrap gap-1.5">
          {(["All", ...GUEST_TYPES] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t as GuestType | "All")}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                typeFilter === t
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent/50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {/* Tag filter */}
        <div className="flex flex-wrap gap-1.5">
          {(["All", ...GUEST_TAGS] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTagFilter(t as GuestTag | "All")}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                tagFilter === t
                  ? "border-gold bg-gold/15 text-[oklch(0.45_0.13_80)]"
                  : "border-border text-muted-foreground hover:bg-accent/50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {list.length === 0 && (
          <div className="md:col-span-2 rounded-lg border border-dashed border-border p-12 text-center">
            <User className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              {guests?.length ? "No guests match your filter." : "No guests yet."}
            </p>
          </div>
        )}
        {list.map((g) => (
          <Link
            key={g.id}
            to="/app/guests/$guestId"
            params={{ guestId: g.id }}
            className="group rounded-lg border border-border bg-card p-4 transition-all hover:border-gold/60 hover:shadow-elegant"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display text-lg text-primary truncate">{g.full_name}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground truncate">
                  {g.property ?? "—"}
                  {g.check_in && g.check_out && (
                    <> · {format(parseISO(g.check_in), "MMM d")} – {format(parseISO(g.check_out), "MMM d")}</>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground truncate">
                  {g.nationality ?? "—"}{g.party_size ? ` · party of ${g.party_size}` : ""}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {g.guest_type && <GuestTypePill type={g.guest_type} size="sm" />}
              {(g.tags as GuestTag[]).map((t) => <GuestTagPill key={t} tag={t} size="sm" />)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function NewGuestDialog({ onCreated }: { onCreated: () => void }) {
  const qc = useQueryClient();

  const [form, setForm] = useState({
    full_name: "", nationality: "", email: "", phone: "", whatsapp: "",
    property: "", check_in: "", check_out: "", party_size: "",
    language: "", dietary: "", room_prefs: "", favorite_activities: "",
    allergies: "", vip_notes: "", special_notes: "",
  });
  const [tags, setTags] = useState<GuestTag[]>([]);
  const [guestType, setGuestType] = useState<GuestType | "">("");
  const toggle = (t: GuestTag) =>
    setTags((arr) => (arr.includes(t) ? arr.filter((x) => x !== t) : [...arr, t]));

  const create = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim()) throw new Error("Full name is required");
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("guests").insert({
        full_name: form.full_name.trim(),
        nationality: form.nationality || null,
        email: form.email || null,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        property: form.property || null,
        check_in: form.check_in || null,
        check_out: form.check_out || null,
        party_size: form.party_size ? Number(form.party_size) : null,
        language: form.language || null,
        dietary: form.dietary || null,
        room_prefs: form.room_prefs || null,
        favorite_activities: form.favorite_activities || null,
        allergies: form.allergies || null,
        vip_notes: form.vip_notes || null,
        special_notes: form.special_notes || null,
        guest_type: guestType || null,
        tags,
        created_by: user?.id ?? null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Guest added");
      qc.invalidateQueries({ queryKey: ["guests"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onCreated();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
      <DialogHeader><DialogTitle className="font-display text-2xl">New guest</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full name *"><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
          <Field label="Nationality"><Input value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="WhatsApp"><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+52…" /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Language"><Input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} placeholder="English, Spanish…" /></Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Property">
            <PropertySelector value={form.property} onChange={(v) => setForm({ ...form, property: v })} />
          </Field>
          <Field label="Guest type">
            <Select value={guestType} onValueChange={(v) => setGuestType(v as GuestType | "")}>
              <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— Unknown —</SelectItem>
                {GUEST_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Party size"><Input type="number" min={1} value={form.party_size} onChange={(e) => setForm({ ...form, party_size: e.target.value })} /></Field>
          <Field label="Check-in"><Input type="date" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} /></Field>
          <Field label="Check-out"><Input type="date" value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value })} /></Field>
        </div>

        <div>
          <Label>Tags</Label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {GUEST_TAGS.map((t) => (
              <button
                key={t} type="button" onClick={() => toggle(t)}
                className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wider ${
                  tags.includes(t) ? "border-gold bg-gold/15 text-[oklch(0.45_0.13_80)]" : "border-border text-muted-foreground"
                }`}
              >{t}</button>
            ))}
          </div>
        </div>

        <details className="rounded-md border border-border bg-muted/30 px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-primary">Preferences</summary>
          <div className="mt-3 space-y-3">
            <Field label="Dietary"><Textarea rows={2} value={form.dietary} onChange={(e) => setForm({ ...form, dietary: e.target.value })} /></Field>
            <Field label="Allergies"><Textarea rows={2} value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} /></Field>
            <Field label="Room preferences"><Textarea rows={2} value={form.room_prefs} onChange={(e) => setForm({ ...form, room_prefs: e.target.value })} /></Field>
            <Field label="Favorite activities"><Textarea rows={2} value={form.favorite_activities} onChange={(e) => setForm({ ...form, favorite_activities: e.target.value })} /></Field>
            <Field label="VIP notes"><Textarea rows={2} value={form.vip_notes} onChange={(e) => setForm({ ...form, vip_notes: e.target.value })} /></Field>
            <Field label="Special notes"><Textarea rows={2} value={form.special_notes} onChange={(e) => setForm({ ...form, special_notes: e.target.value })} /></Field>
          </div>
        </details>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCreated}>Cancel</Button>
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          {create.isPending ? "Saving…" : "Save guest"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
