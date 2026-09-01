import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { sendMail } from "../_shared/mailer.ts";
import { confirmEmail } from "../_shared/newsletter-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SITE_FALLBACK = "https://helvetica-mp.net";

function siteUrl(req: Request, bodyOrigin?: unknown): string {
  const configured = Deno.env.get("SITE_URL");
  if (configured) return configured.replace(/\/$/, "");
  const origin = typeof bodyOrigin === "string" ? bodyOrigin : req.headers.get("origin");
  if (origin && /^https?:\/\//.test(origin)) return origin.replace(/\/$/, "");
  return SITE_FALLBACK;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return json({ error: "Adresse e-mail invalide." }, 400);
    }
    // Anti-spam : champ piège rempli => on répond OK sans rien faire.
    if (String(body.honeypot || "").trim()) return json({ ok: true, status: "pending" });

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: suppressed } = await db
      .from("suppressed_emails")
      .select("email")
      .eq("email", email)
      .maybeSingle();
    if (suppressed) return json({ ok: true, status: "suppressed" });

    const { data: existing } = await db
      .from("newsletters")
      .select("id, confirm_token, unsubscribe_token, confirmed_at, is_subscribed")
      .eq("email", email)
      .maybeSingle();

    if (existing?.confirmed_at && existing.is_subscribed) {
      return json({ ok: true, status: "already" });
    }

    let confirmToken = existing?.confirm_token as string | undefined;
    if (!existing) {
      confirmToken = crypto.randomUUID();
      const { error } = await db.from("newsletters").insert({
        email,
        first_name: body.firstName ? String(body.firstName).slice(0, 120) : null,
        source: body.source ? String(body.source).slice(0, 60) : "site",
        referrer_path: body.referrerPath ? String(body.referrerPath).slice(0, 200) : null,
        popup_id: body.popupId ? String(body.popupId) : null,
        is_subscribed: false,
        confirm_token: confirmToken,
        unsubscribe_token: crypto.randomUUID(),
      });
      if (error) return json({ error: error.message }, 400);
    } else {
      await db
        .from("newsletters")
        .update({ is_subscribed: false, unsubscribed_at: null })
        .eq("id", existing.id);
    }

    const confirmUrl = `${siteUrl(req, body.origin)}/newsletter/confirmation?token=${confirmToken}`;
    const mail = confirmEmail(confirmUrl);
    const sent = await sendMail({ to: email, ...mail });
    if (!sent.ok) console.error("[newsletter-subscribe] mail:", sent.error);

    return json({ ok: true, status: "pending", mailSent: sent.ok });
  } catch (e) {
    console.error("[newsletter-subscribe]", e);
    return json({ error: e instanceof Error ? e.message : "Erreur inattendue" }, 500);
  }
});
