import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, Play, RefreshCw, Download, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { isPersistableUrl } from '@/lib/mediaUrl';
import { Link } from 'react-router-dom';

interface BrokenMedia {
  zone: string;
  label: string;
  url: string;
  reason: 'temporary' | 'http_404' | 'http_error' | 'missing' | 'network';
  fix?: string; // path to admin page
}

const HEAD_CONCURRENCY = 8;

async function headCheck(url: string): Promise<'ok' | 'http_404' | 'http_error' | 'network'> {
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    if (res.ok) return 'ok';
    if (res.status === 404) return 'http_404';
    // Some CDNs reject HEAD — try a lightweight GET with Range.
    try {
      const g = await fetch(url, { method: 'GET', cache: 'no-store', headers: { Range: 'bytes=0-0' } });
      if (g.ok || g.status === 206) return 'ok';
      if (g.status === 404) return 'http_404';
      return 'http_error';
    } catch {
      return 'http_error';
    }
  } catch {
    return 'network';
  }
}

async function batchCheck(urls: string[], onProgress: (done: number) => void): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  let idx = 0;
  let done = 0;
  const workers = Array.from({ length: HEAD_CONCURRENCY }, async () => {
    while (idx < urls.length) {
      const i = idx++;
      const url = urls[i];
      const status = await headCheck(url);
      result.set(url, status);
      done++;
      onProgress(done);
    }
  });
  await Promise.all(workers);
  return result;
}

function collectUrls(obj: unknown, prefix: string, out: { zone: string; label: string; url: string }[]) {
  if (!obj) return;
  if (typeof obj === 'string') {
    if (/^(https?:|\/[^/])/i.test(obj) && /\.(jpe?g|png|webp|gif|svg|avif|mp4|webm|mov|m4v)($|\?)/i.test(obj)) {
      out.push({ zone: prefix.split('.')[0] ?? prefix, label: prefix, url: obj });
    }
    // Also flag temporary URLs regardless of extension
    if (obj.startsWith('blob:') || obj.startsWith('data:') || obj.startsWith('file:')) {
      out.push({ zone: prefix.split('.')[0] ?? prefix, label: prefix, url: obj });
    }
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => collectUrls(v, `${prefix}[${i}]`, out));
    return;
  }
  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      collectUrls(v, prefix ? `${prefix}.${k}` : k, out);
    }
  }
}

export default function AdminMediaAudit() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [broken, setBroken] = useState<BrokenMedia[]>([]);
  const [productsWithoutImage, setProductsWithoutImage] = useState<{ id: string; name: string; sku: string; category: string }[]>([]);
  const [ranAt, setRanAt] = useState<Date | null>(null);

  const runScan = async () => {
    setRunning(true);
    setBroken([]);
    setProgress(0);
    setTotal(0);

    try {
      // 1. Products without image
      const { data: products, error: pErr } = await supabase
        .from('products')
        .select('id, name, sku, category, image, gallery_images')
        .order('name');
      if (pErr) throw pErr;

      const missing = (products || []).filter(
        p => !p.image || p.image.trim() === '' || /placeholder/i.test(p.image),
      );
      setProductsWithoutImage(missing.map(p => ({
        id: p.id, name: p.name, sku: p.sku, category: p.category,
      })));

      // 2. Collect all media URLs from design_settings + products + banners + pages + templates
      const [
        { data: ds },
        { data: banners },
        { data: pages },
        { data: templates },
        { data: boutiques },
      ] = await Promise.all([
        supabase.from('design_settings').select('*').eq('settings_key', 'main').maybeSingle(),
        supabase.from('banners').select('id, title, image'),
        supabase.from('pages').select('id, title, sections'),
        supabase.from('page_templates').select('id, name, layout, preview_image'),
        supabase.from('boutiques').select('id, name, image'),
      ]);

      const candidates: { zone: string; label: string; url: string; fix?: string }[] = [];

      // Products
      (products || []).forEach(p => {
        if (p.image && isPersistableUrl(p.image)) {
          candidates.push({ zone: 'Produits', label: `${p.name} (image principale)`, url: p.image, fix: '/admin/produits' });
        }
        (p.gallery_images || []).forEach((u: string, i: number) => {
          if (isPersistableUrl(u)) candidates.push({ zone: 'Produits', label: `${p.name} (galerie #${i + 1})`, url: u, fix: '/admin/produits' });
          else if (u) candidates.push({ zone: 'Produits', label: `${p.name} (galerie #${i + 1})`, url: u, fix: '/admin/produits' });
        });
      });

      // Design settings — walk the JSON columns
      if (ds) {
        const jsonCols = [
          'hero_slides', 'home_sections', 'home_custom_sections', 'home_page_blocks',
          'top_banner', 'category_layout', 'techwear_hero', 'background_media',
          'settings_json', 'home_texts', 'mannequin_hotspots',
        ];
        for (const col of jsonCols) {
          const raw: { zone: string; label: string; url: string }[] = [];
          collectUrls((ds as any)[col], col, raw);
          raw.forEach(r => candidates.push({ ...r, zone: 'Home / Design', fix: '/admin/design' }));
        }
        // scalar image fields
        const scalarCols: [string, string][] = [
          ['sidebar_image', 'Sidebar'],
          ['mobile_sidebar_image', 'Sidebar mobile'],
          ['footer_logo', 'Logo footer'],
          ['favicon_url', 'Favicon'],
          ['hud_logo', 'Logo HUD'],
          ['background_watermark', 'Watermark fond'],
        ];
        for (const [col, label] of scalarCols) {
          const v = (ds as any)[col];
          if (typeof v === 'string' && v) {
            candidates.push({ zone: 'Home / Design', label, url: v, fix: '/admin/design' });
          }
        }
      }

      // Banners
      (banners || []).forEach(b => {
        if (b.image) candidates.push({ zone: 'Bannières', label: b.title || b.id, url: b.image, fix: '/admin/marketing' });
      });

      // Pages
      (pages || []).forEach(p => {
        const raw: { zone: string; label: string; url: string }[] = [];
        collectUrls(p.sections, `${p.title}`, raw);
        raw.forEach(r => candidates.push({ zone: 'Pages', label: `${p.title} · ${r.label}`, url: r.url, fix: '/admin/pages' }));
      });

      // Templates
      (templates || []).forEach(t => {
        if (t.preview_image) candidates.push({ zone: 'Templates', label: t.name, url: t.preview_image, fix: '/admin/page-templates' });
        const raw: { zone: string; label: string; url: string }[] = [];
        collectUrls(t.layout, t.name, raw);
        raw.forEach(r => candidates.push({ zone: 'Templates', label: `${t.name} · ${r.label}`, url: r.url, fix: '/admin/page-templates' }));
      });

      // Boutiques
      (boutiques || []).forEach(b => {
        if (b.image) candidates.push({ zone: 'Boutiques', label: b.name, url: b.image, fix: '/admin/boutiques' });
      });

      // Dedupe by URL+label, and split temporary vs. remote
      const seen = new Set<string>();
      const toCheck: typeof candidates = [];
      const tempFound: BrokenMedia[] = [];
      for (const c of candidates) {
        const key = c.url + '::' + c.label;
        if (seen.has(key)) continue;
        seen.add(key);
        if (!isPersistableUrl(c.url)) {
          tempFound.push({ ...c, reason: 'temporary' });
        } else {
          toCheck.push(c);
        }
      }

      setTotal(toCheck.length);
      const statuses = await batchCheck(toCheck.map(c => c.url), (done) => setProgress(done));

      const found: BrokenMedia[] = [...tempFound];
      for (const c of toCheck) {
        const status = statuses.get(c.url);
        if (status && status !== 'ok') {
          found.push({
            zone: c.zone,
            label: c.label,
            url: c.url,
            reason: status as BrokenMedia['reason'],
            fix: c.fix,
          });
        }
      }

      setBroken(found);
      setRanAt(new Date());
      toast.success(`Scan terminé — ${found.length} média(s) cassé(s), ${missing.length} produit(s) sans image`);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erreur inconnue';
      toast.error('Erreur pendant le scan : ' + message);
    } finally {
      setRunning(false);
    }
  };

  const exportCsv = () => {
    const rows = [
      ['type', 'zone', 'label', 'url', 'reason'],
      ...productsWithoutImage.map(p => ['produit_sans_image', 'Produits', `${p.name} (${p.sku})`, '', 'missing']),
      ...broken.map(b => ['media_casse', b.zone, b.label, b.url, b.reason]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-medias-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const byZone = broken.reduce<Record<string, BrokenMedia[]>>((acc, b) => {
    (acc[b.zone] ||= []).push(b);
    return acc;
  }, {});

  const percent = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Audit des médias</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Détecte les images et vidéos manquantes ou cassées après publication.
          </p>
        </div>
        <div className="flex gap-2">
          {(broken.length > 0 || productsWithoutImage.length > 0) && (
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-2" />
              Exporter CSV
            </Button>
          )}
          <Button onClick={runScan} disabled={running}>
            {running ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            {running ? 'Scan en cours…' : 'Lancer le scan'}
          </Button>
        </div>
      </div>

      {running && total > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>Vérification des URLs…</span>
            <span className="text-muted-foreground">{progress} / {total}</span>
          </div>
          <Progress value={percent} />
        </Card>
      )}

      {ranAt && !running && (
        <div className="text-xs text-muted-foreground">
          Dernier scan : {ranAt.toLocaleString('fr-FR')}
        </div>
      )}

      {ranAt && broken.length === 0 && productsWithoutImage.length === 0 && (
        <Card className="p-6 flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          <div>
            <div className="font-medium">Aucun média cassé détecté</div>
            <div className="text-sm text-muted-foreground">Tout est prêt pour la publication.</div>
          </div>
        </Card>
      )}

      {productsWithoutImage.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="font-semibold">
              {productsWithoutImage.length} produit{productsWithoutImage.length > 1 ? 's' : ''} sans image
            </h2>
            <Badge variant="secondary" className="ml-auto">
              <Link to="/admin/produits" className="inline-flex items-center gap-1">
                Aller corriger <ExternalLink className="h-3 w-3" />
              </Link>
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Utilisez l'outil <strong>Importer images produits</strong> (bouton dans la page Produits) pour associer
            en masse un dossier par produit.
          </p>
          <div className="max-h-72 overflow-auto border rounded">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2">Nom</th>
                  <th className="text-left px-3 py-2">SKU</th>
                  <th className="text-left px-3 py-2">Catégorie</th>
                </tr>
              </thead>
              <tbody>
                {productsWithoutImage.map(p => (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{p.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.sku}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {Object.entries(byZone).map(([zone, items]) => (
        <Card key={zone} className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h2 className="font-semibold">{zone} — {items.length} média(s) cassé(s)</h2>
            {items[0]?.fix && (
              <Badge variant="secondary" className="ml-auto">
                <Link to={items[0].fix} className="inline-flex items-center gap-1">
                  Aller corriger <ExternalLink className="h-3 w-3" />
                </Link>
              </Badge>
            )}
          </div>
          <div className="max-h-72 overflow-auto border rounded">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2">Emplacement</th>
                  <th className="text-left px-3 py-2">URL</th>
                  <th className="text-left px-3 py-2">Problème</th>
                </tr>
              </thead>
              <tbody>
                {items.map((b, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{b.label}</td>
                    <td className="px-3 py-2 truncate max-w-xs">
                      <a href={b.url} target="_blank" rel="noreferrer" className="text-primary underline text-xs">
                        {b.url.length > 60 ? b.url.slice(0, 60) + '…' : b.url}
                      </a>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="destructive" className="text-[10px]">
                        {b.reason === 'temporary' && 'URL temporaire (blob/data)'}
                        {b.reason === 'http_404' && '404 introuvable'}
                        {b.reason === 'http_error' && 'Erreur HTTP'}
                        {b.reason === 'network' && 'Injoignable'}
                        {b.reason === 'missing' && 'Manquant'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}
