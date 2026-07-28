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
  name: "add_to_wishlist",
  title: "Ajouter aux favoris",
  description: "Ajoute un produit à la liste de souhaits de l'utilisateur connecté.",
  inputSchema: {
    productId: z.string().uuid().describe("UUID du produit à ajouter."),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ productId }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié." }], isError: true };
    }
    const { data, error } = await userClient(ctx)
      .from("wishlists")
      .upsert({ user_id: ctx.getUserId(), product_id: productId }, { onConflict: "user_id,product_id" })
      .select()
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: "Produit ajouté aux favoris." }],
      structuredContent: { item: data },
    };
  },
});
