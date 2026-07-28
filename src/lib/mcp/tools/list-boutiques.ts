import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";

export default defineTool({
  name: "list_boutiques",
  title: "Boutiques physiques",
  description: "Liste les boutiques physiques LVTK6 actives (nom, adresse, ville, coordonnées).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await supabase
      .from("boutiques")
      .select("id, name, address, city, postal_code, country, latitude, longitude")
      .eq("is_active", true)
      .order("sort_order");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `${data?.length ?? 0} boutique(s).` }],
      structuredContent: { boutiques: data ?? [] },
    };
  },
});
