import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/app" />;

  const signInWithGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Sign-in failed");
      setBusy(false);
      return;
    }
    // On redirect, browser navigates away; otherwise session is set and root will redirect.
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden flex-1 bg-primary md:flex md:flex-col md:justify-between md:p-12">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-sm bg-gold" />
          <span className="font-display text-xl text-primary-foreground">Concierge</span>
        </div>
        <div>
          <p className="font-display text-4xl italic leading-tight text-gold">
            "Anticipation is the<br />finest hospitality."
          </p>
          <p className="mt-4 text-sm uppercase tracking-[0.2em] text-primary-foreground/60">
            Itinerary Studio
          </p>
        </div>
        <div className="text-xs text-primary-foreground/40">© Concierge Studio</div>
      </div>

      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <h1 className="font-display text-3xl text-primary">Welcome</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to your concierge desk.
            </p>
          </div>

          <Button
            type="button"
            onClick={signInWithGoogle}
            disabled={busy}
            className="w-full"
            size="lg"
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
              <path fill="currentColor" d="M21.35 11.1h-9.17v2.96h5.27c-.23 1.5-1.7 4.4-5.27 4.4-3.17 0-5.76-2.62-5.76-5.86s2.59-5.86 5.76-5.86c1.81 0 3.02.77 3.71 1.43l2.53-2.44C16.84 4.27 14.7 3.4 12.18 3.4 6.96 3.4 2.75 7.6 2.75 12.6s4.21 9.2 9.43 9.2c5.45 0 9.05-3.83 9.05-9.22 0-.62-.07-1.09-.18-1.48z" />
            </svg>
            {busy ? "Redirecting…" : "Continue with Google"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            By continuing you agree to our terms of service.
          </p>
        </div>
      </div>
    </div>
  );
}
