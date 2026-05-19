import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { LayoutDashboard, Users, Calendar, Settings, Menu, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AppLayout,
});

const nav = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/guests", label: "Guests", icon: Users },
  { to: "/app/calendar", label: "Calendar", icon: Calendar },
  { to: "/app/settings", label: "Settings", icon: Settings },
] as const;

function AppLayout() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      {/* Mobile top bar */}
      <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-sidebar-border/40 bg-sidebar px-4 py-3 text-sidebar-foreground md:hidden">
        <Link to="/app" className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-sm bg-gold" />
          <span className="font-display text-base tracking-wide">Bellamare</span>
        </Link>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-1.5 hover:bg-sidebar-accent/60"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <nav className="no-print fixed inset-x-0 top-[52px] z-20 border-b border-sidebar-border/40 bg-sidebar p-3 text-sidebar-foreground md:hidden">
          {nav.map((n) => {
            const Icon = n.icon;
            const active = isActive(n.to, n.exact);
            return (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={`mb-1 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm ${
                  active ? "bg-sidebar-accent text-gold" : "text-sidebar-foreground/80"
                }`}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
      )}

      {/* Desktop sidebar */}
      <aside className="no-print hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <Link to="/app" className="flex items-center gap-2.5 px-6 py-6">
          <div className="h-8 w-8 rounded-sm bg-gold" />
          <div className="leading-tight">
            <p className="font-display text-lg tracking-wide">Bellamare</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/50">Concierge</p>
          </div>
        </Link>
        <nav className="flex-1 px-3 py-2">
          {nav.map((n) => {
            const Icon = n.icon;
            const active = isActive(n.to, n.exact);
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
        <div className="border-t border-sidebar-border/60 px-6 py-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/50">Los Cabos · MX</p>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
