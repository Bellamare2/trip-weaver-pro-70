import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { CATEGORIES, STATUSES, type ActivityStatus } from "@/lib/domain";

export interface ActivityDraft {
  id?: string;
  guest_id: string;
  name: string;
  category: string;
  date: string; // YYYY-MM-DD
  start_time: string | null; // HH:MM
  duration_minutes: number | null;
  vendor: string | null;
  location: string | null;
  notes: string | null;
  price_usd: number | null;
  confirmation_number: string | null;
  status: ActivityStatus;
}

function emptyDraft(guestId: string, date?: string): ActivityDraft {
  return {
    guest_id: guestId,
    name: "",
    category: "Dining",
    date: date ?? new Date().toISOString().slice(0, 10),
    start_time: "19:00",
    duration_minutes: null,
    vendor: null,
    location: null,
    notes: null,
    price_usd: null,
    confirmation_number: null,
    status: "Requested",
  };
}

export function ActivityDialog({
  open,
  onOpenChange,
  initial,
  fixedGuestId,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Partial<ActivityDraft> & { id?: string };
  fixedGuestId?: string;
  defaultDate?: string;
}) {
  const qc = useQueryClient();
  const isEdit = !!initial?.id;

  const [draft, setDraft] = useState<ActivityDraft>(emptyDraft(fixedGuestId ?? "", defaultDate));

  useEffect(() => {
    if (!open) return;
    setDraft({
      ...emptyDraft(fixedGuestId ?? "", defaultDate),
      ...(initial ?? {}),
    } as ActivityDraft);
  }, [open, initial, fixedGuestId, defaultDate]);

  const { data: guests } = useQuery({
    queryKey: ["guests-lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guests")
        .select("id, full_name, property")
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: open && !fixedGuestId,
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!draft.guest_id) throw new Error("Please pick a guest");
      if (!draft.name.trim()) throw new Error("Activity name is required");
      const payload = {
        guest_id: draft.guest_id,
        name: draft.name.trim(),
        category: draft.category,
        date: draft.date,
        start_time: draft.start_time || null,
        duration_minutes: draft.duration_minutes,
        vendor: draft.vendor || null,
        location: draft.location || null,
        notes: draft.notes || null,
        price_usd: draft.price_usd,
        confirmation_number: draft.confirmation_number || null,
        status: draft.status,
      };
      if (isEdit && initial?.id) {
        const { error } = await supabase.from("activities").update(payload).eq("id", initial.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("activities").insert(payload);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Activity updated" : "Activity added");
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["guest-activities"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isEdit ? "Edit activity" : "New activity"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!fixedGuestId && (
            <div className="space-y-2">
              <Label>Guest</Label>
              <Select value={draft.guest_id} onValueChange={(v) => setDraft({ ...draft, guest_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select guest" /></SelectTrigger>
                <SelectContent>
                  {(guests ?? []).map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.full_name}{g.property ? ` · ${g.property}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-2">
              <Label>Activity name</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Dinner at Sunset Mona Lisa" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v as ActivityStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Start</Label>
              <Input type="time" value={draft.start_time ?? ""} onChange={(e) => setDraft({ ...draft, start_time: e.target.value || null })} />
            </div>
            <div className="space-y-2">
              <Label>Duration (min)</Label>
              <Input
                type="number" min={0}
                value={draft.duration_minutes ?? ""}
                onChange={(e) => setDraft({ ...draft, duration_minutes: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Vendor / Provider</Label>
              <Input value={draft.vendor ?? ""} onChange={(e) => setDraft({ ...draft, vendor: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={draft.location ?? ""} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Price (USD)</Label>
              <Input
                type="number" step="0.01" min={0}
                value={draft.price_usd ?? ""}
                onChange={(e) => setDraft({ ...draft, price_usd: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmation #</Label>
              <Input value={draft.confirmation_number ?? ""} onChange={(e) => setDraft({ ...draft, confirmation_number: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea rows={2} value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Add activity"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
