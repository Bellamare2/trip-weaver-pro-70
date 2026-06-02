import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the currently authenticated Supabase user (or null while loading).
 * Subscribes to auth state changes so it stays in sync after login/logout.
 */
export function useCurrentUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    // Populate immediately from the cached session
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    // Keep in sync when auth state changes (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isLoading = user === undefined;
  const isAuthenticated = !!user;

  return { user, isLoading, isAuthenticated };
}
