import { useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useBoutiques } from '@/hooks/useBoutiques';
import { useSeoRedirects, useSeoRedirectMutations, toPath, type SeoRedirect } from '@/hooks/useSeoRedirects';
import { STATIC_TARGETS, suggestTarget, suggestTargets, HIGH_CONFIDENCE, type RedirectTarget, type RedirectSuggestion } from '@/lib/seoRedirectSuggest';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AdminTableScroll } from '@/components/admin/AdminTableScroll';
import { toast } from '@/hooks/use-toast';
import { Globe, Loader2, Upload, Wand2, Trash2, CheckCircle2, AlertTriangle, Download, Search } from 'lucide-react';

const CUSTOM = '__custom__';

export default function AdminSeoRedirects() {
  const { data: redirects = [], isLoading } = useSeoRedirects();
  const { upsertMany, update, remove } = useSeoRedirectMutations();
  const { data: products = [] } = useProducts();
  const { data: categories = [] } = useCategories();
  const { data: boutiques = [] } = useBoutiques(true);

  const [siteUrl, setSiteUrl] = useState('');
  const [parsing, setParsing] = useState(false);
  const [manualList, setManualList] = useState('');
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'review'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  /** Toutes les cibles possibles du nouveau site. */
  const targets: RedirectTarget[] = useMemo(() => {
    const cats: RedirectTarget[] = categories.map((c) => ({
      path: `/${c.slug || c.title}`,
      label: `${c.title}`,
      group: 'Catégories' as const,
      keywords: [c.title, c.slug || '', ...(c.title.split(/\s+/))].filter(Boolean),
    }));
    const prods: RedirectTarget[] = products.map((p) => ({
      path: `/boutique/${p.id}`,
      label: `${p.name}${p.category ? ` — ${p.category}` : ''}`,
      group: 'Produits' as const,
      keywords: [p.name, p.sku || '', p.category || '', ...(p.categories || [])].filter(Boolean),
    }));
    const shops: RedirectTarget[] = boutiques.map((b) => ({
      path: '/trouver-une-boutique',
      label: `${b.name} (${b.city})`,
      group: 'Boutiques & stands' as const,
      keywords: [b.name, b.city],
    }));
    return [...STATIC_TARGETS, ...cats, ...prods, ...shops];
  }, [categories, products, boutiques]);

  const targetGroups = useMemo(() => {
    const map = new Map<string, RedirectTarget[]>();
    targets.forEach((t) => {
      const arr = map.get(t.group) || [];
      if (!arr.some((x) => x.path === t.path && x.label === t.label)) arr.push(t);
      map.set(t.group, arr);
    });
    return Array.from(map.entries());
  }, [targets]);

  const rows = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return redirects.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!f) return true;
      return r.oldPath.toLowerCase().includes(f) || r.newPath.toLowerCase().includes(f);
    });
  }, [redirects, filter, statusFilter]);

  const stats = useMemo(() => ({
    total: redirects.length,
    valid: redirects.filter((r) => r.status === 'valid').length,
    review: redirects.filter((r) => r.status !== 'valid').length,
  }), [redirects]);

  /** Suggestions classées (règles catégorie + similarité de slug) par redirection. */
  const suggestionsById = useMemo(() => {
    const map = new Map<string, RedirectSuggestion[]>();
    redirects.forEach((r) => map.set(r.id, suggestTargets(r.oldPath, targets, 3)));
    return map;
  }, [redirects, targets]);

  const addUrls = async (urls: string[], source: string) => {
    const clean = Array.from(new Set(urls.map((u) => u.trim()).filter(Boolean)));
    if (!clean.length) {
      toast({ title: 'Aucune URL détectée', variant: 'destructive' });
      return;
    }
    const rowsToAdd = clean.map((u) => {
      const s = suggestTarget(toPath(u), targets);
      return { oldUrl: u, newPath: s?.target.path || '', status: 'review' as const, source };
    });
    try {
      const n = await upsertMany.mutateAsync(rowsToAdd);
      toast({ title: `${n} URL(s) importée(s)`, description: 'Vérifiez les cibles suggérées puis validez.' });
    } catch (e) {
      toast({ title: 'Import impossible', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const handleParse = async () => {
    if (!siteUrl.trim()) return;
    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-sitemap', { body: { url: siteUrl.trim() } });
      if (error) throw error;
      const urls: string[] = (data as any)?.urls || [];
      if (!urls.length) {
        toast({ title: 'Aucune URL trouvée', description: 'Collez directement l’URL du sitemap.xml ou importez un CSV.', variant: 'destructive' });
      } else {
        await addUrls(urls, 'sitemap');
      }
    } catch (e) {
      toast({ title: 'Analyse échouée', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setParsing(false);
    }
  };

  const handleCsv = async (file: File) => {
    const text = await file.text();
    const urls = text
      .split(/\r?\n/)
      .flatMap((line) => line.split(/[;,\t]/))
      .map((c) => c.trim().replace(/^"|"$/g, ''))
      .filter((c) => c && !/^(ancienne?|old|url|source)$/i.test(c) && (c.startsWith('/') || /^https?:\/\//i.test(c)));
    await addUrls(urls, 'csv');
  };

  const autoMapAll = async () => {
    const pending = redirects.filter((r) => !r.newPath);
    let n = 0;
    for (const r of pending) {
      const s = suggestTarget(r.oldPath, targets);
      if (s) {
        await update.mutateAsync({ id: r.id, newPath: s.target.path });
        n += 1;
      }
    }
    toast({ title: `${n} suggestion(s) appliquée(s)`, description: `${pending.length - n} URL(s) sans correspondance.` });
  };

  const bulkStatus = async (status: 'valid' | 'review') => {
    for (const id of selected) await update.mutateAsync({ id, status });
    setSelected(new Set());
  };

  const exportCsv = () => {
    const csv = ['ancienne_url,nouvelle_url,statut', ...redirects.map((r) => `${r.oldPath},${r.newPath},${r.status}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'redirections-seo.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-wider flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Redirections SEO & Migration
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Importez les URLs de votre ancien site, associez-les aux nouvelles pages et validez le mapping.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs text-muted-foreground uppercase">Total</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs text-muted-foreground uppercase">Validées</p><p className="text-2xl font-bold text-green-600">{stats.valid}</p></CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs text-muted-foreground uppercase">À vérifier</p><p className="text-2xl font-bold text-amber-500">{stats.review}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Importer les anciennes URLs</CardTitle>
          <CardDescription>Site complet, sitemap.xml, fichier CSV ou liste collée à la main.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URL de l’ancien site ou de son sitemap.xml</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://mon-ancien-site.com/sitemap.xml"
                className="min-h-11"
              />
              <Button onClick={handleParse} disabled={parsing || !siteUrl.trim()} className="min-h-11 shrink-0">
                {parsing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                Analyser
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="min-h-11" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> Importer un CSV
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsv(f); e.target.value = ''; }}
            />
            <Button variant="outline" className="min-h-11" onClick={autoMapAll} disabled={!redirects.length}>
              <Wand2 className="h-4 w-4 mr-2" /> Suggestions automatiques
            </Button>
            <Button variant="outline" className="min-h-11" onClick={exportCsv} disabled={!redirects.length}>
              <Download className="h-4 w-4 mr-2" /> Exporter
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Ou collez une liste d’URLs (une par ligne)</Label>
            <Textarea
              value={manualList}
              onChange={(e) => setManualList(e.target.value)}
              rows={3}
              placeholder={'/ancienne-page-homme\nhttps://mon-ancien-site.com/produit/veste-tech'}
            />
            <Button
              variant="secondary"
              className="min-h-11"
              disabled={!manualList.trim()}
              onClick={async () => { await addUrls(manualList.split(/\r?\n/), 'manual'); setManualList(''); }}
            >
              Ajouter au mapping
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-3">
          <div>
            <CardTitle className="text-base">2. Mapping des URLs</CardTitle>
            <CardDescription>Ancienne URL → nouvelle cible → statut.</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Rechercher une URL..." className="min-h-11" />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="min-h-11 sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="valid">Validé</SelectItem>
                <SelectItem value="review">À vérifier</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {selected.size > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <Badge variant="secondary">{selected.size} sélectionnée(s)</Badge>
              <Button size="sm" className="min-h-10" onClick={() => bulkStatus('valid')}>Valider</Button>
              <Button size="sm" variant="outline" className="min-h-10" onClick={() => bulkStatus('review')}>À vérifier</Button>
              <Button
                size="sm"
                variant="destructive"
                className="min-h-10"
                onClick={async () => { await remove.mutateAsync(Array.from(selected)); setSelected(new Set()); }}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Supprimer
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
          ) : !rows.length ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Aucune redirection. Importez vos anciennes URLs ci-dessus.</div>
          ) : (
            <AdminTableScroll stickyFirstCol>
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={rows.length > 0 && rows.every((r) => selected.has(r.id))}
                        onCheckedChange={(c) => setSelected(c ? new Set(rows.map((r) => r.id)) : new Set())}
                      />
                    </TableHead>
                    <TableHead>Ancienne URL</TableHead>
                    <TableHead>Nouvelle URL cible</TableHead>
                    <TableHead className="w-40">Statut</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <RedirectRow
                      key={r.id}
                      row={r}
                      targetGroups={targetGroups}
                      selected={selected.has(r.id)}
                      onToggle={() => toggle(r.id)}
                      onUpdate={(patch) => update.mutate({ id: r.id, ...patch })}
                      onDelete={() => remove.mutate([r.id])}
                    />
                  ))}
                </TableBody>
              </Table>
            </AdminTableScroll>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RedirectRow({
  row, targetGroups, selected, onToggle, onUpdate, onDelete,
}: {
  row: SeoRedirect;
  targetGroups: Array<[string, RedirectTarget[]]>;
  selected: boolean;
  onToggle: () => void;
  onUpdate: (patch: { newPath?: string; status?: 'valid' | 'review' }) => void;
  onDelete: () => void;
}) {
  const known = targetGroups.some(([, list]) => list.some((t) => t.path === row.newPath));
  const [customMode, setCustomMode] = useState(!!row.newPath && !known);
  const [draft, setDraft] = useState(row.newPath);

  return (
    <TableRow className={row.status === 'valid' ? '' : 'bg-amber-500/5'}>
      <TableCell><Checkbox checked={selected} onCheckedChange={onToggle} /></TableCell>
      <TableCell className="font-mono text-xs max-w-[240px]">
        <span className="block truncate" title={row.oldUrl}>{row.oldPath}</span>
        <span className="text-[10px] uppercase text-muted-foreground">{row.source}</span>
      </TableCell>
      <TableCell className="min-w-[260px]">
        {customMode ? (
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => onUpdate({ newPath: draft })}
              placeholder="/homme/mon-produit"
              className="min-h-10 font-mono text-xs"
            />
            <Button variant="ghost" size="sm" className="min-h-10" onClick={() => { setCustomMode(false); setDraft(''); onUpdate({ newPath: '' }); }}>
              Liste
            </Button>
          </div>
        ) : (
          <Select
            value={row.newPath || ''}
            onValueChange={(v) => {
              if (v === CUSTOM) { setCustomMode(true); return; }
              onUpdate({ newPath: v });
            }}
          >
            <SelectTrigger className="min-h-10"><SelectValue placeholder="Choisir une cible..." /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={CUSTOM}>URL personnalisée…</SelectItem>
              {targetGroups.map(([group, list]) => (
                <SelectGroup key={group}>
                  <SelectLabel>{group}</SelectLabel>
                  {list.slice(0, 300).map((t) => (
                    <SelectItem key={`${group}-${t.path}-${t.label}`} value={t.path}>
                      {t.label} <span className="text-muted-foreground">({t.path})</span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        )}
      </TableCell>
      <TableCell>
        <Button
          variant={row.status === 'valid' ? 'default' : 'outline'}
          size="sm"
          className="min-h-10 w-full"
          disabled={!row.newPath}
          onClick={() => onUpdate({ status: row.status === 'valid' ? 'review' : 'valid' })}
        >
          {row.status === 'valid'
            ? <><CheckCircle2 className="h-4 w-4 mr-1" /> Validé</>
            : <><AlertTriangle className="h-4 w-4 mr-1" /> À vérifier</>}
        </Button>
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
