import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "list_products",
  title: "Lister les produits",
  description: "Liste les produits actifs du catalogue LVTK6 avec filtres facultatifs (catégorie, recherche texte).",
  inputSchema: {
    category: z.string().optional().describe("Filtrer par nom de catégorie (ex: Homme, Femme, Sportwear)."),
    search: z.string().optional().describe("Recherche texte dans le nom du produit."),
    limit: z.number().int().min(1).max(100).default(20).describe("Nombre max de produits à retourner."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category, search, limit }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    let q = supabase
      .from("products")
      .select("id, name, subtitle, price, sale_price, category, sku, stock, image")
      .eq("is_active", true)
      .order("name")
      .limit(limit);
    if (category) q = q.eq("category", category);
    else q = q.not("category", "eq", "Collab"); // produits marketplace: page dédiée uniquement
    if (search) q = q.ilike("name", `%${search}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `${data?.length ?? 0} produit(s) trouvé(s).` }],
      structuredContent: { products: data ?? [] },
    };
  },
});
