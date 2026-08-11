import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminWooCommerceLogs from './AdminWooCommerceLogs';
import {
  ShoppingBag,
  Users,
  ShoppingCart,
  Zap,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface ImportResult {
  products?: number;
  orders?: number;
  customers?: number;
  errors?: string[];
}

export default function AdminWooCommerce() {
  const { toast } = useToast();

  const [storeUrl, setStoreUrl] = useState('');
  const [consumerKey, setConsumerKey] = useState('');
  const [consumerSecret, setConsumerSecret] = useState('');

  const [importProducts, setImportProducts] = useState(true);
  const [importOrders, setImportOrders] = useState(true);
  const [importCustomers, setImportCustomers] = useState(true);

  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'ok' | 'error'>('idle');

  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const cleanUrl = (url: string) => url.replace(/\/$/, '');

  const handleTestConnection = async () => {
    if (!storeUrl || !consumerKey || !consumerSecret) {
      toast({ title: 'Champs manquants', description: 'Remplis tous les champs avant de tester.', variant: 'destructive' });
      return;
    }
    setTesting(true);
    setConnectionStatus('idle');
    try {
      const base = cleanUrl(storeUrl);
      const testUrl = `${base}/wp-json/wc/v3/system_status?consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
      const res = await fetch(testUrl);
      if (res.ok) {
        setConnectionStatus('ok');
        toast({ title: 'Connexion réussie ✓', description: 'WooCommerce répond correctement.' });
      } else {
        setConnectionStatus('error');
        toast({ title: 'Connexion échouée', description: `Erreur ${res.status} — vérifiez vos clés API.`, variant: 'destructive' });
      }
    } catch {
      setConnectionStatus('error');
      toast({ title: 'Connexion impossible', description: 'Vérifiez l\'URL du site et les CORS.', variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  const runImport = async () => {
    setImporting(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('woocommerce-import', {
        body: {
          storeUrl: cleanUrl(storeUrl),
          consumerKey,
          consumerSecret,
          importProducts,
          importOrders,
          importCustomers,
        },
      });
      if (error) throw error;
      if (data?.fallback || data?.error) {
        toast({
          title: 'Serveur WooCommerce indisponible',
          description: data.error || 'Le serveur est temporairement inaccessible après plusieurs tentatives. Réessayez plus tard.',
          variant: 'destructive',
          action: (
            <button
              onClick={() => runImport()}
              className="text-xs underline whitespace-nowrap"
            >
              Réessayer
            </button>
          ) as any,
        });
      } else {
        setResult(data);
        const cid = data?.correlationId;
        toast({
          title: 'Import terminé ✓',
          description: cid
            ? `ID corrélation : ${String(cid).slice(0, 8)}…`
            : 'Les données ont été importées avec succès.',
          action: cid
            ? (
                <a
                  href={`/admin/woocommerce?tab=logs&cid=${cid}`}
                  className="text-xs underline whitespace-nowrap"
                >
                  Voir le log
                </a>
              ) as any
            : undefined,
        });
      }
    } catch (err: any) {
      toast({ title: 'Erreur d\'import', description: err?.message || 'Une erreur s\'est produite.', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const handleImport = async () => {
    if (!storeUrl || !consumerKey || !consumerSecret) {
      toast({ title: 'Champs manquants', description: 'Remplis tous les champs avant de lancer l\'import.', variant: 'destructive' });
      return;
    }
    if (!importProducts && !importOrders && !importCustomers) {
      toast({ title: 'Rien à importer', description: 'Coche au moins une section à importer.', variant: 'destructive' });
      return;
    }
    await runImport();
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div>
        <p className="font-mono text-[10px] lg:text-xs tracking-[0.3em] text-muted-foreground mb-1">// INTÉGRATIONS</p>
        <h1 className="text-xl lg:text-3xl font-bold uppercase hud-text">WooCommerce</h1>
        <p className="text-xs lg:text-sm text-muted-foreground mt-1">Synchronise tes produits, commandes et clients depuis ton site WooCommerce.</p>
      </div>
      <Tabs defaultValue="sync" className="space-y-4">
        <TabsList className="admin-tabs-scroll w-full h-auto">
          <TabsTrigger value="sync"><Zap className="h-3 w-3 mr-1" /> Synchronisation</TabsTrigger>
          <TabsTrigger value="logs"><FileText className="h-3 w-3 mr-1" /> Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="sync">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connection form */}
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
              <Input
                id="storeUrl"
                placeholder="https://monsite.com"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="consumerKey">Consumer Key</Label>
              <Input
                id="consumerKey"
                placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={consumerKey}
                onChange={(e) => setConsumerKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="consumerSecret">Consumer Secret</Label>
              <Input
                id="consumerSecret"
                type="password"
                placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={consumerSecret}
                onChange={(e) => setConsumerSecret(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-secondary/40 p-4 rounded-sm text-xs space-y-1 text-muted-foreground">
            <p className="flex items-center gap-2 font-medium text-foreground"><AlertCircle className="h-3.5 w-3.5" /> Où trouver tes clés ?</p>
            <p>WooCommerce → Réglages → Avancé → REST API → Ajouter une clé</p>
            <p>Permissions requises : <strong className="text-foreground">Lecture/Écriture</strong></p>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleTestConnection}
            disabled={testing}
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : connectionStatus === 'ok' ? <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" /> : connectionStatus === 'error' ? <XCircle className="h-4 w-4 mr-2 text-destructive" /> : <Zap className="h-4 w-4 mr-2" />}
            Tester la connexion
          </Button>
        </div>

        {/* Import options */}
        <div className="space-y-4">
          <div className="bg-card border border-border p-6 space-y-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-primary" />
              <h2 className="font-bold uppercase tracking-wider text-sm">Sections à importer</h2>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-4 p-4 border border-border cursor-pointer hover:bg-secondary/30 transition-colors">
                <Checkbox checked={importProducts} onCheckedChange={(v) => setImportProducts(!!v)} />
                <ShoppingBag className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Produits</p>
                  <p className="text-xs text-muted-foreground">Nom, prix, images, catégories, stock</p>
                </div>
              </label>

              <label className="flex items-center gap-4 p-4 border border-border cursor-pointer hover:bg-secondary/30 transition-colors">
                <Checkbox checked={importOrders} onCheckedChange={(v) => setImportOrders(!!v)} />
                <ShoppingCart className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Commandes</p>
                  <p className="text-xs text-muted-foreground">Client, total, articles, statut</p>
                </div>
              </label>

              <label className="flex items-center gap-4 p-4 border border-border cursor-pointer hover:bg-secondary/30 transition-colors">
                <Checkbox checked={importCustomers} onCheckedChange={(v) => setImportCustomers(!!v)} />
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Clients</p>
                  <p className="text-xs text-muted-foreground">Email, nom, téléphone</p>
                </div>
              </label>
            </div>

            <Button
              className="w-full uppercase tracking-wider"
              onClick={handleImport}
              disabled={importing}
            >
              {importing ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Importation en cours…</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-2" /> Lancer l'import</>
              )}
            </Button>
          </div>

          {/* Result */}
          {result && (
            <div className="bg-card border border-primary/30 p-6 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <h3 className="font-bold uppercase text-sm tracking-wider">Import terminé</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {result.products !== undefined && (
                  <div className="bg-secondary/40 p-3 text-center">
                    <p className="text-2xl font-bold">{result.products}</p>
                    <p className="text-xs text-muted-foreground uppercase">Produits</p>
                  </div>
                )}
                {result.orders !== undefined && (
                  <div className="bg-secondary/40 p-3 text-center">
                    <p className="text-2xl font-bold">{result.orders}</p>
                    <p className="text-xs text-muted-foreground uppercase">Commandes</p>
                  </div>
                )}
                {result.customers !== undefined && (
                  <div className="bg-secondary/40 p-3 text-center">
                    <p className="text-2xl font-bold">{result.customers}</p>
                    <p className="text-xs text-muted-foreground uppercase">Clients</p>
                  </div>
                )}
              </div>
              {result.errors && result.errors.length > 0 && (
                <div className="text-xs text-destructive space-y-1">
                  {result.errors.map((e, i) => <p key={i}>⚠ {e}</p>)}
                </div>
              )}
            </div>
          )}
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
