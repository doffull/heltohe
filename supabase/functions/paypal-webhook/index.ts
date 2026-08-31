// PayPal webhook receiver — verifies signature, logs events idempotently,
// and applies capture/refund effects as a safety net behind the synchronous
// capture flow in the `paypal` function. Returns 200 after verification to
// stop PayPal retries; never 4xx (which would cause endless retries).
//
// Secrets are reused from the project env (PAYPAL_*_CLIENT_ID/SECRET); the
// webhook_id is read from paypal_config (entered in Admin → PayPal).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = () =>
  createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

type PayPalCreds = { clientId: string; secret: string; base: string; env: string };

function credsFor(env: string): PayPalCreds {
  const live = env === "live";
  const clientId = ((live
    ? Deno.env.get("PAYPAL_LIVE_CLIENT_ID")
    : Deno.env.get("PAYPAL_SANDBOX_CLIENT_ID")) ?? "").trim();
  const secret = ((live
    ? Deno.env.get("PAYPAL_LIVE_CLIENT_SECRET")
    : Deno.env.get("PAYPAL_SANDBOX_CLIENT_SECRET")) ?? "").trim();
  return {
    clientId,
    secret,
    env: live ? "live" : "sandbox",
    base: live ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com",
  };
}

async function accessToken(creds: PayPalCreds): Promise<string> {
  if (!creds.clientId || !creds.secret) {
    throw new Error(`Identifiants PayPal ${creds.env} manquants.`);
  }
  const res = await fetch(`${creds.base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${creds.clientId}:${creds.secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      String(body?.error_description || body?.error || "Authentification PayPal échouée"),
    );
  }
  return body.access_token as string;
}

async function paypalPost(creds: PayPalCreds, path: string, payload: unknown) {
  const token = await accessToken(creds);
  const res = await fetch(`${creds.base}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(body?.message || `PayPal ${res.status}`);
  }
  return body;
}

interface WebhookHeaders {
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSig: string;
  transmissionTime: string;
}

function readWebhookHeaders(req: Request): WebhookHeaders | null {
  const get = (h: string) => req.headers.get(h);
  const authAlgo = get("paypal-auth-algo");
  const certUrl = get("paypal-cert-url");
  const transmissionId = get("paypal-transmission-id");
  const transmissionSig = get("paypal-transmission-sig");
  const transmissionTime = get("paypal-transmission-time");
  if (!transmissionId || !transmissionSig || !authAlgo || !certUrl || !transmissionTime) {
    return null;
  }
  return { authAlgo, certUrl, transmissionId, transmissionSig, transmissionTime };
}

async function verifySignature(
  creds: PayPalCreds,
  webhookId: string,
  headers: WebhookHeaders,
  rawBody: string,
): Promise<string> {
  const result = await paypalPost(creds, "/v1/notifications/verify-webhook-signature", {
    auth_algo: headers.authAlgo,
    cert_url: headers.certUrl,
    transmission_id: headers.transmissionId,
    transmission_sig: headers.transmissionSig,
    transmission_time: headers.transmissionTime,
    webhook_id: webhookId,
    webhook_event: JSON.parse(rawBody),
  });
  return String(result?.verification_status || "UNKNOWN");
}

// Extract the PayPal order/custom id from a webhook resource.
function extractOrderRefs(resource: Record<string, unknown>) {
  const customId = String(
    (resource as { custom_id?: unknown })?.custom_id ||
      (resource as { supplementary_data?: { related_ids?: { order_id?: string } } })
        ?.supplementary_data?.related_ids?.order_id ||
      "",
  );
  const captureId = String(
    (resource as { id?: unknown })?.id ||
      (resource as { capture_id?: unknown })?.capture_id ||
      "",
  );
  const amount = Number(
    ((resource as { amount?: { value?: string } })?.amount?.value) || 0,
  );
  return { customId, captureId, amount };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, reason: "method_not_allowed" }, 405);

  const whHeaders = readWebhookHeaders(req);
  if (!whHeaders) {
    // Not a PayPal webhook delivery — ignore silently.
    return json({ ok: false, reason: "not_a_webhook" });
  }

  const rawBody = await req.text();

  let payload: Record<string, unknown>;
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    payload = {};
  }

  const eventType = String(payload?.event_type || "UNKNOWN");
  const eventId = String(payload?.id || "");

  const db = admin();

  try {
    // Load config (environment + webhook_id)
    const { data: config } = await db
      .from("paypal_config")
      .select("environment, webhook_id")
      .eq("config_key", "main")
      .maybeSingle();
    const envName = String(config?.environment || "sandbox");
    const webhookId = String(config?.webhook_id || "").trim();
    const creds = credsFor(envName);

    let verificationStatus = "NOT_VERIFIED";
    if (webhookId) {
      try {
        verificationStatus = await verifySignature(creds, webhookId, whHeaders, rawBody);
      } catch (e) {
        verificationStatus = "VERIFY_ERROR";
        console.error("webhook verify error", e instanceof Error ? e.message : String(e));
      }
    } else {
      verificationStatus = "NO_WEBHOOK_ID";
    }

    const resource = (payload?.resource ?? {}) as Record<string, unknown>;

    // Idempotent logging keyed by PayPal event id.
    let logId: string | null = null;
    if (eventId) {
      const { data: existing } = await db
        .from("paypal_webhook_events")
        .select("id, processed")
        .eq("event_id", eventId)
        .maybeSingle();
      if (existing?.id) {
        // Already received — do not reprocess.
        return json({ ok: true, event_type: eventType, duplicate: true });
      }
    }

    const { data: inserted } = await db
      .from("paypal_webhook_events")
      .insert({
        event_id: eventId || null,
        event_type: eventType,
        resource_id: String(
          resource?.id || (resource as { resource_id?: unknown })?.resource_id || "",
        ),
        verification_status: verificationStatus,
        processed: false,
        payload,
      })
      .select("id")
      .single();
    logId = inserted?.id ?? null;

    // Only process verified events.
    if (verificationStatus !== "SUCCESS") {
      await db
        .from("paypal_webhook_events")
        .update({
          processed: true,
          error_message: `Signature non vérifiée: ${verificationStatus}`,
        })
        .eq("id", logId);
      // Still 200 — but we deliberately ignore unverified events for safety.
      return json({ ok: true, event_type: eventType, verified: false });
    }

    let processError: string | null = null;
    try {
      const { customId, captureId, amount } = extractOrderRefs(resource);

      if (eventType === "PAYMENT.CAPTURE.COMPLETED" && customId) {
        // custom_id = our order uuid (set at order creation).
        const { data: order } = await db
          .from("orders")
          .select("*")
          .eq("id", customId)
          .maybeSingle();

        if (order) {
          const alreadyPaid = String(order.payment_status || "").toLowerCase() === "paid";
          await db
            .from("orders")
            .update({
              payment_status: "paid",
              payment_method: "paypal",
              status: "processing",
            })
            .eq("id", customId);

          if (!alreadyPaid) {
            // Déstockage réel (une seule fois) puis e-mail de confirmation.
            await db.rpc("consume_order_stock", { p_order_id: customId }).catch(() => undefined);

            const o = order as Record<string, unknown>;
            if (o?.customer_email) {
              try {
                await fetch(`${SUPABASE_URL}/functions/v1/send-order-confirmation`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${SERVICE_KEY}`,
                  },
                  body: JSON.stringify({
                    orderNumber: o.order_number,
                    customerName: o.customer_name || "",
                    customerEmail: o.customer_email,
                    items: o.items ?? [],
                    subtotal: Number(o.subtotal ?? 0),
                    shippingCost: Number(o.shipping_cost ?? 0),
                    total: Number(o.total ?? amount),
                    deliveryMode: o.delivery_mode || "relay",
                    emailType: "payment_received",
                  }),
                });
              } catch { /* e-mail non bloquant */ }
            }
          }
        }

        // Keep transaction row in sync (capture id, status, amount).
        await db
          .from("paypal_transactions")
          .update({
            capture_id: captureId || null,
            status: "completed",
            ...(amount ? { amount } : {}),
          })
          .eq("paypal_order_id", String(resource?.supplementary_data
            ? (resource as { supplementary_data?: { related_ids?: { order_id?: string } } })
                ?.supplementary_data?.related_ids?.order_id
            : resource?.id) || "");
      } else if (eventType === "PAYMENT.CAPTURE.DENIED" && customId) {
        await db
          .from("orders")
          .update({ payment_status: "failed", status: "cancelled" })
          .eq("id", customId);
      } else if (
        (eventType === "PAYMENT.CAPTURE.REFUNDED" ||
          eventType === "PAYMENT.CAPTURE.REVERSED") &&
        captureId
      ) {
        // Match the transaction by capture_id when possible.
        const { data: tx } = await db
          .from("paypal_transactions")
          .select("*")
          .or(`capture_id.eq.${captureId}`)
          .maybeSingle();
        if (tx) {
          const refunded = Number(tx.amount || 0);
          await db
            .from("paypal_transactions")
            .update({
              refunded_amount: refunded,
              status: "refunded",
            })
            .eq("id", tx.id);
          if (tx.order_id) {
            await db
              .from("orders")
              .update({ payment_status: "refunded" })
              .eq("id", tx.order_id);
          }
        }
      }
      // Other event types are simply logged.
    } catch (e) {
      processError = e instanceof Error ? e.message : String(e);
    }

    await db
      .from("paypal_webhook_events")
      .update({ processed: true, error_message: processError })
      .eq("id", logId);

    return json({ ok: true, event_type: eventType, verified: true, processed: !processError });
  } catch (e) {
    return json(
      { ok: false, error: e instanceof Error ? e.message : "Erreur inattendue" },
      200, // 200 to stop PayPal retries even on internal error
    );
  }
});
