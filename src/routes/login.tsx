import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import logo from "@/assets/bellamare-logo.jpg";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (rememberMe) {
        localStorage.setItem("bellamare-remember-me", "1");
      } else {
        localStorage.removeItem("bellamare-remember-me");
        sessionStorage.setItem("bellamare-session-active", "1");
      }
      navigate({ to: "/app" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-sidebar text-sidebar-foreground">
      {/* Left — branding panel */}
      <div className="hidden w-1/2 flex-col justify-between p-14 lg:flex">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Bellamare" className="h-10 w-10 rounded-md object-cover ring-1 ring-gold/40" />
          <span className="font-display text-xl tracking-wide">Bellamare</span>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-gold">Los Cabos · Concierge</p>
          <h1 className="mt-4 font-display text-5xl leading-tight text-sidebar-foreground">
            Quiet luxury,<br />
            <span className="italic text-gold">attentively<br />orchestrated.</span>
          </h1>
          <p className="mt-6 max-w-xs text-sm text-sidebar-foreground/60">
            The internal command desk for Bellamare property managers.
          </p>
        </div>
        <p className="text-[11px] text-sidebar-foreground/30">
          © {new Date().getFullYear()} Bellamare · Los Cabos, México
        </p>
      </div>

      {/* Right — form panel */}
      <div className="flex flex-1 items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src={logo} alt="Bellamare" className="h-9 w-9 rounded-md object-cover" />
            <span className="font-display text-xl text-primary">Bellamare</span>
          </div>

          <h2 className="font-display text-3xl text-primary">Welcome back</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to access the Bellamare desk.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@bellamare.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground select-none cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              Stay signed in until I log out
            </label>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Access is by invitation only. Contact your administrator to request access.
          </p>
        </div>
      </div>
    </div>
  );
}
