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
  name: "get_my_order",
  title: "Détail d'une commande",
  description: "Retourne le détail complet d'une commande de l'utilisateur connecté (articles, suivi, montants).",
  inputSchema: {
    orderNumber: z.string().min(1).describe("Le numéro de commande (order_number)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ orderNumber }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié." }], isError: true };
    }
    const { data, error } = await userClient(ctx)
      .from("orders")
      .select("*")
      .eq("user_id", ctx.getUserId())
      .eq("order_number", orderNumber)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Commande introuvable." }], isError: true };
    return {
      content: [{ type: "text", text: `Commande ${data.order_number} — ${data.status} — ${data.total} €` }],
      structuredContent: { order: data },
    };
  },
});
