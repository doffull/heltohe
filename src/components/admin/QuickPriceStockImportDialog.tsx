import { useRef, useState } from 'react';
import Papa from 'papaparse';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, FileSpreadsheet, X } from 'lucide-react';
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

interface DiffRow {
  sku: string;
  productId?: string;
  name?: string;
  found: boolean;
  before: { price?: number; sale_price?: number | null; stock?: number; is_active?: boolean };
  after: { price?: number; sale_price?: number | null; stock?: number; is_active?: boolean };
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

export function QuickPriceStockImportDialog({ open, onOpenChange, products, onDone }: Props) {
  const bulk = useBulkUpdatePerRow();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<DiffRow[]>([]);
  const [parsing, setParsing] = useState(false);

  const reset = () => setRows([]);

  const bySku = new Map(products.map(p => [p.sku.toLowerCase().trim(), p]));

  const handleFile = (file: File) => {
    setParsing(true);
    reset();
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        try {
          const data = (result.data as Record<string, any>[]);
          const diff: DiffRow[] = data.map(r => {
            const findKey = (kws: string[]) => Object.keys(r).find(k => kws.some(kw => k.toLowerCase().includes(kw)));
            const skuKey = findKey(['sku', 'ugs']);
            const sku = String(r[skuKey || 'sku'] || '').trim();
            const priceKey = findKey(['price', 'prix', 'tarif']);
            const salePriceKey = findKey(['sale', 'promo', 'solde']);
            const stockKey = findKey(['stock', 'quantit']);
            const activeKey = findKey(['active', 'actif', 'published', 'publi']);

            const nextPrice = priceKey ? toNum(r[priceKey]) : undefined;
            const nextSale = salePriceKey ? toNum(r[salePriceKey]) : undefined;
            const nextStock = stockKey ? toNum(r[stockKey]) : undefined;
            const nextActive = activeKey ? toBool(r[activeKey]) : undefined;

            const p = bySku.get(sku.toLowerCase());
            const before = p ? { price: p.price, sale_price: p.salePrice ?? null, stock: p.stock } : {};
            const after: DiffRow['after'] = {};
            if (nextPrice !== undefined && (!p || nextPrice !== p.price)) after.price = nextPrice;
            if (nextSale !== undefined && (!p || nextSale !== (p.salePrice ?? null))) after.sale_price = nextSale;
            if (nextStock !== undefined && (!p || Math.round(nextStock) !== p.stock)) after.stock = Math.round(nextStock);
            if (nextActive !== undefined) after.is_active = nextActive;

            return {
              sku,
              productId: p?.id,
              name: p?.name,
              found: !!p,
              before,
              after,
              changed: !!p && Object.keys(after).length > 0,
            };
          }).filter(r => r.sku);

          setRows(diff);
          const notFound = diff.filter(r => !r.found).length;
          const toUpdate = diff.filter(r => r.changed).length;
          toast.success(`${diff.length} lignes — ${toUpdate} à mettre à jour${notFound ? ` · ${notFound} SKU inconnus` : ''}`);
        } catch (e: any) {
          toast.error('Erreur analyse: ' + e.message);
        } finally {
          setParsing(false);
        }
      },
      error: (err) => { toast.error('Erreur CSV: ' + err.message); setParsing(false); },
    });
  };

  const importable = rows.filter(r => r.changed);

  const handleApply = async () => {
    if (importable.length === 0) { toast.error('Rien à mettre à jour'); return; }
    const payload = importable.map(r => {
      const updates: any = {};
      if (r.after.price !== undefined) updates.price = r.after.price;
      if (r.after.sale_price !== undefined) updates.salePrice = r.after.sale_price === null ? undefined : r.after.sale_price;
      if (r.after.stock !== undefined) updates.stock = r.after.stock;
      if (r.after.is_active !== undefined) updates.isActive = r.after.is_active;
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
    const header = 'sku,price,sale_price,stock,is_active\n';
    const lines = products.slice(0, 500).map(p =>
      `${p.sku},${p.price},${p.salePrice ?? ''},${p.stock},1`
    ).join('\n');
    const blob = new Blob([header + lines], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `produits-prix-stock-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Import CSV rapide — prix & stock
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-3">
          <div className="text-xs text-muted-foreground">
            Colonnes acceptées : <code>sku</code> (obligatoire), <code>price</code>, <code>sale_price</code>, <code>stock</code>, <code>is_active</code>. Le matching se fait par SKU — aucun produit n'est créé.
          </div>

          {rows.length === 0 ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30"
            >
              {parsing ? (
                <div className="flex flex-col items-center gap-3"><Loader2 className="h-8 w-8 animate-spin text-primary" /><span className="text-sm text-muted-foreground">Analyse…</span></div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="font-medium text-sm">Cliquez ou glissez un CSV</p>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); exportTemplate(); }}>
                    Télécharger un gabarit
                  </Button>
                </div>
              )}
              <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
            </div>
          ) : (
            <div className="flex-1 overflow-auto border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">SKU</th>
                    <th className="p-2 text-left">Produit</th>
                    <th className="p-2 text-right">Prix</th>
                    <th className="p-2 text-right">Promo</th>
                    <th className="p-2 text-right">Stock</th>
                    <th className="p-2 text-center">Actif</th>
                    <th className="p-2 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className={cn('border-t', !r.found && 'bg-destructive/5', r.found && !r.changed && 'opacity-50')}>
                      <td className="p-2 font-mono">{r.sku}</td>
                      <td className="p-2 truncate max-w-[220px]">{r.name || <em className="text-destructive">Inconnu</em>}</td>
                      <td className="p-2 text-right">{r.after.price !== undefined ? <><s className="text-muted-foreground">{r.before.price}</s> → <b className="text-primary">{r.after.price}€</b></> : r.before.price ?? '—'}</td>
                      <td className="p-2 text-right">{r.after.sale_price !== undefined ? <><s className="text-muted-foreground">{r.before.sale_price ?? '—'}</s> → <b className="text-primary">{r.after.sale_price ?? '—'}</b></> : r.before.sale_price ?? '—'}</td>
                      <td className="p-2 text-right">{r.after.stock !== undefined ? <><s className="text-muted-foreground">{r.before.stock}</s> → <b className="text-primary">{r.after.stock}</b></> : r.before.stock ?? '—'}</td>
                      <td className="p-2 text-center">{r.after.is_active !== undefined ? (r.after.is_active ? '✓' : '✗') : '—'}</td>
                      <td className="p-2 text-center">
                        {!r.found ? <span className="text-destructive">Inconnu</span> : r.changed ? <span className="text-primary">À MAJ</span> : <span className="text-muted-foreground">Inchangé</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter>
          {rows.length > 0 && (
            <Button variant="ghost" onClick={reset}><X className="h-4 w-4 mr-1" />Recharger</Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={bulk.isPending}>Annuler</Button>
          <Button onClick={handleApply} disabled={importable.length === 0 || bulk.isPending}>
            {bulk.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Appliquer ({importable.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
