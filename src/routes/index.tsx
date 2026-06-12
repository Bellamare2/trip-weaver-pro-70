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

      <main className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-3xl">
          <img src={logo} alt="" className="mb-8 h-24 w-24 rounded-lg object-cover shadow-elegant" />
          <span className="inline-block text-xs uppercase tracking-[0.25em] text-gold">
            Los Cabos · Concierge
          </span>
          <h1 className="mt-6 font-display text-6xl leading-[1.05] text-primary md:text-7xl">
            Quiet luxury,
            <br />
            <span className="italic text-gold">attentively orchestrated.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg text-muted-foreground">
            Trip Inn by Bellamare is the internal command desk for our property managers —
            guest preferences, itineraries, vendors and confirmations, in one calm place.
          </p>
          <div className="mt-10 flex gap-3">
            <Link
              to="/login"
              className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-elegant hover:opacity-90 transition-opacity"
            >
              Enter the desk
            </Link>
          </div>
        </div>

        <div className="mt-24 grid gap-8 md:grid-cols-3">
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
