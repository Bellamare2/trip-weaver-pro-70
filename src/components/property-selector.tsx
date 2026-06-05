/**
 * PropertySelector — dropdown of existing properties with an
 * "Add new property" option that opens a mini creation dialog.
 *
 * Usage:
 *   <PropertySelector value={property} onChange={setProperty} />
 */
import { useState } from "react";
import { Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function PropertySelector({ value, onChange, placeholder = "Select property…" }: Props) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const { data: properties } = useQuery({
    queryKey: ["properties", "lite"],
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("id, name").order("name");
      return data ?? [];
    },
  });

  function handleSelect(v: string) {
    if (v === "__add") {
      setAddOpen(true);
      return;
    }
    onChange(v === "__none" ? "" : v);
  }

  return (
    <>
      <Select value={value || "__none"} onValueChange={handleSelect}>
        <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">— None —</SelectItem>
          {(properties ?? []).map((p) => (
            <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
          ))}
          {/* Add new property option */}
          <div className="border-t border-border mt-1 pt-1">
            <SelectItem value="__add">
              <span className="flex items-center gap-1.5 text-primary">
                <Plus className="h-3.5 w-3.5" /> Add new property
              </span>
            </SelectItem>
          </div>
        </SelectContent>
      </Select>

      <NewPropertyDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(name) => {
          qc.invalidateQueries({ queryKey: ["properties", "lite"] });
          qc.invalidateQueries({ queryKey: ["properties"] });
          onChange(name);
        }}
      />
    </>
  );
}

// ── New Property Dialog ───────────────────────────────────────────────────────
function NewPropertyDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (name: string) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    address: "",
    community: "",
    owner_name: "",
    owner_email: "",
    owner_phone: "",
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Property name is required");
      const { data, error } = await supabase.from("properties").insert({
        name: form.name.trim(),
        address: form.address || null,
        community: form.community || null,
        owner_name: form.owner_name || null,
        owner_email: form.owner_email || null,
        owner_phone: form.owner_phone || null,
      }).select("name").single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (p) => {
      toast.success(`Property "${p.name}" added`);
      onCreated(p.name);
      onOpenChange(false);
      setForm({ name: "", address: "", community: "", owner_name: "", owner_email: "", owner_phone: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">New property</DialogTitle>
          <p className="text-sm text-muted-foreground">Add the basic details — more info can be filled in later from the Properties page.</p>
        </DialogHeader>

        <div className="space-y-3">
          <FF label="Property name *">
            <Input value={form.name} onChange={f("name")} placeholder="e.g. Casa Bellamare" autoFocus />
          </FF>
          <FF label="Address">
            <Input value={form.address} onChange={f("address")} placeholder="Street address" />
          </FF>
          <FF label="Community / Development">
            <Input value={form.community} onChange={f("community")} placeholder="e.g. Chileno Bay" />
          </FF>
          <div className="grid grid-cols-2 gap-3">
            <FF label="Owner name">
              <Input value={form.owner_name} onChange={f("owner_name")} />
            </FF>
            <FF label="Owner phone">
              <Input value={form.owner_phone} onChange={f("owner_phone")} placeholder="+52…" />
            </FF>
          </div>
          <FF label="Owner email">
            <Input type="email" value={form.owner_email} onChange={f("owner_email")} />
          </FF>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Adding…" : "Add property"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
