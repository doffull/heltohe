// Récupère et parse le sitemap (ou la page) d'un ancien site pour extraire ses URLs.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_URLS = 5000;

function normalizeInput(raw: string): string {
  let u = raw.trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SeoMigrationBot/1.0)' },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractTags(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const v = m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
    if (v) out.push(v);
  }
  return out;
}

async function collectFromSitemap(url: string, depth = 0, seen = new Set<string>()): Promise<string[]> {
  if (depth > 2 || seen.has(url)) return [];
  seen.add(url);
  const xml = await fetchText(url);
  if (!xml) return [];

  // Index de sitemaps
  if (/<sitemapindex/i.test(xml)) {
    const children = extractTags(xml, 'loc').slice(0, 50);
    const all: string[] = [];
    for (const child of children) {
      const part = await collectFromSitemap(child, depth + 1, seen);
      all.push(...part);
      if (all.length >= MAX_URLS) break;
    }
    return all;
  }

  if (/<urlset/i.test(xml)) {
    return extractTags(xml, 'loc');
  }

  // Pas du XML → on extrait les liens internes de la page HTML
  const host = new URL(url).origin;
  const links = new Set<string>();
  const re = /href=["']([^"'#]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    try {
      const abs = new URL(m[1], url).href;
      if (abs.startsWith(host)) links.add(abs.split('?')[0]);
    } catch { /* ignore */ }
  }
  return Array.from(links);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    const input = normalizeInput(String(url || ''));
    if (!input) {
      return new Response(JSON.stringify({ error: 'URL manquante' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const candidates: string[] = [];
    if (/\.xml(\?|$)/i.test(input) || /sitemap/i.test(input)) {
      candidates.push(input);
    } else {
      const origin = new URL(input).origin;
      // robots.txt peut déclarer le sitemap
      const robots = await fetchText(`${origin}/robots.txt`);
      if (robots) {
        robots.split('\n').forEach((line) => {
          const m = line.match(/^\s*sitemap:\s*(\S+)/i);
          if (m) candidates.push(m[1].trim());
        });
      }
      candidates.push(`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`, `${origin}/wp-sitemap.xml`, input);
    }

    const urls = new Set<string>();
    let usedSource = '';
    for (const c of candidates) {
      const found = await collectFromSitemap(c);
      if (found.length) {
        usedSource = c;
        found.forEach((u) => urls.add(u.split('#')[0]));
        if (urls.size >= MAX_URLS) break;
      }
    }

    return new Response(
      JSON.stringify({ source: usedSource, count: urls.size, urls: Array.from(urls).slice(0, MAX_URLS) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
