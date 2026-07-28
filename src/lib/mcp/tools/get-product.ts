import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "get_product",
  title: "Détail d'un produit",
  description: "Retourne toutes les informations d'un produit LVTK6 par son identifiant ou SKU.",
  inputSchema: {
    idOrSku: z.string().min(1).describe("UUID ou SKU du produit."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ idOrSku }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSku);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq(isUuid ? "id" : "sku", idOrSku)
      .eq("is_active", true)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Produit introuvable." }], isError: true };
    return {
      content: [{ type: "text", text: `${data.name} — ${data.sale_price ?? data.price} €` }],
      structuredContent: { product: data },
    };
  },
});
