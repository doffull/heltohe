import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";

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
  name: "list_my_addresses",
  title: "Mes adresses",
  description: "Retourne les adresses de livraison enregistrées de l'utilisateur connecté.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié." }], isError: true };
    }
    const supabase = userClient(ctx);
    // customers.id → addresses.customer_id
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (!customer) {
      return {
        content: [{ type: "text", text: "Aucun profil client." }],
        structuredContent: { addresses: [] },
      };
    }
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("customer_id", customer.id)
      .order("is_default", { ascending: false });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `${data?.length ?? 0} adresse(s).` }],
      structuredContent: { addresses: data ?? [] },
    };
  },
});
