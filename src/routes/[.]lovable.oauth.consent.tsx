import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import logo from "@/assets/bellamare-logo.jpg";

// TanStack Router escapes literal dots with [.]. The URL is /.lovable/oauth/consent.
export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) {
      throw redirect({ to: "/login", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    // The auth.oauth namespace is beta — cast the client to reach it.
    const oauth = (supabase.auth as unknown as {
      oauth: {
        getAuthorizationDetails: (id: string) => Promise<{
          data: { client?: { name?: string }; redirect_url?: string; redirect_to?: string; scope?: string } | null;
          error: { message: string } | null;
        }>;
      };
    }).oauth;
    const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-md p-8 text-center">
      <h1 className="font-display text-2xl text-primary">Authorization error</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {String((error as Error)?.message ?? error)}
      </p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const oauth = (supabase.auth as unknown as {
      oauth: {
        approveAuthorization: (id: string) => Promise<{
          data: { redirect_url?: string; redirect_to?: string } | null;
          error: { message: string } | null;
        }>;
        denyAuthorization: (id: string) => Promise<{
          data: { redirect_url?: string; redirect_to?: string } | null;
          error: { message: string } | null;
        }>;
      };
    }).oauth;
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);
    if (error) { setBusy(false); setError(error.message); return; }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); setError("No redirect returned by the authorization server."); return; }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "an external app";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-8">
      <img src={logo} alt="Bellamare" className="mb-6 h-14 w-14 rounded-md object-cover ring-1 ring-gold/40" />
      <h1 className="font-display text-2xl text-primary text-center">
        Connect {clientName} to Bellamare Concierge
      </h1>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        This lets {clientName} use Bellamare Concierge as you — reading and modifying
        guest, reservation, itinerary, and maintenance data through your account.
      </p>
      {error && (
        <p role="alert" className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mt-8 flex w-full gap-3">
        <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
          Deny
        </Button>
        <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
          {busy ? "Working…" : "Approve"}
        </Button>
      </div>
      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        Bellamare permissions and backend policies still apply.
      </p>
    </main>
  );
}
