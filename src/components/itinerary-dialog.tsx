import { useState, useMemo, useRef, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Printer, Mail, Download, Plus, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ActivityDialog } from "@/components/activity-dialog";
import type { ReservationRow } from "@/components/reservation-dialog";
import logoUrl from "@/assets/bellamare-logo.jpg";

interface ItinActivity {
  id: string;
  name: string;
  category: string;
  service_type: string;
  date: string;
  start_time: string | null;
  vendor: string | null;
  location: string | null;
  notes: string | null;
  internal_notes: string | null;
  price_usd: number | null;
  confirmation_number: string | null;
  assigned_to: string | null;
  confirmed_with: string | null;
  details: Record<string, unknown>;
  status: string;
}

function fmtDateTime(date: string, time: string | null) {
  const d = format(parseISO(date), "EEEE, MMMM d, yyyy");
  if (!time) return d;
  const [h, m] = time.split(":");
  const dt = new Date(); dt.setHours(Number(h), Number(m));
  return `${d} · ${format(dt, "h:mm a")}`;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reservation: ReservationRow;
  guestName: string;
  guestId: string;
  /** If set, pre-selects only this activity (single-ticket mode) */
  singleActivityId?: string;
}

export function ItineraryDialog({ open, onOpenChange, reservation, guestName, guestId, singleActivityId }: Props) {
  const qc = useQueryClient();
  const [activityOpen, setActivityOpen] = useState(false);
  const [tab, setTab] = useState<"tickets" | "message">(singleActivityId ? "message" : "tickets");
  const printRef = useRef<HTMLDivElement>(null);

  // Load logo as base64 for printing (img src in about:blank windows won't resolve relative paths)
  const logoDataUrlRef = useRef<string>("");
  useEffect(() => {
    fetch(logoUrl)
      .then((r) => r.blob())
      .then((b) => {
        const reader = new FileReader();
        reader.onload = () => { logoDataUrlRef.current = reader.result as string; };
        reader.readAsDataURL(b);
      })
      .catch(() => {});
  }, []);

  const { data: activities } = useQuery({
    queryKey: ["reservation-activities", reservation.id],
    enabled: open,
    queryFn: async () => {
      // Include activities directly linked to this reservation, OR activities
      // for this guest within the stay date range that weren't linked yet.
      let orFilter = `reservation_id.eq.${reservation.id}`;
      if (reservation.check_in && reservation.check_out) {
        orFilter += `,and(guest_id.eq.${guestId},reservation_id.is.null,date.gte.${reservation.check_in},date.lte.${reservation.check_out})`;
      } else if (reservation.check_in) {
        orFilter += `,and(guest_id.eq.${guestId},reservation_id.is.null,date.gte.${reservation.check_in})`;
      }
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .or(orFilter)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as ItinActivity[];
    },
  });

  // Checked activity IDs for document inclusion
  const [checked, setChecked] = useState<Set<string>>(() =>
    singleActivityId ? new Set([singleActivityId]) : new Set()
  );

  // When activities load, default-check all (unless single mode)
  const allIds = useMemo(() => (activities ?? []).map((a) => a.id), [activities]);
  const [defaulted, setDefaulted] = useState(false);
  if (!defaulted && allIds.length > 0) {
    if (!singleActivityId) setChecked(new Set(allIds));
    setDefaulted(true);
  }

  const [intro, setIntro] = useState(reservation.itinerary_intro);
  const [closing, setClosing] = useState(reservation.itinerary_closing);

  const saveMessages = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reservations")
        .update({ itinerary_intro: intro, itinerary_closing: closing })
        .eq("id", reservation.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Messages saved");
      qc.invalidateQueries({ queryKey: ["reservations", guestId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedActivities = useMemo(
    () => (activities ?? []).filter((a) => checked.has(a.id))
      .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.start_time ?? "").localeCompare(b.start_time ?? "")),
    [activities, checked]
  );

  function toggleAll() {
    if (checked.size === allIds.length) setChecked(new Set());
    else setChecked(new Set(allIds));
  }

  function handlePrint() {
    const win = window.open("", "_blank");
    if (!win) return;

    const logoSrc = logoDataUrlRef.current || `${window.location.origin}${logoUrl}`;

    const activitiesHtml = selectedActivities.map((a) => {
      const det = (a.details ?? {}) as Record<string, unknown>;
      const rows = [
        ["Date & Time", fmtDateTime(a.date, a.start_time)],
        a.vendor ? ["Vendor", a.vendor] : null,
        a.location ? ["Location", a.location] : null,
        det.pickup ? ["Pick-up", String(det.pickup)] : null,
        det.destination ? ["Destination", String(det.destination)] : null,
        det.car_type ? ["Car type", String(det.car_type)] : null,
        det.adults ? ["Number of adults", String(det.adults)] : null,
        det.children ? ["Number of children", String(det.children)] : null,
        det.flight_number ? ["Flight #", String(det.flight_number)] : null,
        det.charge_type ? ["Charge type", String(det.charge_type)] : null,
        a.price_usd != null ? ["Total price", `$${a.price_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD`] : null,
        a.notes ? ["Special notes", a.notes] : null,
        a.confirmation_number ? ["Confirmation #", a.confirmation_number] : null,
        a.confirmed_with ? ["Confirmed with", a.confirmed_with] : null,
      ].filter(Boolean) as [string, string][];

      return `<div style="border-top:1px solid #e5e5e5;padding:16px 0 4px;">
        <p style="font-weight:bold;font-size:14px;margin:0 0 10px;">${a.name}</p>
        ${rows.map(([lbl, val]) => `
          <div style="display:flex;gap:16px;margin-bottom:5px;font-size:12px;">
            <span style="min-width:140px;color:#888;text-transform:uppercase;font-size:10px;letter-spacing:1px;padding-top:1px;">${lbl}</span>
            <span style="color:#1a1a2e;">${val}</span>
          </div>`).join("")}
      </div>`;
    }).join("");

    win.document.write(`<!DOCTYPE html><html><head>
      <title></title>
      <meta charset="utf-8">
      <style>
        @page { margin: 0; size: letter; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
        body { font-family: Georgia, serif; color: #1a1a2e; margin: 0; padding: 0; }
        .page { max-width: 700px; margin: 0 auto; padding: 48px 40px; }
        @media print { body { margin: 0; } .page { padding: 32px 28px; } }
      </style>
    </head><body><div class="page">
      <div style="display:flex;align-items:center;gap:16px;border-bottom:1px solid #c9a84c;padding-bottom:20px;margin-bottom:28px;">
        <img src="${logoSrc}" alt="Bellamare" style="width:56px;height:56px;border-radius:8px;object-fit:cover;">
        <div>
          <p style="margin:0;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#c9a84c;">Los Cabos · Concierge</p>
          <p style="margin:0;font-size:20px;font-family:Georgia,serif;color:#1a1a2e;">Bellamare</p>
        </div>
      </div>
      <p style="font-style:italic;font-size:14px;margin:0 0 8px;">Dear ${guestName},</p>
      <p style="font-size:12px;line-height:1.7;white-space:pre-line;color:#444;margin:0 0 20px;">${intro}</p>
      ${activitiesHtml}
      <div style="border-top:1px solid #c9a84c55;margin-top:24px;padding-top:16px;">
        <p style="font-size:12px;line-height:1.7;white-space:pre-line;color:#444;margin:0;">${closing}</p>
      </div>
    </div></body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }

  function handleEmail() {
    const subject = encodeURIComponent(`Bellamare — Itinerary for ${guestName}`);
    const body = encodeURIComponent(buildPlainText());
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }

  function buildPlainText() {
    const lines = [
      `Dear ${guestName},`,
      "",
      intro,
      "",
      ...selectedActivities.flatMap((a) => {
        const det = a.details ?? {};
        const rows = [
          `────────────────────────`,
          `${a.name}`,
          `Date & Time: ${fmtDateTime(a.date, a.start_time)}`,
          a.vendor ? `Vendor: ${a.vendor}` : "",
          a.location ? `Location: ${a.location}` : "",
          det.pickup ? `Pick-up: ${det.pickup}` : "",
          det.destination ? `Destination: ${det.destination}` : "",
          det.car_type ? `Car type: ${det.car_type}` : "",
          a.price_usd != null ? `Total price: $${a.price_usd.toLocaleString()} USD` : "",
          det.charge_type ? `Charge type: ${det.charge_type}` : "",
          a.notes ? `Special notes: ${a.notes}` : "",
          a.confirmation_number ? `Confirmation #: ${a.confirmation_number}` : "",
        ].filter(Boolean);
        return rows;
      }),
      "",
      "────────────────────────",
      "",
      closing,
    ];
    return lines.join("\n");
  }

  const stayLine = [
    reservation.property,
    reservation.check_in && reservation.check_out
      ? `${format(parseISO(reservation.check_in), "MMM d")} – ${format(parseISO(reservation.check_out), "MMM d, yyyy")}`
      : reservation.check_in
      ? `Check-in ${format(parseISO(reservation.check_in), "MMM d, yyyy")}`
      : null,
  ].filter(Boolean).join(" · ");

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[90vh] max-w-6xl flex-col gap-0 p-0">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle className="font-display text-xl">
              Itinerary — {guestName}
            </DialogTitle>
            {stayLine && <p className="text-sm text-muted-foreground">{stayLine}</p>}
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden">
            {/* Left panel */}
            <div className="flex w-1/2 flex-col border-r border-border">
              <Tabs value={tab} onValueChange={(v) => setTab(v as "tickets" | "message")} className="flex flex-1 flex-col">
                <TabsList className="mx-4 mt-3 w-auto self-start">
                  <TabsTrigger value="tickets">Tickets</TabsTrigger>
                  <TabsTrigger value="message">Edit Message</TabsTrigger>
                </TabsList>

                {/* Tickets tab */}
                <TabsContent value="tickets" className="flex flex-1 flex-col overflow-hidden px-4 pb-4">
                  <div className="mb-2 mt-3 flex items-center justify-between">
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                      <Checkbox
                        checked={checked.size === allIds.length && allIds.length > 0}
                        onCheckedChange={toggleAll}
                      />
                      Select all
                    </label>
                    <Button size="sm" variant="outline" onClick={() => setActivityOpen(true)} className="gap-1.5 text-xs">
                      <Plus className="h-3.5 w-3.5" /> Guest Request
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2">
                    {(!activities || activities.length === 0) && (
                      <p className="py-8 text-center text-sm text-muted-foreground">No activities yet. Add a guest request.</p>
                    )}
                    {(activities ?? []).map((a) => (
                      <label
                        key={a.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                          checked.has(a.id) ? "border-gold/60 bg-gold/5" : "border-border bg-card"
                        }`}
                      >
                        <Checkbox
                          checked={checked.has(a.id)}
                          onCheckedChange={(v) => {
                            const next = new Set(checked);
                            if (v) next.add(a.id); else next.delete(a.id);
                            setChecked(next);
                          }}
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium text-primary">{a.name}</p>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                              a.status === "Confirmed" ? "bg-success/15 text-success-foreground" :
                              a.status === "Cancelled" ? "bg-destructive/15 text-destructive" :
                              "bg-warning/15 text-warning-foreground"
                            }`}>{a.status}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {fmtDateTime(a.date, a.start_time)}
                            {a.vendor ? ` · ${a.vendor}` : ""}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </TabsContent>

                {/* Edit Message tab */}
                <TabsContent value="message" className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Introduction</Label>
                    <Textarea rows={5} value={intro} onChange={(e) => setIntro(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Closing</Label>
                    <Textarea rows={6} value={closing} onChange={(e) => setClosing(e.target.value)} />
                  </div>
                  <Button size="sm" variant="outline" onClick={() => saveMessages.mutate()} disabled={saveMessages.isPending} className="self-end">
                    {saveMessages.isPending ? "Saving…" : "Save messages"}
                  </Button>
                </TabsContent>
              </Tabs>
            </div>

            {/* Right panel — preview */}
            <div className="flex w-1/2 flex-col">
              <div className="flex-1 overflow-y-auto bg-muted/20 p-4">
                <div ref={printRef} className="rounded-lg border border-border bg-white p-6 shadow-sm text-[13px] text-gray-800" style={{ fontFamily: "Georgia, serif" }}>
                  {/* Doc header */}
                  <div className="mb-6 flex items-center gap-4 border-b border-[#c9a84c]/40 pb-5">
                    <img src={logoUrl} alt="Bellamare" className="h-12 w-12 rounded-lg object-cover" />
                    <div>
                      <p style={{ fontSize: "9px", letterSpacing: "3px", textTransform: "uppercase", color: "#c9a84c" }}>Los Cabos · Concierge</p>
                      <p style={{ fontSize: "18px", fontFamily: "Georgia, serif", color: "#1a1a2e" }}>Bellamare</p>
                    </div>
                  </div>

                  {/* Greeting */}
                  <p style={{ marginBottom: "6px", fontStyle: "italic", fontSize: "14px" }}>Dear {guestName},</p>
                  <p style={{ marginBottom: "20px", lineHeight: "1.7", whiteSpace: "pre-line", fontSize: "12px", color: "#444" }}>{intro}</p>

                  {/* Activities */}
                  {selectedActivities.length === 0 && (
                    <p style={{ color: "#aaa", fontSize: "12px", fontStyle: "italic" }}>No tickets selected.</p>
                  )}
                  {selectedActivities.map((a) => {
                    const det = (a.details ?? {}) as Record<string, unknown>;
                    return (
                      <div key={a.id} style={{ borderTop: "1px solid #e5e5e5", paddingTop: "14px", marginTop: "14px" }}>
                        <p style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "8px" }}>{a.name}</p>
                        <DocRow label="Date & Time" value={fmtDateTime(a.date, a.start_time)} />
                        {a.vendor && <DocRow label="Vendor" value={a.vendor} />}
                        {a.location && <DocRow label="Location" value={a.location} />}
                        {Boolean(det.pickup) && <DocRow label="Pick-up" value={String(det.pickup)} />}
                        {Boolean(det.destination) && <DocRow label="Destination" value={String(det.destination)} />}
                        {Boolean(det.car_type) && <DocRow label="Car type" value={String(det.car_type)} />}
                        {Boolean(det.adults) && <DocRow label="Number of adults" value={String(det.adults)} />}
                        {Boolean(det.children) && <DocRow label="Number of children" value={String(det.children)} />}
                        {Boolean(det.flight_number) && <DocRow label="Flight #" value={String(det.flight_number)} />}
                        {Boolean(det.charge_type) && <DocRow label="Charge type" value={String(det.charge_type)} />}
                        {a.price_usd != null && <DocRow label="Total price" value={`$${a.price_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD`} />}
                        {a.notes && <DocRow label="Special notes" value={a.notes} />}
                        {a.confirmation_number && <DocRow label="Confirmation #" value={a.confirmation_number} />}
                        {a.confirmed_with && <DocRow label="Confirmed with" value={a.confirmed_with} />}
                        {a.assigned_to && <DocRow label="Assigned to" value={a.assigned_to} />}
                      </div>
                    );
                  })}

                  {/* Closing */}
                  <div style={{ borderTop: "1px solid #c9a84c40", marginTop: "24px", paddingTop: "16px" }}>
                    <p style={{ lineHeight: "1.7", whiteSpace: "pre-line", fontSize: "12px", color: "#444" }}>{closing}</p>
                  </div>
                </div>
              </div>

              {/* Action bar */}
              <div className="flex items-center gap-2 border-t border-border bg-card px-4 py-3">
                <Button variant="outline" size="sm" onClick={() => handlePrint()} className="gap-1.5">
                  <Printer className="h-4 w-4" /> Print
                </Button>
                <Button variant="outline" size="sm" onClick={handleEmail} className="gap-1.5">
                  <Mail className="h-4 w-4" /> Send as Email
                </Button>
                <Button size="sm" onClick={() => handlePrint()} className="gap-1.5">
                  <Download className="h-4 w-4" /> Save as PDF
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add activity linked to this reservation */}
      <ActivityDialog
        open={activityOpen}
        onOpenChange={(v) => {
          setActivityOpen(v);
          if (!v) qc.invalidateQueries({ queryKey: ["reservation-activities", reservation.id] });
        }}
        fixedGuestId={guestId}
        fixedReservationId={reservation.id}
        defaultDate={reservation.check_in ?? undefined}
      />
    </>
  );
}

function DocRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: "16px", marginBottom: "5px", fontSize: "12px" }}>
      <span style={{ minWidth: "140px", color: "#888", textTransform: "uppercase", fontSize: "10px", letterSpacing: "1px", paddingTop: "1px" }}>{label}</span>
      <span style={{ color: "#1a1a2e" }}>{value}</span>
    </div>
  );
}
