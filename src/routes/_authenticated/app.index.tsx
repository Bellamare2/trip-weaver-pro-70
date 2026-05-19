import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Calendar, ChevronRight } from "lucide-react";
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
import { UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/")({
  component: ItinerariesPage,
});

interface Itinerary {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: string;
  guest_id: string;
  guests: { full_name: string; room_number: string | null } | null;
}

interface GuestLite { id: string; full_name: string; room_number: string | null }

function ItinerariesPage() {
  const [open, setOpen] = useState(false);

  const { data: itineraries, refetch } = useQuery({
    queryKey: ["itineraries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itineraries")
        .select("id, title, start_date, end_date, status, guest_id, guests(full_name, room_number)")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as unknown as Itinerary[];
    },
  });

  const { data: guests, refetch: refetchGuests } = useQuery({
    queryKey: ["guests-lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guests")
        .select("id, full_name, room_number")
        .order("full_name");
      if (error) throw error;
      return data as GuestLite[];
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold">Studio</p>
          <h1 className="mt-1 font-display text-3xl text-primary md:text-4xl">Itineraries</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/app/guests"><UserPlus className="mr-2 h-4 w-4" /> Guests</Link>
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> New itinerary</Button>
            </DialogTrigger>
            {open && (
              <NewItineraryDialog
                guests={guests ?? []}
                onGuestCreated={refetchGuests}
                onCreated={() => { setOpen(false); refetch(); }}
              />
            )}
          </Dialog>
        </div>
      </div>


      <div className="mt-8 grid gap-4">
        {itineraries?.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <Calendar className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No itineraries yet. Create your first one.
            </p>
          </div>
        )}
        {itineraries?.map((it) => (
          <Link
            key={it.id}
            to="/app/itineraries/$itineraryId"
            params={{ itineraryId: it.id }}
            className="group flex items-center justify-between rounded-lg border border-border bg-card px-6 py-5 shadow-sm transition-all hover:border-gold hover:shadow-elegant"
          >
            <div>
              <h3 className="font-display text-xl text-primary">{it.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {it.guests?.full_name ?? "—"}
                {it.guests?.room_number && <> · Room {it.guests.room_number}</>}
                {" · "}
                {format(new Date(it.start_date), "MMM d")} – {format(new Date(it.end_date), "MMM d, yyyy")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-gold/40 px-3 py-1 text-xs uppercase tracking-wider text-gold">
                {it.status}
              </span>
              <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function NewItineraryDialog({ guests, onCreated, onGuestCreated }: { guests: GuestLite[]; onCreated: () => void; onGuestCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [guestId, setGuestId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [addingGuest, setAddingGuest] = useState(guests.length === 0);
  const [newGuest, setNewGuest] = useState({ full_name: "", room_number: "", phone: "" });

  const createGuest = async () => {
    if (!newGuest.full_name.trim()) {
      toast.error("Guest name is required");
      return;
    }
    const { data, error } = await supabase.from("guests").insert({
      full_name: newGuest.full_name.trim(),
      room_number: newGuest.room_number || null,
      phone: newGuest.phone || null,
    }).select("id").single();
    if (error) { toast.error(error.message); return; }
    toast.success("Guest added");
    setGuestId(data.id);
    setNewGuest({ full_name: "", room_number: "", phone: "" });
    setAddingGuest(false);
    onGuestCreated();
  };


  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestId) { toast.error("Please select or add a guest"); return; }
    setBusy(true);
    const { error } = await supabase.from("itineraries").insert({
      guest_id: guestId, title, start_date: start, end_date: end, notes: notes || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Itinerary created");
    setTitle(""); setGuestId(""); setStart(""); setEnd(""); setNotes("");
    onCreated();
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle className="font-display text-2xl">New itinerary</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Guest</Label>
            {guests.length > 0 && (
              <button
                type="button"
                onClick={() => setAddingGuest((v) => !v)}
                className="text-xs text-gold hover:underline"
              >
                {addingGuest ? "Pick existing" : "+ New guest"}
              </button>
            )}
          </div>

          {addingGuest ? (
            <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
              <Input
                placeholder="Full name *"
                value={newGuest.full_name}
                onChange={(e) => setNewGuest({ ...newGuest, full_name: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Room"
                  value={newGuest.room_number}
                  onChange={(e) => setNewGuest({ ...newGuest, room_number: e.target.value })}
                />
                <Input
                  placeholder="Phone"
                  value={newGuest.phone}
                  onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
                />
              </div>
              <Button type="button" size="sm" onClick={createGuest} className="w-full">
                Save guest
              </Button>
              {guestId && (
                <p className="text-xs text-muted-foreground">✓ Guest added & selected</p>
              )}
            </div>
          ) : (
            <Select value={guestId} onValueChange={setGuestId} required>
              <SelectTrigger><SelectValue placeholder="Select guest" /></SelectTrigger>
              <SelectContent>
                {guests.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.full_name}{g.room_number ? ` · Room ${g.room_number}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Anniversary Weekend" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Start</Label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>End</Label>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={busy || !guestId}>{busy ? "Creating…" : "Create"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
