// PayPal integration — order creation, capture, refunds, admin tooling.
// Secrets never leave the server. Amounts are always recomputed server-side.
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
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = () =>
  createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

type PayPalCreds = { clientId: string; secret: string; base: string; env: string };

async function loadConfig() {
  const { data, error } = await admin()
    .from("paypal_config")
    .select("*")
    .eq("config_key", "main")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown> | null;
}

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
    throw new Error(
      `Identifiants PayPal ${creds.env} manquants. Renseignez-les dans les secrets du projet.`,
    );
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
    const raw = String(body?.error_description || body?.error || "Authentification PayPal échouée");
    if (/authentication/i.test(raw)) {
      throw new Error(
        `PayPal a refusé les identifiants ${creds.env} (Client Authentication failed). ` +
          `Vérifiez que le Client ID et le Secret proviennent bien d'une application ${creds.env === "sandbox" ? "Sandbox" : "Live"} du même compte PayPal Developer, sans espace ni retour à la ligne. ` +
          `Diagnostic : Client ID ${creds.clientId.length} caractères (préfixe « ${creds.clientId.slice(0, 2)} »), Secret ${creds.secret.length} caractères.`,
      );
    }
    throw new Error(raw);
  }
  return body.access_token as string;
}


async function paypalFetch(
  creds: PayPalCreds,
  token: string,
  path: string,
  init: RequestInit = {},
) {
  const res = await fetch(`${creds.base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const issues = Array.isArray(body?.details)
      ? body.details
          .map((d: Record<string, unknown>) =>
            [d?.issue, d?.field, d?.description].filter(Boolean).join(" "),
          )
          .join(" | ")
      : "";
    const detail = [body?.message, issues].filter(Boolean).join(" — ") || "Erreur PayPal";
    throw new Error(detail);
  }

  return body;
}

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await userClient.auth.getClaims(token);
  if (error || !data?.claims) return null;
  const userId = data.claims.sub as string;
  const { data: isAdmin } = await userClient.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  return isAdmin ? userId : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const config = await loadConfig();
    if (!config) return json({ error: "Configuration PayPal introuvable" }, 500);

    const envName = String(config.environment || "sandbox");
    const creds = credsFor(envName);

    // ---------- PUBLIC: credential presence (no values) ----------
    if (action === "status") {
      return json({
        environment: envName,
        // Le Client ID est public par nature (il est visible dans l'URL du SDK JS).
        clientId: creds.clientId,
        sandboxConfigured: Boolean(
          Deno.env.get("PAYPAL_SANDBOX_CLIENT_ID") && Deno.env.get("PAYPAL_SANDBOX_CLIENT_SECRET"),
        ),
        liveConfigured: Boolean(
          Deno.env.get("PAYPAL_LIVE_CLIENT_ID") && Deno.env.get("PAYPAL_LIVE_CLIENT_SECRET"),
        ),
      });
    }


    // ---------- PUBLIC: create a PayPal order for the current cart ----------
    if (action === "create-order") {
      if (!config.enabled) return json({ error: "PayPal est désactivé" }, 400);

      const items = Array.isArray(body.items) ? body.items : [];
      if (items.length === 0) return json({ error: "Panier vide" }, 400);
      const orderData = (body.orderData ?? {}) as Record<string, unknown>;
      const deliveryMode = body.deliveryMode === "home" ? "home" : "relay";
      const orderNumber = `HMP-${Date.now().toString(36).toUpperCase()}`;

      const db = admin();
      const { data: rpcResult, error: rpcError } = await db.rpc("validate_and_create_order", {
        p_items: items.map((it: Record<string, unknown>) => ({
          productId: String(it.productId ?? ""),
          quantity: Number(it.quantity ?? 0),
          size: it.size ?? null,
          color: it.color ?? null,
        })),
        p_promo_code: String(body.promoCode || ""),
        p_delivery_mode: deliveryMode,
        p_order_data: { ...orderData, order_number: orderNumber },
      });
      if (rpcError) return json({ error: rpcError.message }, 400);
      const result = rpcResult as Record<string, unknown>;
      if (result?.error) return json({ error: String(result.error) }, 400);

      const currency = String(config.currency || "EUR");
      const total = Number(result.total || 0).toFixed(2);
      const token = await accessToken(creds);
      const ppOrder = await paypalFetch(creds, token, "/v2/checkout/orders", {
        method: "POST",
        body: JSON.stringify({
          intent: String(config.intent || "capture").toUpperCase(),
          purchase_units: [
            {
              reference_id: orderNumber,
              custom_id: String(result.orderId ?? ""),
              invoice_id: orderNumber,
              description: `Commande ${orderNumber}`,
              amount: { currency_code: currency, value: total },
            },
          ],
          payment_source: {
            paypal: {
              experience_context: {
                brand_name: String(config.brand_name || "Boutique"),
                locale: String(config.locale || "fr-FR").replace("_", "-"),
                shipping_preference: "NO_SHIPPING",
                user_action: "PAY_NOW",
              },
            },
          },
        }),
      });

      await db.from("paypal_transactions").insert({
        order_id: result.orderId,
        paypal_order_id: ppOrder.id,
        environment: creds.env,
        status: "created",
        amount: Number(total),
        currency,
        raw: ppOrder,
      });

      await db.from("orders").update({ payment_method: "paypal" }).eq("id", result.orderId);

      return json({
        paypalOrderId: ppOrder.id,
        orderId: result.orderId,
        orderNumber,
        total: Number(total),
        items: result.items,
        subtotal: result.subtotal,
        shippingCost: result.shippingCost,
      });
    }

    // ---------- PUBLIC: capture an approved PayPal order ----------
    if (action === "capture-order") {
      const paypalOrderId = String(body.paypalOrderId || "");
      if (!paypalOrderId) return json({ error: "Commande PayPal manquante" }, 400);

      const db = admin();
      const { data: tx } = await db
        .from("paypal_transactions")
        .select("*")
        .eq("paypal_order_id", paypalOrderId)
        .maybeSingle();
      if (!tx) return json({ error: "Transaction inconnue" }, 404);

      const token = await accessToken(creds);
      const capture = await paypalFetch(
        creds,
        token,
        `/v2/checkout/orders/${paypalOrderId}/capture`,
        { method: "POST", body: JSON.stringify({}) },
      );

      const unit = capture?.purchase_units?.[0];
      const cap = unit?.payments?.captures?.[0];
      const paid = capture?.status === "COMPLETED" || cap?.status === "COMPLETED";

      await db
        .from("paypal_transactions")
        .update({
          capture_id: cap?.id ?? null,
          status: paid ? "completed" : String(capture?.status || "pending").toLowerCase(),
          payer_email: capture?.payer?.email_address ?? null,
          payer_name: [capture?.payer?.name?.given_name, capture?.payer?.name?.surname]
            .filter(Boolean)
            .join(" ") || null,
          funding_source: capture?.payment_source ? Object.keys(capture.payment_source)[0] : null,
          raw: capture,
        })
        .eq("id", tx.id);

      if (paid && tx.order_id) {
        await db
          .from("orders")
          .update({ payment_status: "paid", payment_method: "paypal", status: "processing" })
          .eq("id", tx.order_id);
      }

      return json({ success: paid, status: capture?.status, captureId: cap?.id ?? null });
    }

    // ---------- ADMIN ONLY ----------
    const adminId = await requireAdmin(req);
    if (!adminId) return json({ error: "Forbidden" }, 403);

    if (action === "test-credentials") {
      const target = body.environment === "live" ? "live" : "sandbox";
      const c = credsFor(target);
      await accessToken(c);
      return json({ ok: true, environment: target });
    }

    if (action === "refund") {
      const txId = String(body.transactionId || "");
      const db = admin();
      const { data: tx } = await db
        .from("paypal_transactions")
        .select("*")
        .eq("id", txId)
        .maybeSingle();
      if (!tx?.capture_id) return json({ error: "Aucune capture à remborser" }, 400);

      const remaining = Number(tx.amount) - Number(tx.refunded_amount || 0);
      const requested = body.amount != null ? Number(body.amount) : remaining;
      if (!(requested > 0) || requested > remaining + 0.001) {
        return json({ error: "Montant de remboursement invalide" }, 400);
      }

      const token = await accessToken(credsFor(String(tx.environment || envName)));
      const c = credsFor(String(tx.environment || envName));
      const refund = await paypalFetch(c, token, `/v2/payments/captures/${tx.capture_id}/refund`, {
        method: "POST",
        body: JSON.stringify({
          amount: { value: requested.toFixed(2), currency_code: tx.currency || "EUR" },
          note_to_payer: String(body.note || "Remboursement").slice(0, 255),
        }),
      });

      const newRefunded = Number(tx.refunded_amount || 0) + requested;
      await db
        .from("paypal_transactions")
        .update({
          refunded_amount: newRefunded,
          status: newRefunded >= Number(tx.amount) - 0.001 ? "refunded" : "partially_refunded",
        })
        .eq("id", tx.id);

      if (tx.order_id) {
        await db
          .from("orders")
          .update({
            payment_status: newRefunded >= Number(tx.amount) - 0.001 ? "refunded" : "partially_refunded",
          })
          .eq("id", tx.order_id);
      }

      return json({ success: true, refundId: refund?.id, refunded: newRefunded });
    }

    if (action === "sync-order") {
      const paypalOrderId = String(body.paypalOrderId || "");
      const token = await accessToken(creds);
      const remote = await paypalFetch(creds, token, `/v2/checkout/orders/${paypalOrderId}`);
      await admin()
        .from("paypal_transactions")
        .update({ status: String(remote?.status || "unknown").toLowerCase(), raw: remote })
        .eq("paypal_order_id", paypalOrderId);
      return json({ success: true, status: remote?.status });
    }

    return json({ error: "Action inconnue" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erreur inattendue" }, 500);
  }
});
