import { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Loader2, Upload, Download, ShoppingBag } from 'lucide-react';
import { edgeErrorMessage } from '@/lib/edgeFunctionError';

type Row = Record<string, string>;

interface ParsedCustomer {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
  country: string;
}

/** Détection tolérante des colonnes (français / anglais / export WooCommerce). */
const FIELD_ALIASES: Record<keyof ParsedCustomer, string[]> = {
  email: ['email', 'e-mail', 'mail', 'adresse e-mail', 'billing_email', 'customer_email'],
  first_name: ['first_name', 'firstname', 'prenom', 'prénom', 'billing_first_name'],
  last_name: ['last_name', 'lastname', 'nom', 'nom de famille', 'billing_last_name'],
  phone: ['phone', 'telephone', 'téléphone', 'tel', 'mobile', 'billing_phone'],
  address: ['address', 'adresse', 'address_1', 'billing_address_1', 'rue'],
  city: ['city', 'ville', 'billing_city'],
  zip: ['zip', 'postcode', 'code postal', 'code_postal', 'cp', 'billing_postcode'],
  country: ['country', 'pays', 'billing_country'],
};

const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');

function pick(row: Row, field: keyof ParsedCustomer): string {
  const keys = Object.keys(row);
  for (const alias of FIELD_ALIASES[field]) {
    const hit = keys.find((k) => norm(k) === alias);
    if (hit && row[hit] != null) return String(row[hit]).trim();
  }
  return '';
}

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

function mapRows(rows: Row[]): { valid: ParsedCustomer[]; rejected: { line: number; reason: string; raw: string }[] } {
  const valid: ParsedCustomer[] = [];
  const rejected: { line: number; reason: string; raw: string }[] = [];
  const seen = new Set<string>();

  rows.forEach((row, i) => {
    const email = pick(row, 'email').toLowerCase();
    if (!isEmail(email)) {
      rejected.push({ line: i + 2, reason: 'E-mail manquant ou invalide', raw: JSON.stringify(row).slice(0, 200) });
      return;
    }
    if (seen.has(email)) {
      rejected.push({ line: i + 2, reason: 'Doublon dans le fichier', raw: email });
      return;
    }
    seen.add(email);
    valid.push({
      email,
      first_name: pick(row, 'first_name'),
      last_name: pick(row, 'last_name'),
      phone: pick(row, 'phone'),
      address: pick(row, 'address'),
      city: pick(row, 'city'),
      zip: pick(row, 'zip'),
      country: pick(row, 'country'),
    });
  });

  return { valid, rejected };
}

export function CustomerImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  // La préproduction peut partager la base de données de production.
  // L'analyse des fichiers est autorisée, mais aucune écriture client depuis le preview.
  const isProductionHost = typeof window !== 'undefined' && window.location.hostname === 'helvetica-mp.com';
  const previewOnly = !isProductionHost;
  const [rows, setRows] = useState<ParsedCustomer[]>([]);
  const [rejected, setRejected] = useState<{ line: number; reason: string; raw: string }[]>([]);
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [skipExisting, setSkipExisting] = useState(false);
  const [wooBusy, setWooBusy] = useState(false);

  const reset = () => { setRows([]); setRejected([]); setFileName(''); };

  const handleFile = async (file: File) => {
    setParsing(true);
    reset();
    setFileName(file.name);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let raw: Row[] = [];
      if (ext === 'xls' || ext === 'xlsx') {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        raw = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false }) as Row[];
      } else {
        const text = await file.text();
        const parsed = Papa.parse<Row>(text, { header: true, skipEmptyLines: true });
        raw = (parsed.data || []) as Row[];
      }
      const { valid, rejected } = mapRows(raw);
      setRows(valid);
      setRejected(rejected);
      if (valid.length === 0) {
        toast({ title: 'Aucune ligne exploitable', description: 'Vérifiez la colonne e-mail du fichier.', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Lecture impossible', description: e.message, variant: 'destructive' });
    } finally {
      setParsing(false);
    }
  };

  const runImport = async () => {
    if (previewOnly) { toast({ title: 'Mode test', description: 'Fichier vérifié : aucune donnée client enregistrée.', }); return; }
    if (rows.length === 0) return;
    setImporting(true);
    try {
      const emails = rows.map((r) => r.email);
      const existing = new Set<string>();
      for (let i = 0; i < emails.length; i += 200) {
        const { data } = await supabase.from('customers').select('email').in('email', emails.slice(i, i + 200));
        (data || []).forEach((d: any) => existing.add(String(d.email).toLowerCase()));
      }

      const toWrite = skipExisting ? rows.filter((r) => !existing.has(r.email)) : rows;
      let created = 0;
      let updated = 0;
      const errors: string[] = [];

      for (let i = 0; i < toWrite.length; i += 100) {
        const chunk = toWrite.slice(i, i + 100).map((r) => ({
          email: r.email,
          first_name: r.first_name || null,
          last_name: r.last_name || null,
          phone: r.phone || null,
          address: r.address || null,
          city: r.city || null,
          zip: r.zip || null,
          country: r.country || null,
          source: 'import',
        }));
        const { error } = await supabase.from('customers').upsert(chunk as any, { onConflict: 'email' });
        if (error) errors.push(error.message);
        else {
          chunk.forEach((c) => { if (existing.has(c.email)) updated++; else created++; });
        }
      }

      qc.invalidateQueries({ queryKey: ['admin-customers'] });
      toast({
        title: 'Import terminé',
        description: `${created} nouveau(x) · ${updated} mis à jour · ${rejected.length + (rows.length - toWrite.length)} ignoré(s)${errors.length ? ` · ${errors.length} erreur(s)` : ''}`,
        variant: errors.length ? 'destructive' : undefined,
      });
      if (errors.length === 0) onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Import impossible', description: e.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const downloadReport = () => {
    const csv = Papa.unparse(rejected.map((r) => ({ ligne: r.line, motif: r.reason, contenu: r.raw })));
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clients-ignores.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFromWoo = async () => {
    if (previewOnly) { toast({ title: 'Mode test', description: 'Import WooCommerce désactivé hors production.' }); return; }
    setWooBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('woocommerce-import', {
        body: { importCustomers: true, skipExistingCustomers: skipExisting },
      });
      if (error) throw new Error(await edgeErrorMessage(error));
      const errs: string[] = data?.errors || [];
      qc.invalidateQueries({ queryKey: ['admin-customers'] });
      toast({
        title: 'Import WooCommerce terminé',
        description: `${data?.customers ?? 0} fiche(s) client traitée(s)${errs.length ? ` · ${errs.length} erreur(s)` : ''}`,
        variant: errs.length ? 'destructive' : undefined,
      });
    } catch (e: any) {
      toast({ title: 'Import WooCommerce impossible', description: e.message, variant: 'destructive' });
    } finally {
      setWooBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer des clients</DialogTitle>
          <DialogDescription>
            L'e-mail sert de clé unique : aucun doublon n'est créé. Aucun compte de connexion n'est créé.
          </DialogDescription>
        </DialogHeader>

        {previewOnly && <p role="status" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          Mode test : vous pouvez charger et prévisualiser les fichiers CSV/Excel, mais aucun client ne sera ajouté ou modifié.
        </p>}
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={skipExisting} onCheckedChange={(v) => setSkipExisting(!!v)} />
          Ne pas écraser les fiches existantes
        </label>

        <Tabs defaultValue="file">
          <TabsList className="w-full">
            <TabsTrigger value="file" className="flex-1">Fichier CSV / Excel</TabsTrigger>
            <TabsTrigger value="woo" className="flex-1">WooCommerce</TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="space-y-3 pt-3">
            <input
              type="file"
              accept=".csv,.xls,.xlsx,text/csv"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              className="block w-full text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Colonnes reconnues : e-mail, prénom, nom, téléphone, adresse, ville, code postal, pays.
            </p>

            {parsing && <Loader2 className="h-4 w-4 animate-spin" />}

            {rows.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {fileName} — {rows.length} fiche(s) valide(s), {rejected.length} ignorée(s)
                </p>
                <div className="border border-border rounded overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2">E-mail</th>
                        <th className="text-left p-2">Prénom</th>
                        <th className="text-left p-2">Nom</th>
                        <th className="text-left p-2">Ville</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 10).map((r) => (
                        <tr key={r.email} className="border-t border-border/50">
                          <td className="p-2 font-mono break-all">{r.email}</td>
                          <td className="p-2">{r.first_name}</td>
                          <td className="p-2">{r.last_name}</td>
                          <td className="p-2">{r.city}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={runImport} disabled={importing} className="gap-2">
                    {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {previewOnly ? `Prévisualisation : ${rows.length} client(s)` : `Importer ${rows.length} client(s)`}
                  </Button>
                  {rejected.length > 0 && (
                    <Button variant="outline" onClick={downloadReport} className="gap-2">
                      <Download className="h-4 w-4" /> Rapport des lignes ignorées
                    </Button>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="woo" className="space-y-3 pt-3">
            <p className="text-sm text-muted-foreground">
              Récupère les clients de la boutique WooCommerce connectée dans Admin → WooCommerce.
            </p>
            <Button onClick={importFromWoo} disabled={wooBusy || previewOnly} className="gap-2">
              {wooBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
              Importer depuis WooCommerce
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
