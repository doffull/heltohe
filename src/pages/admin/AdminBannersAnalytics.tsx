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
  const { data, isLoading } = useQuery({
    queryKey: ['banner-analytics-30d'],
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

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6" /> Analytique bannières</h1>
        <p className="text-sm text-muted-foreground">Performance des bannières et pop-ups (30 derniers jours).</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Performances par bannière</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">Aucun événement enregistré pour le moment.</p>
          ) : (
            <Table>
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
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
