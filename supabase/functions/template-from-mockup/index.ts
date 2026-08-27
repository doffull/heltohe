import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SYSTEM_PROMPT = `Tu es un expert UI qui convertit des maquettes de pages produit e-commerce en JSON structuré.
Tu dois retourner un template avec un thème (couleurs) et une disposition (blocs sur grille 12 colonnes).
Identifie les blocs visibles : galerie, titre, prix, tailles, quantité, bouton panier, description, badges, etc.
Extrais la palette dominante (fond, texte, accent, etc.).`;

const TOOL = {
  type: 'function',
  function: {
    name: 'build_template',
    description: 'Construit un template de page produit depuis une maquette',
    parameters: {
      type: 'object',
      properties: {
        theme: {
          type: 'object',
          properties: {
            colors: {
              type: 'object',
              properties: {
                bg: { type: 'string' }, fg: { type: 'string' },
                primary: { type: 'string' }, accent: { type: 'string' },
                muted: { type: 'string' }, card: { type: 'string' }, border: { type: 'string' },
              },
              required: ['bg', 'fg', 'primary', 'accent', 'muted', 'card', 'border'],
              additionalProperties: false,
            },
            font: { type: 'string' },
            radius: { type: 'string' },
            shadow: { type: 'string' },
          },
          required: ['colors'],
          additionalProperties: false,
        },
        layout: {
          type: 'object',
          properties: {
            grid: {
              type: 'object',
              properties: { cols: { type: 'number' }, gap: { type: 'number' } },
              required: ['cols', 'gap'],
              additionalProperties: false,
            },
            blocks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: [
                      'gallery', 'breadcrumb', 'category_tag', 'sku', 'title', 'collab_subtitle',
                      'price', 'stock_status', 'model_info', 'find_size_btn', 'trust_badges',
                      'description', 'material', 'sizes_selector', 'quantity_selector',
                      'cta_add_to_cart', 'btn_wishlist', 'btn_share', 'related_products',
                      'custom_html', 'divider', 'spacer',
                    ],
                  },
                  col: { type: 'number' },
                  span: { type: 'number' },
                },
                required: ['type', 'col', 'span'],
                additionalProperties: false,
              },
            },
          },
          required: ['grid', 'blocks'],
          additionalProperties: false,
        },
      },
      required: ['theme', 'layout'],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY missing');

    const { imageBase64, html, name } = await req.json();
    if (!imageBase64 && !html) {
      return new Response(JSON.stringify({ error: 'Provide imageBase64 or html' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userContent: any[] = [];
    if (html) {
      userContent.push({ type: 'text', text: `Maquette HTML:\n\`\`\`html\n${String(html).slice(0, 15000)}\n\`\`\`` });
    }
    if (imageBase64) {
      userContent.push({ type: 'text', text: 'Maquette image:' });
      userContent.push({ type: 'image_url', image_url: { url: imageBase64 } });
    }
    if (!html && imageBase64) {
      userContent.unshift({ type: 'text', text: 'Analyse cette maquette de page produit et génère le template.' });
    }

    const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: await getAiModel("vision"),
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        tools: [TOOL],
        tool_choice: { type: 'function', function: { name: 'build_template' } },
      }),
    });

    if (r.status === 429) return new Response(JSON.stringify({ error: 'Limite IA atteinte, réessayez plus tard.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (r.status === 402) return new Response(JSON.stringify({ error: 'Crédits IA épuisés.' }),
      { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (!r.ok) {
      const t = await r.text();
      console.error('AI gateway error:', r.status, t);
      throw new Error(`AI gateway ${r.status}`);
    }

    const j = await r.json();
    const call = j.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error('No tool call');
    const parsed = JSON.parse(call.function.arguments);

    const slug = (name || 'mockup').toString().toLowerCase().replace(/[^a-z0-9-]+/g, '-') + '-' + Date.now().toString(36);
    const blocks = (parsed.layout.blocks || []).map((b: any, i: number) => ({
      id: `b${i}_${Math.random().toString(36).slice(2, 7)}`,
      type: b.type, col: b.col, span: b.span, visible: true,
    }));

    const template = {
      name: name || 'Template depuis maquette',
      slug,
      type: 'product' as const,
      theme: parsed.theme,
      layout: { grid: parsed.layout.grid, blocks },
    };

    return new Response(JSON.stringify({ template }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('template-from-mockup error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
