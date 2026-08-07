import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { productCategories } from '@/lib/productCategories';
import { Product } from '@/types';
import { useBulkUpdatePerRow } from '@/hooks/useProducts';

type NumOp = 'unchanged' | 'set' | 'add' | 'sub' | 'pctAdd' | 'pctSub' | 'round';
type SaleOp = 'unchanged' | 'set' | 'add' | 'sub' | 'pctAdd' | 'pctSub' | 'clear';
type StockOp = 'unchanged' | 'set' | 'add' | 'sub' | 'zero';
type SkuOp = 'unchanged' | 'prefix' | 'suffix' | 'replace';
type TagsOp = 'unchanged' | 'add' | 'remove' | 'replace';
type BoolOp = 'unchanged' | 'true' | 'false';
type SubtitleOp = 'unchanged' | 'set' | 'collab' | 'clear';

export const COLLAB_SUBTITLE = 'HELVETICA MOUNTAIN PIONEERS X PEGASHOES';


interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  products: Product[];
  categories: string[];
  onDone?: () => void;
}

function applyNumOp(v: number, op: NumOp, arg: number): number {
  if (op === 'unchanged') return v;
  if (op === 'set') return arg;
  if (op === 'add') return v + arg;
  if (op === 'sub') return Math.max(0, v - arg);
  if (op === 'pctAdd') return v * (1 + arg / 100);
  if (op === 'pctSub') return Math.max(0, v * (1 - arg / 100));
  if (op === 'round') return Math.round(v / arg) * arg;
  return v;
}

function applyStockOp(v: number, op: StockOp, arg: number): number {
  if (op === 'unchanged') return v;
  if (op === 'set') return Math.max(0, Math.round(arg));
  if (op === 'add') return v + Math.round(arg);
  if (op === 'sub') return Math.max(0, v - Math.round(arg));
  if (op === 'zero') return 0;
  return v;
}

export function BulkEditDialog({ open, onOpenChange, products, categories, onDone }: Props) {
  const bulk = useBulkUpdatePerRow();

  const [priceOp, setPriceOp] = useState<NumOp>('unchanged');
  const [priceArg, setPriceArg] = useState('');
  const [saleOp, setSaleOp] = useState<SaleOp>('unchanged');
  const [saleArg, setSaleArg] = useState('');
  const [stockOp, setStockOp] = useState<StockOp>('unchanged');
  const [stockArg, setStockArg] = useState('');
  const [skuOp, setSkuOp] = useState<SkuOp>('unchanged');
  const [skuArg, setSkuArg] = useState('');
  const [skuFind, setSkuFind] = useState('');
  const [category, setCategory] = useState<string>('__unchanged__');
  const [extraCatOp, setExtraCatOp] = useState<'unchanged' | 'add' | 'remove'>('unchanged');
  const [extraCat, setExtraCat] = useState<string>('');
  const [tagsOp, setTagsOp] = useState<TagsOp>('unchanged');
  const [tagsArg, setTagsArg] = useState('');
  const [activeOp, setActiveOp] = useState<BoolOp>('unchanged');
  const [subtitleOp, setSubtitleOp] = useState<SubtitleOp>('unchanged');
  const [subtitleArg, setSubtitleArg] = useState('');

  const computeUpdates = (p: Product) => {
    const upd: Partial<Product> & { isActive?: boolean } = {};


    if (priceOp !== 'unchanged') {
      const arg = parseFloat(priceArg || '0');
      const next = applyNumOp(p.price, priceOp, arg);
      upd.price = Math.max(0, Math.round(next * 100) / 100);
    }

    if (saleOp !== 'unchanged') {
      if (saleOp === 'clear') {
        upd.salePrice = undefined;
      } else {
        const cur = p.salePrice ?? p.price;
        const arg = parseFloat(saleArg || '0');
        const next = applyNumOp(cur, saleOp as NumOp, arg);
        upd.salePrice = Math.max(0, Math.round(next * 100) / 100);
      }
    }

    if (stockOp !== 'unchanged') {
      upd.stock = applyStockOp(p.stock, stockOp, parseFloat(stockArg || '0'));
    }

    if (skuOp !== 'unchanged') {
      if (skuOp === 'prefix') upd.sku = (skuArg || '') + p.sku;
      else if (skuOp === 'suffix') upd.sku = p.sku + (skuArg || '');
      else if (skuOp === 'replace' && skuFind) upd.sku = p.sku.split(skuFind).join(skuArg || '');
    }

    if (category !== '__unchanged__') {
      upd.category = category;
      upd.categories = Array.from(new Set([category, ...productCategories(p)]));
    }

    if (extraCatOp !== 'unchanged' && extraCat) {
      const current = upd.categories || productCategories(p);
      if (extraCatOp === 'add') {
        if (!current.some(c => c.toLowerCase() === extraCat.toLowerCase())) {
          upd.categories = [...current, extraCat];
        }
      } else {
        const main = (upd.category || p.category || '').toLowerCase();
        if (extraCat.toLowerCase() !== main) {
          const next = current.filter(c => c.toLowerCase() !== extraCat.toLowerCase());
          if (next.length !== current.length) upd.categories = next;
        }
      }
    }

    if (tagsOp !== 'unchanged') {
      const list = tagsArg.split(',').map(s => s.trim()).filter(Boolean);
      const current = p.tags || [];
      if (tagsOp === 'add') upd.tags = Array.from(new Set([...current, ...list]));
      else if (tagsOp === 'remove') upd.tags = current.filter(t => !list.includes(t));
      else if (tagsOp === 'replace') upd.tags = list;
    }

    if (activeOp !== 'unchanged') upd.isActive = activeOp === 'true';

    if (subtitleOp !== 'unchanged') {
      const next =
        subtitleOp === 'clear' ? '' :
        subtitleOp === 'collab' ? COLLAB_SUBTITLE :
        subtitleArg.trim().toUpperCase();
      if (next !== (p.subtitle || '')) upd.subtitle = next || undefined;
    }

    return upd;
  };

  const [step, setStep] = useState<'configure' | 'review'>('configure');

  const allDiff = useMemo(
    () => products.map(p => ({ p, upd: computeUpdates(p) })).filter(x => Object.keys(x.upd).length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products, priceOp, priceArg, saleOp, saleArg, stockOp, stockArg, skuOp, skuArg, skuFind, category, extraCatOp, extraCat, tagsOp, tagsArg, activeOp, subtitleOp, subtitleArg],

  );

  const warnings = useMemo(() => {
    const w: string[] = [];
    const negPrice = allDiff.filter(({ upd }) => upd.price !== undefined && upd.price < 0).length;
    if (negPrice) w.push(`${negPrice} prix négatif(s)`);
    const badSale = allDiff.filter(({ p, upd }) => {
      const sale = 'salePrice' in upd ? upd.salePrice : p.salePrice;
      const price = upd.price !== undefined ? upd.price : p.price;
      return sale !== undefined && sale !== null && sale >= price;
    }).length;
    if (badSale) w.push(`${badSale} promo ≥ prix normal`);
    const skus = allDiff.map(({ p, upd }) => upd.sku ?? p.sku);
    const dup = skus.filter((s, i) => skus.indexOf(s) !== i);
    if (dup.length) w.push(`${new Set(dup).size} SKU en doublon`);
    return w;
  }, [allDiff]);

  const preview = allDiff.slice(0, 5);
  const hasChanges = allDiff.length > 0;

  const handleApply = async () => {
    if (allDiff.length === 0) { toast.error('Aucun changement calculé'); return; }
    try {
      const { success, errors } = await bulk.mutateAsync(allDiff.map(({ p, upd }) => ({ id: p.id, updates: upd })));
      if (errors.length > 0) {
        toast.error(`${success} mis à jour, ${errors.length} erreurs`, { description: errors.slice(0, 3).join(' • ') });
      } else {
        toast.success(`${success} produit(s) mis à jour`);
      }
      onDone?.();
      onOpenChange(false);
      setStep('configure');
    } catch (e: any) {
      toast.error('Erreur', { description: e?.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setStep('configure'); onOpenChange(o); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            {step === 'configure' ? `Édition en masse — ${products.length} produit(s)` : `Aperçu des changements — ${allDiff.length} produit(s) impacté(s)`}
          </DialogTitle>
        </DialogHeader>

        {step === 'configure' ? (
          <div className="space-y-5">
            {/* Prix */}
            <FieldRow label="Prix (€)">
              <Select value={priceOp} onValueChange={(v) => setPriceOp(v as NumOp)}>
                <SelectTrigger className="w-[220px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unchanged">Inchangé</SelectItem>
                  <SelectItem value="set">Fixer à…</SelectItem>
                  <SelectItem value="add">Augmenter de X €</SelectItem>
                  <SelectItem value="sub">Diminuer de X €</SelectItem>
                  <SelectItem value="pctAdd">Augmenter de X %</SelectItem>
                  <SelectItem value="pctSub">Diminuer de X %</SelectItem>
                  <SelectItem value="round">Arrondir au multiple de…</SelectItem>
                </SelectContent>
              </Select>
              {priceOp !== 'unchanged' && (
                <Input type="number" step="0.01" placeholder="valeur" value={priceArg} onChange={e => setPriceArg(e.target.value)} className="w-32 h-8 text-xs" />
              )}
            </FieldRow>

            {/* Sale price */}
            <FieldRow label="Prix promo (€)">
              <Select value={saleOp} onValueChange={(v) => setSaleOp(v as SaleOp)}>
                <SelectTrigger className="w-[220px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unchanged">Inchangé</SelectItem>
                  <SelectItem value="set">Fixer à…</SelectItem>
                  <SelectItem value="add">+ X €</SelectItem>
                  <SelectItem value="sub">− X €</SelectItem>
                  <SelectItem value="pctAdd">+ X %</SelectItem>
                  <SelectItem value="pctSub">− X %</SelectItem>
                  <SelectItem value="clear">Supprimer promo</SelectItem>
                </SelectContent>
              </Select>
              {saleOp !== 'unchanged' && saleOp !== 'clear' && (
                <Input type="number" step="0.01" placeholder="valeur" value={saleArg} onChange={e => setSaleArg(e.target.value)} className="w-32 h-8 text-xs" />
              )}
            </FieldRow>

            {/* Stock */}
            <FieldRow label="Stock">
              <Select value={stockOp} onValueChange={(v) => setStockOp(v as StockOp)}>
                <SelectTrigger className="w-[220px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unchanged">Inchangé</SelectItem>
                  <SelectItem value="set">Fixer à…</SelectItem>
                  <SelectItem value="add">+ X unités</SelectItem>
                  <SelectItem value="sub">− X unités</SelectItem>
                  <SelectItem value="zero">Mettre à 0 (rupture)</SelectItem>
                </SelectContent>
              </Select>
              {stockOp !== 'unchanged' && stockOp !== 'zero' && (
                <Input type="number" placeholder="quantité" value={stockArg} onChange={e => setStockArg(e.target.value)} className="w-32 h-8 text-xs" />
              )}
            </FieldRow>

            {/* SKU */}
            <FieldRow label="SKU">
              <Select value={skuOp} onValueChange={(v) => setSkuOp(v as SkuOp)}>
                <SelectTrigger className="w-[220px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unchanged">Inchangé</SelectItem>
                  <SelectItem value="prefix">Préfixer</SelectItem>
                  <SelectItem value="suffix">Suffixer</SelectItem>
                  <SelectItem value="replace">Remplacer texte</SelectItem>
                </SelectContent>
              </Select>
              {skuOp === 'replace' && (
                <Input placeholder="chercher" value={skuFind} onChange={e => setSkuFind(e.target.value)} className="w-32 h-8 text-xs" />
              )}
              {skuOp !== 'unchanged' && (
                <Input placeholder={skuOp === 'replace' ? 'remplacer par' : 'texte'} value={skuArg} onChange={e => setSkuArg(e.target.value)} className="w-32 h-8 text-xs" />
              )}
            </FieldRow>

            {/* Sous-titre */}
            <FieldRow label="Sous-titre">
              <Select value={subtitleOp} onValueChange={(v) => setSubtitleOp(v as SubtitleOp)}>
                <SelectTrigger className="w-[220px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unchanged">Inchangé</SelectItem>
                  <SelectItem value="collab">Préréglage Collab</SelectItem>
                  <SelectItem value="set">Fixer à…</SelectItem>
                  <SelectItem value="clear">Supprimer</SelectItem>
                </SelectContent>
              </Select>
              {subtitleOp === 'set' && (
                <Input placeholder="ex : MARQUE X MARQUE" value={subtitleArg} onChange={e => setSubtitleArg(e.target.value)} className="flex-1 h-8 text-xs uppercase" />
              )}
              {subtitleOp === 'collab' && (
                <span className="text-[11px] font-mono text-muted-foreground truncate">{COLLAB_SUBTITLE}</span>
              )}
            </FieldRow>



            {/* Category */}
            <FieldRow label="Catégorie">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[220px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unchanged__">Inchangée</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </FieldRow>

            {/* Catégories additionnelles */}
            <FieldRow label="Catégories add.">
              <Select value={extraCatOp} onValueChange={(v) => setExtraCatOp(v as typeof extraCatOp)}>
                <SelectTrigger className="w-[220px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unchanged">Inchangées</SelectItem>
                  <SelectItem value="add">Ajouter une catégorie</SelectItem>
                  <SelectItem value="remove">Retirer une catégorie</SelectItem>
                </SelectContent>
              </Select>
              {extraCatOp !== 'unchanged' && (
                <Select value={extraCat} onValueChange={setExtraCat}>
                  <SelectTrigger className="w-[220px] h-8 text-xs"><SelectValue placeholder="Choisir…" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={`x-${c}`} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </FieldRow>

            {/* Tags */}
            <FieldRow label="Tags">
              <Select value={tagsOp} onValueChange={(v) => setTagsOp(v as TagsOp)}>
                <SelectTrigger className="w-[220px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unchanged">Inchangés</SelectItem>
                  <SelectItem value="add">Ajouter</SelectItem>
                  <SelectItem value="remove">Retirer</SelectItem>
                  <SelectItem value="replace">Remplacer</SelectItem>
                </SelectContent>
              </Select>
              {tagsOp !== 'unchanged' && (
                <Input placeholder="tag1, tag2, tag3" value={tagsArg} onChange={e => setTagsArg(e.target.value)} className="flex-1 h-8 text-xs" />
              )}
            </FieldRow>

            {/* Actif */}
            <FieldRow label="Publication">
              <Select value={activeOp} onValueChange={(v) => setActiveOp(v as BoolOp)}>
                <SelectTrigger className="w-[220px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unchanged">Inchangé</SelectItem>
                  <SelectItem value="true">Activer</SelectItem>
                  <SelectItem value="false">Désactiver</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>

            {/* Quick preview */}
            <div className="border rounded-lg p-3 bg-muted/30">
              <p className="text-xs font-semibold mb-2">Aperçu rapide — {allDiff.length} produit(s) sur {products.length} seront modifiés</p>
              {!hasChanges ? (
                <p className="text-xs text-muted-foreground">Aucune modification configurée.</p>
              ) : (
                <div className="space-y-1 text-xs">
                  {preview.map(({ p, upd }) => (
                    <div key={p.id} className="flex flex-wrap gap-2 items-center border-t pt-1 first:border-0 first:pt-0">
                      <span className="font-medium truncate max-w-[180px]">{p.name}</span>
                      {upd.price !== undefined && <Diff before={`${p.price}€`} after={`${upd.price}€`} label="prix" />}
                      {'salePrice' in upd && <Diff before={p.salePrice ? `${p.salePrice}€` : '—'} after={upd.salePrice ? `${upd.salePrice}€` : '—'} label="promo" />}
                      {upd.stock !== undefined && <Diff before={String(p.stock)} after={String(upd.stock)} label="stock" />}
                      {upd.sku !== undefined && <Diff before={p.sku} after={upd.sku} label="sku" />}
                      {upd.category !== undefined && <Diff before={p.category} after={upd.category} label="cat" />}
                          {'subtitle' in upd && <Diff before={p.subtitle || '—'} after={upd.subtitle || '—'} label="sous-titre" />}
                      {upd.tags !== undefined && <Diff before={(p.tags || []).join(',') || '—'} after={upd.tags.join(',') || '—'} label="tags" />}
                      {upd.isActive !== undefined && <Diff before="—" after={upd.isActive ? 'Actif' : 'Inactif'} label="statut" />}
                    </div>
                  ))}
                </div>
              )}
              {warnings.length > 0 && (
                <div className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">⚠ {warnings.join(' · ')}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {warnings.length > 0 && (
              <div className="rounded border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300">
                ⚠ {warnings.join(' · ')}. Vérifiez avant d'appliquer.
              </div>
            )}
            <div className="border rounded-lg overflow-auto max-h-[55vh]">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Produit</th>
                    <th className="p-2 text-left">SKU</th>
                    <th className="p-2 text-left">Changements</th>
                  </tr>
                </thead>
                <tbody>
                  {allDiff.map(({ p, upd }) => (
                    <tr key={p.id} className="border-t">
                      <td className="p-2 truncate max-w-[220px]">{p.name}</td>
                      <td className="p-2 font-mono">{upd.sku ?? p.sku}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {upd.price !== undefined && <Diff before={`${p.price}€`} after={`${upd.price}€`} label="prix" />}
                          {'salePrice' in upd && <Diff before={p.salePrice ? `${p.salePrice}€` : '—'} after={upd.salePrice ? `${upd.salePrice}€` : '—'} label="promo" />}
                          {upd.stock !== undefined && <Diff before={String(p.stock)} after={String(upd.stock)} label="stock" />}
                          {upd.sku !== undefined && <Diff before={p.sku} after={upd.sku} label="sku" />}
                          {upd.category !== undefined && <Diff before={p.category} after={upd.category} label="cat" />}
                          {'subtitle' in upd && <Diff before={p.subtitle || '—'} after={upd.subtitle || '—'} label="sous-titre" />}
                          {upd.tags !== undefined && <Diff before={(p.tags || []).join(',') || '—'} after={upd.tags.join(',') || '—'} label="tags" />}
                          {upd.isActive !== undefined && <Diff before="—" after={upd.isActive ? 'Actif' : 'Inactif'} label="statut" />}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'configure' ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={bulk.isPending}>Annuler</Button>
              <Button onClick={() => setStep('review')} disabled={!hasChanges}>
                Aperçu des changements ({allDiff.length})
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep('configure')} disabled={bulk.isPending}>Retour</Button>
              <Button onClick={handleApply} disabled={!hasChanges || bulk.isPending}>
                {bulk.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                Confirmer et appliquer ({allDiff.length})
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Label className="w-32 text-xs font-semibold shrink-0">{label}</Label>
      {children}
    </div>
  );
}

function Diff({ before, after, label }: { before: string; after: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-background border">
      <span className="text-[10px] uppercase text-muted-foreground">{label}</span>
      <span className="line-through text-muted-foreground">{before}</span>
      <span>→</span>
      <span className="text-primary font-semibold">{after}</span>
    </span>
  );
}
