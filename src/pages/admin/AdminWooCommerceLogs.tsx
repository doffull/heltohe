import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { RefreshCw, Eye, AlertCircle, CheckCircle2, XCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface SyncLog {
  id: string;
  correlation_id: string | null;
  created_at: string;
  direction: 'import' | 'export';
  status: 'success' | 'partial' | 'failed';
  total: number;
  succeeded: number;
  failed: number;
  message: string | null;
  details: any;
  triggered_by: string | null;
}

const statusVariant: Record<SyncLog['status'], { variant: any; icon: any; label: string }> = {
  success: { variant: 'default', icon: CheckCircle2, label: 'Succès' },
  partial: { variant: 'secondary', icon: AlertCircle, label: 'Partiel' },
  failed: { variant: 'destructive', icon: XCircle, label: 'Échec' },
};

export default function AdminWooCommerceLogs() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SyncLog | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('wp_sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) toast.error('Erreur chargement: ' + error.message);
    else setLogs((data || []) as SyncLog[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Deep link: ?cid=<correlation_id> ou ?logId=<row id>
  useEffect(() => {
    if (!logs.length) return;
    const params = new URLSearchParams(window.location.search);
    const cid = params.get('cid');
    const logId = params.get('logId');
    if (cid) {
      const match = logs.find((l) => l.correlation_id === cid);
      if (match) setSelected(match);
    } else if (logId) {
      const match = logs.find((l) => l.id === logId);
      if (match) setSelected(match);
    }
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (direction !== 'all' && l.direction !== direction) return false;
      if (status !== 'all' && l.status !== status) return false;
      if (search && !(l.message || '').toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [logs, direction, status, search]);

  const purgeOld = async () => {
    if (!confirm('Supprimer les logs de plus de 30 jours ?')) return;
    const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { error } = await (supabase as any).from('wp_sync_logs').delete().lt('created_at', cutoff);
    if (error) toast.error(error.message);
    else { toast.success('Logs anciens supprimés'); load(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground mb-1">// DIAGNOSTIC</p>
          <h2 className="text-lg lg:text-xl font-bold uppercase hud-text">Logs de synchronisation</h2>
          <p className="text-xs text-muted-foreground">Historique des imports WooCommerce — statut, totaux, erreurs.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Rafraîchir
          </Button>
          <Button variant="outline" size="sm" onClick={purgeOld}>Purger &gt; 30j</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-end">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Direction</p>
          <Select value={direction} onValueChange={setDirection}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="import">Import</SelectItem>
              <SelectItem value="export">Export</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Statut</p>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="success">Succès</SelectItem>
              <SelectItem value="partial">Partiel</SelectItem>
              <SelectItem value="failed">Échec</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 flex-1 min-w-[200px]">
          <p className="text-xs text-muted-foreground">Recherche (message)</p>
          <Input placeholder="ex: 404, network, timeout…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>ID corrélation</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">OK / KO / Total</TableHead>
              <TableHead>Message</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                  Aucun log à afficher. Lance une synchro pour générer des entrées.
                </TableCell>
              </TableRow>
            )}
          <TableBody>
            {filtered.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                  Aucun log à afficher. Lance une synchro pour générer des entrées.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((l) => {
              const meta = statusVariant[l.status];
              const Icon = meta.icon;
              return (
                <TableRow key={l.id} className="cursor-pointer" onClick={() => setSelected(l)}>
                  <TableCell className="text-xs font-mono">{new Date(l.created_at).toLocaleString('fr-FR')}</TableCell>
                  <TableCell><Badge variant="outline" className="uppercase text-[10px]">{l.direction}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={meta.variant} className="gap-1">
                      <Icon className="h-3 w-3" /> {meta.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    <span className="text-green-500">{l.succeeded}</span> / <span className="text-destructive">{l.failed}</span> / {l.total}
                  </TableCell>
                  <TableCell className="max-w-md truncate text-xs text-muted-foreground">{l.message || '—'}</TableCell>
                  <TableCell><Eye className="h-4 w-4 text-muted-foreground" /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Details dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails de la synchro</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-muted-foreground">Date :</span> {new Date(selected.created_at).toLocaleString('fr-FR')}</div>
                <div><span className="text-muted-foreground">Direction :</span> {selected.direction}</div>
                <div><span className="text-muted-foreground">Statut :</span> {statusVariant[selected.status].label}</div>
                <div><span className="text-muted-foreground">Totaux :</span> {selected.succeeded} OK / {selected.failed} KO / {selected.total}</div>
              </div>
              {selected.message && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Message</p>
                  <pre className="bg-muted p-2 rounded text-xs whitespace-pre-wrap">{selected.message}</pre>
                </div>
              )}
              {Array.isArray(selected.details?.errors) && selected.details.errors.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Erreurs ({selected.details.errors.length})</p>
                  <pre className="bg-muted p-2 rounded text-xs whitespace-pre-wrap max-h-64 overflow-auto">
                    {selected.details.errors.map((e: string, i: number) => `${i + 1}. ${e}`).join('\n')}
                  </pre>
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Détails bruts</p>
                <pre className="bg-muted p-2 rounded text-xs whitespace-pre-wrap max-h-64 overflow-auto">{JSON.stringify(selected.details, null, 2)}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
