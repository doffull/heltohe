import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Eye, MousePointer, Users, Smartphone, Monitor, Tablet } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Session {
  session_id: string;
  user_id: string | null;
  started_at: string;
  last_seen_at: string;
  device: string | null;
  landing_path: string | null;
  referrer: string | null;
}
interface PageView {
  id: string;
  session_id: string;
  path: string;
  title: string | null;
  viewed_at: string;
  duration_ms: number | null;
}
interface ClickEvent {
  id: string;
  session_id: string;
  path: string;
  element_label: string | null;
  clicked_at: string;
}

const ONLINE_THRESHOLD_MS = 60_000;

export default function AdminLive() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [views, setViews] = useState<PageView[]>([]);
  const [clicks, setClicks] = useState<ClickEvent[]>([]);
  const [now, setNow] = useState(Date.now());

  // Load + realtime
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from('visitor_sessions')
        .select('session_id, user_id, started_at, last_seen_at, device, landing_path, referrer')
        .order('last_seen_at', { ascending: false })
        .limit(100);
      if (alive && data) setSessions(data as Session[]);
    };
    load();
    const ch = supabase
      .channel('live-visitors')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitor_sessions' }, () => load())
      .subscribe();
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => {
      alive = false;
      supabase.removeChannel(ch);
      clearInterval(t);
    };
  }, []);

  // Selected session details
  useEffect(() => {
    if (!selected) {
      setViews([]);
      setClicks([]);
      return;
    }
    const load = async () => {
      const [v, c] = await Promise.all([
        supabase
          .from('page_views')
          .select('*')
          .eq('session_id', selected)
          .order('viewed_at', { ascending: true })
          .limit(200),
        supabase
          .from('click_events')
          .select('*')
          .eq('session_id', selected)
          .order('clicked_at', { ascending: true })
          .limit(200),
      ]);
      setViews((v.data as PageView[]) || []);
      setClicks((c.data as ClickEvent[]) || []);
    };
    load();
    const ch = supabase
      .channel(`live-detail-${selected}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'page_views', filter: `session_id=eq.${selected}` },
        () => load()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'click_events', filter: `session_id=eq.${selected}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [selected]);

  const onlineSessions = useMemo(
    () => sessions.filter((s) => now - new Date(s.last_seen_at).getTime() < ONLINE_THRESHOLD_MS),
    [sessions, now]
  );

  const topPaths = useMemo(() => {
    const map = new Map<string, number>();
    sessions.slice(0, 50).forEach((s) => {
      if (s.landing_path) map.set(s.landing_path, (map.get(s.landing_path) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [sessions]);

  const timeline = useMemo(() => {
    const items = [
      ...views.map((v) => ({ kind: 'view' as const, time: v.viewed_at, label: v.path, title: v.title || '' })),
      ...clicks.map((c) => ({
        kind: 'click' as const,
        time: c.clicked_at,
        label: c.element_label || '',
        title: c.path,
      })),
    ];
    items.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    return items;
  }, [views, clicks]);

  const DeviceIcon = ({ d }: { d: string | null }) =>
    d === 'mobile' ? <Smartphone className="h-3.5 w-3.5" /> : d === 'tablet' ? <Tablet className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5" />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight uppercase">Live</h1>
          <p className="text-sm text-muted-foreground">Visiteurs et parcours en temps réel</p>
        </div>
        <Badge variant="outline" className="gap-2 text-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          {onlineSessions.length} en ligne
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider flex items-center gap-2"><Users className="h-3.5 w-3.5" />En ligne</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{onlineSessions.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider flex items-center gap-2"><Eye className="h-3.5 w-3.5" />Sessions 24h</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{sessions.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider flex items-center gap-2"><Activity className="h-3.5 w-3.5" />Auth</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{sessions.filter(s => s.user_id).length}</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-sm uppercase tracking-wider">Visiteurs</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <ul className="divide-y divide-border">
                {sessions.map((s) => {
                  const online = now - new Date(s.last_seen_at).getTime() < ONLINE_THRESHOLD_MS;
                  return (
                    <li key={s.session_id}>
                      <button
                        onClick={() => setSelected(s.session_id)}
                        className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${selected === s.session_id ? 'bg-muted' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${online ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                            <DeviceIcon d={s.device} />
                            <span className="text-xs font-mono truncate">{s.session_id.slice(0, 8)}</span>
                            {s.user_id && <Badge variant="secondary" className="text-[9px] h-4 px-1">AUTH</Badge>}
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatDistanceToNow(new Date(s.last_seen_at), { addSuffix: false, locale: fr })}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate mt-1">{s.landing_path || '/'}</div>
                      </button>
                    </li>
                  );
                })}
                {sessions.length === 0 && <li className="p-6 text-xs text-muted-foreground text-center">Aucun visiteur récent</li>}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider flex items-center justify-between">
              <span>Parcours</span>
              {selected && <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>Fermer</Button>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <div className="space-y-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Top pages d'entrée</div>
                <ul className="space-y-2">
                  {topPaths.map(([p, n]) => (
                    <li key={p} className="flex items-center justify-between text-sm border-b border-border py-2">
                      <span className="font-mono truncate">{p}</span>
                      <Badge variant="outline">{n}</Badge>
                    </li>
                  ))}
                  {topPaths.length === 0 && <li className="text-xs text-muted-foreground">—</li>}
                </ul>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <ol className="relative border-l border-border ml-3 space-y-3 pr-2">
                  {timeline.map((it, i) => (
                    <li key={i} className="ml-4">
                      <span className={`absolute -left-[6px] mt-1.5 h-3 w-3 rounded-full border border-background ${it.kind === 'view' ? 'bg-foreground' : 'bg-emerald-500'}`} />
                      <div className="flex items-start gap-2">
                        {it.kind === 'view' ? <Eye className="h-3 w-3 mt-1 text-muted-foreground" /> : <MousePointer className="h-3 w-3 mt-1 text-emerald-600" />}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{it.label || '—'}</div>
                          {it.title && <div className="text-[11px] text-muted-foreground truncate">{it.title}</div>}
                          <div className="text-[10px] text-muted-foreground font-mono">{new Date(it.time).toLocaleTimeString('fr-FR')}</div>
                        </div>
                      </div>
                    </li>
                  ))}
                  {timeline.length === 0 && <li className="text-xs text-muted-foreground ml-4">Aucune activité enregistrée</li>}
                </ol>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
