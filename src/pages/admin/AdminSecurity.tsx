import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldAlert, RefreshCw, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

type Snapshot = {
  score: number;
  tablesWithoutRls: { table: string }[];
  functionsWithoutSearchPath: { function: string }[];
  recentErrors: { message: string; occurrences: number; last_seen: string }[];
  failedLogins24h: number;
  criticalRpcs: Record<string, boolean>;
  generatedAt: string;
};

export default function AdminSecurity() {
  const { data, isLoading, refetch, isFetching, error } = useQuery({
    queryKey: ['security-snapshot'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('security_audit_snapshot' as any);
      if (error) throw error;
      return data as unknown as Snapshot;
    },
    refetchOnWindowFocus: false,
  });

  const score = data?.score ?? 0;
  const scoreColor =
    score >= 80 ? 'text-green-500' : score >= 50 ? 'text-amber-500' : 'text-red-500';
  const ScoreIcon = score >= 80 ? ShieldCheck : ShieldAlert;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold hud-text">SÉCURITÉ</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vue d'ensemble continue de l'état de sécurité du backend.
          </p>
        </div>
        <Button onClick={() => refetch()} disabled={isFetching} variant="outline" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Re-scan
        </Button>
      </div>

      {error && (
        <Card className="p-4 border-destructive">
          <p className="text-sm text-destructive">
            Impossible de charger l'audit : {(error as Error).message}
          </p>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center gap-4">
          <ScoreIcon className={`h-12 w-12 ${scoreColor}`} />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Score global</p>
            <p className={`text-4xl font-bold ${scoreColor}`}>{isLoading ? '…' : score}/100</p>
            {data && (
              <p className="text-xs text-muted-foreground mt-1">
                Généré {new Date(data.generatedAt).toLocaleString('fr-FR')}
              </p>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <h2 className="font-bold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Tables sans RLS
          </h2>
          {data?.tablesWithoutRls.length ? (
            <div className="flex flex-wrap gap-1.5">
              {data.tablesWithoutRls.map((t) => (
                <Badge key={t.table} variant="outline" className="text-red-500 border-red-500/30">
                  {t.table}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-green-500 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Toutes les tables sont protégées
            </p>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="font-bold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Fonctions sans search_path
          </h2>
          {data?.functionsWithoutSearchPath.length ? (
            <div className="flex flex-wrap gap-1.5">
              {data.functionsWithoutSearchPath.map((f) => (
                <Badge key={f.function} variant="outline" className="text-amber-500 border-amber-500/30">
                  {f.function}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-green-500 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Toutes les fonctions sont sécurisées
            </p>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="font-bold mb-3">Tentatives de connexion échouées (24h)</h2>
          <p className={`text-3xl font-bold ${(data?.failedLogins24h ?? 0) > 20 ? 'text-red-500' : 'text-foreground'}`}>
            {data?.failedLogins24h ?? '…'}
          </p>
        </Card>

        <Card className="p-4">
          <h2 className="font-bold mb-3">Fonctions critiques</h2>
          <div className="space-y-1.5">
            {data?.criticalRpcs && Object.entries(data.criticalRpcs).map(([name, exists]) => (
              <div key={name} className="flex items-center gap-2 text-sm">
                {exists ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <code className="text-xs">{name}</code>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="font-bold mb-3">Erreurs JS récentes (7 jours)</h2>
        {data?.recentErrors.length ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {data.recentErrors.map((e, i) => (
              <div key={i} className="border-b border-border/50 py-2 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <code className="text-xs break-all flex-1">{e.message}</code>
                  <Badge variant="outline">{e.occurrences}×</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Dernière : {new Date(e.last_seen).toLocaleString('fr-FR')}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-green-500 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Aucune erreur récente
          </p>
        )}
      </Card>
    </div>
  );
}
