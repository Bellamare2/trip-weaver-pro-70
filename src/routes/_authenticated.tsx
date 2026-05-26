import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard, Users, Calendar, Settings, Menu, X,
  Home, Wrench, ClipboardCheck, Receipt, Car, Briefcase, FileText,
  CheckSquare,
} from "lucide-react";
import logoNavy from "@/assets/bellamare-logo-navy.jpg";

export const Route = createFileRoute("/_authenticated")({
  component: AppLayout,
});

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { to: "/app/calendar", label: "Calendar", icon: Calendar },
      { to: "/app/inspections", label: "Inspections", icon: ClipboardCheck },
      { to: "/app/maintenance", label: "Maintenance", icon: Wrench },
      { to: "/app/arrivals", label: "Arrivals & Departures", icon: CheckSquare },
    ],
  },
  {
    label: "Catalog",
    items: [
      { to: "/app/properties", label: "Properties", icon: Home },
      { to: "/app/vendors", label: "Vendors", icon: Briefcase },
      { to: "/app/vehicles", label: "Vehicles", icon: Car },
      { to: "/app/guests", label: "Guests", icon: Users },
    ],
  },
  {
    label: "Finance",
    items: [
      { to: "/app/expenses", label: "Expenses", icon: Receipt },
      { to: "/app/reports", label: "Reports", icon: FileText },
    ],
  },
  {
    label: "Workspace",
    items: [
      { to: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
];

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
          <img src={logoNavy} alt="Bellamare" className="h-8 w-8 rounded-sm object-cover ring-1 ring-gold/40" />
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

      {open && (
        <nav className="no-print fixed inset-x-0 top-[52px] z-20 max-h-[80vh] overflow-y-auto border-b border-sidebar-border/40 bg-sidebar p-3 text-sidebar-foreground md:hidden">
          {groups.map((g) => (
            <div key={g.label} className="mb-3">
              <p className="px-3 pb-1.5 text-[9px] uppercase tracking-[0.22em] text-sidebar-foreground/40">{g.label}</p>
              {g.items.map((n) => {
                const Icon = n.icon;
                const active = isActive(n.to, n.exact);
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setOpen(false)}
                    className={`mb-0.5 flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                      active ? "bg-sidebar-accent text-gold" : "text-sidebar-foreground/80"
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {n.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      )}

      <aside className="no-print hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <Link to="/app" className="flex items-center gap-2.5 px-6 py-6">
          <div className="h-8 w-8 rounded-sm bg-gold" />
          <div className="leading-tight">
            <p className="font-display text-lg tracking-wide">Bellamare</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/50">Property OS</p>
          </div>
        </Link>
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {groups.map((g) => (
            <div key={g.label} className="mb-4">
              <p className="px-3 pb-1.5 text-[9px] uppercase tracking-[0.22em] text-sidebar-foreground/40">{g.label}</p>
              {g.items.map((n) => {
                const Icon = n.icon;
                const active = isActive(n.to, n.exact);
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`mb-0.5 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      active ? "bg-sidebar-accent text-gold" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {n.label}
                  </Link>
                );
              })}
            </div>
          ))}
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
