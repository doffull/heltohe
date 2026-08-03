import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const ALLOWED_GATEWAYS = ["stripe", "payplug", "mollie", "klarna", "paypal"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);

    const userId = claimsData.claims.sub as string;
    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Forbidden: admin role required" }, 403);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = (body.action as string) || "status";

    // Never returns secret values — only masked metadata.
    if (action === "status") {
      const { data, error } = await admin
        .from("payment_gateway_secrets")
        .select("gateway, last4, updated_at");
      if (error) return json({ error: error.message }, 500);
      return json({ secrets: data ?? [] });
    }

    if (action === "set") {
      const gateway = String(body.gateway || "").toLowerCase();
      const secret = String(body.secretKey || "").trim();
      if (!ALLOWED_GATEWAYS.includes(gateway)) return json({ error: "Passerelle inconnue" }, 400);
      if (secret.length < 12 || secret.length > 512) {
        return json({ error: "Clé secrète invalide (12 à 512 caractères)." }, 400);
      }
      const { error } = await admin.from("payment_gateway_secrets").upsert(
        {
          gateway,
          secret_key: secret,
          last4: secret.slice(-4),
          updated_at: new Date().toISOString(),
          updated_by: userId,
        },
        { onConflict: "gateway" },
      );
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, gateway, last4: secret.slice(-4) });
    }

    if (action === "delete") {
      const gateway = String(body.gateway || "").toLowerCase();
      if (!ALLOWED_GATEWAYS.includes(gateway)) return json({ error: "Passerelle inconnue" }, 400);
      const { error } = await admin
        .from("payment_gateway_secrets")
        .delete()
        .eq("gateway", gateway);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, gateway });
    }

    return json({ error: "Action inconnue" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erreur serveur" }, 500);
  }
});
