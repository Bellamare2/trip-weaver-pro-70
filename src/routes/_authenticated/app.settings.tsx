import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GuestTagPill } from "@/components/guest-tag-pill";
import { GUEST_TAGS } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const { data: properties } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("id, name").order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name is required");
      const { error } = await supabase.from("properties").insert({ name: name.trim() });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Property added");
      setName("");
      qc.invalidateQueries({ queryKey: ["properties"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["properties"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-10">
      <p className="text-[10px] uppercase tracking-[0.25em] text-gold">Workspace</p>
      <h1 className="mt-1 font-display text-3xl text-primary md:text-4xl">Settings</h1>

      <section className="mt-8">
        <h2 className="font-display text-xl text-primary">Properties</h2>
        <p className="mt-1 text-sm text-muted-foreground">Residences managed under Bellamare Concierge.</p>
        <div className="mt-4 flex gap-2">
          <Input
            value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Casa Bellamare"
            onKeyDown={(e) => { if (e.key === "Enter") add.mutate(); }}
          />
          <Button onClick={() => add.mutate()} disabled={add.isPending}>
            <Plus className="mr-1.5 h-4 w-4" /> Add
          </Button>
        </div>

        <div className="mt-4 divide-y divide-border rounded-md border border-border bg-card">
          {properties?.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">No properties yet.</p>
          )}
          {properties?.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-primary">{p.name}</span>
              <button
                onClick={() => { if (confirm(`Remove "${p.name}"?`)) remove.mutate(p.id); }}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl text-primary">Guest tags</h2>
        <p className="mt-1 text-sm text-muted-foreground">Visual legend for guest classifications.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {GUEST_TAGS.map((t) => <GuestTagPill key={t} tag={t} />)}
        </div>
      </section>
    </div>
  );
}
