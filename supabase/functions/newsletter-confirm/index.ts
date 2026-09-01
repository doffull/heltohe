import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function db() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = String(body.action || url.searchParams.get("action") || "confirm");
    const token = String(body.token || url.searchParams.get("token") || "").trim();
    if (!token) return json({ error: "Lien invalide." }, 400);

    const client = db();

    if (action === "unsubscribe") {
      const { data: row } = await client
        .from("newsletters")
        .select("id, email, is_subscribed")
        .eq("unsubscribe_token", token)
        .maybeSingle();
      if (!row) return json({ error: "Lien de désabonnement invalide ou expiré." }, 404);
      await client
        .from("newsletters")
        .update({ is_subscribed: false, unsubscribed_at: new Date().toISOString() })
        .eq("id", row.id);
      return json({ ok: true, status: "unsubscribed", email: row.email });
    }

    const { data: row } = await client
      .from("newsletters")
      .select("id, email, confirmed_at, is_subscribed")
      .eq("confirm_token", token)
      .maybeSingle();
    if (!row) return json({ error: "Lien de confirmation invalide ou expiré." }, 404);

    if (row.confirmed_at && row.is_subscribed) {
      return json({ ok: true, status: "already", email: row.email });
    }

    const now = new Date().toISOString();
    const { error } = await client
      .from("newsletters")
      .update({ confirmed_at: row.confirmed_at ?? now, is_subscribed: true, subscribed_at: now, unsubscribed_at: null })
      .eq("id", row.id);
    if (error) return json({ error: error.message }, 400);

    return json({ ok: true, status: "confirmed", email: row.email });
  } catch (e) {
    console.error("[newsletter-confirm]", e);
    return json({ error: e instanceof Error ? e.message : "Erreur inattendue" }, 500);
  }
});
