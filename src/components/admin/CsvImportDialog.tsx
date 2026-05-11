import { useState, useRef, useMemo } from 'react';
import Papa from 'papaparse';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Upload, Loader2, FileSpreadsheet, X, AlertTriangle, Check, Download } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { mapCsvRowToProduct, isImportableRow } from '@/lib/csvProductMapper';
import { validateHeaders, validateMappedRows, buildErrorReportCsv, type ValidatedRow } from '@/lib/csvProductValidator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface RowState extends ValidatedRow {
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
  const [missingHeaders, setMissingHeaders] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [skipErrors, setSkipErrors] = useState(true);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setRows([]);
    setMissingHeaders([]);
    setProgress(0);
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    reset();
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        try {
          const headers = result.meta.fields || [];
          const headerCheck = validateHeaders(headers);
          if (!headerCheck.ok) {
            setMissingHeaders(headerCheck.missing);
            toast.error('Colonnes manquantes — fichier non importable');
            setParsing(false);
            return;
          }

          const raw = (result.data as Record<string, any>[]).filter(isImportableRow);
          if (raw.length === 0) {
            toast.error('Aucun produit valide trouvé dans le fichier');
            setParsing(false);
            return;
          }
          const mapped = raw.map(mapCsvRowToProduct);
          const skus = mapped.map(m => m.sku);
          const { data: existing } = await supabase
            .from('products')
            .select('sku')
            .in('sku', skus);
          const existingSet = new Set((existing || []).map((p: any) => p.sku));

          const validated = validateMappedRows(mapped, existingSet);
          setRows(
            validated.map(v => ({
              ...v,
              exists: existingSet.has(v.sku),
              selected: v.status !== 'error',
            }))
          );
          const okCount = validated.filter(v => v.status === 'ok').length;
          const warnCount = validated.filter(v => v.status === 'warning').length;
          const errCount = validated.filter(v => v.status === 'error').length;
          toast.success(`${validated.length} lignes — ${okCount} OK · ${warnCount} avert. · ${errCount} erreurs`);
        } catch (err: any) {
          toast.error("Erreur d'analyse: " + err.message);
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

  const counts = useMemo(() => {
    const ok = rows.filter(r => r.status === 'ok').length;
    const warn = rows.filter(r => r.status === 'warning').length;
    const err = rows.filter(r => r.status === 'error').length;
    return { ok, warn, err };
  }, [rows]);

  const importable = useMemo(() =>
    rows.filter(r => r.selected && (skipErrors ? r.status !== 'error' : true) && (updateExisting || !r.exists)),
    [rows, skipErrors, updateExisting]
  );

  const toggleAll = (checked: boolean) => {
    setRows(rs => rs.map(r => ({
      ...r,
      selected: checked && (skipErrors ? r.status !== 'error' : true),
    })));
  };

  const toggleOne = (i: number) => {
    setRows(rs => rs.map((r, idx) => idx === i ? { ...r, selected: !r.selected } : r));
  };

  const downloadReport = () => {
    const csv = buildErrorReportCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-validation-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (importable.length === 0) {
      toast.error('Aucun produit à importer');
      return;
    }
    setImporting(true);
    let success = 0;
    const errors: string[] = [];
    for (let i = 0; i < importable.length; i++) {
      const p = importable[i];
      const payload = {
        name: p.name, sku: p.sku, price: p.price, sale_price: p.sale_price,
        image: p.image, category: p.category, stock: p.stock, description: p.description,
        is_active: p.is_active, sizes: p.sizes, colors: p.colors, tags: p.tags,
      };
      const { error } = await supabase.from('products').upsert(payload, { onConflict: 'sku' });
      if (error) errors.push(`${p.name}: ${error.message}`);
      else success++;
      setProgress(Math.round(((i + 1) / importable.length) * 100));
    }
    setImporting(false);
    if (errors.length > 0) {
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

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importer des produits depuis un CSV
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {missingHeaders.length > 0 && (
            <div className="border border-destructive/50 bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2 font-semibold mb-1">
                <AlertTriangle className="h-4 w-4" /> Colonnes obligatoires manquantes
              </div>
              <ul className="list-disc pl-6 text-xs">
                {missingHeaders.map(h => <li key={h}>{h}</li>)}
              </ul>
            </div>
          )}

          {rows.length === 0 ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            >
              {parsing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Analyse & validation…</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Cliquez ou glissez un fichier CSV</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Format export WooCommerce supporté
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
              <div className="flex items-center justify-between gap-3 flex-wrap p-3 border border-border rounded-lg bg-muted/30">
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-emerald-600 font-medium">✓ {counts.ok} OK</span>
                  <span className="text-amber-600 font-medium">⚠ {counts.warn} avertissements</span>
                  <span className="text-destructive font-medium">✗ {counts.err} erreurs</span>
                  <span className="text-muted-foreground">→ {importable.length} à importer</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Switch id="skip-err" checked={skipErrors} onCheckedChange={setSkipErrors} />
                    <Label htmlFor="skip-err" className="text-xs cursor-pointer">Ignorer les erreurs</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="update-existing" checked={updateExisting} onCheckedChange={setUpdateExisting} />
                    <Label htmlFor="update-existing" className="text-xs cursor-pointer">MAJ existants</Label>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadReport} className="gap-1 h-8">
                    <Download className="h-3 w-3" /> Rapport
                  </Button>
                  <Button variant="ghost" size="sm" onClick={reset}>
                    <X className="h-4 w-4 mr-1" /> Recharger
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={rows.every(r => r.selected)}
                  onCheckedChange={(c) => toggleAll(!!c)}
                  id="select-all"
                />
                <Label htmlFor="select-all" className="cursor-pointer text-xs">
                  Tout sélectionner ({rows.length})
                </Label>
              </div>

              <div className="flex-1 overflow-auto border border-border rounded-lg">
                <TooltipProvider delayDuration={150}>
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="p-2 w-10"></th>
                        <th className="p-2 w-10"></th>
                        <th className="p-2 w-14"></th>
                        <th className="p-2 text-left">Nom</th>
                        <th className="p-2 text-left">SKU</th>
                        <th className="p-2 text-left">Catégorie</th>
                        <th className="p-2 text-right">Prix</th>
                        <th className="p-2 text-right">Stock</th>
                        <th className="p-2 text-center">Existe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr
                          key={i}
                          className={cn(
                            'border-t border-border hover:bg-muted/30',
                            r.status === 'error' && 'bg-destructive/5',
                            r.status === 'warning' && 'bg-amber-500/5',
                          )}
                        >
                          <td className="p-2">
                            <Checkbox checked={r.selected} onCheckedChange={() => toggleOne(i)} />
                          </td>
                          <td className="p-2 text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex">
                                  {r.status === 'ok' && <Check className="h-4 w-4 text-emerald-600" />}
                                  {r.status === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                                  {r.status === 'error' && <X className="h-4 w-4 text-destructive" />}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                {r.errors.length === 0 && r.warnings.length === 0
                                  ? <span>Aucun problème détecté</span>
                                  : (
                                    <ul className="text-xs space-y-0.5">
                                      {r.errors.map((e, ix) => <li key={'e' + ix} className="text-destructive">✗ {e}</li>)}
                                      {r.warnings.map((w, ix) => <li key={'w' + ix} className="text-amber-500">⚠ {w}</li>)}
                                    </ul>
                                  )}
                              </TooltipContent>
                            </Tooltip>
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
                            ) : <>{r.price}€</>}
                          </td>
                          <td className="p-2 text-right">{r.stock}</td>
                          <td className="p-2 text-center">
                            {r.exists ? (
                              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400">Oui</span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">Nouveau</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TooltipProvider>
              </div>

              {importing && (
                <div className="text-xs text-muted-foreground text-center">
                  Import en cours… {progress}%
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>Annuler</Button>
          <Button onClick={handleImport} disabled={rows.length === 0 || importing || importable.length === 0}>
            {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Importer {importable.length > 0 ? `(${importable.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
