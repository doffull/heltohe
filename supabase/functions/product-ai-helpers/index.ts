import { callGemini } from "../_shared/gemini.ts";
// Unified AI helpers for the product form (subtitle, description, material,
// care, attributes, color-name) — uses Lovable AI Gateway.
// Vision actions are grounded on the real product photos (anti-hallucination).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Action = "name" | "subtitle" | "description" | "material" | "care" | "attributes" | "color-name";

interface Body {
  action: Action;
  name?: string;
  category?: string;
  imageUrl?: string;
  imageUrls?: string[];
  material?: string;
  colors?: string[];
  sizes?: string[];
  hex?: string;
}

const SYS = `Tu es directeur de la rédaction produit pour LVTK6 / HELVETICA-MP : mode & outerwear technique, positionnement "Industrial Luxury", français, minimaliste et factuel.

MÉTHODE (obligatoire) :
1. OBSERVER : n'utilise que ce qui est visible sur les photos fournies + les données saisies par l'admin.
2. NOMMER PRÉCISÉMENT : privilégie le vocabulaire technique exact du vêtement (col montant, capuche amovible, zip double curseur, matelassage à canaux, empiècement ripstop, bas élastiqué, poches kangourou, coutures thermosoudées, finition mate/brillante).
3. RÉDIGER : phrases courtes, concrètes, zéro remplissage.

INTERDITS ABSOLUS :
- Inventer une performance technique (imperméabilité, indice thermique, membrane, plage de températures, certification, grammage) non fournie.
- Inventer une marque, une collaboration, un pays de fabrication ou une matière non visible.
- Superlatifs creux ("incroyable", "révolutionnaire", "ultime"), clichés IA, emojis, hashtags.
- Guillemets autour de la réponse, préfixes ("Voici…"), listes à puces sauf demande explicite.
- Si un détail n'est pas identifiable : ne le mentionne pas (ne devine jamais).

Réponds toujours via l'outil fourni, jamais en texte libre.`;

const TEXT_TOOL = {
  name: "return_text",
  params: {
    type: "object",
    properties: {
      observations: { type: "array", items: { type: "string" }, description: "Détails réellement visibles sur les photos (type, couleur, matière apparente, coupe, détails de construction)" },
      value: { type: "string" },
    },
    required: ["value"],
  },
};

function ctx(b: Body): string {
  const lines = [
    b.name ? `Nom: "${b.name}"` : null,
    b.category ? `Catégorie: "${b.category}"` : null,
    b.material ? `Matière déclarée: "${b.material}"` : null,
    b.colors?.length ? `Couleurs: ${b.colors.join(", ")}` : null,
    b.sizes?.length ? `Tailles: ${b.sizes.join(", ")}` : null,
  ].filter(Boolean);
  return lines.length ? `\nDonnées saisies par l'admin (fiables, à respecter) :\n- ${lines.join("\n- ")}` : "";
}

function buildPrompt(b: Body): { user: string; tool: any; multimodal: boolean } {
  switch (b.action) {
    case "name":
      return {
        user: `Propose un NOM COMMERCIAL de produit, fidèle à la photo.
Format strict : 2 à 4 mots, en MAJUSCULES, structure "[TYPE DE VÊTEMENT] + [SIGNE DISTINCTIF]" (ex: "DOUDOUNE MATELASSÉE ARCTIC", "VESTE RIPSTOP OMBRE", "HOODIE MOLLETON GRAPHITE").
Règles : le type de vêtement doit être exact et visible ; le qualificatif peut décrire la matière, la coupe ou la teinte réellement observée. Pas de nom de marque, pas de chiffres inventés, pas de ponctuation.${ctx(b)}`,
        multimodal: true,
        tool: TEXT_TOOL,
      };
    case "subtitle":
      return {
        user: `Génère un SOUS-TITRE d'accroche, en MAJUSCULES, 4 à 8 mots, sans point final.
Il doit exprimer un bénéfice ou un caractère RÉELLEMENT observable (construction, matière, usage évident), pas une performance chiffrée. Exemples de style : "MATELASSAGE À CANAUX, VOLUME MAÎTRISÉ", "COUPE DROITE, FINITION MATE".${ctx(b)}`,
        multimodal: true,
        tool: TEXT_TOOL,
      };
    case "description":
      return {
        user: `Étape 1 — OBSERVE les photos et remplis "observations" avec 5 à 10 constats factuels et uniquement ceux-là : type de vêtement, couleur(s), aspect de la matière, coupe et longueur, détails de construction (capuche, col, zips, poches, cordons, matelassage, coutures, empiècements, marquage visible).

Étape 2 — RÉDIGE dans "value" une description structurée en 3 paragraphes courts séparés par un retour à la ligne, 500 à 700 caractères au total, français :
1) Une phrase d'ouverture qui pose le produit (type + silhouette + teinte).
2) Deux à trois phrases sur la construction et les détails observés (vocabulaire technique exact).
3) Une phrase sur le porté / l'usage concret (association, saison plausible d'après l'épaisseur visible).

Chaque affirmation doit être traçable à une observation de l'étape 1 ou aux données admin. Aucune donnée technique inventée, aucun superlatif creux.${ctx(b)}`,
        multimodal: true,
        tool: TEXT_TOOL,
      };
    case "material":
      return {
        user: `Identifie la matière principale APPARENTE sur les photos, en 2 à 6 mots, avec le terme textile le plus précis possible (ex: "Nylon ripstop matelassé", "Coton molletonné gratté", "Twill polyester déperlant d'aspect", "Cuir grainé").
N'annonce jamais une composition chiffrée (%) ni un traitement certifié. Si la matière n'est pas identifiable avec certitude, réponds exactement "Non identifiable".${ctx(b)}`,
        multimodal: true,
        tool: TEXT_TOOL,
      };
    case "care":
      return {
        user: `Donne les instructions d'entretien standard et sûres pour ${b.material ? `un vêtement en ${b.material}` : "ce produit tel qu'il apparaît sur les photos"}.
Format strict : une seule ligne, 3 à 5 consignes séparées par des virgules, dans cet ordre : lavage, séchage, repassage, interdits (ex: "Lavage 30°C cycle délicat, séchage à plat, ne pas repasser, ne pas sécher en machine").
Reste générique : aucun produit ni traitement spécifique inventé.`,
        multimodal: !b.material,
        tool: TEXT_TOOL,
      };
    case "attributes":
      return {
        user: `Propose 5 à 7 attributs techniques DÉDUCTIBLES des photos ou des données saisies. Clé de 1-2 mots, valeur de 1-4 mots, toutes deux précises et vérifiables.
Clés à privilégier quand elles sont observables : Coupe, Col, Capuche, Fermeture, Poches, Manches, Bas, Doublure visible, Finition, Marquage.
Exemples : "Fermeture"→"Zip double curseur", "Bas"→"Élastiqué par cordon", "Poches"→"2 latérales zippées".
N'invente aucun indice de performance (imperméabilité, températures, grammage) ni composition chiffrée. Remplis aussi "observations" avec ce que tu vois.${ctx(b)}`,
        multimodal: true,
        tool: {
          name: "return_attributes",
          params: {
            type: "object",
            properties: {
              observations: { type: "array", items: { type: "string" } },
              items: {
                type: "array",
                items: { type: "object", properties: { key: { type: "string" }, value: { type: "string" } }, required: ["key", "value"] },
              },
            },
            required: ["items"],
          },
        },
      };
    case "color-name":
      return {
        user: `Donne un nom de couleur mode en 2 mots (français) pour le code hex ${b.hex} : "[Teinte] [Référence matière ou minérale]".
La teinte doit correspondre exactement au hex fourni (ne change pas la famille de couleur). Exemples : "Noir Obsidienne", "Vert Sapin", "Beige Sable", "Gris Béton". Réponse : le nom seul, sans guillemets.`,
        multimodal: false,
        tool: TEXT_TOOL,
      };
  }
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = (await req.json()) as Body;
    if (!body?.action) {
      return new Response(JSON.stringify({ error: "action requise" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const images = Array.from(
      new Set(
        [...(Array.isArray(body.imageUrls) ? body.imageUrls : []), body.imageUrl]
          .filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u))
      )
    ).slice(0, 4);

    const { user, tool, multimodal } = buildPrompt(body);
    const useVision = multimodal && images.length > 0;

    if (multimodal && images.length === 0 && (body.action === "description" || body.action === "material" || body.action === "attributes")) {
      return new Response(
        JSON.stringify({ error: "Ajoutez au moins une photo pour une génération fidèle au produit." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userContent: any = useVision
      ? [
          { type: "text", text: user + (images.length > 1 ? `\n\n${images.length} photos du même produit sont fournies (vues différentes).` : "") },
          ...images.map((url) => ({ type: "image_url", image_url: { url } })),
        ]
      : user;

    const model = useVision ? "google/gemini-3.1-pro-preview" : "google/gemini-3.6-flash";

    const resp = await callGemini({
        model,
        messages: [{ role: "system", content: SYS }, { role: "user", content: userContent }],
        tools: [{ type: "function", function: { name: tool.name, description: "Réponse structurée", parameters: tool.params } }],
        tool_choice: { type: "function", function: { name: tool.name } },
      });

    if (!resp.ok) {
      const msg = resp.status === 429 ? "Trop de requêtes, réessayez."
        : resp.status === 402 ? "Crédits IA épuisés."
        : "Erreur du service IA.";
      return new Response(JSON.stringify({ error: msg, status: resp.status }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const argsStr = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = argsStr ? JSON.parse(argsStr) : { value: data.choices?.[0]?.message?.content || "" };

    if (typeof parsed.value === "string") {
      parsed.value = parsed.value.trim().replace(/^["«\s]+|["»\s]+$/g, "");
      if (body.action === "description" && parsed.value.length > 900) {
        parsed.value = parsed.value.slice(0, 900).replace(/\s+\S*$/, "") + "…";
      }
    }
    if (Array.isArray(parsed.observations)) {
      parsed.observations = parsed.observations.map((o: unknown) => String(o)).filter(Boolean).slice(0, 12);
    }
    parsed.imagesUsed = images.length;

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("product-ai-helpers error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
