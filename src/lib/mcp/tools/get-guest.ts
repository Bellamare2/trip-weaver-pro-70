import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_guest",
  title: "Get guest",
  description: "Get a single guest profile with preferences, stays, and activities.",
  inputSchema: {
    guest_id: z.string().uuid().describe("Guest UUID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ guest_id }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    const [guest, activities, reservations] = await Promise.all([
      sb.from("guests").select("*").eq("id", guest_id).maybeSingle(),
      sb.from("activities").select("*").eq("guest_id", guest_id).order("start_at", { ascending: false }).limit(100),
      sb.from("reservations").select("*").eq("guest_id", guest_id).order("check_in", { ascending: false }).limit(50),
    ]);
    if (guest.error) return { content: [{ type: "text", text: guest.error.message }], isError: true };
    if (!guest.data) return { content: [{ type: "text", text: "Guest not found" }], isError: true };
    const payload = { guest: guest.data, activities: activities.data ?? [], reservations: reservations.data ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
