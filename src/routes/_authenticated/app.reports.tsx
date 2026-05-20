import { createFileRoute } from "@tanstack/react-router";
import { Printer, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, startOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PageHeader, PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/_authenticated/app/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const monthStart = startOfMonth(new Date()).toISOString().slice(0, 10);

  const { data: expenses } = useQuery({
    queryKey: ["reports", "expenses", monthStart],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("id, date, category, amount_usd, description, property:properties(name)").gte("date", monthStart).order("date");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: inspections } = useQuery({
    queryKey: ["reports", "inspections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inspections").select("id, date, type, overall_status, property:properties(name)").order("date", { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: maintenance } = useQuery({
    queryKey: ["reports", "maintenance"],
    queryFn: async () => {
      const { data, error } = await supabase.from("maintenance_tickets").select("id, title, status, priority, cost_estimate, created_at, property:properties(name)").order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const total = (expenses ?? []).reduce((s, e) => s + Number(e.amount_usd), 0);

  return (
    <PageShell>
      <PageHeader eyebrow="Insights" title="Reports"
        action={<Button variant="outline" onClick={() => window.print()}><Printer className="mr-1.5 h-4 w-4" /> Print / PDF</Button>} />

      <div className="print-page mt-6 space-y-6">
        <section className="rounded-lg border border-border bg-card p-6 shadow-elegant">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold">Monthly Owner Summary · {format(new Date(), "MMMM yyyy")}</p>
          <h2 className="mt-1 font-display text-2xl text-primary">Expense overview</h2>
          <p className="mt-1 text-sm text-muted-foreground">Total this month: <span className="text-primary font-medium">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>

          <table className="mt-4 w-full text-sm">
            <thead className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr><th className="py-2">Date</th><th>Property</th><th>Category</th><th>Description</th><th className="text-right">Amount</th></tr>
            </thead>
            <tbody>
              {(expenses ?? []).map((e) => (
                <tr key={e.id} className="border-b border-border/60">
                  <td className="py-2">{format(parseISO(e.date), "MMM d")}</td>
                  <td>{e.property?.name ?? "—"}</td>
                  <td>{e.category}</td>
                  <td className="text-muted-foreground">{e.description ?? "—"}</td>
                  <td className="text-right">${Number(e.amount_usd).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
              {(expenses ?? []).length === 0 && <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No expenses this month.</td></tr>}
            </tbody>
          </table>
        </section>

        <section className="rounded-lg border border-border bg-card p-6 shadow-elegant">
          <h2 className="font-display text-2xl text-primary flex items-center gap-2"><FileText className="h-5 w-5" /> Recent inspections</h2>
          <ul className="mt-3 divide-y divide-border">
            {(inspections ?? []).map((i) => (
              <li key={i.id} className="flex items-center justify-between py-2 text-sm">
                <span>{format(parseISO(i.date), "MMM d, yyyy")} · {i.property?.name ?? "—"} · {i.type}</span>
                <span className="text-muted-foreground">{i.overall_status}</span>
              </li>
            ))}
            {(inspections ?? []).length === 0 && <li className="py-3 text-sm text-muted-foreground">No inspections.</li>}
          </ul>
        </section>

        <section className="rounded-lg border border-border bg-card p-6 shadow-elegant">
          <h2 className="font-display text-2xl text-primary">Maintenance history</h2>
          <ul className="mt-3 divide-y divide-border">
            {(maintenance ?? []).map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                <span>{m.property?.name ?? "—"} · {m.title}</span>
                <span className="text-muted-foreground">{m.status} · {m.priority}{m.cost_estimate ? ` · $${m.cost_estimate}` : ""}</span>
              </li>
            ))}
            {(maintenance ?? []).length === 0 && <li className="py-3 text-sm text-muted-foreground">No tickets.</li>}
          </ul>
        </section>
      </div>
    </PageShell>
  );
}
