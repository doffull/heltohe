import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function applyTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((t, [k, v]) => t.replaceAll(`{{${k}}}`, v), template);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth check — admin or stock_manager only
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sbAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await sbAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claimsData.claims.sub;
    const [{ data: isAdmin }, { data: isStockMgr }] = await Promise.all([
      sbAuth.rpc("has_role", { _user_id: callerId, _role: "admin" }),
      sbAuth.rpc("has_role", { _user_id: callerId, _role: "stock_manager" }),
    ]);
    if (!isAdmin && !isStockMgr) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { orderId, orderNumber, customerName, customerEmail, customerPhone, notificationType, userId, role } = await req.json();

    if (!notificationType) {
      return new Response(JSON.stringify({ error: "Missing notificationType" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl0 = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey0 = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb0 = createClient(supabaseUrl0, serviceRoleKey0);

    // Handle role attribution notification (no order context)
    if (notificationType === "role_assigned") {
      if (!userId || !role) {
        return new Response(JSON.stringify({ error: "Missing userId or role" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Lookup recipient email
      let recipient = customerEmail as string | undefined;
      if (!recipient) {
        const { data: cust } = await sb0.from("customers").select("email, first_name").eq("user_id", userId).maybeSingle();
        recipient = cust?.email;
      }
      if (!recipient) {
        const { data: u } = await sb0.auth.admin.getUserById(userId);
        recipient = u?.user?.email || undefined;
      }
      if (!recipient) {
        return new Response(JSON.stringify({ error: "No email found for user" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const roleLabels: Record<string, string> = {
        admin: "Administrateur",
        stock_manager: "Responsable stock",
        preparator: "Préparateur",
      };
      const label = roleLabels[role] || role;
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      let status = "skipped";
      let errMsg: string | null = null;
      if (RESEND_API_KEY && LOVABLE_API_KEY) {
        try {
          const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": RESEND_API_KEY,
            },
            body: JSON.stringify({
              from: "HELVETICA-MP <onboarding@resend.dev>",
              to: [recipient],
              subject: `HELVETICA-MP — Nouveau rôle attribué : ${label}`,
              html: `<div style="font-family:Arial,sans-serif;padding:20px;max-width:600px;margin:0 auto"><h2>Bienvenue dans l'équipe HELVETICA-MP</h2><p>Bonjour ${customerName || ""},</p><p>Le rôle <strong>${label}</strong> vient de vous être attribué sur la plateforme HELVETICA-MP.</p><p>Vous pouvez désormais accéder à votre espace de gestion en vous connectant à votre compte.</p><p style="color:#666;font-size:12px;margin-top:24px">Si vous n'avez pas demandé cet accès, contactez l'administrateur.</p></div>`,
            }),
          });
          status = res.ok ? "sent" : "failed";
          if (!res.ok) errMsg = await res.text();
        } catch (e) {
          status = "failed";
          errMsg = String(e);
        }
      }
      return new Response(JSON.stringify({ status, recipient }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!orderId) {
      return new Response(JSON.stringify({ error: "Missing orderId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get notification config
    const { data: config } = await supabase.from("notification_config").select("*").eq("config_key", "main").single();
    
    if (!config) {
      return new Response(JSON.stringify({ message: "No notification config found, skipping" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Special handling for internal notifications (stock_manager / preparator)
    const internalTypes = ["stock_reservation_created", "preparation_assigned"];
    if (internalTypes.includes(notificationType)) {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      const results: any[] = [];

      // Determine recipients
      let recipients: string[] = [];
      if (notificationType === "stock_reservation_created") {
        // Send to all stock_managers (and admins as fallback)
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id")
          .in("role", ["stock_manager", "admin"]);
        const userIds = (roles || []).map((r: any) => r.user_id);
        if (userIds.length > 0) {
          const { data: emails } = await supabase
            .from("customers")
            .select("email")
            .in("user_id", userIds);
          recipients = (emails || []).map((e: any) => e.email).filter(Boolean);
        }
        // Fallback to admin_notification_email
        if (recipients.length === 0) {
          const { data: ac } = await supabase.from("admin_config").select("admin_notification_email").eq("config_key", "main").maybeSingle();
          if (ac?.admin_notification_email) recipients = [ac.admin_notification_email];
        }
      } else if (notificationType === "preparation_assigned") {
        // Recipient passed in body
        if (customerEmail) recipients = [customerEmail];
      }

      const subject = notificationType === "stock_reservation_created"
        ? `📦 Nouvelle commande à préparer #${orderNumber}`
        : `🛠️ Préparation assignée #${orderNumber}`;
      const body = notificationType === "stock_reservation_created"
        ? `Une nouvelle commande #${orderNumber} (${customerName}) vient d'être payée et le stock a été réservé.\n\nConnectez-vous au tableau de bord Préparations pour l'assigner à un préparateur.`
        : `La commande #${orderNumber} vient de vous être assignée pour préparation.\n\nConnectez-vous au tableau de bord Préparations pour la préparer.`;

      if (RESEND_API_KEY && LOVABLE_API_KEY && recipients.length > 0) {
        for (const to of recipients) {
          try {
            const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "X-Connection-Api-Key": RESEND_API_KEY,
              },
              body: JSON.stringify({
                from: "HELVETICA-MP <onboarding@resend.dev>",
                to: [to],
                subject,
                html: `<div style="font-family:Arial,sans-serif;padding:20px;max-width:600px;margin:0 auto"><h2>HELVETICA-MP — Préparation</h2><div style="white-space:pre-line;color:#333">${body}</div></div>`,
              }),
            });
            results.push({ to, status: res.ok ? "sent" : "failed" });
            await supabase.from("notification_log").insert({
              order_id: orderId, channel: "email", notification_type: notificationType,
              status: res.ok ? "sent" : "failed", recipient: to,
            });
          } catch (e) {
            results.push({ to, status: "failed", error: String(e) });
          }
        }
      }
      return new Response(JSON.stringify({ results, recipients }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const channels = config.notification_channels as { email?: boolean; sms?: boolean };
    const templateVars = { order_number: orderNumber || "", customer_name: customerName || "" };
    const results: { channel: string; status: string; error?: string }[] = [];

    // Send Email
    if (channels.email && customerEmail) {
      const emailTemplates = config.email_templates as Record<string, { subject: string; body: string }>;
      const template = emailTemplates[notificationType];
      
      if (template) {
        try {
          const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
          const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
          
          if (RESEND_API_KEY && LOVABLE_API_KEY) {
            const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "X-Connection-Api-Key": RESEND_API_KEY,
              },
              body: JSON.stringify({
                from: "HELVETICA-MP <onboarding@resend.dev>",
                to: [customerEmail],
                subject: applyTemplate(template.subject, templateVars),
                html: `<div style="font-family:Arial,sans-serif;padding:20px;max-width:600px;margin:0 auto"><h2 style="color:#333">HELVETICA-MP</h2><div style="white-space:pre-line;color:#555">${applyTemplate(template.body, templateVars)}</div></div>`,
              }),
            });
            
            if (res.ok) {
              results.push({ channel: "email", status: "sent" });
            } else {
              const err = await res.text();
              results.push({ channel: "email", status: "failed", error: err });
            }
          } else {
            results.push({ channel: "email", status: "failed", error: "Missing API keys" });
          }
        } catch (e) {
          results.push({ channel: "email", status: "failed", error: String(e) });
        }
      }
    }

    // Send SMS via Twilio
    if (channels.sms && customerPhone && config.sms_from_number) {
      const smsTemplates = config.sms_templates as Record<string, string>;
      const smsBody = smsTemplates[notificationType];
      
      if (smsBody) {
        try {
          const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
          const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
          
          if (TWILIO_API_KEY && LOVABLE_API_KEY) {
            const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "X-Connection-Api-Key": TWILIO_API_KEY,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                To: customerPhone,
                From: config.sms_from_number,
                Body: applyTemplate(smsBody, templateVars),
              }),
            });
            
            if (res.ok) {
              results.push({ channel: "sms", status: "sent" });
            } else {
              const err = await res.text();
              results.push({ channel: "sms", status: "failed", error: err });
            }
          } else {
            results.push({ channel: "sms", status: "failed", error: "Twilio not configured" });
          }
        } catch (e) {
          results.push({ channel: "sms", status: "failed", error: String(e) });
        }
      }
    }

    // Log notifications
    for (const r of results) {
      await supabase.from("notification_log").insert({
        order_id: orderId,
        channel: r.channel,
        notification_type: notificationType,
        status: r.status,
        recipient: r.channel === "email" ? customerEmail : customerPhone,
        error_message: r.error || null,
      });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-order-notification error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
