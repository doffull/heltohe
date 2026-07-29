import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Layers, Wand2, Plus, Minus, Equal, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  productId: string;
  productName: string;
  onSaved?: () => void;
}

type Level = {
  id: string;
  inventory_id: string;
  location_id: string;
  size: string | null;
  color: string | null;
  quantity: number;
  reserved: number;
};

type Op = 'set' | 'add' | 'sub';

export function BulkVariantStockDialog({ open, onOpenChange, productId, productName, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inventoryId, setInventoryId] = useState<string | null>(null);
  const [webLocationId, setWebLocationId] = useState<string | null>(null);
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  // grid[size|"_"][color|"_"] = qty  (edited values)
  const [grid, setGrid] = useState<Record<string, Record<string, number>>>({});

  // Bulk action controls
  const [op, setOp] = useState<Op>('set');
  const [value, setValue] = useState<string>('');

  const SZ_KEY = (s: string | null) => s || '_';
  const CL_KEY = (c: string | null) => c || '_';

  useEffect(() => {
    if (!open || !productId) return;
    (async () => {
      setLoading(true);
      try {
        const [{ data: prod }, { data: webLoc }] = await Promise.all([
          supabase.from('products').select('sizes, colors').eq('id', productId).maybeSingle(),
          supabase.from('locations').select('id').eq('type', 'web').maybeSingle(),
        ]);
        const pSizes: string[] = (prod?.sizes || []).filter(Boolean);
        const pColors: string[] = (prod?.colors || []).filter(Boolean);
        setSizes(pSizes);
        setColors(pColors);

        let invId: string | null = null;
        const { data: inv } = await supabase.from('inventory').select('id').eq('product_id', productId).maybeSingle();
        if (inv) invId = inv.id;
        else {
          const { data: prodFull } = await supabase.from('products').select('sku, name').eq('id', productId).maybeSingle();
          if (prodFull) {
            const { data: newInv } = await supabase.from('inventory').insert({
              product_id: productId, sku: prodFull.sku, name: prodFull.name, channel: 'b2c', threshold: 10,
            }).select('id').single();
            invId = newInv?.id ?? null;
          }
        }
        setInventoryId(invId);
        setWebLocationId(webLoc?.id ?? null);

        if (invId && webLoc?.id) {
          const { data: sls } = await supabase
            .from('stock_levels')
            .select('*')
            .eq('inventory_id', invId)
            .eq('location_id', webLoc.id);
          const list = (sls || []) as Level[];
          setLevels(list);

          const g: Record<string, Record<string, number>> = {};
          const szList = pSizes.length ? pSizes : [null];
          const clList = pColors.length ? pColors : [null];
          for (const s of szList) {
            g[SZ_KEY(s)] = {};
            for (const c of clList) {
              const found = list.find(l => (l.size || null) === s && (l.color || null) === c);
              g[SZ_KEY(s)][CL_KEY(c)] = found?.quantity ?? 0;
            }
          }
          setGrid(g);
        } else {
          setLevels([]);
          setGrid({});
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [open, productId]);

  const szList = sizes.length ? sizes : [null];
  const clList = colors.length ? colors : [null];

  const totalCurrent = useMemo(() => levels.reduce((s, l) => s + (l.quantity || 0), 0), [levels]);
  const totalNew = useMemo(
    () => Object.values(grid).reduce((sum, row) => sum + Object.values(row).reduce((s, v) => s + (v || 0), 0), 0),
    [grid],
  );

  const setCell = (s: string | null, c: string | null, v: number) => {
    setGrid(prev => ({
      ...prev,
      [SZ_KEY(s)]: { ...(prev[SZ_KEY(s)] || {}), [CL_KEY(c)]: Math.max(0, Math.round(v)) },
    }));
  };

  const applyOpToCells = (cells: Array<{ s: string | null; c: string | null }>) => {
    const num = parseInt(value, 10);
    if (!Number.isFinite(num)) { toast.error('Entrez une valeur numérique'); return; }
    setGrid(prev => {
      const next = { ...prev };
      for (const { s, c } of cells) {
        const sk = SZ_KEY(s), ck = CL_KEY(c);
        next[sk] = { ...(next[sk] || {}) };
        const cur = next[sk][ck] ?? 0;
        if (op === 'set') next[sk][ck] = Math.max(0, num);
        else if (op === 'add') next[sk][ck] = Math.max(0, cur + num);
        else if (op === 'sub') next[sk][ck] = Math.max(0, cur - num);
      }
      return next;
    });
  };

  const applyToAll = () => applyOpToCells(szList.flatMap(s => clList.map(c => ({ s, c }))));
  const applyToSize = (s: string | null) => applyOpToCells(clList.map(c => ({ s, c })));
  const applyToColor = (c: string | null) => applyOpToCells(szList.map(s => ({ s, c })));

  const resetGrid = () => {
    const g: Record<string, Record<string, number>> = {};
    for (const s of szList) {
      g[SZ_KEY(s)] = {};
      for (const c of clList) {
        const found = levels.find(l => (l.size || null) === s && (l.color || null) === c);
        g[SZ_KEY(s)][CL_KEY(c)] = found?.quantity ?? 0;
      }
    }
    setGrid(g);
  };

  const handleSave = async () => {
    if (!inventoryId || !webLocationId) { toast.error('Inventaire ou emplacement Web manquant'); return; }
    setSaving(true);
    try {
      const inserts: any[] = [];
      const updates: Array<{ id: string; qty: number }> = [];
      for (const s of szList) {
        for (const c of clList) {
          const qty = grid[SZ_KEY(s)]?.[CL_KEY(c)] ?? 0;
          const existing = levels.find(l => (l.size || null) === s && (l.color || null) === c);
          if (existing) {
            if (existing.quantity !== qty) updates.push({ id: existing.id, qty });
          } else if (qty > 0) {
            inserts.push({
              inventory_id: inventoryId,
              location_id: webLocationId,
              size: s,
              color: c,
              quantity: qty,
              reserved: 0,
              stocked_at: new Date().toISOString(),
            });
          }
        }
      }

      // Batch updates
      for (const u of updates) {
        const { error } = await supabase.from('stock_levels')
          .update({ quantity: u.qty, updated_at: new Date().toISOString() })
          .eq('id', u.id);
        if (error) throw error;
      }
      if (inserts.length > 0) {
        const { error } = await supabase.from('stock_levels').insert(inserts);
        if (error) throw error;
      }

      // Also update aggregate product.stock so filters/UX stay consistent
      await supabase.from('products').update({ stock: totalNew }).eq('id', productId);

      toast.success(`Stock mis à jour — total ${totalNew}`);
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error('Erreur', { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Stock par taille & couleur — {productName}
          </DialogTitle>
          <DialogDescription>
            Modifiez le stock de chaque variante. Utilisez les actions rapides pour appliquer une valeur à toute une ligne, colonne ou à toute la grille en un clic.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Quick actions */}
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Label className="text-xs font-semibold">Action rapide :</Label>
                <div className="inline-flex rounded-md border overflow-hidden">
                  <Button type="button" size="sm" variant={op === 'set' ? 'default' : 'ghost'} className="h-8 rounded-none px-2 gap-1" onClick={() => setOp('set')}>
                    <Equal className="h-3 w-3" /> Fixer
                  </Button>
                  <Button type="button" size="sm" variant={op === 'add' ? 'default' : 'ghost'} className="h-8 rounded-none px-2 gap-1 border-l" onClick={() => setOp('add')}>
                    <Plus className="h-3 w-3" /> Ajouter
                  </Button>
                  <Button type="button" size="sm" variant={op === 'sub' ? 'default' : 'ghost'} className="h-8 rounded-none px-2 gap-1 border-l" onClick={() => setOp('sub')}>
                    <Minus className="h-3 w-3" /> Retirer
                  </Button>
                </div>
                <Input
                  type="number"
                  min={0}
                  placeholder="quantité"
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  className="w-28 h-8 text-xs"
                />
                <Button type="button" size="sm" variant="secondary" className="h-8" onClick={applyToAll}>
                  <Wand2 className="h-3 w-3 mr-1" /> Toute la grille
                </Button>
                <Button type="button" size="sm" variant="ghost" className="h-8 ml-auto" onClick={resetGrid}>
                  <RotateCcw className="h-3 w-3 mr-1" /> Réinitialiser
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Astuce : cliquez sur le bouton d'une taille (ligne) ou couleur (colonne) pour appliquer l'action à toute la ligne/colonne.
              </p>
            </div>

            {/* Grid */}
            <div className="border rounded-lg overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left text-xs font-semibold w-32">Taille \ Couleur</th>
                    {clList.map((c, i) => (
                      <th key={i} className="p-2 text-center text-xs font-semibold">
                        <div className="flex flex-col items-center gap-1">
                          <span>{c || '—'}</span>
                          {(sizes.length > 0 || colors.length > 0) && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[10px]"
                              onClick={() => applyToColor(c)}
                              title="Appliquer l'action à toute la colonne"
                            >
                              Appliquer col.
                            </Button>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="p-2 text-center text-xs font-semibold w-24">Total ligne</th>
                  </tr>
                </thead>
                <tbody>
                  {szList.map((s, si) => {
                    const rowTotal = clList.reduce((sum, c) => sum + (grid[SZ_KEY(s)]?.[CL_KEY(c)] ?? 0), 0);
                    return (
                      <tr key={si} className="border-t">
                        <td className="p-2 font-semibold text-xs">
                          <div className="flex items-center gap-2">
                            <span>{s || '—'}</span>
                            {(sizes.length > 0 || colors.length > 0) && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-[10px]"
                                onClick={() => applyToSize(s)}
                                title="Appliquer l'action à toute la ligne"
                              >
                                Appliquer
                              </Button>
                            )}
                          </div>
                        </td>
                        {clList.map((c, ci) => (
                          <td key={ci} className="p-1.5 text-center">
                            <Input
                              type="number"
                              min={0}
                              value={grid[SZ_KEY(s)]?.[CL_KEY(c)] ?? 0}
                              onChange={e => setCell(s, c, parseInt(e.target.value || '0', 10))}
                              className="h-8 w-20 mx-auto text-center text-sm font-mono"
                            />
                          </td>
                        ))}
                        <td className="p-2 text-center font-mono font-bold text-sm">{rowTotal}</td>
                      </tr>
                    );
                  })}
                  <tr className="border-t bg-muted/30">
                    <td className="p-2 font-semibold text-xs">Total colonne</td>
                    {clList.map((c, ci) => {
                      const colTotal = szList.reduce((sum, s) => sum + (grid[SZ_KEY(s)]?.[CL_KEY(c)] ?? 0), 0);
                      return (
                        <td key={ci} className="p-2 text-center font-mono font-bold text-sm">{colTotal}</td>
                      );
                    })}
                    <td className="p-2 text-center font-mono font-bold text-primary">{totalNew}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="text-xs text-muted-foreground flex justify-between">
              <span>Stock actuel (Web) : <strong className="text-foreground">{totalCurrent}</strong></span>
              <span>Nouveau total : <strong className="text-primary">{totalNew}</strong> ({totalNew - totalCurrent >= 0 ? '+' : ''}{totalNew - totalCurrent})</span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
