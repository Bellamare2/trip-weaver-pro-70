import { useState, useEffect, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ExternalLink, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  STATUSES, SERVICE_TYPES, CAR_TYPES, TRANSPORT_LOCATIONS, CHARGE_TYPES,
  TRANSPORTATION_MODES, ACTIVITY_TYPES, PAYMENT_METHODS,
  serviceCategory, type ActivityStatus, type ServiceType,
} from "@/lib/domain";

export interface ActivityDraft {
  id?: string;
  guest_id: string;
  service_type: ServiceType;
  name: string;
  date: string;
  start_time: string | null;
  duration_minutes: number | null;
  vendor: string | null;
  location: string | null;
  notes: string | null;
  internal_notes: string | null;
  assigned_to: string | null;
  confirmed_with: string | null;
  price_usd: number | null;
  confirmation_number: string | null;
  status: ActivityStatus;
  roll_over: boolean;
  is_internal: boolean;
  details: Record<string, unknown>;
}

function emptyDraft(guestId: string, date?: string, isInternal = false): ActivityDraft {
  return {
    guest_id: guestId,
    service_type: "Activity",
    name: "",
    date: date ?? new Date().toISOString().slice(0, 10),
    start_time: "12:00",
    duration_minutes: null,
    vendor: null,
    location: null,
    notes: null,
    internal_notes: null,
    assigned_to: null,
    confirmed_with: null,
    price_usd: null,
    confirmation_number: null,
    status: "Requested",
    roll_over: false,
    is_internal: isInternal,
    details: {},
  };
}

export function ActivityDialog({
  open, onOpenChange, initial, fixedGuestId, defaultDate, defaultInternal,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Partial<ActivityDraft> & { id?: string };
  fixedGuestId?: string;
  defaultDate?: string;
  defaultInternal?: boolean;
}) {
  const qc = useQueryClient();
  const isEdit = !!initial?.id;

  const [draft, setDraft] = useState<ActivityDraft>(
    emptyDraft(fixedGuestId ?? "", defaultDate, defaultInternal),
  );

  useEffect(() => {
    if (!open) return;
    setDraft({
      ...emptyDraft(fixedGuestId ?? "", defaultDate, defaultInternal),
      ...(initial ?? {}),
      details: { ...(initial?.details ?? {}) },
    } as ActivityDraft);
  }, [open, initial, fixedGuestId, defaultDate, defaultInternal]);

  const { data: guests } = useQuery({
    queryKey: ["guests-lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guests").select("id, full_name, property").order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: open && !fixedGuestId,
  });

  const setD = (k: keyof ActivityDraft, v: unknown) => setDraft((d) => ({ ...d, [k]: v }));
  const setDetail = (k: string, v: unknown) =>
    setDraft((d) => ({ ...d, details: { ...d.details, [k]: v } }));
  const det = (k: string) => (draft.details?.[k] as string | number | undefined) ?? "";

  const save = useMutation({
    mutationFn: async () => {
      if (!draft.guest_id && !draft.is_internal) throw new Error("Please pick a guest");
      if (!draft.name.trim()) throw new Error("Activity name / title is required");
      const payload = {
        guest_id: draft.guest_id || null,
        service_type: draft.service_type,
        category: serviceCategory(draft.service_type),
        name: draft.name.trim(),
        date: draft.date,
        start_time: draft.start_time || null,
        duration_minutes: draft.duration_minutes,
        vendor: draft.vendor || null,
        location: draft.location || null,
        notes: draft.notes || null,
        internal_notes: draft.internal_notes || null,
        assigned_to: draft.assigned_to || null,
        confirmed_with: draft.confirmed_with || null,
        price_usd: draft.price_usd,
        confirmation_number: draft.confirmation_number || null,
        status: draft.status,
        roll_over: draft.roll_over,
        is_internal: draft.is_internal,
        details: (draft.details ?? {}) as never,
      };
      if (isEdit && initial?.id) {
        const { error } = await supabase.from("activities").update(payload).eq("id", initial.id);
        if (error) throw new Error(error.message);
      } else {
        if (!payload.guest_id) throw new Error("Please pick a guest (or add one first)");
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from("activities").insert({
          ...payload,
          created_by: user?.id ?? null,
        });
        if (error) throw new Error(error.message);
      }

    },
    onSuccess: () => {
      toast.success(isEdit ? "Saved" : "Added");
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["guest-activities"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isTransport = draft.service_type.includes("Transportation");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isEdit ? "Edit request" : draft.is_internal ? "New internal request" : "New guest request"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Guest + Service type */}
          <div className="grid gap-3 md:grid-cols-2">
            {!fixedGuestId ? (
              <Field label="Guest *">
                <div className="flex gap-2">
                  <Select value={draft.guest_id} onValueChange={(v) => setD("guest_id", v)}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Search guest…" /></SelectTrigger>
                    <SelectContent>
                      {(guests ?? []).map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.full_name}{g.property ? ` · ${g.property}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Link to="/app/guests" onClick={() => onOpenChange(false)}>
                    <Button type="button" variant="outline" size="icon" title="Add guest">
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </Field>
            ) : <div />}
            <Field label="Service *">
              <Select value={draft.service_type} onValueChange={(v) => setD("service_type", v as ServiceType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Title / Vendor / Date / Time */}
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Title *">
              <Input value={draft.name} onChange={(e) => setD("name", e.target.value)}
                placeholder={titlePlaceholder(draft.service_type)} />
            </Field>
            <Field label="Vendor / Provider">
              <Input value={draft.vendor ?? ""} onChange={(e) => setD("vendor", e.target.value)} />
            </Field>
            <Field label="Date *">
              <Input type="date" value={draft.date} onChange={(e) => setD("date", e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Time">
                <Input type="time" value={draft.start_time ?? ""} onChange={(e) => setD("start_time", e.target.value || null)} />
              </Field>
              <Field label="Duration (min)">
                <Input type="number" min={0} value={draft.duration_minutes ?? ""}
                  onChange={(e) => setD("duration_minutes", e.target.value ? Number(e.target.value) : null)} />
              </Field>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
            <label className="flex items-center gap-2">
              <Checkbox checked={draft.roll_over} onCheckedChange={(v) => setD("roll_over", !!v)} />
              Roll over
            </label>
            <label className="flex items-center gap-2">
              <Checkbox checked={draft.is_internal} onCheckedChange={(v) => setD("is_internal", !!v)} />
              Internal request
            </label>
            <Field label="Status" inline>
              <Select value={draft.status} onValueChange={(v) => setD("status", v as ActivityStatus)}>
                <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>

          {/* Dynamic section */}
          {isTransport && (
            <Section title="Transportation details">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Car type">
                  <Select value={String(det("car_type"))} onValueChange={(v) => setDetail("car_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{CAR_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Service type">
                  <Input value={String(det("service_subtype"))} onChange={(e) => setDetail("service_subtype", e.target.value)} placeholder="Regular, Round Trip, Owners…" />
                </Field>
                <Field label="Pick-up location">
                  <ComboInput value={String(det("pickup"))} onChange={(v) => setDetail("pickup", v)} options={TRANSPORT_LOCATIONS} />
                </Field>
                <Field label="Destination">
                  <ComboInput value={String(det("destination"))} onChange={(v) => setDetail("destination", v)} options={TRANSPORT_LOCATIONS} />
                </Field>
                <Field label="Adults">
                  <Input type="number" min={0} value={det("adults") as number | string} onChange={(e) => setDetail("adults", e.target.value ? Number(e.target.value) : "")} />
                </Field>
                <Field label="Children">
                  <Input type="number" min={0} value={det("children") as number | string} onChange={(e) => setDetail("children", e.target.value ? Number(e.target.value) : "")} />
                </Field>
                <Field label="Car seat">
                  <Input value={String(det("car_seat"))} onChange={(e) => setDetail("car_seat", e.target.value)} placeholder="None / Infant / Toddler" />
                </Field>
                <Field label="Additional names">
                  <Input value={String(det("additional_names"))} onChange={(e) => setDetail("additional_names", e.target.value)} />
                </Field>
                {draft.service_type !== "Private Transportation" && (
                  <>
                    <Field label="Airline & Flight #">
                      <Input value={String(det("flight_number"))} onChange={(e) => setDetail("flight_number", e.target.value)} placeholder="AA 1234" />
                    </Field>
                    <Field label="Flight time">
                      <Input type="time" value={String(det("flight_time"))} onChange={(e) => setDetail("flight_time", e.target.value)} />
                    </Field>
                    <Field label="Tail number">
                      <Input value={String(det("tail_number"))} onChange={(e) => setDetail("tail_number", e.target.value)} />
                    </Field>
                  </>
                )}
                <Field label="Charge type">
                  <Select value={String(det("charge_type"))} onValueChange={(v) => setDetail("charge_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{CHARGE_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Total Price (USD)">
                  <Input type="number" step="0.01" min={0} value={draft.price_usd ?? ""}
                    onChange={(e) => setD("price_usd", e.target.value ? Number(e.target.value) : null)} />
                </Field>
              </div>
            </Section>
          )}

          {draft.service_type === "Restaurant Reservation" && (
            <Section title="Reservation details">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Restaurant">
                  <Input value={String(det("restaurant"))} onChange={(e) => setDetail("restaurant", e.target.value)} />
                </Field>
                <Field label="Reservation time">
                  <Input type="time" value={String(det("reservation_time"))} onChange={(e) => setDetail("reservation_time", e.target.value)} />
                </Field>
                <Field label="Number of people">
                  <Input type="number" min={0} value={det("party_size") as number | string} onChange={(e) => setDetail("party_size", e.target.value ? Number(e.target.value) : "")} />
                </Field>
                <Field label="Number of kids">
                  <Input type="number" min={0} value={det("kids") as number | string} onChange={(e) => setDetail("kids", e.target.value ? Number(e.target.value) : "")} />
                </Field>
                <Field label="Allergies">
                  <Input value={String(det("allergies"))} onChange={(e) => setDetail("allergies", e.target.value)} />
                </Field>
                <Field label="Transportation type">
                  <Select value={String(det("transport_mode"))} onValueChange={(v) => setDetail("transport_mode", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{TRANSPORTATION_MODES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Confirmed with">
                  <Input value={draft.confirmed_with ?? ""} onChange={(e) => setD("confirmed_with", e.target.value)} />
                </Field>
                <Field label="Confirmation #">
                  <Input value={draft.confirmation_number ?? ""} onChange={(e) => setD("confirmation_number", e.target.value)} />
                </Field>
                <Field label="Special instructions">
                  <Input value={String(det("special_instructions"))} onChange={(e) => setDetail("special_instructions", e.target.value)} />
                </Field>
              </div>
            </Section>
          )}

          {draft.service_type === "Activity" && (
            <Section title="Activity details">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Type of activity">
                  <ComboInput value={String(det("activity_type"))} onChange={(v) => setDetail("activity_type", v)} options={ACTIVITY_TYPES} />
                </Field>
                <Field label="Public or Private">
                  <Select value={String(det("public_private")) || "Public"} onValueChange={(v) => setDetail("public_private", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Public">Public</SelectItem>
                      <SelectItem value="Private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Adults *">
                  <Input type="number" min={0} value={det("adults") as number | string} onChange={(e) => setDetail("adults", e.target.value ? Number(e.target.value) : "")} />
                </Field>
                <Field label="Children">
                  <Input type="number" min={0} value={det("children") as number | string} onChange={(e) => setDetail("children", e.target.value ? Number(e.target.value) : "")} />
                </Field>
                <Field label="Meeting time">
                  <Input type="time" value={String(det("meeting_time"))} onChange={(e) => setDetail("meeting_time", e.target.value)} />
                </Field>
                <Field label="Meeting location">
                  <Input value={String(det("meeting_location"))} onChange={(e) => setDetail("meeting_location", e.target.value)} />
                </Field>
                <Field label="Confirmed with">
                  <Input value={draft.confirmed_with ?? ""} onChange={(e) => setD("confirmed_with", e.target.value)} />
                </Field>
                <Field label="Confirmation # *">
                  <Input value={draft.confirmation_number ?? ""} onChange={(e) => setD("confirmation_number", e.target.value)} />
                </Field>
                <Field label="Payment method">
                  <Select value={String(det("payment_method"))} onValueChange={(v) => setDetail("payment_method", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{PAYMENT_METHODS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Price (USD) *">
                  <Input type="number" step="0.01" min={0} value={draft.price_usd ?? ""}
                    onChange={(e) => setD("price_usd", e.target.value ? Number(e.target.value) : null)} />
                </Field>
                <Field label="Additional details" full>
                  <Textarea rows={2} value={String(det("additional_details"))} onChange={(e) => setDetail("additional_details", e.target.value)} placeholder="Insurance, park fees, etc." />
                </Field>
              </div>
            </Section>
          )}

          {!isTransport && draft.service_type !== "Restaurant Reservation" && draft.service_type !== "Activity" && (
            <Section title="Details">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Location">
                  <Input value={draft.location ?? ""} onChange={(e) => setD("location", e.target.value)} />
                </Field>
                <Field label="Price (USD)">
                  <Input type="number" step="0.01" min={0} value={draft.price_usd ?? ""}
                    onChange={(e) => setD("price_usd", e.target.value ? Number(e.target.value) : null)} />
                </Field>
                <Field label="Confirmed with">
                  <Input value={draft.confirmed_with ?? ""} onChange={(e) => setD("confirmed_with", e.target.value)} />
                </Field>
                <Field label="Confirmation #">
                  <Input value={draft.confirmation_number ?? ""} onChange={(e) => setD("confirmation_number", e.target.value)} />
                </Field>
              </div>
            </Section>
          )}

          {/* Notes */}
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Special Info (guest-facing)">
              <Textarea rows={3} value={draft.notes ?? ""} onChange={(e) => setD("notes", e.target.value)} />
            </Field>
            <Field label="Internal Notes">
              <Textarea rows={3} value={draft.internal_notes ?? ""} onChange={(e) => setD("internal_notes", e.target.value)} />
            </Field>
            <Field label="Assigned to">
              <Input value={draft.assigned_to ?? ""} onChange={(e) => setD("assigned_to", e.target.value)} placeholder="Concierge name" />
            </Field>
            {draft.guest_id && (
              <div className="flex items-end">
                <Link to="/app/guests/$guestId" params={{ guestId: draft.guest_id }} onClick={() => onOpenChange(false)}
                  className="inline-flex items-center gap-1 text-sm text-gold hover:underline">
                  Open guest profile <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Save request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, full, inline }: { label: string; children: ReactNode; full?: boolean; inline?: boolean }) {
  if (inline) {
    return (
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        {children}
      </div>
    );
  }
  return (
    <div className={`space-y-1.5 ${full ? "md:col-span-2" : ""}`}>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <p className="mb-3 text-[10px] uppercase tracking-[0.25em] text-gold">{title}</p>
      {children}
    </div>
  );
}

/** Select-with-custom-text fallback. */
function ComboInput({
  value, onChange, options,
}: { value: string; onChange: (v: string) => void; options: readonly string[] }) {
  const isPreset = options.includes(value);
  const [mode, setMode] = useState<"preset" | "custom">(isPreset || !value ? "preset" : "custom");
  return (
    <div className="flex gap-2">
      {mode === "preset" ? (
        <Select value={value} onValueChange={(v) => v === "__custom" ? setMode("custom") : onChange(v)}>
          <SelectTrigger className="flex-1"><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            <SelectItem value="__custom">Custom…</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <Input className="flex-1" value={value} onChange={(e) => onChange(e.target.value)} autoFocus
          onBlur={() => { if (!value) setMode("preset"); }} />
      )}
    </div>
  );
}

function titlePlaceholder(s: ServiceType): string {
  switch (s) {
    case "Restaurant Reservation": return "Dinner at Sunset Mona Lisa";
    case "Activity": return "Sunset Sailing";
    case "Arrival Transportation": return "Airport pickup";
    case "Departure Transportation": return "Airport drop-off";
    case "Private Transportation": return "Transfer to El Dorado";
    case "Spa": return "Couples massage";
    default: return "Title";
  }
}
