import { createFileRoute, Link } from "@tanstack/react-router";
import logo from "@/assets/bellamare-logo.jpg";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Trip Inn by Bellamare" className="h-10 w-10 rounded-md object-cover" />
          <span className="font-display text-xl font-semibold text-primary">
            Trip Inn <span className="text-muted-foreground font-normal">by</span> Bellamare
          </span>
        </div>
        <Link
          to="/login"
          className="rounded-md border border-primary/20 px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col items-center text-center">
          <img src={logo} alt="" className="mb-6 h-40 w-40 rounded-xl object-cover shadow-elegant" />
          <h1 className="font-display text-5xl leading-[1.05] text-primary md:text-7xl">
            Trip Inn
          </h1>
          <p className="mt-2 font-display text-2xl text-muted-foreground md:text-3xl">
            by <span className="text-gold italic">Bellamare</span>
          </p>
          <span className="mt-6 inline-block text-xs uppercase tracking-[0.25em] text-gold">
            Los Cabos · Concierge
          </span>
          <p className="mt-8 max-w-xl text-lg text-muted-foreground">
            The internal command desk for our property managers —
            guest preferences, itineraries, vendors and confirmations, in one calm place.
          </p>
          <div className="mt-10 flex gap-3">
            <Link
              to="/login"
              className="rounded-md bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground shadow-elegant hover:opacity-90 transition-opacity"
            >
              Enter the desk
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-8 md:grid-cols-3">
          {[
            { t: "Guest profiles", d: "Preferences, allergies, languages, VIP notes and history at a glance." },
            { t: "Itineraries", d: "Activity cards by day with vendors, prices and confirmation numbers." },
            { t: "Calendar", d: "All properties, all guests, color-coded by confirmation status." },
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
