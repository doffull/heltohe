import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { sendMail, explainSendFailure } from "../_shared/mailer.ts";
import { campaignEmail } from "../_shared/newsletter-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_FALLBACK = "https://helvetica-mp.net";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const admin = () => createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function requireAdmin(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await userClient.auth.getClaims(token);
  if (error || !data?.claims) return null;
  const userId = data.claims.sub as string;
  const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: userId, _role: "admin" });
  return isAdmin ? userId : null;
}

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
    if (!(await requireAdmin(req))) return json({ error: "Accès refusé." }, 403);

    const body = await req.json().catch(() => ({}));
    const campaignId = String(body.campaignId || "");
    if (!campaignId) return json({ error: "Campagne manquante." }, 400);

    const db = admin();
    const { data: campaign, error: cErr } = await db
      .from("newsletter_campaigns")
      .select("*")
      .eq("id", campaignId)
      .maybeSingle();
    if (cErr || !campaign) return json({ error: "Campagne introuvable." }, 404);

    const base = siteUrl(req, body.origin);
    const content = {
      subject: campaign.subject as string,
      preheader: campaign.preheader as string | null,
      content: campaign.content as string,
      imageUrl: campaign.image_url as string | null,
      ctaLabel: campaign.cta_label as string | null,
      ctaUrl: campaign.cta_url as string | null,
    };

    // Envoi de test : un seul destinataire, aucun compteur modifié.
    const testEmail = String(body.testEmail || "").trim().toLowerCase();
    if (testEmail) {
      const mail = campaignEmail(content, `${base}/newsletter/desabonnement?token=test`);
      const res = await sendMail({ to: testEmail, subject: `[TEST] ${mail.subject}`, html: mail.html, text: mail.text });
      if (!res.ok) return json({ error: explainSendFailure(res) }, 502);
      return json({ ok: true, test: true });
    }

    if (campaign.status === "sending") return json({ error: "Envoi déjà en cours." }, 409);

    const { data: subscribers } = await db
      .from("newsletters")
      .select("email, unsubscribe_token")
      .eq("is_subscribed", true)
      .not("confirmed_at", "is", null);

    const { data: suppressed } = await db.from("suppressed_emails").select("email");
    const blocked = new Set((suppressed || []).map((s) => String(s.email).toLowerCase()));
    const targets = (subscribers || []).filter((s) => !blocked.has(String(s.email).toLowerCase()));

    await db.from("newsletter_campaigns").update({ status: "sending" }).eq("id", campaignId);

    let sent = 0;
    let failed = 0;
    for (const sub of targets) {
      const unsubUrl = `${base}/newsletter/desabonnement?token=${sub.unsubscribe_token}`;
      const mail = campaignEmail(content, unsubUrl);
      const res = await sendMail({
        to: sub.email as string,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        headers: { "List-Unsubscribe": `<${unsubUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      });
      if (res.ok) sent++;
      else failed++;
      await db.from("newsletter_campaign_sends").insert({
        campaign_id: campaignId,
        email: sub.email as string,
        status: res.ok ? "sent" : "failed",
        error_message: res.ok ? null : explainSendFailure(res),
      });
      // Ménage la limite de débit de Resend : 2 requêtes/seconde, donc 500 ms
      // minimum entre deux envois. La marge évite de frôler le plafond — un 429
      // ici ferait échouer un abonné définitivement, la boucle ne réessaie pas.
      await new Promise((r) => setTimeout(r, 600));
    }

    await db
      .from("newsletter_campaigns")
      .update({
        status: failed && !sent ? "failed" : "sent",
        sent_at: new Date().toISOString(),
        sent_count: sent,
        failed_count: failed,
      })
      .eq("id", campaignId);

    return json({ ok: true, sent, failed, total: targets.length });
  } catch (e) {
    console.error("[newsletter-campaign]", e);
    return json({ error: e instanceof Error ? e.message : "Erreur inattendue" }, 500);
  }
});
