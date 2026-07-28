import { useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, FileSpreadsheet, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Product } from '@/types';
import { useBulkUpdatePerRow } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  products: Product[];
  onDone?: () => void;
}

type FieldKey = 'price' | 'sale_price' | 'stock' | 'is_active' | 'name' | 'subtitle' | 'sizes' | 'colors' | 'material' | 'tags';

interface DiffRow {
  rowIndex: number;
  sku: string;
  productId?: string;
  productName?: string;
  found: boolean;
  before: Partial<Record<FieldKey, any>>;
  after: Partial<Record<FieldKey, any>>;
  errors: string[];
  warnings: string[];
  changed: boolean;
}

const toNum = (v: any): number | undefined => {
  if (v === '' || v === null || v === undefined) return undefined;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};
const toBool = (v: any): boolean | undefined => {
  if (v === '' || v === null || v === undefined) return undefined;
  const s = String(v).toLowerCase().trim();
  if (['1', 'true', 'oui', 'yes', 'actif', 'on'].includes(s)) return true;
  if (['0', 'false', 'non', 'no', 'inactif', 'off'].includes(s)) return false;
  return undefined;
};
const toList = (v: any): string[] | undefined => {
  if (v === '' || v === null || v === undefined) return undefined;
  return String(v).split(/[|,;]/).map(s => s.trim()).filter(Boolean);
};
const arrayEqual = (a: string[] | undefined | null, b: string[] | undefined | null) => {
  const A = a || []; const B = b || [];
  if (A.length !== B.length) return false;
  return A.every((v, i) => v === B[i]);
};

export function QuickPriceStockImportDialog({ open, onOpenChange, products, onDone }: Props) {
  const bulk = useBulkUpdatePerRow();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<DiffRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [step, setStep] = useState<'upload' | 'review'>('upload');

  const reset = () => { setRows([]); setStep('upload'); };

  const bySku = useMemo(() => new Map(products.map(p => [p.sku.toLowerCase().trim(), p])), [products]);

  const analyzeRows = (data: Record<string, any>[]) => {
    const seenSkus = new Map<string, number>();
    const diff: DiffRow[] = data.map((r, idx) => {
      const findKey = (kws: string[]) => Object.keys(r).find(k => kws.some(kw => k.toLowerCase().includes(kw)));
      const skuKey = findKey(['sku', 'ugs', 'ref']);
      const sku = String(r[skuKey || 'sku'] || '').trim();

      const priceKey = findKey(['price', 'prix', 'tarif']);
      const salePriceKey = Object.keys(r).find(k => /sale|promo|solde/i.test(k) && !/regular|normal/i.test(k));
      const stockKey = findKey(['stock', 'quantit', 'qty']);
      const activeKey = findKey(['active', 'actif', 'published', 'publi']);
      const nameKey = findKey(['name', 'nom ', 'nom_', 'titre', 'title', 'libell']);
      const subtitleKey = findKey(['subtitle', 'variation', 'variante', 'sous-titre', 'sous_titre', 'declinaison']);
      const sizesKey = findKey(['size', 'taille', 'pointure']);
      const colorsKey = findKey(['color', 'couleur', 'coloris']);
      const materialKey = findKey(['material', 'matiere', 'matière', 'compos']);
      const tagsKey = findKey(['tag', 'etiquett', 'étiquett']);

      const nextPrice = priceKey ? toNum(r[priceKey]) : undefined;
      const nextSale = salePriceKey ? toNum(r[salePriceKey]) : undefined;
      const nextStock = stockKey ? toNum(r[stockKey]) : undefined;
      const nextActive = activeKey ? toBool(r[activeKey]) : undefined;
      const nextName = nameKey && r[nameKey] ? String(r[nameKey]).trim() : undefined;
      const nextSubtitle = subtitleKey && r[subtitleKey] ? String(r[subtitleKey]).trim() : undefined;
      const nextSizes = sizesKey ? toList(r[sizesKey]) : undefined;
      const nextColors = colorsKey ? toList(r[colorsKey]) : undefined;
      const nextMaterial = materialKey && r[materialKey] ? String(r[materialKey]).trim() : undefined;
      const nextTags = tagsKey ? toList(r[tagsKey]) : undefined;

      const p = bySku.get(sku.toLowerCase());
      const before: DiffRow['before'] = p ? {
        price: p.price, sale_price: p.salePrice ?? null, stock: p.stock,
        name: p.name, subtitle: p.subtitle, sizes: p.sizes, colors: p.colors,
        material: p.material, tags: p.tags,
      } : {};
      const after: DiffRow['after'] = {};
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!sku) errors.push('SKU manquant');
      if (sku) {
        const prevIdx = seenSkus.get(sku.toLowerCase());
        if (prevIdx !== undefined) errors.push(`SKU en doublon (ligne ${prevIdx + 2})`);
        else seenSkus.set(sku.toLowerCase(), idx);
      }
      if (!p && sku) warnings.push('SKU inconnu — ligne ignorée');

      if (nextPrice !== undefined) {
        if (nextPrice < 0) errors.push('Prix négatif');
        else if (!p || nextPrice !== p.price) after.price = nextPrice;
      }
      if (nextSale !== undefined) {
        if (nextSale < 0) errors.push('Prix promo négatif');
        else if (!p || nextSale !== (p.salePrice ?? null)) after.sale_price = nextSale;
      }
      const effectivePrice = after.price ?? p?.price;
      const effectiveSale = 'sale_price' in after ? after.sale_price : p?.salePrice;
      if (effectivePrice !== undefined && effectiveSale !== undefined && effectiveSale !== null && effectiveSale >= effectivePrice) {
        warnings.push('Promo ≥ prix normal');
      }
      if (nextStock !== undefined) {
        if (nextStock < 0) errors.push('Stock négatif');
        else if (!p || Math.round(nextStock) !== p.stock) after.stock = Math.round(nextStock);
      }
      if (nextActive !== undefined) after.is_active = nextActive;
      if (nextName && (!p || nextName !== p.name)) after.name = nextName;
      if (nextSubtitle !== undefined && (!p || nextSubtitle !== (p.subtitle || ''))) after.subtitle = nextSubtitle;
      if (nextSizes !== undefined && (!p || !arrayEqual(nextSizes, p.sizes))) after.sizes = nextSizes;
      if (nextColors !== undefined && (!p || !arrayEqual(nextColors, p.colors))) after.colors = nextColors;
      if (nextMaterial && (!p || nextMaterial !== (p.material || ''))) after.material = nextMaterial;
      if (nextTags !== undefined && (!p || !arrayEqual(nextTags, p.tags))) after.tags = nextTags;

      return {
        rowIndex: idx + 2,
        sku,
        productId: p?.id,
        productName: p?.name,
        found: !!p,
        before,
        after,
        errors,
        warnings,
        changed: !!p && errors.length === 0 && Object.keys(after).length > 0,
      };
    });
    setRows(diff);
    setStep('review');
    const toUpdate = diff.filter(r => r.changed).length;
    const errs = diff.filter(r => r.errors.length > 0).length;
    const notFound = diff.filter(r => !r.found && !r.errors.length).length;
    toast.success(
      `${diff.length} ligne(s) analysée(s) — ${toUpdate} valide(s)${errs ? ` · ${errs} erreur(s)` : ''}${notFound ? ` · ${notFound} SKU inconnu(s)` : ''}`
    );
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    reset();
    const ext = file.name.toLowerCase().split('.').pop() || '';
    try {
      if (ext === 'xls' || ext === 'xlsx') {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
        analyzeRows(data);
        setParsing(false);
      } else {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (result) => {
            try { analyzeRows(result.data as Record<string, any>[]); }
            catch (e: any) { toast.error('Erreur analyse: ' + e.message); }
            finally { setParsing(false); }
          },
          error: (err) => { toast.error('Erreur CSV: ' + err.message); setParsing(false); },
        });
      }
    } catch (e: any) {
      toast.error('Erreur fichier: ' + e.message);
      setParsing(false);
    }
  };

  const importable = rows.filter(r => r.changed);
  const errorCount = rows.filter(r => r.errors.length > 0).length;
  const warnCount = rows.filter(r => r.warnings.length > 0 && r.errors.length === 0).length;

  const handleApply = async () => {
    if (importable.length === 0) { toast.error('Rien à mettre à jour'); return; }
    const payload = importable.map(r => {
      const updates: any = {};
      if (r.after.price !== undefined) updates.price = r.after.price;
      if ('sale_price' in r.after) updates.salePrice = r.after.sale_price === null ? undefined : r.after.sale_price;
      if (r.after.stock !== undefined) updates.stock = r.after.stock;
      if (r.after.is_active !== undefined) updates.isActive = r.after.is_active;
      if (r.after.name !== undefined) updates.name = r.after.name;
      if (r.after.subtitle !== undefined) updates.subtitle = r.after.subtitle;
      if (r.after.sizes !== undefined) updates.sizes = r.after.sizes;
      if (r.after.colors !== undefined) updates.colors = r.after.colors;
      if (r.after.material !== undefined) updates.material = r.after.material;
      if (r.after.tags !== undefined) updates.tags = r.after.tags;
      return { id: r.productId!, updates };
    });
    try {
      const { success, errors } = await bulk.mutateAsync(payload);
      if (errors.length > 0) toast.error(`${success} OK, ${errors.length} erreurs`);
      else toast.success(`${success} produit(s) mis à jour`);
      onDone?.();
      onOpenChange(false);
      reset();
    } catch (e: any) {
      toast.error('Erreur: ' + e?.message);
    }
  };

  const exportTemplate = () => {
    const header = 'sku,name,subtitle,price,sale_price,stock,is_active,sizes,colors,material,tags\n';
    const lines = products.slice(0, 500).map(p =>
      `${p.sku},"${p.name}","${p.subtitle || ''}",${p.price},${p.salePrice ?? ''},${p.stock},1,"${(p.sizes || []).join('|')}","${(p.colors || []).join('|')}","${p.material || ''}","${(p.tags || []).join('|')}"`
    ).join('\n');
    const blob = new Blob([header + lines], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `produits-import-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const renderCell = (before: any, after: any, isArr = false) => {
    if (after === undefined) return <span className="text-muted-foreground">{isArr ? (before || []).join(', ') || '—' : (before ?? '—')}</span>;
    const b = isArr ? (before || []).join(', ') || '—' : (before ?? '—');
    const a = isArr ? (after || []).join(', ') || '—' : (after ?? '—');
    return <><s className="text-muted-foreground">{b}</s> → <b className="text-primary">{a}</b></>;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-6xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {step === 'upload' ? 'Import CSV / XLSX — prix, stock & variations' : `Aperçu de l'import — ${rows.length} ligne(s)`}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-3">
          <div className="text-xs text-muted-foreground">
            Colonnes reconnues : <code>sku</code> (obligatoire), <code>name</code>, <code>subtitle</code> (variation), <code>price</code>, <code>sale_price</code>, <code>stock</code>, <code>is_active</code>, <code>sizes</code>, <code>colors</code>, <code>material</code>, <code>tags</code>. Séparez les listes par <code>|</code> ou <code>,</code>. Matching par SKU — aucun produit n'est créé.
          </div>

          {step === 'upload' ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30"
            >
              {parsing ? (
                <div className="flex flex-col items-center gap-3"><Loader2 className="h-8 w-8 animate-spin text-primary" /><span className="text-sm text-muted-foreground">Analyse…</span></div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="font-medium text-sm">Cliquez ou glissez un fichier CSV / XLS / XLSX</p>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); exportTemplate(); }}>
                    Télécharger un gabarit
                  </Button>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
              />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary"><CheckCircle2 className="h-3 w-3" />{importable.length} à mettre à jour</span>
                {errorCount > 0 && <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-destructive/10 text-destructive"><AlertTriangle className="h-3 w-3" />{errorCount} erreur(s) — ligne(s) ignorée(s)</span>}
                {warnCount > 0 && <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400"><AlertTriangle className="h-3 w-3" />{warnCount} avertissement(s)</span>}
              </div>
              <div className="flex-1 overflow-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="p-2 text-left">#</th>
                      <th className="p-2 text-left">SKU</th>
                      <th className="p-2 text-left">Produit</th>
                      <th className="p-2 text-left">Nom / Variation</th>
                      <th className="p-2 text-right">Prix</th>
                      <th className="p-2 text-right">Promo</th>
                      <th className="p-2 text-right">Stock</th>
                      <th className="p-2 text-left">Tailles</th>
                      <th className="p-2 text-left">Couleurs</th>
                      <th className="p-2 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.rowIndex} className={cn(
                        'border-t',
                        r.errors.length > 0 && 'bg-destructive/10',
                        !r.errors.length && r.warnings.length > 0 && 'bg-amber-500/5',
                        !r.errors.length && !r.found && 'opacity-60',
                        !r.errors.length && r.found && !r.changed && 'opacity-50',
                      )}>
                        <td className="p-2 text-muted-foreground">{r.rowIndex}</td>
                        <td className="p-2 font-mono">{r.sku || <em className="text-destructive">—</em>}</td>
                        <td className="p-2 truncate max-w-[180px]">{r.productName || <em className="text-destructive">Inconnu</em>}</td>
                        <td className="p-2 max-w-[200px]">
                          <div>{renderCell(r.before.name, r.after.name)}</div>
                          {(r.after.subtitle !== undefined || r.before.subtitle) && (
                            <div className="text-[10px] text-muted-foreground">{renderCell(r.before.subtitle, r.after.subtitle)}</div>
                          )}
                        </td>
                        <td className="p-2 text-right">{renderCell(r.before.price !== undefined ? `${r.before.price}€` : '—', r.after.price !== undefined ? `${r.after.price}€` : undefined)}</td>
                        <td className="p-2 text-right">{renderCell(r.before.sale_price ? `${r.before.sale_price}€` : '—', 'sale_price' in r.after ? (r.after.sale_price ? `${r.after.sale_price}€` : '—') : undefined)}</td>
                        <td className="p-2 text-right">{renderCell(r.before.stock, r.after.stock)}</td>
                        <td className="p-2 max-w-[140px] truncate">{renderCell(r.before.sizes, r.after.sizes, true)}</td>
                        <td className="p-2 max-w-[140px] truncate">{renderCell(r.before.colors, r.after.colors, true)}</td>
                        <td className="p-2 text-center">
                          {r.errors.length > 0 ? (
                            <span className="text-destructive" title={r.errors.join(' · ')}>Erreur</span>
                          ) : !r.found ? (
                            <span className="text-muted-foreground">Inconnu</span>
                          ) : r.changed ? (
                            <span className="text-primary">À MAJ</span>
                          ) : (
                            <span className="text-muted-foreground">Inchangé</span>
                          )}
                          {(r.errors.length > 0 || r.warnings.length > 0) && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {[...r.errors, ...r.warnings].slice(0, 2).join(' · ')}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          {step === 'review' && (
            <Button variant="ghost" onClick={reset}><X className="h-4 w-4 mr-1" />Recharger</Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={bulk.isPending}>Annuler</Button>
          {step === 'review' && (
            <Button onClick={handleApply} disabled={importable.length === 0 || bulk.isPending}>
              {bulk.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Confirmer et appliquer ({importable.length})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
