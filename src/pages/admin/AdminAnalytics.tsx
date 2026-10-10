import { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowUpRight, BadgePercent, BarChart3, Download, Layers,
  Package, Pause, Play, RefreshCw, Search, ShoppingCart, TrendingUp, Users, Wallet,
} from 'lucide-react';
import {
  Area, Bar, BarChart, ComposedChart, CartesianGrid, Cell, Legend, Line, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AdminTableScroll } from '@/components/admin/AdminTableScroll';
import { cn } from '@/lib/utils';
import {
  AnalyticsOrder, DateRange, RangeKey, previousYearRange, rangeFor, useAnalyticsData,
} from '@/hooks/useAnalyticsData';

/* ---------------------------------- utils --------------------------------- */

const eur = (n: number) =>
  `${(Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`;
const eur2 = (n: number) =>
  `${(Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const pct = (n: number) => `${(Number(n) || 0).toFixed(1)} %`;

const CHART_COLORS = ['#a855f7', '#3b82f6', '#06b6d4', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6'];

function inRange(o: AnalyticsOrder, r: DateRange) {
  const t = new Date(o.createdAt).getTime();
  return t >= r.from.getTime() && t <= r.to.getTime();
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [cols.join(';'), ...rows.map((r) => cols.map((c) => esc(r[c])).join(';'))].join('\n');
}

function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  const blob = new Blob([`\uFEFF${toCsv(rows)}`], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: '7d', label: '7 jours' },
  { key: 'month', label: 'Ce mois' },
  { key: 'year', label: 'Année' },
  { key: 'custom', label: 'Personnalisé' },
];

/* ------------------------------- KPI card -------------------------------- */

function KpiCard({
  label, value, sub, icon: Icon, delta, accent,
}: {
  label: string; value: string; sub?: string;
  icon: typeof Wallet; delta?: number | null; accent?: string;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-0.5" style={{ backgroundColor: accent || CHART_COLORS[1] }} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
            <p className="mt-2 truncate text-2xl font-semibold tabular-nums">{value}</p>
            {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
          </div>
          <span className="rounded-md border p-2 text-muted-foreground"><Icon className="h-4 w-4" /></span>
        </div>
        {delta !== undefined && delta !== null && Number.isFinite(delta) && (
          <div className={cn('mt-3 flex items-center gap-1 text-xs font-medium', up ? 'text-emerald-600' : 'text-red-600')}>
            {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {pct(Math.abs(delta))} <span className="font-normal text-muted-foreground">vs N-1</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* --------------------------------- page ---------------------------------- */

export default function AdminAnalytics() {
  const { orders, products, demoMode, simulate, setSimulate, loading, refresh } = useAnalyticsData();

  const [rangeKey, setRangeKey] = useState<RangeKey>('7d');
  const [customFrom, setCustomFrom] = useState(() => new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10));
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [compare, setCompare] = useState(true);

  const range = useMemo<DateRange>(() => {
    if (rangeKey === 'custom') {
      const from = new Date(`${customFrom}T00:00:00`);
      const to = new Date(`${customTo}T23:59:59`);
      return { from, to };
    }
    return rangeFor(rangeKey);
  }, [rangeKey, customFrom, customTo]);

  const current = useMemo(() => orders.filter((o) => inRange(o, range)), [orders, range]);
  const previous = useMemo(() => {
    const r = previousYearRange(range);
    return orders.filter((o) => inRange(o, r));
  }, [orders, range]);

  const agg = (list: AnalyticsOrder[]) => {
    const gross = list.reduce((s, o) => s + o.subtotal, 0);
    const discounts = list.reduce((s, o) => s + o.discount, 0);
    const net = list.reduce((s, o) => s + o.total, 0);
    return { gross, discounts, net, count: list.length, aov: list.length ? net / list.length : 0 };
  };
  const cur = agg(current);
  const prev = agg(previous);
  const growth = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : null);

  // Estimation visiteurs pour le taux de conversion
  const sessions = Math.max(cur.count, Math.round(cur.count * 34 + 40));
  const conversion = sessions ? (cur.count / sessions) * 100 : 0;

  /* ---------------------------- séries temporelles ---------------------------- */

  const daily = useMemo(() => {
    const map = new Map<string, { date: string; ca: number; commandes: number; remises: number; ca_n1: number }>();
    const step = 864e5;
    for (let t = new Date(range.from).setHours(0, 0, 0, 0); t <= range.to.getTime(); t += step) {
      const key = new Date(t).toISOString().slice(0, 10);
      map.set(key, { date: key, ca: 0, commandes: 0, remises: 0, ca_n1: 0 });
    }
    current.forEach((o) => {
      const k = o.createdAt.slice(0, 10);
      const row = map.get(k);
      if (row) { row.ca += o.total; row.commandes += 1; row.remises += o.discount; }
    });
    previous.forEach((o) => {
      const d = new Date(o.createdAt);
      d.setFullYear(d.getFullYear() + 1);
      const row = map.get(d.toISOString().slice(0, 10));
      if (row) row.ca_n1 += o.total;
    });
    return [...map.values()].map((r) => ({
      ...r,
      label: new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      ca: Math.round(r.ca),
      remises: Math.round(r.remises),
      ca_n1: Math.round(r.ca_n1),
    }));
  }, [current, previous, range]);

  /* ------------------------------- produits -------------------------------- */

  const productStats = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number; category?: string; productId: string }>();
    current.forEach((o) =>
      o.items.forEach((it) => {
        const key = it.productId || it.name;
        const e = map.get(key) || { name: it.name, qty: 0, revenue: 0, category: it.category, productId: key };
        e.qty += it.quantity;
        e.revenue += it.price * it.quantity;
        if (!e.category && it.category) e.category = it.category;
        map.set(key, e);
      }),
    );
    const stockOf = (id: string, name: string) =>
      products.find((p) => p.id === id)?.stock ?? products.find((p) => p.name === name)?.stock ?? 0;
    const catOf = (id: string, fallback?: string) => products.find((p) => p.id === id)?.category ?? fallback ?? 'Autre';
    return [...map.values()]
      .map((e) => ({ ...e, stock: stockOf(e.productId, e.name), category: catOf(e.productId, e.category) }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [current, products]);

  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    productStats.forEach((p) => map.set(p.category || 'Autre', (map.get(p.category || 'Autre') || 0) + p.revenue));
    return [...map.entries()]
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
  }, [productStats]);

  const variationMatrix = useMemo(() => {
    const sizes = new Set<string>();
    const colors = new Set<string>();
    const map = new Map<string, number>();
    current.forEach((o) =>
      o.items.forEach((it) => {
        const s = it.size || '—';
        const c = it.color || '—';
        sizes.add(s); colors.add(c);
        map.set(`${c}|${s}`, (map.get(`${c}|${s}`) || 0) + it.quantity);
      }),
    );
    const sizeList = [...sizes].sort();
    const colorList = [...colors].sort();
    const max = Math.max(1, ...map.values());
    return { sizeList, colorList, get: (c: string, s: string) => map.get(`${c}|${s}`) || 0, max };
  }, [current]);

  /* -------------------------------- coupons -------------------------------- */

  const [couponSearch, setCouponSearch] = useState('');
  const [couponSort, setCouponSort] = useState<{ key: 'code' | 'uses' | 'discount' | 'net'; dir: 'asc' | 'desc' }>({ key: 'net', dir: 'desc' });
  const [couponPage, setCouponPage] = useState(1);
  const perPage = 8;

  const coupons = useMemo(() => {
    const map = new Map<string, { code: string; uses: number; discount: number; net: number }>();
    current.forEach((o) => {
      if (!o.promoCode) return;
      const e = map.get(o.promoCode) || { code: o.promoCode, uses: 0, discount: 0, net: 0 };
      e.uses += 1; e.discount += o.discount; e.net += o.total;
      map.set(o.promoCode, e);
    });
    let rows = [...map.values()];
    if (couponSearch.trim()) {
      const q = couponSearch.trim().toLowerCase();
      rows = rows.filter((r) => r.code.toLowerCase().includes(q));
    }
    const { key, dir } = couponSort;
    rows.sort((a, b) => {
      const va = key === 'code' ? a.code : a[key];
      const vb = key === 'code' ? b.code : b[key];
      const c = typeof va === 'string' ? String(va).localeCompare(String(vb)) : Number(va) - Number(vb);
      return dir === 'asc' ? c : -c;
    });
    return rows;
  }, [current, couponSearch, couponSort]);

  useEffect(() => { setCouponPage(1); }, [couponSearch, rangeKey]);
  const couponPages = Math.max(1, Math.ceil(coupons.length / perPage));
  const couponRows = coupons.slice((couponPage - 1) * perPage, couponPage * perPage);

  const promoImpact = useMemo(() => {
    const withPromo = current.filter((o) => o.promoCode);
    const days = new Set(withPromo.map((o) => o.createdAt.slice(0, 10)));
    const pendant = current.filter((o) => days.has(o.createdAt.slice(0, 10)));
    const hors = current.filter((o) => !days.has(o.createdAt.slice(0, 10)));
    const avg = (l: AnalyticsOrder[], n: number) => (n ? l.reduce((s, o) => s + o.total, 0) / n : 0);
    const daysHors = new Set(hors.map((o) => o.createdAt.slice(0, 10))).size;
    return [
      { phase: 'Hors promo', ca: Math.round(avg(hors, daysHors || 1)), commandes: hors.length },
      { phase: 'Période promo', ca: Math.round(avg(pendant, days.size || 1)), commandes: pendant.length },
      { phase: 'Coupons utilisés', ca: Math.round(avg(withPromo, days.size || 1)), commandes: withPromo.length },
    ];
  }, [current]);

  /* ------------------------------ live ticker ------------------------------ */

  const liveFeed = useMemo(
    () => [...orders].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 12),
    [orders],
  );
  const todayOrders = useMemo(() => orders.filter((o) => inRange(o, rangeFor('today'))), [orders]);
  const todayCa = todayOrders.reduce((s, o) => s + o.total, 0);

  /* --------------------------------- render -------------------------------- */

  return (
    <div className="min-w-0 space-y-4 rounded-2xl bg-[#080f20] p-4 text-white lg:p-6 [&_.bg-card]:!bg-[#111c32] [&_.rounded-lg.bg-card]:!bg-[#111c32] [&_[data-state=active]]:!bg-[#37476a] [&_[data-state=active]]:!text-white [&_.bg-muted]:!bg-[#263653] [&_.bg-secondary]:!bg-[#263653] [&_.text-black]:!text-white [&_.text-slate-900]:!text-white [&_.text-gray-900]:!text-white [&_.text-primary]:!text-cyan-300 [&_.bg-popover]:!bg-[#18243b] [&_.bg-background]:!bg-[#17243d] [&_.text-card-foreground]:!text-white [&_.text-foreground]:!text-white [&_.text-muted-foreground]:!text-slate-400 [&_.border-border]:!border-white/10 [&_input]:!text-white [&_button]:!text-white [&_select]:!text-white [&_th]:!text-slate-300 [&_td]:!text-white">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black">
            <BarChart3 className="h-6 w-6" /> Analytics &amp; Stats
          </h1>
          <p className="text-sm text-muted-foreground">
            Performance commerciale en temps réel — CA, produits, catégories et coupons.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {demoMode && (
            <Badge variant="outline" className="gap-1">
              <Activity className="h-3 w-3" /> Données de démonstration
            </Badge>
          )}
          {demoMode && (
            <Button variant="outline" size="sm" onClick={() => setSimulate(!simulate)}>
              {simulate ? <Pause className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}
              {simulate ? 'Pause simulation' : 'Reprendre'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className={cn('mr-1 h-4 w-4', loading && 'animate-spin')} /> Actualiser
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[{label:'CA du jour',value:eur(todayCa),color:'from-violet-600/40 to-violet-950/20'},{label:'Commandes du jour',value:String(todayOrders.length),color:'from-blue-600/40 to-blue-950/20'},{label:'Évolution commerciale',value:'Voir courbes ↓',color:'from-pink-600/40 to-pink-950/20'},{label:'Coupons & produits',value:'Voir analyses ↓',color:'from-orange-600/40 to-orange-950/20'}].map(k=><div key={k.label} className={`rounded-2xl border border-white/10 bg-gradient-to-br ${k.color} p-4`}><p className="text-xs text-slate-300">{k.label}</p><p className="mt-2 text-xl font-black">{k.value}</p></div>)}
      </div>
      {/* Live ticker */}
      <Card className="overflow-hidden border-white/10 bg-[#111c32] text-white">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="flex shrink-0 items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Ventes en direct</p>
              <p className="text-lg font-semibold tabular-nums">
                {todayOrders.length} cmd · {eur(todayCa)}
              </p>
            </div>
          </div>
          <div className="min-w-0 flex-1 overflow-hidden border-l pl-4">
            <div className="flex gap-6 whitespace-nowrap text-xs animate-[marquee_38s_linear_infinite] hover:[animation-play-state:paused]">
              {[...liveFeed, ...liveFeed].map((o, i) => (
                <span key={`${o.id}-${i}`} className="flex items-center gap-2 text-muted-foreground">
                  <ShoppingCart className="h-3.5 w-3.5" />
                  <b className="text-foreground">{o.orderNumber}</b>
                  {o.customerName}
                  <span className="font-medium text-emerald-600">{eur2(o.total)}</span>
                  <span className="opacity-60">
                    {new Date(o.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <Button
            key={r.key}
            size="sm"
            variant={rangeKey === r.key ? 'default' : 'outline'}
            onClick={() => setRangeKey(r.key)}
          >
            {r.label}
          </Button>
        ))}
        {rangeKey === 'custom' && (
          <div className="flex items-center gap-2">
            <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-9 w-[150px]" />
            <span className="text-muted-foreground">→</span>
            <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-9 w-[150px]" />
          </div>
        )}
        <Button size="sm" variant={compare ? 'secondary' : 'outline'} onClick={() => setCompare(!compare)}>
          <TrendingUp className="mr-1 h-4 w-4" /> Comparatif N-1
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard label="CA brut" value={eur(cur.gross)} icon={Wallet} accent={CHART_COLORS[0]}
          delta={compare ? growth(cur.gross, prev.gross) : undefined} sub="Hors remises et livraison" />
        <KpiCard label="CA net" value={eur(cur.net)} icon={TrendingUp} accent={CHART_COLORS[4]}
          delta={compare ? growth(cur.net, prev.net) : undefined} sub="Encaissé, remises déduites" />
        <KpiCard label="Commandes" value={String(cur.count)} icon={ShoppingCart} accent={CHART_COLORS[1]}
          delta={compare ? growth(cur.count, prev.count) : undefined} />
        <KpiCard label="Panier moyen" value={eur2(cur.aov)} icon={Package} accent={CHART_COLORS[2]}
          delta={compare ? growth(cur.aov, prev.aov) : undefined} />
        <KpiCard label="Taux de conversion" value={pct(conversion)} icon={Users} accent={CHART_COLORS[6]}
          sub={`${sessions.toLocaleString('fr-FR')} sessions estimées`} />
        <KpiCard label="Remises appliquées" value={eur(cur.discounts)} icon={BadgePercent} accent={CHART_COLORS[3]}
          delta={compare ? growth(cur.discounts, prev.discounts) : undefined}
          sub={cur.gross ? `${pct((cur.discounts / cur.gross) * 100)} du CA brut` : undefined} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="products">Produits &amp; catégories</TabsTrigger>
          <TabsTrigger value="coupons">Codes promo</TabsTrigger>
        </TabsList>

        {/* ------------------------------ Overview ------------------------------ */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <Card className="border-white/10 bg-[#111c32] text-white">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Chiffre d'affaires &amp; commandes</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => downloadCsv('analytics-ca', daily)}>
                <Download className="mr-1 h-4 w-4" /> CSV
              </Button>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={daily}>
                  <defs>
                    <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS[1]} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={CHART_COLORS[1]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="l" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}€`} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number, n) => (n === 'commandes' ? v : eur(v))} />
                  <Legend />
                  <Area yAxisId="l" type="monotone" dataKey="ca" name="CA net" stroke={CHART_COLORS[1]} fill="url(#caGrad)" strokeWidth={2} />
                  {compare && (
                    <Line yAxisId="l" type="monotone" dataKey="ca_n1" name="CA N-1" stroke={CHART_COLORS[3]} strokeDasharray="5 4" dot={false} strokeWidth={2} />
                  )}
                  <Line yAxisId="r" type="monotone" dataKey="commandes" name="commandes" stroke={CHART_COLORS[4]} dot={false} strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Ventes vs remises</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}€`} />
                  <Tooltip formatter={(v: number) => eur(v)} />
                  <Legend />
                  <Bar dataKey="ca" name="Ventes" stackId="a" fill={CHART_COLORS[0]} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="remises" name="Remises" stackId="a" fill={CHART_COLORS[3]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------ Produits ------------------------------ */}
        <TabsContent value="products" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Top produits</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => downloadCsv('analytics-produits', productStats)}>
                  <Download className="mr-1 h-4 w-4" /> CSV
                </Button>
              </CardHeader>
              <CardContent>
                <AdminTableScroll>
                  <Table className="min-w-[560px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead className="text-right">Volume</TableHead>
                        <TableHead className="text-right">Revenus</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productStats.slice(0, 12).map((p) => (
                        <TableRow key={p.productId}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="text-muted-foreground">{p.category}</TableCell>
                          <TableCell className="text-right tabular-nums">{p.qty}</TableCell>
                          <TableCell className="text-right tabular-nums">{eur(p.revenue)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={p.stock === 0 ? 'destructive' : p.stock < 10 ? 'secondary' : 'outline'}>{p.stock}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!productStats.length && (
                        <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Aucune vente sur la période.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </AdminTableScroll>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Ventes par catégorie</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryStats} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                      {categoryStats.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => eur(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <Layers className="h-4 w-4" />
              <CardTitle className="text-base">Matrice des variations (unités vendues)</CardTitle>
            </CardHeader>
            <CardContent>
              <AdminTableScroll>
                <Table className="min-w-[520px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Couleur / Taille</TableHead>
                      {variationMatrix.sizeList.map((s) => <TableHead key={s} className="text-center">{s}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variationMatrix.colorList.map((c) => (
                      <TableRow key={c}>
                        <TableCell className="font-medium">{c}</TableCell>
                        {variationMatrix.sizeList.map((s) => {
                          const v = variationMatrix.get(c, s);
                          return (
                            <TableCell key={s} className="text-center tabular-nums">
                              <span
                                className="inline-block min-w-8 rounded px-2 py-1 text-xs"
                                style={{ backgroundColor: v ? `rgba(37,99,235,${0.08 + (v / variationMatrix.max) * 0.6})` : 'transparent' }}
                              >
                                {v || '·'}
                              </span>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                    {!variationMatrix.colorList.length && (
                      <TableRow><TableCell className="py-8 text-center text-muted-foreground">Aucune variation vendue.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </AdminTableScroll>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------- Coupons ------------------------------ */}
        <TabsContent value="coupons" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-2 space-y-0 sm:flex-row">
              <CardTitle className="text-base">Analyse des coupons</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input value={couponSearch} onChange={(e) => setCouponSearch(e.target.value)} placeholder="Rechercher un code" className="h-9 w-[190px] pl-8" />
                </div>
                <Button variant="ghost" size="sm" onClick={() => downloadCsv('analytics-coupons', coupons)}>
                  <Download className="mr-1 h-4 w-4" /> CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <AdminTableScroll>
                <Table className="min-w-[560px]">
                  <TableHeader>
                    <TableRow>
                      {([['code', 'Code'], ['uses', 'Utilisations'], ['discount', 'Montant déduit'], ['net', 'Revenu net généré']] as const).map(
                        ([key, label]) => (
                          <TableHead
                            key={key}
                            className={cn('cursor-pointer select-none', key !== 'code' && 'text-right')}
                            onClick={() =>
                              setCouponSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))
                            }
                          >
                            {label}{couponSort.key === key ? (couponSort.dir === 'desc' ? ' ↓' : ' ↑') : ''}
                          </TableHead>
                        ),
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {couponRows.map((c) => (
                      <TableRow key={c.code}>
                        <TableCell><Badge variant="outline" className="font-mono">{c.code}</Badge></TableCell>
                        <TableCell className="text-right tabular-nums">{c.uses}</TableCell>
                        <TableCell className="text-right tabular-nums text-amber-600">-{eur2(c.discount)}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{eur2(c.net)}</TableCell>
                      </TableRow>
                    ))}
                    {!couponRows.length && (
                      <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Aucun coupon utilisé sur la période.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </AdminTableScroll>
              {couponPages > 1 && (
                <div className="mt-3 flex items-center justify-end gap-2 text-sm">
                  <Button variant="outline" size="sm" disabled={couponPage === 1} onClick={() => setCouponPage((p) => p - 1)}>Précédent</Button>
                  <span className="text-muted-foreground">{couponPage} / {couponPages}</span>
                  <Button variant="outline" size="sm" disabled={couponPage === couponPages} onClick={() => setCouponPage((p) => p + 1)}>Suivant</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Impact des périodes promotionnelles (CA moyen / jour)</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={promoImpact}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="phase" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}€`} />
                  <Tooltip formatter={(v: number, n) => (n === 'commandes' ? v : eur(v))} />
                  <Legend />
                  <Bar dataKey="ca" name="CA moyen / jour" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="commandes" name="Commandes" fill={CHART_COLORS[4]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
