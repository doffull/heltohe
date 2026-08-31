import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdminWooCommerceLogs from './AdminWooCommerceLogs';
import {
  useWooConfig,
  useSaveWooConfig,
  useWooPing,
  useWooSync,
  useWooStats,
  useRefreshWooStats,
  type WooSyncResult,
} from '@/hooks/useWooCommerce';
import {
  Users,
  ShoppingCart,
  Zap,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  AlertCircle,
  FileText,
  BarChart3,
  Save,
  TrendingUp,
} from 'lucide-react';

const PERIODS = [
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
  { value: 'last_month', label: 'Mois dernier' },
  { value: 'year', label: 'Cette année' },
];

function money(v: unknown, currency = 'EUR') {
  const n = Number(v || 0);
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(n);
}

export default function AdminWooCommerce() {
  const { toast } = useToast();
  const { data: config, isLoading: loadingConfig } = useWooConfig();
  const saveConfig = useSaveWooConfig();
  const ping = useWooPing();
  const sync = useWooSync();

  const [storeUrl, setStoreUrl] = useState('');
  const [consumerKey, setConsumerKey] = useState('');
  const [consumerSecret, setConsumerSecret] = useState('');
  const [syncCustomers, setSyncCustomers] = useState(true);
  const [syncOrders, setSyncOrders] = useState(true);
  const [syncStats, setSyncStats] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [result, setResult] = useState<WooSyncResult | null>(null);
  const [period, setPeriod] = useState('month');

  const { data: stats } = useWooStats(period);
  const refreshStats = useRefreshWooStats();

  useEffect(() => {
    if (!config) return;
    setStoreUrl(config.store_url || '');
    setConsumerKey(config.consumer_key || '');
    setSyncCustomers(config.sync_customers);
    setSyncOrders(config.sync_orders);
    setSyncStats(config.sync_stats);
  }, [config]);

  const currency = (stats?.orders_totals && config?.store_info?.currency) || config?.store_info?.currency || 'EUR';

  const salesRow = useMemo(() => {
    const raw = stats?.sales?.value;
    const first = Array.isArray(raw) ? raw[0] : raw;
    return first || null;
  }, [stats]);

  const orderTotals: Array<{ slug: string; name: string; total: number }> = useMemo(() => {
    const raw = stats?.orders_totals?.value;
    return Array.isArray(raw) ? raw : [];
  }, [stats]);

  const customerTotals: Array<{ slug: string; name: string; total: number }> = useMemo(() => {
    const raw = stats?.customers_totals?.value;
    return Array.isArray(raw) ? raw : [];
  }, [stats]);

  const topSellers: Array<{ name: string; quantity: number }> = useMemo(() => {
    const raw = stats?.top_sellers?.value;
    return Array.isArray(raw) ? raw : [];
  }, [stats]);

  const handleSave = async () => {
    if (!storeUrl || !consumerKey || (!consumerSecret && !config?.has_secret)) {
      toast({ title: 'Champs manquants', description: 'URL, Consumer Key et Consumer Secret sont requis.', variant: 'destructive' });
      return;
    }
    try {
      await saveConfig.mutateAsync({ storeUrl, consumerKey, consumerSecret: consumerSecret || undefined, syncCustomers, syncOrders, syncStats });
      setConsumerSecret('');
      toast({ title: 'Configuration enregistrée ✓', description: 'Les identifiants sont conservés côté serveur.' });
    } catch (e: any) {
      toast({ title: 'Enregistrement impossible', description: e?.message, variant: 'destructive' });
    }
  };

  const handleTest = async () => {
    setConnectionStatus('idle');
    try {
      const data = await ping.mutateAsync(
        consumerSecret ? { storeUrl, consumerKey, consumerSecret } : { storeUrl: storeUrl || undefined, consumerKey: consumerKey || undefined },
      );
      if (data?.success) {
        setConnectionStatus('ok');
        const info: any = data.storeInfo || {};
        toast({
          title: 'Connexion réussie ✓',
          description: info.store_name
            ? `${info.store_name} — WooCommerce ${info.wc_version || '?'} / WordPress ${info.wp_version || '?'}`
            : 'WooCommerce répond correctement.',
        });
      } else {
        setConnectionStatus('error');
        toast({ title: 'Connexion échouée', description: data?.error || 'Vérifie l’URL et les clés API.', variant: 'destructive' });
      }
    } catch (e: any) {
      setConnectionStatus('error');
      toast({ title: 'Connexion impossible', description: e?.message, variant: 'destructive' });
    }
  };

  const runSync = async (incremental: boolean) => {
    if (!syncCustomers && !syncOrders && !syncStats) {
      toast({ title: 'Rien à synchroniser', description: 'Coche au moins une section.', variant: 'destructive' });
      return;
    }
    setResult(null);
    try {
      const data = await sync.mutateAsync({ incremental, syncCustomers, syncOrders, syncStats, statsPeriod: period });
      if ((data as any)?.error && !(data as any)?.status) {
        toast({ title: 'Serveur WooCommerce indisponible', description: (data as any).error, variant: 'destructive' });
        return;
      }
      setResult(data);
      toast({
        title: data.status === 'success' ? 'Synchronisation terminée ✓' : 'Synchronisation partielle',
        description: `${data.customers} client(s), ${data.orders} commande(s) dont ${data.ordersInProgress} en cours.`,
        variant: data.status === 'failed' ? 'destructive' : undefined,
      });
    } catch (e: any) {
      toast({ title: 'Erreur de synchronisation', description: e?.message, variant: 'destructive' });
    }
  };

  const lastSync = config?.last_sync_at ? new Date(config.last_sync_at).toLocaleString('fr-FR') : null;

  return (
    <div className="space-y-6 lg:space-y-8">
      <div>
        <p className="font-mono text-[10px] lg:text-xs tracking-[0.3em] text-muted-foreground mb-1">// INTÉGRATIONS</p>
        <h1 className="text-xl lg:text-3xl font-bold uppercase hud-text">WooCommerce</h1>
        <p className="text-xs lg:text-sm text-muted-foreground mt-1">
          Récupère tes clients, tes commandes (y compris en cours) et tes statistiques depuis WordPress. Les produits ne sont pas synchronisés.
        </p>
        {lastSync && (
          <p className="text-[11px] font-mono text-muted-foreground mt-2">
            Dernière synchro : {lastSync} — {config?.last_sync_status || '—'}
          </p>
        )}
      </div>

      <Tabs defaultValue="sync" className="space-y-4">
        <TabsList className="admin-tabs-scroll w-full h-auto">
          <TabsTrigger value="sync"><Zap className="h-3 w-3 mr-1" /> Synchronisation</TabsTrigger>
          <TabsTrigger value="stats"><BarChart3 className="h-3 w-3 mr-1" /> Statistiques</TabsTrigger>
          <TabsTrigger value="logs"><FileText className="h-3 w-3 mr-1" /> Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="sync">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Connexion */}
            <div className="bg-card border border-border p-6 space-y-6">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-primary" />
                <h2 className="font-bold uppercase tracking-wider text-sm">Configuration API</h2>
                {connectionStatus === 'ok' && <Badge variant="default" className="ml-auto">Connecté</Badge>}
                {connectionStatus === 'error' && <Badge variant="destructive" className="ml-auto">Erreur</Badge>}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="storeUrl">URL du site WooCommerce</Label>
                  <Input id="storeUrl" placeholder="https://monsite.com" value={storeUrl} onChange={(e) => setStoreUrl(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consumerKey">Consumer Key</Label>
                  <Input id="consumerKey" placeholder="ck_xxxxxxxx" value={consumerKey} onChange={(e) => setConsumerKey(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consumerSecret">Consumer Secret</Label>
                  <Input
                    id="consumerSecret"
                    type="password"
                    placeholder={config?.has_secret ? '•••••••• (enregistré — laisse vide pour conserver)' : 'cs_xxxxxxxx'}
                    value={consumerSecret}
                    onChange={(e) => setConsumerSecret(e.target.value)}
                  />
                </div>
              </div>

              <div className="bg-secondary/40 p-4 rounded-sm text-xs space-y-1 text-muted-foreground">
                <p className="flex items-center gap-2 font-medium text-foreground"><AlertCircle className="h-3.5 w-3.5" /> Où trouver tes clés ?</p>
                <p>WooCommerce → Réglages → Avancé → REST API → Ajouter une clé</p>
                <p>Permissions requises : <strong className="text-foreground">Lecture</strong> (Lecture/Écriture conseillé)</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button onClick={handleSave} disabled={saveConfig.isPending || loadingConfig}>
                  {saveConfig.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Enregistrer
                </Button>
                <Button variant="outline" onClick={handleTest} disabled={ping.isPending}>
                  {ping.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> :
                    connectionStatus === 'ok' ? <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" /> :
                    connectionStatus === 'error' ? <XCircle className="h-4 w-4 mr-2 text-destructive" /> :
                    <Zap className="h-4 w-4 mr-2" />}
                  Tester
                </Button>
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-4">
              <div className="bg-card border border-border p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-primary" />
                  <h2 className="font-bold uppercase tracking-wider text-sm">Données à récupérer</h2>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-4 p-4 border border-border cursor-pointer hover:bg-secondary/30 transition-colors">
                    <Checkbox checked={syncCustomers} onCheckedChange={(v) => setSyncCustomers(!!v)} />
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Clients</p>
                      <p className="text-xs text-muted-foreground">Nom, e-mail, téléphone, adresse, total dépensé</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-4 p-4 border border-border cursor-pointer hover:bg-secondary/30 transition-colors">
                    <Checkbox checked={syncOrders} onCheckedChange={(v) => setSyncOrders(!!v)} />
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Commandes (tous statuts)</p>
                      <p className="text-xs text-muted-foreground">En attente, en cours, en pause, terminées, remboursées</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-4 p-4 border border-border cursor-pointer hover:bg-secondary/30 transition-colors">
                    <Checkbox checked={syncStats} onCheckedChange={(v) => setSyncStats(!!v)} />
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Statistiques</p>
                      <p className="text-xs text-muted-foreground">Ventes, totaux commandes/clients, coupons, meilleures ventes</p>
                    </div>
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <Label className="text-xs uppercase tracking-wider">Période stats</Label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button onClick={() => runSync(false)} disabled={sync.isPending}>
                    {sync.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Synchroniser tout
                  </Button>
                  <Button variant="outline" onClick={() => runSync(true)} disabled={sync.isPending || !config?.last_sync_at}>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Sync incrémentale
                  </Button>
                </div>
              </div>

              {result && (
                <div className="bg-card border border-border p-6 space-y-3">
                  <h3 className="font-bold uppercase tracking-wider text-sm">Résultat</h3>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="border border-border p-3">
                      <p className="text-2xl font-bold">{result.customers}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Clients</p>
                    </div>
                    <div className="border border-border p-3">
                      <p className="text-2xl font-bold">{result.orders}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Commandes</p>
                    </div>
                    <div className="border border-border p-3">
                      <p className="text-2xl font-bold">{result.ordersInProgress}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">En cours</p>
                    </div>
                  </div>
                  {result.incremental && (
                    <p className="text-xs text-muted-foreground">Mode incrémental — modifications depuis {result.since}</p>
                  )}
                  {result.errors?.length > 0 && (
                    <div className="text-xs text-destructive space-y-1">
                      {result.errors.slice(0, 5).map((e, i) => <p key={i}>• {e}</p>)}
                      {result.errors.length > 5 && <p>… et {result.errors.length - 5} autre(s)</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stats">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => refreshStats.mutate(period)} disabled={refreshStats.isPending}>
                {refreshStats.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Actualiser
              </Button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-card border border-border p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Chiffre d'affaires</p>
                <p className="text-xl font-bold">{money(salesRow?.total_sales, currency as string)}</p>
              </div>
              <div className="bg-card border border-border p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ventes nettes</p>
                <p className="text-xl font-bold">{money(salesRow?.net_sales, currency as string)}</p>
              </div>
              <div className="bg-card border border-border p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Commandes</p>
                <p className="text-xl font-bold">{salesRow?.total_orders ?? '—'}</p>
              </div>
              <div className="bg-card border border-border p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Panier moyen</p>
                <p className="text-xl font-bold">
                  {salesRow?.total_orders ? money(Number(salesRow.net_sales || 0) / Number(salesRow.total_orders), currency as string) : '—'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-card border border-border p-4 space-y-2">
                <h3 className="font-bold uppercase tracking-wider text-xs">Commandes par statut</h3>
                {orderTotals.length === 0 && <p className="text-xs text-muted-foreground">Aucune donnée — lance une synchro.</p>}
                {orderTotals.map((s) => (
                  <div key={s.slug} className="flex justify-between text-sm border-b border-border/50 py-1">
                    <span>{s.name}</span><span className="font-mono">{s.total}</span>
                  </div>
                ))}
              </div>
              <div className="bg-card border border-border p-4 space-y-2">
                <h3 className="font-bold uppercase tracking-wider text-xs">Clients</h3>
                {customerTotals.length === 0 && <p className="text-xs text-muted-foreground">Aucune donnée.</p>}
                {customerTotals.map((s) => (
                  <div key={s.slug} className="flex justify-between text-sm border-b border-border/50 py-1">
                    <span>{s.name}</span><span className="font-mono">{s.total}</span>
                  </div>
                ))}
              </div>
              <div className="bg-card border border-border p-4 space-y-2">
                <h3 className="font-bold uppercase tracking-wider text-xs">Meilleures ventes</h3>
                {topSellers.length === 0 && <p className="text-xs text-muted-foreground">Aucune donnée.</p>}
                {topSellers.slice(0, 10).map((s, i) => (
                  <div key={i} className="flex justify-between text-sm border-b border-border/50 py-1">
                    <span className="truncate mr-2">{s.name}</span><span className="font-mono">{s.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <AdminWooCommerceLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
}
