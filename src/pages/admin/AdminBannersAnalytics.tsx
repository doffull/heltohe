import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, BarChart3 } from 'lucide-react';

interface Row {
  banner_id: string;
  banner_type: string;
  event: string;
}

export default function AdminBannersAnalytics() {
  const { data, isLoading, isError, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['banner-analytics-30d'],
    refetchInterval: 30000,
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86400_000).toISOString();
      const { data, error } = await supabase
        .from('banner_analytics')
        .select('banner_id, banner_type, event')
        .gte('created_at', since)
        .limit(10000);
      if (error) throw error;
      return data as Row[];
    },
  });

  const agg = (data || []).reduce<Record<string, { type: string; views: number; clicks: number; dismisses: number; conversions: number }>>(
    (acc, r) => {
      const key = r.banner_id;
      acc[key] ||= { type: r.banner_type, views: 0, clicks: 0, dismisses: 0, conversions: 0 };
      if (r.event === 'view') acc[key].views++;
      else if (r.event === 'click') acc[key].clicks++;
      else if (r.event === 'dismiss') acc[key].dismisses++;
      else if (r.event === 'convert') acc[key].conversions++;
      return acc;
    },
    {},
  );

  const rows = Object.entries(agg).sort((a, b) => b[1].views - a[1].views);
  const total = rows.reduce((acc, [, v]) => ({ views: acc.views + v.views, clicks: acc.clicks + v.clicks, dismisses: acc.dismisses + v.dismisses, conversions: acc.conversions + v.conversions }), { views: 0, clicks: 0, dismisses: 0, conversions: 0 });

  return (
    <div className="min-w-0 space-y-4 rounded-2xl bg-[#080f20] p-4 text-white md:p-6">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2"><BarChart3 className="h-6 w-6" /> Analytique bannières</h1>
        <p className="text-sm text-muted-foreground">Performance des bannières et pop-ups (30 derniers jours).</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-slate-400">30 derniers jours · actualisation toutes les 30 s · {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('fr-FR') : 'En attente'}</p><button type="button" onClick={() => void refetch()} className="rounded-lg border border-white/15 bg-[#17243d] px-3 py-2 text-xs hover:bg-[#243657]">↻ Actualiser</button></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[{label:'Affichages',value:total.views,color:'from-violet-600/40 to-violet-950/20'},{label:'Clics',value:total.clicks,color:'from-blue-600/40 to-blue-950/20'},{label:'Taux de clics',value:total.views ? (total.clicks / total.views * 100).toFixed(1) + '%' : '—',color:'from-pink-600/40 to-pink-950/20'},{label:'Conversions suivies',value:total.conversions,color:'from-orange-600/40 to-orange-950/20'}].map(k=><div key={k.label} className={`rounded-2xl border border-white/10 bg-gradient-to-br ${k.color} p-4`}><p className="text-xs text-slate-300">{k.label}</p><p className="mt-2 text-2xl font-black">{isError ? '—' : k.value}</p></div>)}
      </div>
      {isError && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">Impossible de charger les événements : {error instanceof Error ? error.message : 'erreur inconnue'}</p>}
      <Card className="border-white/10 bg-[#111c32] text-white">
        <CardHeader><CardTitle>Performances par bannière</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-400 py-10 text-center">Aucun événement enregistré sur les 30 derniers jours. Vérifier que les bannières et pop-ups émettent bien des événements de vue et de clic.</p>
          ) : (
            <div className="max-w-full overflow-x-auto"><Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bannière</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Vues</TableHead>
                  <TableHead className="text-right">Clics</TableHead>
                  <TableHead className="text-right">Fermetures</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">Conversions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(([id, s]) => {
                  const ctr = s.views > 0 ? ((s.clicks / s.views) * 100).toFixed(1) : '0.0';
                  return (
                    <TableRow key={id}>
                      <TableCell className="font-mono text-xs">{id}</TableCell>
                      <TableCell><span className="text-xs px-2 py-0.5 rounded bg-muted">{s.type}</span></TableCell>
                      <TableCell className="text-right tabular-nums">{s.views}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.clicks}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{s.dismisses}</TableCell>
                      <TableCell className="text-right tabular-nums">{ctr}%</TableCell>
                      <TableCell className="text-right tabular-nums text-primary">{s.conversions}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table></div>
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-slate-400">Les conversions représentent uniquement les événements « convert » enregistrés, pas des ventes attribuées ou des inscriptions newsletter vérifiées. Données limitées aux 10 000 premiers événements de la requête.</p>
    </div>
  );
}
