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
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load sessions + polling (realtime disabled for PII protection)
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data, error } = await supabase
        .from('visitor_sessions')
        .select('session_id, user_id, started_at, last_seen_at, device, landing_path, referrer')
        .order('last_seen_at', { ascending: false })
        .limit(100);
      if (alive) { if (error) setLoadError(error.message); else { setLoadError(null); setSessions((data || []) as Session[]); } }
    };
    load();
    const poll = setInterval(load, 10_000);
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => {
      alive = false;
      clearInterval(poll);
      clearInterval(t);
    };
  }, []);

  // Historique agrégé depuis le 1er septembre 2026. Lecture seule et pagination explicite.
  const [history, setHistory] = useState<{ visits: number; signedIn: number; pageViews: number; pages: { path: string; count: number }[]; complete: boolean } | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    const since = '2026-09-01T00:00:00.000Z';
    const readPages = async (table: 'visitor_sessions' | 'page_views', columns: string, timeColumn: string) => {
      const all: Record<string, unknown>[] = [];
      let complete = false;
      for (let offset = 0; offset < 20000; offset += 1000) {
        const { data, error } = await supabase.from(table).select(columns).gte(timeColumn, since).order(timeColumn, { ascending: true }).range(offset, offset + 999);
        if (error) throw error;
        const batch = (data || []) as Record<string, unknown>[];
        all.push(...batch);
        if (batch.length < 1000) { complete = true; break; }
      }
      return { all, complete };
    };
    const loadHistory = async () => {
      try {
        const [s, v] = await Promise.all([
          readPages('visitor_sessions', 'session_id,user_id,started_at', 'started_at'),
          readPages('page_views', 'path,viewed_at', 'viewed_at'),
        ]);
        const pages = new Map<string, number>();
        v.all.forEach(row => { const p = String(row.path || '/'); pages.set(p, (pages.get(p) || 0) + 1); });
        if (alive) {
          setHistory({
            visits: new Set(s.all.map(row => String(row.session_id))).size,
            signedIn: new Set(s.all.filter(row => row.user_id).map(row => String(row.user_id))).size,
            pageViews: v.all.length,
            pages: [...pages.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([path, count]) => ({ path, count })),
            complete: s.complete && v.complete,
          });
          setHistoryError(null);
        }
      } catch (e) { if (alive) setHistoryError(e instanceof Error ? e.message : 'Historique indisponible'); }
      finally { if (alive) setHistoryLoading(false); }
    };
    void loadHistory();
    const timer = window.setInterval(() => void loadHistory(), 60000);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);

  // Selected session details + polling
  useEffect(() => {
    if (!selected) {
      setViews([]);
      setClicks([]);
      return;
    }
    let alive = true;
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
      if (!alive) return;
      setViews((v.data as PageView[]) || []);
      setClicks((c.data as ClickEvent[]) || []);
    };
    load();
    const poll = setInterval(load, 8_000);
    return () => {
      alive = false;
      clearInterval(poll);
    };
  }, [selected]);

  const onlineSessions = useMemo(
    () => sessions.filter((s) => now - new Date(s.last_seen_at).getTime() < ONLINE_THRESHOLD_MS),
    [sessions, now]
  );

  const last24h = sessions.filter(s => now - new Date(s.started_at).getTime() < 86400_000).length;
  const totalLoaded = sessions.length;
  const deviceCounts = ['mobile', 'desktop', 'tablet'].map(device => ({ device, count: sessions.filter(s => s.device === device).length }));
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
    <div className="min-w-0 space-y-4 rounded-2xl bg-[#080f20] p-4 text-white lg:p-6 [&_.bg-card]:!bg-[#111c32] [&_.border]:!border-white/10 [&_.text-muted-foreground]:!text-slate-400 [&_.text-card-foreground]:!text-white [&_.text-foreground]:!text-white [&_.text-primary]:!text-cyan-300 [&_.bg-muted]:!bg-[#24334e] [&_.bg-secondary]:!bg-[#24334e] [&_.border-border]:!border-white/10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Live</h1>
          <p className="text-sm text-muted-foreground">Visiteurs et parcours en temps réel</p>
        </div>
        <Badge variant="outline" className="gap-2 text-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          {onlineSessions.length} en ligne
        </Badge>
      </div>

      <section className="rounded-2xl border border-cyan-400/20 bg-[#111c32] p-4">
        <h2 className="mb-3 text-base font-bold text-cyan-300">Historique depuis septembre 2026</h2>
        {historyError && <p role="alert" className="text-xs text-rose-300">Historique indisponible : {historyError}</p>}
        {historyLoading && <p className="text-xs text-slate-400">Chargement de l'historique…</p>}
        {history && <><div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[{label:'Visites enregistrées',value:history.visits,color:'text-violet-300'},{label:'Utilisateurs identifiés',value:history.signedIn,color:'text-cyan-300'},{label:'Pages consultées',value:history.pageViews,color:'text-pink-300'},{label:'Pages différentes',value:history.pages.length,color:'text-orange-300'}].map(k=><div key={k.label} className="rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-xs text-slate-300">{k.label}</p><p className={`mt-1 text-2xl font-black ${k.color}`}>{k.value.toLocaleString('fr-FR')}{!history.complete ? '+' : ''}</p></div>)}
        </div><h3 className="mb-2 mt-4 text-sm font-bold">Pages les plus consultées</h3><div className="grid gap-2 md:grid-cols-2">{history.pages.map((p,i)=><div key={p.path} className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs"><span className="min-w-0 truncate">{i+1}. {p.path}</span><b className="text-cyan-300">{p.count}</b></div>)}</div>
        <p className="mt-3 text-[11px] text-slate-400">{history.complete ? 'Historique des événements disponibles depuis le 1er septembre 2026.' : 'Résultats partiels : plafond de 20 000 événements par source atteint.'} Les visites sont des sessions enregistrées, pas nécessairement des personnes uniques. Les visiteurs anonymes ne sont pas identifiables. Les événements non collectés avant l’activation du suivi ne peuvent pas être reconstruits.</p></>}
      </section>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-[#111c32] text-white border-white/10">
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider flex items-center gap-2"><Users className="h-3.5 w-3.5" />En ligne</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{onlineSessions.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider flex items-center gap-2"><Eye className="h-3.5 w-3.5" />Sessions 24h</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{last24h}</div><p className="text-[10px] text-slate-400">Parmi les 100 dernières sessions chargées</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider flex items-center gap-2"><Activity className="h-3.5 w-3.5" />Auth</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{sessions.filter(s => s.user_id).length}</div><p className="text-[10px] text-slate-400">Parmi les sessions chargées</p></CardContent>
        </Card>
      </div>

      <Card className="border-white/10 bg-gradient-to-r from-violet-700/20 via-cyan-700/15 to-pink-700/20 text-white"><CardContent className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
        <div><p className="text-xs text-slate-400">Sessions chargées</p><p className="text-xl font-bold text-violet-300">{totalLoaded}</p></div>
        {deviceCounts.map(d => <div key={d.device}><p className="text-xs capitalize text-slate-400">{d.device}</p><p className="text-xl font-bold text-cyan-300">{d.count}</p></div>)}
      </CardContent></Card>
      {loadError && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">Données live indisponibles : {loadError}</p>}
      <p className="text-[11px] text-slate-400">Actualisation toutes les 10 secondes · en ligne = activité dans la dernière minute · liste limitée aux 100 sessions récentes, pas au total historique depuis le lancement.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1 bg-[#111c32] text-white border-white/10">
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
                        className={`w-full text-left px-4 py-3 text-white hover:bg-white/10 transition-colors ${selected === s.session_id ? 'bg-white/15' : ''}`}
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

        <Card className="lg:col-span-2 bg-[#111c32] text-white border-white/10">
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
