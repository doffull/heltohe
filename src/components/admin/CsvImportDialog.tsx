import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Upload, Loader2, FileSpreadsheet, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { mapCsvRowToProduct, isImportableRow, MappedCsvProduct } from '@/lib/csvProductMapper';

interface RowState extends MappedCsvProduct {
  selected: boolean;
  exists: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function CsvImportDialog({ open, onOpenChange, onComplete }: Props) {
  const [rows, setRows] = useState<RowState[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setRows([]);
    setProgress(0);
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    reset();
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      // Auto-detects ","/";" delimiter
      complete: async (result) => {
        try {
          const raw = (result.data as Record<string, any>[]).filter(isImportableRow);
          if (raw.length === 0) {
            toast.error('Aucun produit valide trouvé dans le fichier');
            setParsing(false);
            return;
          }
          const mapped = raw.map(mapCsvRowToProduct);
          // Check existing SKUs
          const skus = mapped.map((m) => m.sku);
          const { data: existing } = await supabase
            .from('products')
            .select('sku')
            .in('sku', skus);
          const existingSet = new Set((existing || []).map((p: any) => p.sku));
          setRows(
            mapped.map((m) => ({
              ...m,
              exists: existingSet.has(m.sku),
              selected: true,
            }))
          );
          toast.success(`${mapped.length} produits détectés`);
        } catch (err: any) {
          toast.error('Erreur lors de l\'analyse: ' + err.message);
        } finally {
          setParsing(false);
        }
      },
      error: (err) => {
        toast.error('Erreur CSV: ' + err.message);
        setParsing(false);
      },
    });
  };

  const toggleAll = (checked: boolean) => {
    setRows((rs) => rs.map((r) => ({ ...r, selected: checked })));
  };

  const toggleOne = (i: number) => {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, selected: !r.selected } : r)));
  };

  const handleImport = async () => {
    const selected = rows.filter((r) => r.selected && (updateExisting || !r.exists));
    if (selected.length === 0) {
      toast.error('Aucun produit sélectionné');
      return;
    }
    setImporting(true);
    let success = 0;
    const errors: string[] = [];
    for (let i = 0; i < selected.length; i++) {
      const p = selected[i];
      const payload = {
        name: p.name,
        sku: p.sku,
        price: p.price,
        sale_price: p.sale_price,
        image: p.image,
        category: p.category,
        stock: p.stock,
        description: p.description,
        is_active: p.is_active,
        sizes: p.sizes,
        colors: p.colors,
        tags: p.tags,
      };
      const { error } = await supabase
        .from('products')
        .upsert(payload, { onConflict: 'sku' });
      if (error) errors.push(`${p.name}: ${error.message}`);
      else success++;
      setProgress(Math.round(((i + 1) / selected.length) * 100));
    }
    setImporting(false);
    if (errors.length > 0) {
      console.warn('CSV import errors', errors);
      toast.error(`${success} importés, ${errors.length} erreurs`, {
        description: errors.slice(0, 3).join(' • '),
      });
    } else {
      toast.success(`${success} produits importés avec succès`);
    }
    onComplete?.();
    onOpenChange(false);
    reset();
  };

  const selectedCount = rows.filter((r) => r.selected && (updateExisting || !r.exists)).length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importer des produits depuis un CSV
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {rows.length === 0 ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            >
              {parsing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Analyse en cours...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Cliquez ou glissez un fichier CSV</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Format export WooCommerce supporté (colonnes Nom, UGS, Tarif, Stock, Catégories, Images...)
                    </p>
                  </div>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
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
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={rows.every((r) => r.selected)}
                    onCheckedChange={(c) => toggleAll(!!c)}
                    id="select-all"
                  />
                  <Label htmlFor="select-all" className="cursor-pointer">
                    Tout sélectionner ({rows.length})
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="update-existing"
                    checked={updateExisting}
                    onCheckedChange={setUpdateExisting}
                  />
                  <Label htmlFor="update-existing" className="cursor-pointer text-sm">
                    Mettre à jour les produits existants
                  </Label>
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
                      <th className="p-2 w-14"></th>
                      <th className="p-2 text-left">Nom</th>
                      <th className="p-2 text-left">SKU</th>
                      <th className="p-2 text-left">Catégorie</th>
                      <th className="p-2 text-right">Prix</th>
                      <th className="p-2 text-right">Stock</th>
                      <th className="p-2 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-t border-border hover:bg-muted/30">
                        <td className="p-2">
                          <Checkbox
                            checked={r.selected}
                            onCheckedChange={() => toggleOne(i)}
                          />
                        </td>
                        <td className="p-2">
                          {r.image && r.image !== '/placeholder.svg' ? (
                            <img src={r.image} alt="" className="h-10 w-10 object-cover rounded" />
                          ) : (
                            <div className="h-10 w-10 bg-muted rounded" />
                          )}
                        </td>
                        <td className="p-2 max-w-xs truncate">{r.name}</td>
                        <td className="p-2 font-mono text-xs">{r.sku}</td>
                        <td className="p-2">{r.category}</td>
                        <td className="p-2 text-right">
                          {r.sale_price ? (
                            <>
                              <span className="line-through text-muted-foreground text-xs">{r.price}€</span>{' '}
                              <span className="text-primary">{r.sale_price}€</span>
                            </>
                          ) : (
                            <>{r.price}€</>
                          )}
                        </td>
                        <td className="p-2 text-right">{r.stock}</td>
                        <td className="p-2 text-center">
                          {r.exists ? (
                            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400">
                              Existe
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                              Nouveau
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {importing && (
                <div className="text-xs text-muted-foreground text-center">
                  Import en cours... {progress}%
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            Annuler
          </Button>
          <Button onClick={handleImport} disabled={rows.length === 0 || importing || selectedCount === 0}>
            {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Importer {selectedCount > 0 ? `(${selectedCount})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
