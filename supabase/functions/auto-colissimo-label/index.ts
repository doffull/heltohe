import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

/**
 * Génère automatiquement l'étiquette Colissimo d'une commande payée,
 * enregistre le numéro de suivi, passe la commande en « Expédiée »
 * et déclenche l'e-mail d'expédition. Idempotent : ne fait rien si un
 * numéro de suivi existe déjà.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const orderId = String(body.orderId || body.order_id || "");
    if (!orderId) return json({ error: "orderId manquant." }, 400);

    const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    const { data: config } = await db
      .from("checkout_config")
      .select("auto_colissimo_label")
      .maybeSingle();
    if (config && config.auto_colissimo_label === false) {
      return json({ ok: true, skipped: "disabled" });
    }

    const { data: order, error: oErr } = await db
      .from("orders")
      .select(
        "id, order_number, status, payment_status, tracking_number, customer_name, customer_email, customer_phone, customer_address, customer_city, customer_zip, customer_country",
      )
      .eq("id", orderId)
      .maybeSingle();
    if (oErr || !order) return json({ error: "Commande introuvable." }, 404);
    if (order.tracking_number) return json({ ok: true, skipped: "already_labelled" });
    if (String(order.payment_status || "").toLowerCase() !== "paid") {
      return json({ ok: true, skipped: "not_paid" });
    }

    // Étiquetage délégué à `create-colissimo-label`, à qui l'on ne passe que
    // l'identifiant : la fonction relit la commande en base et y trouve tout —
    // pays de destination, poids réels des articles, déclaration douanière.
    //
    // ⚠️ Cette fonction recopiait auparavant l'adresse champ par champ vers
    // `colissimo-proxy`, en omettant `customer_country` : toute commande
    // étrangère payée échouait donc en silence, alors même que le pays était
    // lu juste au-dessus. C'est la même omission qui rendait inopérant le
    // bouton d'étiquetage de l'écran Commandes (COLISSIMO_ARBITRAGE.md, P2).
    // L'expéditeur n'est plus transmis non plus : `create-colissimo-label` lit
    // `admin_config` lui-même, une source de moins à tenir synchronisée.
    const { data: label, error: lErr } = await db.functions.invoke("create-colissimo-label", {
      body: { order_id: order.id },
    });

    const trackingNumber = (label as { trackingNumber?: string } | null)?.trackingNumber;
    if (lErr || !trackingNumber) {
      // `invoke` réduit une réponse non-2xx à « non-2xx status code » et jette le
      // corps : on le relit, sinon le journal ne dit jamais POURQUOI Colissimo a
      // refusé — code SH manquant, pays non desservi, point relais impossible.
      let detail = "";
      try {
        const ctx = (lErr as { context?: Response } | null)?.context;
        if (ctx && typeof ctx.json === "function") {
          const payload = await ctx.json();
          detail = [payload?.error, payload?.details].filter(Boolean).join(" — ");
        }
      } catch {
        // corps illisible : on se rabat sur le message générique ci-dessous.
      }

      const reason = detail || lErr?.message || (label as any)?.error ||
        "Colissimo n'a pas renvoyé de numéro de suivi.";
      console.error("[auto-colissimo-label]", order.order_number, reason);
      // La commande reste en préparation : aucun e-mail d'expédition erroné n'est envoyé.
      await db.from("client_error_logs").insert({
        message: `Étiquette Colissimo automatique impossible (${order.order_number}) : ${reason}`,
        source: "auto-colissimo-label",
      } as Record<string, unknown>).then(({ error }) => {
        if (error) console.error("[auto-colissimo-label] log:", error.message);
      });
      return json({ ok: false, error: reason }, 502);
    }

    await db
      .from("orders")
      .update({ tracking_number: trackingNumber, shipping_carrier: "Colissimo", status: "Shipped" })
      .eq("id", orderId);

    // Conservation du bordereau pour réimpression côté admin.
    const pdfBase64 = (label as { pdfBase64?: string } | null)?.pdfBase64;
    if (pdfBase64) {
      const bytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
      const path = `auto/${order.order_number}-${trackingNumber}.pdf`;
      const up = await db.storage.from("media").upload(path, bytes, {
        contentType: "application/pdf",
        upsert: true,
      });
      if (up.error) console.error("[auto-colissimo-label] pdf:", up.error.message);
    }

    const mail = await db.functions.invoke("send-order-status-email", {
      body: { order_id: orderId, type: "shipped" },
    });
    if (mail.error) console.error("[auto-colissimo-label] mail:", mail.error.message);

    return json({ ok: true, trackingNumber });
  } catch (e) {
    console.error("[auto-colissimo-label]", e);
    return json({ error: e instanceof Error ? e.message : "Erreur inattendue" }, 500);
  }
});
