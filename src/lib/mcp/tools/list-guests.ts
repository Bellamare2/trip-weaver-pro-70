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
  name: "list_guests",
  title: "List guests",
  description: "List guest profiles in Bellamare Concierge, optionally filtered by a name search.",
  inputSchema: {
    search: z.string().optional().describe("Case-insensitive substring match on guest first/last name."),
    limit: z.number().int().min(1).max(200).optional().describe("Maximum number of guests to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    let q = sb.from("guests")
      .select("id, first_name, last_name, email, phone, guest_type, tags, property, notes, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (search) q = q.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { guests: data ?? [] },
    };
  },
});
