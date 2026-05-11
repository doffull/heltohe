import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Trash2, Copy, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface ErrorLog {
  id: string;
  created_at: string;
  source: string;
  label: string | null;
  message: string | null;
  stack: string | null;
  component_stack: string | null;
  url: string | null;
  user_agent: string | null;
  viewport: string | null;
  pixel_ratio: number | null;
  console_tail: any;
  extra: any;
}

function browserFromUA(ua: string | null): string {
  if (!ua) return '—';
  if (/SamsungBrowser/i.test(ua)) return 'Samsung Internet';
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/Firefox/i.test(ua)) return 'Firefox';
  if (/OPR|Opera/i.test(ua)) return 'Opera';
  if (/Chrome/i.test(ua)) return 'Chrome';
  if (/Safari/i.test(ua)) return 'Safari';
  return ua.slice(0, 40);
}

export default function AdminErrorLogs() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ErrorLog | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('client_error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) toast.error('Erreur chargement: ' + error.message);
    else setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from('client_error_logs').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Supprimé');
      setSelected(null);
      load();
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Supprimer tous les logs d\'erreurs ?')) return;
    const { error } = await (supabase as any)
      .from('client_error_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) toast.error(error.message);
    else { toast.success('Tous les logs supprimés'); load(); }
  };

  const copyLog = (log: ErrorLog) => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    toast.success('Copié dans le presse-papier');
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Erreurs Client</h1>
          <p className="text-sm text-muted-foreground">
            Crashes capturés automatiquement (HeroErrorBoundary, erreurs globales, promesses non gérées).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button variant="destructive" size="sm" onClick={handleClearAll} disabled={!logs.length}>
            <Trash2 className="h-4 w-4 mr-1" /> Vider
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* List */}
        <div className="border rounded-md overflow-hidden">
          <div className="max-h-[70vh] overflow-y-auto">
            {logs.length === 0 && !loading && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Aucune erreur enregistrée. 🎉
              </div>
            )}
            {logs.map((log) => (
              <button
                key={log.id}
                onClick={() => setSelected(log)}
                className={`w-full text-left p-3 border-b hover:bg-muted/50 transition flex items-start gap-2 ${
                  selected?.id === log.id ? 'bg-muted' : ''
                }`}
              >
                <ChevronRight className="h-4 w-4 mt-1 flex-shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">{log.source}</Badge>
                    {log.label && <Badge variant="secondary" className="text-xs">{log.label}</Badge>}
                    <Badge className="text-xs">{browserFromUA(log.user_agent)}</Badge>
                    <span className="text-xs text-muted-foreground">{log.viewport}</span>
                  </div>
                  <p className="text-sm font-mono mt-1 truncate">{log.message || '(no message)'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(log.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="border rounded-md p-4 max-h-[70vh] overflow-y-auto">
          {!selected ? (
            <p className="text-sm text-muted-foreground">Sélectionne une erreur pour voir les détails.</p>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => copyLog(selected)}>
                  <Copy className="h-3 w-3 mr-1" /> Copier JSON
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(selected.id)}>
                  <Trash2 className="h-3 w-3 mr-1" /> Supprimer
                </Button>
              </div>
              <Section label="Date">{new Date(selected.created_at).toLocaleString('fr-FR')}</Section>
              <Section label="Source">{selected.source}{selected.label ? ` / ${selected.label}` : ''}</Section>
              <Section label="URL"><code className="break-all">{selected.url}</code></Section>
              <Section label="Navigateur">{browserFromUA(selected.user_agent)}</Section>
              <Section label="User-Agent"><code className="text-xs break-all">{selected.user_agent}</code></Section>
              <Section label="Viewport">{selected.viewport} (DPR {selected.pixel_ratio})</Section>
              <Section label="Message"><pre className="whitespace-pre-wrap font-mono text-xs bg-muted p-2 rounded">{selected.message}</pre></Section>
              {selected.stack && (
                <Section label="Stack">
                  <pre className="whitespace-pre-wrap font-mono text-xs bg-muted p-2 rounded max-h-64 overflow-auto">{selected.stack}</pre>
                </Section>
              )}
              {selected.component_stack && (
                <Section label="Component Stack">
                  <pre className="whitespace-pre-wrap font-mono text-xs bg-muted p-2 rounded max-h-64 overflow-auto">{selected.component_stack}</pre>
                </Section>
              )}
              {Array.isArray(selected.console_tail) && selected.console_tail.length > 0 && (
                <Section label={`Console (${selected.console_tail.length} dernières lignes)`}>
                  <pre className="whitespace-pre-wrap font-mono text-xs bg-muted p-2 rounded max-h-64 overflow-auto">
                    {selected.console_tail.map((c: any, i: number) =>
                      `[${c.level}] ${(c.args || []).join(' ')}`
                    ).join('\n')}
                  </pre>
                </Section>
              )}
              {selected.extra && (
                <Section label="Extra">
                  <pre className="whitespace-pre-wrap font-mono text-xs bg-muted p-2 rounded max-h-48 overflow-auto">{JSON.stringify(selected.extra, null, 2)}</pre>
                </Section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div>{children}</div>
    </div>
  );
}
