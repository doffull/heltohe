import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAYPLUG_SECRET_KEY = Deno.env.get("PAYPLUG_SECRET_KEY");

    if (!PAYPLUG_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: "PAYPLUG_SECRET_KEY not configured. Please add your PayPlug secret key in admin settings." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { orderId, orderNumber, amount, currency, customer, successUrl, cancelUrl } = await req.json();

    if (!amount || !customer?.email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: amount, customer.email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PayPlug API call
    const payload = {
      amount,
      currency: currency || "EUR",
      billing: {
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
      },
      hosted_payment: {
        return_url: successUrl,
        cancel_url: cancelUrl,
      },
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payplug-webhook`,
      metadata: {
        order_id: orderId,
        order_number: orderNumber,
      },
    };

    const response = await fetch("https://api.payplug.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYPLUG_SECRET_KEY}`,
        "Content-Type": "application/json",
        "PayPlug-Version": "2019-08-06",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("PayPlug error:", data);
      return new Response(
        JSON.stringify({ error: data.message || "PayPlug payment creation failed", details: data }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        payment_id: data.id,
        payment_url: data.hosted_payment?.payment_url,
        status: data.is_paid ? "paid" : "pending",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("payplug-checkout error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
