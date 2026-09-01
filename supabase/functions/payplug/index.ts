// PayPlug : création de paiement hébergé, notification (webhook) et vérification.
// La clé secrète reste côté serveur (table payment_gateway_secrets). Les montants
// sont toujours recalculés par la RPC validate_and_create_order.
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
const PAYPLUG_API = "https://api.payplug.com/v1";

const admin = () =>
  createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

async function secretKey(): Promise<string> {
  const { data, error } = await admin()
    .from("payment_gateway_secrets")
    .select("secret_key")
    .eq("gateway", "payplug")
    .maybeSingle();
  if (error) throw new Error(error.message);
  const key =
    String(data?.secret_key || "") ||
    String(Deno.env.get("PAYPLUG_SECRET_KEY") || Deno.env.get("payplug_api_secret") || "");
  if (!key) {
    throw new Error(
      "Clé secrète PayPlug manquante. Renseignez-la dans Admin → Paiement & Livraison.",
    );
  }
  return key;
}

async function payplugFetch(key: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${PAYPLUG_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "PayPlug-Version": "2019-08-06",
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const msg = body?.message ? String(body.message) : "Erreur PayPlug";
    const details = body?.details ? ` ${JSON.stringify(body.details)}` : "";
    throw new Error(`${msg}${details}`);
  }
  return body;
}

/** Applique le résultat d'un paiement PayPlug sur la transaction + la commande. */
async function applyPayment(payment: Record<string, unknown>) {
  const db = admin();
  const paid = Boolean(payment.is_paid);
  const failure = (payment.failure as Record<string, unknown> | null)?.message ?? null;
  const status = paid ? "paid" : failure ? "failed" : "pending";

  const { data: tx } = await db
    .from("payplug_transactions")
    .select("id, order_id")
    .eq("payplug_payment_id", String(payment.id))
    .maybeSingle();

  if (tx) {
    await db
      .from("payplug_transactions")
      .update({
        status,
        failure_message: failure ? String(failure) : null,
        raw: payment,
      })
      .eq("id", tx.id);

    if (paid && tx.order_id) {
      await db
        .from("orders")
        .update({ payment_status: "paid", payment_method: "payplug", status: "processing" })
        .eq("id", tx.order_id);
      await triggerAutoLabel(db, tx.order_id);
    }
  }

  return { paid, status, failure };
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

  try {
    const body = await req.json().catch(() => ({}));

    // ---------- WEBHOOK PayPlug (pas d'action, objet "payment") ----------
    if (!body.action && body.object === "payment" && body.id) {
      const key = await secretKey();
      // On ne fait jamais confiance au corps reçu : on relit le paiement chez PayPlug.
      const remote = await payplugFetch(key, `/payments/${String(body.id)}`);
      const result = await applyPayment(remote);
      return json({ received: true, ...result });
    }

    const action = String(body.action || "");

    // ---------- PUBLIC : la passerelle est-elle prête ? ----------
    if (action === "status") {
      const { data } = await admin()
        .from("payment_gateway_secrets")
        .select("last4, updated_at")
        .eq("gateway", "payplug")
        .maybeSingle();
      let mode: "test" | "live" | null = null;
      if (data) {
        try {
          const key = await secretKey();
          mode = key.startsWith("sk_test_") ? "test" : "live";
        } catch {
          mode = null;
        }
      }
      return json({
        configured: Boolean(data),
        last4: data?.last4 ?? null,
        updatedAt: data?.updated_at ?? null,
        mode,
      });
    }

    // ---------- ADMIN : vérifier la clé auprès de PayPlug ----------
    if (action === "verify") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(
        authHeader.replace("Bearer ", ""),
      );
      if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
      const { data: isAdmin } = await userClient.rpc("has_role", {
        _user_id: claimsData.claims.sub as string,
        _role: "admin",
      });
      if (!isAdmin) return json({ error: "Forbidden: admin role required" }, 403);

      let key: string;
      try {
        key = await secretKey();
      } catch (e) {
        return json({ valid: false, message: e instanceof Error ? e.message : "Clé absente" });
      }
      const mode = key.startsWith("sk_test_") ? "test" : "live";
      try {
        // Endpoint léger et non destructif : liste des paiements (limitée à 1).
        await payplugFetch(key, "/payments?per_page=1");
        return json({
          valid: true,
          mode,
          last4: key.slice(-4),
          message:
            mode === "live"
              ? "Clé LIVE valide : les paiements réels par carte sont actifs."
              : "Clé de TEST valide : aucun paiement réel ne sera encaissé.",
        });
      } catch (e) {
        return json({
          valid: false,
          mode,
          message: e instanceof Error ? e.message : "Clé refusée par PayPlug",
        });
      }
    }


    // ---------- PUBLIC : créer un paiement hébergé ----------
    if (action === "create-payment") {
      const items = Array.isArray(body.items) ? body.items : [];
      if (items.length === 0) return json({ error: "Panier vide" }, 400);

      const orderData = (body.orderData ?? {}) as Record<string, unknown>;
      const deliveryMode = body.deliveryMode === "home" ? "home" : "relay";
      const orderNumber = `HMP-${Date.now().toString(36).toUpperCase()}`;
      const returnBase = String(body.returnUrl || "").split("?")[0];
      if (!returnBase.startsWith("http")) return json({ error: "URL de retour invalide" }, 400);

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

      const total = Number(result.total || 0);
      const amountCents = Math.round(total * 100);
      if (amountCents < 99) return json({ error: "Montant trop faible pour PayPlug" }, 400);

      const fullName = String(orderData.customer_name || "").trim();
      const [firstName, ...rest] = fullName.split(" ");
      const email = String(orderData.customer_email || "").trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return json({ error: "Adresse e-mail invalide pour le paiement" }, 400);
      }
      const person = {
        first_name: (firstName || "Client").slice(0, 30),
        last_name: (rest.join(" ") || "LVTK").slice(0, 30),
        email,
        address1: String(orderData.customer_address || "").slice(0, 255) || "N/A",
        postcode: String(orderData.customer_zip || "").slice(0, 16) || "00000",
        city: String(orderData.customer_city || "").slice(0, 63) || "N/A",
        country: "FR",
        language: "fr",
      };
      const key = await secretKey();

      const payment = await payplugFetch(key, "/payments", {
        method: "POST",
        body: JSON.stringify({
          amount: amountCents,
          currency: "EUR",
          billing: person,
          shipping: {
            ...person,
            // Valeurs autorisées par PayPlug : BILLING, VERIFIED, NEW,
            // SHIP_TO_STORE, OTHER. (PICKUP_POINT n'est pas accepté par l'API.)
            delivery_type: deliveryMode === "relay" ? "SHIP_TO_STORE" : "BILLING",

          },
          hosted_payment: {
            return_url: `${returnBase}?payplug=return&order=${orderNumber}`,
            cancel_url: `${returnBase}?payplug=cancel`,
          },
          notification_url: `${SUPABASE_URL}/functions/v1/payplug`,
          metadata: { order_id: String(result.orderId ?? ""), order_number: orderNumber },
        }),
      });

      await db.from("payplug_transactions").insert({
        order_id: result.orderId,
        payplug_payment_id: payment.id,
        status: "created",
        amount: total,
        currency: "EUR",
        is_live: Boolean(payment.is_live),
        raw: payment,
      });

      await db.from("orders").update({ payment_method: "payplug" }).eq("id", result.orderId);

      return json({
        paymentId: payment.id,
        paymentUrl: payment?.hosted_payment?.payment_url,
        orderNumber,
        total,
      });
    }

    // ---------- PUBLIC : vérifier l'état d'un paiement au retour ----------
    if (action === "check-order") {
      const orderNumber = String(body.orderNumber || "");
      if (!orderNumber) return json({ error: "Référence manquante" }, 400);

      const db = admin();
      const { data: order } = await db
        .from("orders")
        .select("id, payment_status, total")
        .eq("order_number", orderNumber)
        .maybeSingle();
      if (!order) return json({ error: "Commande introuvable" }, 404);

      if (order.payment_status !== "paid") {
        // Le webhook peut ne pas être encore arrivé : on interroge PayPlug.
        const { data: tx } = await db
          .from("payplug_transactions")
          .select("payplug_payment_id")
          .eq("order_id", order.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (tx?.payplug_payment_id) {
          const key = await secretKey();
          const remote = await payplugFetch(key, `/payments/${tx.payplug_payment_id}`);
          const applied = await applyPayment(remote);
          return json({
            paid: applied.paid,
            status: applied.status,
            orderNumber,
            total: Number(order.total),
          });
        }
      }

      return json({
        paid: order.payment_status === "paid",
        status: order.payment_status,
        orderNumber,
        total: Number(order.total),
      });
    }

    return json({ error: "Action inconnue" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erreur inattendue" }, 500);
  }
});
