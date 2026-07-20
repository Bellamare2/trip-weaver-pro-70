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
  name: "get_itinerary",
  title: "Get itinerary",
  description: "Return activities in chronological order for a date range and/or guest.",
  inputSchema: {
    guest_id: z.string().uuid().optional().describe("Filter to a single guest."),
    from: z.string().optional().describe("ISO datetime lower bound on start_at."),
    to: z.string().optional().describe("ISO datetime upper bound on start_at."),
    limit: z.number().int().min(1).max(500).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ guest_id, from, to, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    let q = sb.from("activities")
      .select("*")
      .order("start_at", { ascending: true })
      .limit(limit ?? 200);
    if (guest_id) q = q.eq("guest_id", guest_id);
    if (from) q = q.gte("start_at", from);
    if (to) q = q.lte("start_at", to);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { activities: data ?? [] },
    };
  },
});
