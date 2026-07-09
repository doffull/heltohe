import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { callGeminiText, extractJson } from "../_shared/ai-extraction.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_FILE_SIZE = 25 * 1024 * 1024; // ~25MB base64 (~18MB file)

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Admin role check
    const { data: roleCheck } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    // Support both old pdfBase64 field and new fileBase64+fileType fields
    const fileBase64 = body.fileBase64 || body.pdfBase64;
    const fileType = body.fileType || "pdf";

    if (!fileBase64) {
      return new Response(JSON.stringify({ error: "No file data provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof fileBase64 !== "string" || fileBase64.length > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: "File data too large or invalid" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gemini API key checked inside callGemini()


    const systemPrompt = `You are a product data extraction assistant. You receive the content of a product catalog file and must extract ALL products found in it.

For each product, return a JSON object with these fields:
- name (string, required): Product name
- subtitle (string): Short description or tagline
- price (number, required): Regular price in EUR
- salePrice (number or null): Sale price if applicable
- category (string): Product category (Homme, Femme, Enfant, Accessoires, etc.)
- sizes (string[]): Available sizes like ["S","M","L","XL"]
- colors (string[]): Available colors like ["Noir","Blanc","Rouge"]
- description (string): Full product description
- material (string): Material composition
- sku (string, required): Product SKU/reference code. Generate one if not found (format: PREFIX-XXXX)
- stock (number): Stock quantity, default to 50 if not specified

Return ONLY a valid JSON array of products. No markdown, no explanation, just the JSON array.
If you cannot extract any products, return an empty array [].`;

    let messages: any[];

    if (fileType === "pdf") {
      // PDF: send as image_url with base64
      messages = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all products from this PDF catalog. Return a JSON array.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${fileBase64}`,
              },
            },
          ],
        },
      ];
    } else {
      // CSV/XLS/XLSX: decode base64 to text and send as text content
      let textContent: string;
      try {
        const binaryString = atob(fileBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        textContent = new TextDecoder("utf-8").decode(bytes);
      } catch {
        textContent = atob(fileBase64);
      }

      messages = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Extract all products from this ${fileType.toUpperCase()} file content. Return a JSON array.\n\n--- FILE CONTENT ---\n${textContent.slice(0, 100000)}`,
        },
      ];
    }

    const aiRes = await callGeminiText({ messages }, "parse-products-pdf");

    if (!aiRes.ok) {
      return new Response(
        JSON.stringify({ error: aiRes.message }),
        { status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const products = extractJson<unknown[]>(aiRes.text) ?? [];
    if (!Array.isArray(products)) {
      return new Response(
        JSON.stringify({ error: "Failed to parse product data from file" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ products }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("parse-products-pdf error:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
