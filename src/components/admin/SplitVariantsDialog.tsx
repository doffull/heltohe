import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Product } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/hooks/useProducts';
import { buildSplitRows, buildChildProduct, SplitRow } from '@/lib/splitProductVariants';
import { getSwatchStyle } from '@/lib/swatch';
import { useToast } from '@/hooks/use-toast';
import { Layers2, Loader2 } from 'lucide-react';

interface SplitVariantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  existingSkus: string[];
}

type SourceFate = 'keep' | 'deactivate' | 'delete';

/** stock_levels rows for the source product, keyed by color → size → qty */
type StockMap = Record<string, Record<string, number>>;

export function SplitVariantsDialog({ open, onOpenChange, product, existingSkus }: SplitVariantsDialogProps) {
  const { toast } = useToast();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [rows, setRows] = useState<SplitRow[]>([]);
  const [includeSourceGallery, setIncludeSourceGallery] = useState(true);
  const [inheritPrice, setInheritPrice] = useState(true);
  const [inheritImages, setInheritImages] = useState(true);
  const [inheritStatus, setInheritStatus] = useState(true);
  const [sourceFate, setSourceFate] = useState<SourceFate>('deactivate');
  const [stockMap, setStockMap] = useState<StockMap>({});
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [report, setReport] = useState<{ created: number; errors: string[] } | null>(null);

  useEffect(() => {
    if (!open || !product) return;
    setRows(buildSplitRows(product, existingSkus));
    setIncludeSourceGallery(true);
    setInheritPrice(true);
    setInheritImages(true);
    setInheritStatus(true);
    setSourceFate('deactivate');
    setDone(0);
    setReport(null);
    setStockMap({});

    (async () => {
      try {
        const { data: inv } = await supabase
          .from('inventory')
          .select('id')
          .eq('product_id', product.id)
          .maybeSingle();
        if (!inv) return;
        const { data: levels } = await supabase
          .from('stock_levels')
          .select('size, color, quantity')
          .eq('inventory_id', inv.id);
        const map: StockMap = {};
        for (const l of levels || []) {
          const color = (l.color || '__none__') as string;
          const size = (l.size || '__none__') as string;
          map[color] = map[color] || {};
          map[color][size] = (map[color][size] || 0) + (l.quantity || 0);
        }
        setStockMap(map);
      } catch {
        /* stock read is best-effort */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  const selectedRows = useMemo(() => rows.filter(r => r.selected), [rows]);

  function stockForRow(row: SplitRow): { total: number; sizes: Record<string, number> } {
    const byColor = stockMap[row.colorKey] || stockMap[row.label] || {};
    const sizes: Record<string, number> = {};
    let total = 0;
    for (const [size, qty] of Object.entries(byColor)) {
      if (size !== '__none__') sizes[size] = qty;
      total += qty;
    }
    return { total, sizes };
  }

  function patchRow(index: number, patch: Partial<SplitRow>) {
    setRows(prev => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  async function syncInventory(productId: string, payload: Omit<Product, 'id'>, sizes: Record<string, number>, colorLabel: string) {
    try {
      const { data: webLoc } = await supabase.from('locations').select('id').eq('type', 'web').maybeSingle();
      if (!webLoc) return;
      const { data: inv } = await supabase.from('inventory').insert({
        product_id: productId, sku: payload.sku, name: payload.name, channel: 'b2c', threshold: 10,
      }).select('id').single();
      if (!inv) return;
      const now = new Date().toISOString();
      const inserts = Object.entries(sizes)
        .filter(([, qty]) => qty > 0)
        .map(([size, qty]) => ({ inventory_id: inv.id, location_id: webLoc.id, quantity: qty, reserved: 0, size, color: colorLabel, stocked_at: now }));
      if (inserts.length === 0 && payload.stock > 0) {
        inserts.push({ inventory_id: inv.id, location_id: webLoc.id, quantity: payload.stock, reserved: 0, size: null as any, color: colorLabel, stocked_at: now });
      }
      if (inserts.length > 0) await supabase.from('stock_levels').insert(inserts);
    } catch {
      /* non-critical */
    }
  }

  async function handleRun() {
    if (!product || selectedRows.length === 0) return;
    setRunning(true);
    setDone(0);
    const errors: string[] = [];
    let created = 0;

    for (const row of selectedRows) {
      try {
        const { total, sizes } = stockForRow(row);
        const payload = buildChildProduct(product, row, {
          includeSourceGallery,
          stock: total > 0 ? total : product.stock,
          inheritPrice,
          inheritImages,
          inheritStatus,
          sourceIsActive: product.isActive ?? true,
        });
        const child = await createProduct.mutateAsync(payload);
        created += 1;
        if (child?.id) await syncInventory(child.id, payload, sizes, row.label);
      } catch (e: any) {
        errors.push(`${row.label}: ${e?.message || 'échec'}`);
      }
      setDone(d => d + 1);
    }

    if (created > 0) {
      try {
        if (sourceFate === 'deactivate') {
          await updateProduct.mutateAsync({ id: product.id, isActive: false } as any);
        } else if (sourceFate === 'delete') {
          await deleteProduct.mutateAsync(product.id);
        }
      } catch (e: any) {
        errors.push(`Produit d'origine: ${e?.message || 'échec'}`);
      }
    }

    setRunning(false);
    setReport({ created, errors });
    toast({
      title: `${created} produit(s) créé(s)`,
      description: errors.length > 0 ? `${errors.length} erreur(s)` : 'Un produit par couleur est disponible en boutique',
      variant: errors.length > 0 ? 'destructive' : undefined,
    });
  }

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!running) onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 uppercase tracking-wider">
            <Layers2 className="h-4 w-4" />
            Éclater « {product.name} » par couleur
          </DialogTitle>
        </DialogHeader>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6">
            Ce produit n'a aucune variante de couleur. Ajoutez des couleurs dans la fiche produit pour pouvoir l'éclater.
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {selectedRows.length} produit(s) seront créés · tailles, description et attributs sont copiés
            </p>

            <div className="space-y-2">
              {rows.map((row, index) => {
                const { total } = stockForRow(row);
                return (
                  <div key={`${row.colorKey}-${index}`} className="flex items-center gap-3 border border-border p-3">
                    <Checkbox
                      checked={row.selected}
                      onCheckedChange={(v) => patchRow(index, { selected: !!v })}
                      disabled={running}
                    />
                    <span
                      className="h-8 w-8 rounded-full ring-1 ring-border shrink-0 overflow-hidden"
                      style={getSwatchStyle({ color: row.option.color, color2: row.option.color2, swatchImage: row.option.swatchImage })}
                    >
                      {row.image && row.option.image ? (
                        <img src={row.image} alt={row.label} className="h-full w-full object-cover" />
                      ) : null}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                      <Input
                        value={row.name}
                        onChange={(e) => patchRow(index, { name: e.target.value })}
                        disabled={running || !row.selected}
                        placeholder="Nom du produit"
                      />
                      <Input
                        value={row.sku}
                        onChange={(e) => patchRow(index, { sku: e.target.value })}
                        disabled={running || !row.selected}
                        placeholder="SKU"
                        className="font-mono text-xs"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-20 text-right shrink-0">
                      stock {total > 0 ? total : product.stock}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <Label className="text-xs uppercase tracking-wider">Héritage du produit d'origine</Label>
              {([
                ['price', 'Hériter du prix (et du prix promo)', inheritPrice, setInheritPrice],
                ['images', 'Hériter des images (image principale + galerie)', inheritImages, setInheritImages],
                ['status', 'Hériter du statut (publié / brouillon)', inheritStatus, setInheritStatus],
              ] as [string, string, boolean, (v: boolean) => void][]).map(([key, label, value, set]) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={`inherit-${key}`}
                    checked={value}
                    onCheckedChange={(v) => set(!!v)}
                    disabled={running}
                  />
                  <Label htmlFor={`inherit-${key}`} className="text-xs uppercase tracking-wider cursor-pointer">
                    {label}
                  </Label>
                </div>
              ))}
              {inheritImages && (
                <div className="flex items-center gap-2 pl-6">
                  <Checkbox
                    id="split-gallery"
                    checked={includeSourceGallery}
                    onCheckedChange={(v) => setIncludeSourceGallery(!!v)}
                    disabled={running}
                  />
                  <Label htmlFor="split-gallery" className="text-xs uppercase tracking-wider cursor-pointer">
                    Inclure aussi la galerie du produit d'origine
                  </Label>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                Décoché : prix remis à 0, images limitées à la variante, produit créé en brouillon.
              </p>
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <Label className="text-xs uppercase tracking-wider">Produit d'origine</Label>
              <RadioGroup
                value={sourceFate}
                onValueChange={(v) => setSourceFate(v as SourceFate)}
                className="flex flex-col gap-2"
              >
                {([
                  ['keep', 'Conserver actif'],
                  ['deactivate', 'Désactiver (recommandé)'],
                  ['delete', 'Supprimer'],
                ] as [SourceFate, string][]).map(([value, label]) => (
                  <div key={value} className="flex items-center gap-2">
                    <RadioGroupItem value={value} id={`fate-${value}`} disabled={running} />
                    <Label htmlFor={`fate-${value}`} className="text-sm cursor-pointer">{label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {running && (
              <div className="space-y-1">
                <Progress value={(done / Math.max(1, selectedRows.length)) * 100} />
                <p className="text-xs text-muted-foreground">{done}/{selectedRows.length} créés…</p>
              </div>
            )}

            {report && (
              <div className="text-xs space-y-1 border border-border p-3">
                <p className="font-bold">{report.created} produit(s) créé(s)</p>
                {report.errors.map((e, i) => (
                  <p key={i} className="text-destructive">{e}</p>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={running}>
                {report ? 'Fermer' : 'Annuler'}
              </Button>
              {!report && (
                <Button onClick={handleRun} disabled={running || selectedRows.length === 0}>
                  {running && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Créer {selectedRows.length} produit(s)
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
