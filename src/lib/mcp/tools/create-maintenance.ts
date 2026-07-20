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
  name: "create_maintenance_ticket",
  title: "Create maintenance ticket",
  description: "Open a new maintenance ticket for a property.",
  inputSchema: {
    property_id: z.string().uuid().describe("Property this ticket belongs to."),
    title: z.string().min(1).describe("Short summary of the issue."),
    description: z.string().optional(),
    priority: z.enum(["Low", "Normal", "High", "Urgent"]).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ property_id, title, description, priority }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb.from("maintenance_tickets").insert({
      property_id,
      title,
      description: description ?? null,
      priority: priority ?? "Normal",
      status: "Open",
    }).select().single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Created ticket ${data.id}` }],
      structuredContent: { ticket: data },
    };
  },
});
