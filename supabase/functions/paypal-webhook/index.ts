// PayPal webhook receiver — verifies the signature with PayPal, then logs and applies the event.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { sendPaymentConfirmationOnce } from "../_shared/payment-confirmation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const db = () =>
  createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

function credsFor(env: string) {
  const live = env === "live";
  return {
    clientId:
      (live ? Deno.env.get("PAYPAL_LIVE_CLIENT_ID") : Deno.env.get("PAYPAL_SANDBOX_CLIENT_ID")) ?? "",
    secret:
      (live
        ? Deno.env.get("PAYPAL_LIVE_CLIENT_SECRET")
        : Deno.env.get("PAYPAL_SANDBOX_CLIENT_SECRET")) ?? "",
    base: live ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com",
  };
}

/** Déclenche l'étiquette Colissimo automatique (best-effort, sans bloquer le paiement). */
async function triggerAutoLabel(db: any, orderId: string) {
  try {
    const { error } = await db.functions.invoke("auto-colissimo-label", { body: { orderId } });
    if (error) console.error("[auto-colissimo-label]", error.message);
  } catch (e) {
    console.error("[auto-colissimo-label]", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const rawBody = await req.text();
  let event: Record<string, any> = {};
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("bad request", { status: 400, headers: corsHeaders });
  }

  const supabase = db();
  const { data: config } = await supabase
    .from("paypal_config")
    .select("environment, webhook_id")
    .eq("config_key", "main")
    .maybeSingle();

  const env = String(config?.environment || "sandbox");
  const creds = credsFor(env);
  let verification = "UNVERIFIED";

  try {
    if (config?.webhook_id && creds.clientId && creds.secret) {
      const tokenRes = await fetch(`${creds.base}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${creds.clientId}:${creds.secret}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });
      const tokenBody = await tokenRes.json();
      const verifyRes = await fetch(`${creds.base}/v1/notifications/verify-webhook-signature`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenBody.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auth_algo: req.headers.get("paypal-auth-algo"),
          cert_url: req.headers.get("paypal-cert-url"),
          transmission_id: req.headers.get("paypal-transmission-id"),
          transmission_sig: req.headers.get("paypal-transmission-sig"),
          transmission_time: req.headers.get("paypal-transmission-time"),
          webhook_id: config.webhook_id,
          webhook_event: event,
        }),
      });
      const verifyBody = await verifyRes.json();
      verification = String(verifyBody?.verification_status || "FAILURE");
    }
  } catch {
    verification = "ERROR";
  }

  const resource = event.resource ?? {};
  const eventType = String(event.event_type || "UNKNOWN");
  let processed = false;
  let errorMessage: string | null = null;

  try {
    if (verification === "SUCCESS" || !config?.webhook_id) {
      const paypalOrderId =
        resource?.supplementary_data?.related_ids?.order_id ||
        resource?.id ||
        event?.resource?.order_id;

      const { data: tx } = await supabase
        .from("paypal_transactions")
        .select("*")
        .or(`paypal_order_id.eq.${paypalOrderId},capture_id.eq.${resource?.id ?? "none"}`)
        .maybeSingle();

      if (tx) {
        const patch: Record<string, unknown> = { raw: event };
        if (eventType === "PAYMENT.CAPTURE.COMPLETED") patch.status = "completed";
        if (eventType === "PAYMENT.CAPTURE.DENIED") patch.status = "denied";
        if (eventType === "PAYMENT.CAPTURE.REFUNDED") patch.status = "refunded";
        if (eventType === "CUSTOMER.DISPUTE.CREATED") patch.status = "disputed";
        await supabase.from("paypal_transactions").update(patch).eq("id", tx.id);

        if (tx.order_id) {
          if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
            await supabase
              .from("orders")
              .update({ payment_status: "paid", status: "processing" })
              .eq("id", tx.order_id);
            // Même confirmation que par le retour du navigateur : c'est le
            // filet quand la cliente ne revient jamais sur le site.
            await sendPaymentConfirmationOnce(supabase, tx.order_id);
            await triggerAutoLabel(supabase, tx.order_id);
          } else if (eventType === "PAYMENT.CAPTURE.REFUNDED") {
            await supabase.from("orders").update({ payment_status: "refunded" }).eq("id", tx.order_id);
          } else if (eventType === "PAYMENT.CAPTURE.DENIED") {
            await supabase.from("orders").update({ payment_status: "failed" }).eq("id", tx.order_id);
          }
        }
      }
      processed = true;
    }
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : "unknown";
  }

  await supabase.from("paypal_webhook_events").insert({
    event_id: event.id ?? null,
    event_type: eventType,
    resource_id: resource?.id ?? null,
    verification_status: verification,
    processed,
    error_message: errorMessage,
    payload: event,
  });

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
