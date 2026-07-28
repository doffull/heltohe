import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function userClient(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "list_my_orders",
  title: "Mes commandes",
  description: "Liste les commandes de l'utilisateur connecté (les plus récentes d'abord).",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(10),
    status: z.string().optional().describe("Filtrer par statut (pending, shipped, delivered, cancelled…)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, status }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié." }], isError: true };
    }
    let q = userClient(ctx)
      .from("orders")
      .select("id, order_number, status, payment_status, total, created_at, tracking_number, shipping_carrier")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(limit);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `${data?.length ?? 0} commande(s).` }],
      structuredContent: { orders: data ?? [] },
    };
  },
});
