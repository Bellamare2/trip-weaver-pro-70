import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Mail, Phone, BedDouble } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/guests/$guestId")({
  component: GuestDetail,
});

function GuestDetail() {
  const { guestId } = Route.useParams();
  const { data: guest } = useQuery({
    queryKey: ["guest", guestId],
    queryFn: async () => {
      const { data, error } = await supabase.from("guests").select("*").eq("id", guestId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: itineraries } = useQuery({
    queryKey: ["guest-itineraries", guestId],
    queryFn: async () => {
      const { data, error } = await supabase.from("itineraries")
        .select("id, title, start_date, end_date, status")
        .eq("guest_id", guestId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (!guest) return <div className="p-10 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link to="/app/guests" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Guests
      </Link>

      <div className="mt-6 rounded-xl border border-border bg-card p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Guest profile</p>
        <h1 className="mt-1 font-display text-4xl text-primary">{guest.full_name}</h1>

        <div className="mt-6 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
          {guest.room_number && (
            <div className="flex items-center gap-2 text-muted-foreground"><BedDouble className="h-4 w-4 text-gold" /> Room {guest.room_number}</div>
          )}
          {guest.email && (
            <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4 text-gold" /> {guest.email}</div>
          )}
          {guest.phone && (
            <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4 text-gold" /> {guest.phone}</div>
          )}
        </div>

        {guest.preferences && (
          <div className="mt-6 border-t border-border pt-6">
            <h3 className="font-display text-lg text-primary">Preferences</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{guest.preferences}</p>
          </div>
        )}
        {guest.notes && (
          <div className="mt-4 border-t border-border pt-4">
            <h3 className="font-display text-lg text-primary">Notes</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{guest.notes}</p>
          </div>
        )}
      </div>

      <h2 className="mt-10 font-display text-2xl text-primary">Itineraries</h2>
      <div className="mt-4 grid gap-3">
        {itineraries?.length === 0 && (
          <p className="text-sm text-muted-foreground">No itineraries for this guest yet.</p>
        )}
        {itineraries?.map((it) => (
          <Link
            key={it.id}
            to="/app/itineraries/$itineraryId"
            params={{ itineraryId: it.id }}
            className="rounded-lg border border-border bg-card px-5 py-4 transition-colors hover:border-gold"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-lg text-primary">{it.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(it.start_date), "MMM d")} – {format(new Date(it.end_date), "MMM d, yyyy")}
                </p>
              </div>
              <span className="rounded-full border border-gold/40 px-2.5 py-0.5 text-xs uppercase tracking-wider text-gold">
                {it.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
