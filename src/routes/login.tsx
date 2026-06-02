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
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // If already logged in, go straight to the app
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === "sign_in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/app" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        setSuccessMsg("Account created! Check your email to confirm, then sign in.");
        setMode("sign_in");
      }
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

          <h2 className="font-display text-3xl text-primary">
            {mode === "sign_in" ? "Welcome back" : "Create account"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "sign_in"
              ? "Sign in to access the Bellamare desk."
              : "Set up your Bellamare account."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {mode === "sign_up" && (
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Your name</Label>
                <Input
                  id="displayName"
                  placeholder="e.g. Guillermo"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            )}

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
                autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
              />
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            {successMsg && (
              <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success-foreground">
                {successMsg}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Please wait…"
                : mode === "sign_in"
                ? "Sign in"
                : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "sign_in" ? (
              <>
                No account yet?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("sign_up"); setError(null); setSuccessMsg(null); }}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("sign_in"); setError(null); setSuccessMsg(null); }}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
