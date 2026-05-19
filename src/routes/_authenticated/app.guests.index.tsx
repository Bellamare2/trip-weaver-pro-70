import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, ChevronRight, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/app/guests/")({
  component: GuestsPage,
});

interface Guest {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  room_number: string | null;
  preferences: string | null;
}

function GuestsPage() {
  const [open, setOpen] = useState(false);
  const { data: guests, refetch } = useQuery({
    queryKey: ["guests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guests").select("*").order("full_name");
      if (error) throw error;
      return data as Guest[];
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold">People</p>
          <h1 className="mt-1 font-display text-4xl text-primary">Guests</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New guest</Button>
          </DialogTrigger>
          <NewGuestDialog onCreated={() => { setOpen(false); refetch(); }} />
        </Dialog>
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-2">
        {guests?.length === 0 && (
          <div className="md:col-span-2 rounded-lg border border-dashed border-border p-12 text-center">
            <User className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No guests yet.</p>
          </div>
        )}
        {guests?.map((g) => (
          <Link
            key={g.id}
            to="/app/guests/$guestId"
            params={{ guestId: g.id }}
            className="group flex items-center justify-between rounded-lg border border-border bg-card px-6 py-5 transition-all hover:border-gold hover:shadow-elegant"
          >
            <div>
              <h3 className="font-display text-lg text-primary">{g.full_name}</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {g.room_number ? `Room ${g.room_number}` : "—"}{g.email ? ` · ${g.email}` : ""}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function NewGuestDialog({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", room_number: "", preferences: "", notes: "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("guests").insert({
      full_name: form.full_name,
      email: form.email || null,
      phone: form.phone || null,
      room_number: form.room_number || null,
      preferences: form.preferences || null,
      notes: form.notes || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Guest added");
    setForm({ full_name: "", email: "", phone: "", room_number: "", preferences: "", notes: "" });
    onCreated();
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle className="font-display text-2xl">New guest</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label>Full name</Label>
          <Input value={form.full_name} onChange={set("full_name")} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Room</Label>
            <Input value={form.room_number} onChange={set("room_number")} placeholder="412" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={set("phone")} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={set("email")} />
        </div>
        <div className="space-y-2">
          <Label>Preferences</Label>
          <Textarea value={form.preferences} onChange={set("preferences")} placeholder="Vegetarian, prefers quiet table…" rows={2} />
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={set("notes")} rows={2} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save guest"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
