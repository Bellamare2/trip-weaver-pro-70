import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EXPENSE_CATEGORIES } from "@/lib/domain";
import { PageHeader, PageShell, EmptyState } from "@/components/page-shell";

export const Route = createFileRoute("/_authenticated/app/expenses")({
  component: ExpensesPage,
});

interface Expense {
  id: string; date: string; category: string; amount_usd: number;
  description: string | null;
  property: { name: string } | null;
  vendor: { name: string } | null;
}

function ExpensesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: expenses } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("id, date, category, amount_usd, description, property:properties(name), vendor:vendors(name)")
        .order("date", { ascending: false }).limit(200);
      if (error) throw error;
      return data as unknown as Expense[];
    },
  });

  const summary = useMemo(() => {
    const byCat: Record<string, number> = {};
    let total = 0; let thisMonth = 0;
    const monthKey = format(new Date(), "yyyy-MM");
    (expenses ?? []).forEach((e) => {
      byCat[e.category] = (byCat[e.category] ?? 0) + Number(e.amount_usd);
      total += Number(e.amount_usd);
      if (e.date.startsWith(monthKey)) thisMonth += Number(e.amount_usd);
    });
    return { byCat, total, thisMonth };
  }, [expenses]);

  return (
    <PageShell>
      <PageHeader eyebrow="Finance" title="Expenses"
        action={<Button onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> New expense</Button>} />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatTile label="This month" value={`$${summary.thisMonth.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        <StatTile label="Recent total" value={`$${summary.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        <StatTile label="Records" value={`${(expenses ?? []).length}`} />
      </div>

      <section className="mt-6 rounded-lg border border-border bg-card p-5 shadow-elegant">
        <h2 className="font-display text-lg text-primary">By category</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(summary.byCat).map(([c, v]) => (
            <div key={c} className="rounded-md border border-border bg-background p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{c}</p>
              <p className="mt-1 font-display text-xl text-primary">${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
          ))}
          {Object.keys(summary.byCat).length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-lg text-primary">Recent ledger</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-border bg-card">
          {(!expenses || expenses.length === 0) && <EmptyState>No expenses recorded yet.</EmptyState>}
          {expenses?.map((e) => (
            <div key={e.id} className="flex items-center justify-between border-b border-border px-4 py-3 last:border-b-0">
              <div className="min-w-0">
                <p className="text-sm text-primary">{e.description ?? e.category}</p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(e.date), "MMM d, yyyy")} · {e.property?.name ?? "—"}{e.vendor ? ` · ${e.vendor.name}` : ""} · {e.category}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg text-primary">${Number(e.amount_usd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <Button variant="ghost" size="icon" onClick={async () => {
                  if (!confirm("Remove?")) return;
                  const { error } = await supabase.from("expenses").delete().eq("id", e.id);
                  if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["expenses"] });
                }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <ExpenseDialog open={open} onOpenChange={setOpen} onSaved={() => qc.invalidateQueries({ queryKey: ["expenses"] })} />
    </PageShell>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-elegant">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl text-primary">{value}</p>
    </div>
  );
}

function ExpenseDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    property_id: "", vendor_id: "", category: EXPENSE_CATEGORIES[0] as string,
    amount_usd: "", date: format(new Date(), "yyyy-MM-dd"), description: "",
  });
  const { data: properties } = useQuery({
    queryKey: ["properties", "lite"], enabled: open,
    queryFn: async () => { const { data } = await supabase.from("properties").select("id, name").order("name"); return data ?? []; },
  });
  const { data: vendors } = useQuery({
    queryKey: ["vendors", "lite"], enabled: open,
    queryFn: async () => { const { data } = await supabase.from("vendors").select("id, name").order("name"); return data ?? []; },
  });
  const save = useMutation({
    mutationFn: async () => {
      if (!form.property_id) throw new Error("Property required");
      if (!form.amount_usd) throw new Error("Amount required");
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("expenses").insert({
        property_id: form.property_id, vendor_id: form.vendor_id || null,
        category: form.category, amount_usd: Number(form.amount_usd),
        date: form.date, description: form.description || null,
        created_by: user?.id ?? null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Expense added"); onSaved(); onOpenChange(false);
      setForm({ property_id: "", vendor_id: "", category: EXPENSE_CATEGORIES[0], amount_usd: "", date: format(new Date(), "yyyy-MM-dd"), description: "" }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">New expense</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <FF label="Property">
            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })}>
              <option value="">Select…</option>
              {properties?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </FF>
          <FF label="Vendor">
            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.vendor_id} onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}>
              <option value="">—</option>
              {vendors?.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </FF>
          <FF label="Category">
            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </FF>
          <FF label="Amount (USD)"><Input type="number" step="0.01" value={form.amount_usd} onChange={(e) => setForm({ ...form, amount_usd: e.target.value })} /></FF>
          <FF label="Date"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></FF>
          <div className="sm:col-span-2"><FF label="Description"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FF></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label><div className="mt-1">{children}</div></div>;
}
