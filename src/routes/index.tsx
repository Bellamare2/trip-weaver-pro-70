import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/app" />;

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-sm bg-primary" />
          <span className="font-display text-xl font-semibold text-primary">Concierge</span>
        </div>
        <Link
          to="/login"
          className="rounded-md border border-primary/20 px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-3xl">
          <span className="inline-block text-xs uppercase tracking-[0.2em] text-gold">
            Itinerary Studio
          </span>
          <h1 className="mt-6 font-display text-6xl leading-[1.05] text-primary md:text-7xl">
            Craft journeys
            <br />
            <span className="italic text-gold">worth remembering.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg text-muted-foreground">
            Build, edit and print bespoke itineraries for every guest. Keep profiles,
            preferences and past stays at your fingertips — like Alice, but yours.
          </p>
          <div className="mt-10 flex gap-3">
            <Link
              to="/login"
              className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-elegant hover:opacity-90 transition-opacity"
            >
              Open the studio
            </Link>
          </div>
        </div>

        <div className="mt-24 grid gap-8 md:grid-cols-3">
          {[
            { t: "Guest profiles", d: "Preferences, past itineraries, room numbers — one source of truth." },
            { t: "Calendar view", d: "Drag‑smooth event scheduling across every day of the stay." },
            { t: "Print‑ready", d: "Branded PDFs and print layouts in one click." },
          ].map((f) => (
            <div key={f.t} className="border-t border-gold/40 pt-6">
              <h3 className="font-display text-2xl text-primary">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
