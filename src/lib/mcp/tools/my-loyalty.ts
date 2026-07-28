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
  name: "my_loyalty",
  title: "Mon programme de fidélité",
  description: "Retourne le solde de points de fidélité, le palier (bronze/silver/gold/platinum) et le total dépensé de l'utilisateur connecté.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié." }], isError: true };
    }
    const supabase = userClient(ctx);
    const { data: customer, error } = await supabase
      .from("customers")
      .select("loyalty_points, loyalty_tier, total_spent, first_name, last_name")
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!customer) return { content: [{ type: "text", text: "Aucun profil client trouvé." }], isError: true };

    const { data: rewards } = await supabase
      .from("loyalty_rewards")
      .select("id, name, description, points_required, reward_type, value")
      .eq("is_active", true)
      .order("points_required");

    return {
      content: [{
        type: "text",
        text: `${customer.loyalty_points ?? 0} points · palier ${customer.loyalty_tier ?? "bronze"}`,
      }],
      structuredContent: { customer, rewards: rewards ?? [] },
    };
  },
});
