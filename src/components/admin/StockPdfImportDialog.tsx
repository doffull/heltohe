import { useState, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Loader2, FileText, X, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type ExtractedItem = { sku: string; name: string; stock: number };
type Row = ExtractedItem & {
  selected: boolean;
  inventoryId: string | null;
  currentStock: number;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: { id: string; name: string; type: string }[];
  inventory: { id: string; sku: string; name: string }[];
  stockLevels: { inventory_id: string; location_id: string; quantity: number; size: string | null; color: string | null; id: string }[];
  onComplete?: () => void;
}

export function StockPdfImportDialog({ open, onOpenChange, locations, inventory, stockLevels, onComplete }: Props) {
  const [parsing, setParsing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [locationId, setLocationId] = useState<string>(() => locations.find(l => l.type === 'web')?.id || locations[0]?.id || '');
  const [mode, setMode] = useState<'replace' | 'add'>('replace');
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setRows([]);
    setProgress(0);
  };

  const skuMap = useMemo(() => {
    const m = new Map<string, string>();
    inventory.forEach(i => m.set(i.sku.trim().toLowerCase(), i.id));
    return m;
  }, [inventory]);

  const handleFile = async (file: File) => {
    setParsing(true);
    reset();
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const fileBase64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke('parse-stock-pdf', {
        body: { fileBase64, fileType: ext },
      });
      if (error) throw error;
      const items: ExtractedItem[] = data?.items || [];
      if (items.length === 0) {
        toast.error('Aucun produit détecté dans le fichier');
        return;
      }
      const mapped: Row[] = items.map(it => {
        const invId = skuMap.get(it.sku.trim().toLowerCase()) || null;
        const currentStock = invId
          ? stockLevels
              .filter(sl => sl.inventory_id === invId && sl.location_id === locationId)
              .reduce((s, sl) => s + sl.quantity, 0)
          : 0;
        return { ...it, selected: !!invId, inventoryId: invId, currentStock };
      });
      setRows(mapped);
      const matched = mapped.filter(r => r.inventoryId).length;
      toast.success(`${mapped.length} lignes extraites — ${matched} SKU reconnu${matched > 1 ? 's' : ''}`);
    } catch (err: any) {
      toast.error('Erreur: ' + (err.message || 'extraction échouée'));
    } finally {
      setParsing(false);
    }
  };

  const apply = async () => {
    const targets = rows.filter(r => r.selected && r.inventoryId);
    if (targets.length === 0 || !locationId) {
      toast.error('Aucune ligne applicable');
      return;
    }
    setApplying(true);
    let ok = 0;
    const errors: string[] = [];
    for (let i = 0; i < targets.length; i++) {
      const r = targets[i];
      try {
        // Find existing root-level (no size/color) stock row for this inventory+location
        const { data: existing } = await supabase
          .from('stock_levels')
          .select('id, quantity')
          .eq('inventory_id', r.inventoryId!)
          .eq('location_id', locationId)
          .is('size', null)
          .is('color', null)
          .maybeSingle();

        const newQty = mode === 'replace' ? r.stock : r.currentStock + r.stock;

        if (existing?.id) {
          const { error } = await supabase
            .from('stock_levels')
            .update({ quantity: newQty, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('stock_levels').insert({
            inventory_id: r.inventoryId!,
            location_id: locationId,
            quantity: newQty,
            reserved: 0,
            size: null,
            color: null,
          });
          if (error) throw error;
        }
        ok++;
      } catch (err: any) {
        errors.push(`${r.sku}: ${err.message}`);
      }
      setProgress(Math.round(((i + 1) / targets.length) * 100));
    }
    setApplying(false);
    if (errors.length > 0) {
      toast.error(`${ok} mis à jour, ${errors.length} erreurs`, {
        description: errors.slice(0, 3).join(' • '),
      });
    } else {
      toast.success(`Stock mis à jour pour ${ok} produit${ok > 1 ? 's' : ''}`);
    }
    onComplete?.();
    onOpenChange(false);
    reset();
  };

  const selectedCount = rows.filter(r => r.selected && r.inventoryId).length;
  const matchedCount = rows.filter(r => r.inventoryId).length;
  const unmatchedCount = rows.length - matchedCount;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Importer le stock depuis un fichier (PDF/Excel/CSV)
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {rows.length === 0 ? (
            <div
              onClick={() => !parsing && inputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            >
              {parsing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Analyse IA en cours… (peut prendre 30s)</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Glissez ou cliquez pour sélectionner</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Rapport ATUM, export PDF, Excel (.xlsx) ou CSV — extrait par IA
                    </p>
                  </div>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = '';
                }}
              />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 p-3 border border-border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Destination:</Label>
                  <Select value={locationId} onValueChange={setLocationId}>
                    <SelectTrigger className="w-44 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {locations.map(l => (
                        <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Mode:</Label>
                  <Select value={mode} onValueChange={(v) => setMode(v as any)}>
                    <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="replace">Remplacer</SelectItem>
                      <SelectItem value="add">Ajouter (delta)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 text-xs ml-auto">
                  <span className="text-emerald-600">✓ {matchedCount} match</span>
                  {unmatchedCount > 0 && <span className="text-amber-600">⚠ {unmatchedCount} inconnus</span>}
                </div>
                <Button variant="ghost" size="sm" onClick={reset}>
                  <X className="h-4 w-4 mr-1" /> Recharger
                </Button>
              </div>

              <div className="flex-1 overflow-auto border border-border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="p-2 w-10"></th>
                      <th className="p-2 text-left">SKU</th>
                      <th className="p-2 text-left">Nom détecté</th>
                      <th className="p-2 text-right">Stock actuel</th>
                      <th className="p-2 text-right">Nouveau stock</th>
                      <th className="p-2 text-right">Δ</th>
                      <th className="p-2 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const target = mode === 'replace' ? r.stock : r.currentStock + r.stock;
                      const delta = target - r.currentStock;
                      return (
                        <tr key={i} className="border-t border-border hover:bg-muted/30">
                          <td className="p-2">
                            <Checkbox
                              checked={r.selected}
                              disabled={!r.inventoryId}
                              onCheckedChange={(c) => {
                                setRows(rs => rs.map((rr, ix) => ix === i ? { ...rr, selected: !!c } : rr));
                              }}
                            />
                          </td>
                          <td className="p-2 font-mono text-xs">{r.sku || '—'}</td>
                          <td className="p-2 max-w-xs truncate">{r.name}</td>
                          <td className="p-2 text-right font-mono text-muted-foreground">
                            {r.inventoryId ? r.currentStock : '—'}
                          </td>
                          <td className="p-2 text-right font-mono font-semibold">
                            {r.inventoryId ? target : '—'}
                          </td>
                          <td className={`p-2 text-right font-mono text-xs ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {r.inventoryId ? (delta > 0 ? `+${delta}` : delta) : '—'}
                          </td>
                          <td className="p-2 text-center">
                            {r.inventoryId ? (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><Check className="h-3 w-3" /> Match</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-600"><AlertCircle className="h-3 w-3" /> SKU inconnu</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {applying && <p className="text-xs text-muted-foreground text-center">Application… {progress}%</p>}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={applying}>Annuler</Button>
          <Button onClick={apply} disabled={selectedCount === 0 || applying || !locationId}>
            {applying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
            Appliquer {selectedCount > 0 ? `(${selectedCount})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
