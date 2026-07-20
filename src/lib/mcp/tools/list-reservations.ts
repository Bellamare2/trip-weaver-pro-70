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
  name: "list_reservations",
  title: "List reservations",
  description: "List reservations, optionally filtered by status or date range (check_in within [from, to]).",
  inputSchema: {
    status: z.string().optional().describe("e.g. Pre-Arrival, In House, Out, Cancelled."),
    from: z.string().optional().describe("ISO date, inclusive lower bound on check_in."),
    to: z.string().optional().describe("ISO date, inclusive upper bound on check_in."),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, from, to, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    let q = sb.from("reservations")
      .select("*")
      .order("check_in", { ascending: true })
      .limit(limit ?? 100);
    if (status) q = q.eq("status", status);
    if (from) q = q.gte("check_in", from);
    if (to) q = q.lte("check_in", to);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { reservations: data ?? [] },
    };
  },
});
