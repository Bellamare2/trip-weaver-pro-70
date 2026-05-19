import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { LayoutGrid, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { pathname } = useLocation();

  const nav = [
    { to: "/app", label: "Itineraries", icon: LayoutGrid },
    { to: "/app/guests", label: "Guests", icon: Users },
  ] as const;

  const isActive = (to: string) =>
    to === "/app" ? pathname === "/app" : pathname.startsWith(to);

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      {/* Mobile top bar */}
      <header className="no-print flex items-center justify-between bg-sidebar px-4 py-3 text-sidebar-foreground md:hidden">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-sm bg-gold" />
          <span className="font-display text-base">Concierge</span>
        </div>
        <nav className="flex items-center gap-1">
          {nav.map((n) => {
            const Icon = n.icon;
            const active = isActive(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs ${
                  active ? "bg-sidebar-accent text-gold" : "text-sidebar-foreground/80"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Desktop sidebar */}
      <aside className="no-print hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2 px-6 py-6">
          <div className="h-7 w-7 rounded-sm bg-gold" />
          <span className="font-display text-lg">Concierge</span>
        </div>
        <nav className="flex-1 px-3 py-2">
          {nav.map((n) => {
            const Icon = n.icon;
            const active = isActive(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active ? "bg-sidebar-accent text-gold" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
                }`}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
