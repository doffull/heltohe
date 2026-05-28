import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ArrowRight, Check, Eye, Loader2, RefreshCw, Settings2 } from 'lucide-react';

export type SyncType = 'products' | 'customers' | 'orders' | 'stock';

const SYNC_CONFIG: Record<SyncType, { title: string; previewMode: string; importKey: string; labelSingular: string; labelPlural: string }> = {
  products: { title: 'Produits', previewMode: 'preview', importKey: 'importProducts', labelSingular: 'produit', labelPlural: 'produits' },
  customers: { title: 'Clients', previewMode: 'preview-customers', importKey: 'importCustomers', labelSingular: 'client', labelPlural: 'clients' },
  orders: { title: 'Commandes', previewMode: 'preview-orders', importKey: 'importOrders', labelSingular: 'commande', labelPlural: 'commandes' },
  stock: { title: 'Stocks', previewMode: 'preview-stock', importKey: 'importStock', labelSingular: 'stock', labelPlural: 'stocks' },
};

interface PreviewItem {
  name: string;
  sku?: string;
  email?: string;
  order_number?: string;
  price?: number;
  total?: number;
  stock?: number;
  image?: string;
  category?: string;
  isDuplicate: boolean;
  localProduct?: any;
  selected: boolean;
}

const LS_KEY = 'wc_sync_credentials';
const LS_ENABLED_KEY = 'wc_sync_enabled';

function loadCredentials() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
}

function isWpEnabled(): boolean {
  return localStorage.getItem(LS_ENABLED_KEY) !== 'false';
}

export function WordPressSyncDialog({ open, onOpenChange, syncType = 'products' }: { open: boolean; onOpenChange: (v: boolean) => void; syncType?: SyncType }) {
  const { toast } = useToast();
  const saved = loadCredentials();
  const config = SYNC_CONFIG[syncType];

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [storeUrl, setStoreUrl] = useState(saved.storeUrl || '');
  const [consumerKey, setConsumerKey] = useState(saved.consumerKey || '');
  const [consumerSecret, setConsumerSecret] = useState(saved.consumerSecret || '');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [comparingIdx, setComparingIdx] = useState<number | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importDone, setImportDone] = useState(false);
  const [wpEnabled, setWpEnabled] = useState(isWpEnabled());
  const [showSettings, setShowSettings] = useState(false);

  const handleToggleWp = (enabled: boolean) => {
    setWpEnabled(enabled);
    localStorage.setItem(LS_ENABLED_KEY, String(enabled));
  };

  const handleFetchPreview = async () => {
    if (!wpEnabled) {
      toast({ title: 'Connexion WordPress désactivée', description: 'Activez la connexion dans les paramètres.', variant: 'destructive' });
      return;
    }
    if (!storeUrl || !consumerKey || !consumerSecret) {
      toast({ title: 'Remplissez tous les champs', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ storeUrl, consumerKey, consumerSecret }));

      // 1) Lightweight ping first — validates auth + WAF without loading full catalog
      const ping = await supabase.functions.invoke('woocommerce-import', {
        body: { storeUrl, consumerKey, consumerSecret, mode: 'ping' },
      });
      if (ping.error) throw ping.error;
      if (ping.data?.error) throw new Error(ping.data.error);

      // 2) Full preview now that we know the server is reachable
      const { data, error } = await supabase.functions.invoke('woocommerce-import', {
        body: { storeUrl, consumerKey, consumerSecret, mode: config.previewMode },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const fetched = data.products || data.customers || data.orders || data.stock || [];
      setItems(fetched.map((p: any) => ({ ...p, selected: !p.isDuplicate })));
      setStep(2);
    } catch (err: any) {
      toast({
        title: 'Erreur de connexion',
        description: err.message,
        variant: 'destructive',
        action: (
          <button
            onClick={() => handleFetchPreview()}
            className="text-xs underline whitespace-nowrap"
          >
            Réessayer
          </button>
        ) as any,
      });
    } finally {
      setLoading(false);
    }
  };


  const selectedCount = items.filter(p => p.selected).length;
  const duplicateCount = items.filter(p => p.isDuplicate).length;

  const handleImport = async () => {
    const selected = items.filter(p => p.selected);
    if (selected.length === 0) return;
    setStep(3);
    setImportTotal(selected.length);
    setImportProgress(0);
    setImportDone(false);

    try {
      const body: any = { storeUrl, consumerKey, consumerSecret, [config.importKey]: true };
      if (syncType === 'products') body.selectedSkus = selected.map(p => p.sku);
      const { data, error } = await supabase.functions.invoke('woocommerce-import', { body });
      if (error) throw error;
      setImportProgress(selected.length);
      setImportDone(true);
      const count = data?.products || data?.customers || data?.orders || data?.stock || 0;
      const errCount = data?.errors?.length || 0;
      toast({
        title: `${count} ${config.labelSingular}(s) importé(s)`,
        description: errCount > 0 ? `${errCount} erreur(s)` : undefined,
      });
    } catch (err: any) {
      toast({ title: "Erreur d'import", description: err.message, variant: 'destructive' });
      setImportDone(true);
    }
  };

  const toggleAll = (checked: boolean) => setItems(prev => prev.map(p => ({ ...p, selected: checked })));
  const toggleOne = (idx: number) => setItems(prev => prev.map((p, i) => i === idx ? { ...p, selected: !p.selected } : p));

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => { setStep(1); setItems([]); setComparingIdx(null); setImportDone(false); setImportProgress(0); setShowSettings(false); }, 300);
  };

  const getItemLabel = (item: PreviewItem) => item.name || item.email || item.order_number || 'N/A';
  const getItemSub = (item: PreviewItem) => {
    if (syncType === 'products') return `SKU: ${item.sku} • ${item.category}`;
    if (syncType === 'customers') return item.email || '';
    if (syncType === 'orders') return `${item.order_number} • ${item.total?.toFixed(2)} €`;
    return item.sku || '';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <RefreshCw className="h-5 w-5 shrink-0" />
            <span className="truncate">Sync WordPress — {config.title} — Étape {step}/3</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto shrink-0" onClick={() => setShowSettings(!showSettings)}>
              <Settings2 className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Settings panel */}
        {showSettings && (
          <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Connexion WordPress</p>
                <p className="text-xs text-muted-foreground">Activer/désactiver la synchronisation</p>
              </div>
              <Switch checked={wpEnabled} onCheckedChange={handleToggleWp} />
            </div>
            {!wpEnabled && (
              <p className="text-xs text-destructive">La synchronisation est désactivée. Vos clés API sont conservées.</p>
            )}
          </div>
        )}

        {/* STEP 1: Connection */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connectez votre boutique WooCommerce pour récupérer vos {config.labelPlural}.
            </p>
            <div className="space-y-3">
              <div><Label>URL de la boutique</Label><Input placeholder="https://maboutique.com" value={storeUrl} onChange={e => setStoreUrl(e.target.value)} /></div>
              <div><Label>Clé client (Consumer Key)</Label><Input placeholder="ck_..." value={consumerKey} onChange={e => setConsumerKey(e.target.value)} /></div>
              <div><Label>Secret client (Consumer Secret)</Label><Input type="password" placeholder="cs_..." value={consumerSecret} onChange={e => setConsumerSecret(e.target.value)} /></div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleFetchPreview} disabled={loading || !wpEnabled}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                Analyser
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Preview */}
        {step === 2 && comparingIdx === null && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {items.length} {config.labelSingular}(s) • {duplicateCount} doublon(s)
              </p>
              <div className="flex items-center gap-2">
                <Checkbox checked={selectedCount === items.length} onCheckedChange={(v) => toggleAll(!!v)} />
                <span className="text-xs text-muted-foreground">Tout sélectionner</span>
              </div>
            </div>

            <div className="max-h-[50vh] overflow-y-auto space-y-2">
              {items.map((p, idx) => (
                <div key={idx} className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border ${p.isDuplicate ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-card/50'}`}>
                  <Checkbox checked={p.selected} onCheckedChange={() => toggleOne(idx)} className="shrink-0" />
                  {p.image ? (
                    <img src={p.image} alt={getItemLabel(p)} className="w-10 h-10 object-cover rounded shrink-0" />
                  ) : (
                    <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-[10px] shrink-0">N/A</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{getItemLabel(p)}</p>
                    <p className="text-xs text-muted-foreground truncate">{getItemSub(p)}</p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    {p.price != null && <p className="text-sm font-bold">{p.price.toFixed(2)} €</p>}
                    {p.stock != null && <p className="text-xs text-muted-foreground">Stock: {p.stock}</p>}
                  </div>
                  {p.isDuplicate ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="outline" className="border-amber-500 text-amber-500 text-[10px]">Doublon</Badge>
                      {p.localProduct && <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setComparingIdx(idx)}><Eye className="h-3 w-3" /></Button>}
                    </div>
                  ) : (
                    <Badge className="bg-green-600 text-[10px] shrink-0">Nouveau</Badge>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="w-full sm:w-auto">
                <ArrowLeft className="h-4 w-4 mr-2" />Retour
              </Button>
              <Button onClick={handleImport} disabled={selectedCount === 0} className="w-full sm:w-auto">
                <Check className="h-4 w-4 mr-2" />
                Importer {selectedCount} {config.labelSingular}(s)
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Compare */}
        {step === 2 && comparingIdx !== null && (() => {
          const wp = items[comparingIdx];
          const local = wp.localProduct;
          if (!local) return null;
          return (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Comparaison</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 p-3 rounded-lg border bg-card/50">
                  <Badge className="text-[10px]">Local (actuel)</Badge>
                  {local.image && <img src={local.image} alt="" className="w-full h-32 object-cover rounded" />}
                  <p className="text-sm font-medium">{local.name || local.email || local.order_number}</p>
                  {local.price != null && <p className="text-xs">{local.price.toFixed(2)} € • Stock: {local.stock}</p>}
                  {local.description && <p className="text-xs text-muted-foreground line-clamp-3">{local.description}</p>}
                </div>
                <div className="space-y-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <Badge variant="outline" className="border-primary text-primary text-[10px]">WordPress</Badge>
                  {wp.image && <img src={wp.image} alt="" className="w-full h-32 object-cover rounded" />}
                  <p className="text-sm font-medium">{getItemLabel(wp)}</p>
                  {wp.price != null && <p className="text-xs">{wp.price.toFixed(2)} € • Stock: {wp.stock}</p>}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-between gap-2">
                <Button variant="outline" onClick={() => setComparingIdx(null)} className="w-full sm:w-auto">
                  <ArrowLeft className="h-4 w-4 mr-2" />Retour
                </Button>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button variant="outline" className="w-full sm:w-auto" onClick={() => {
                    setItems(prev => prev.map((p, i) => i === comparingIdx ? { ...p, selected: false } : p));
                    setComparingIdx(null);
                  }}>Garder local</Button>
                  <Button className="w-full sm:w-auto" onClick={() => {
                    setItems(prev => prev.map((p, i) => i === comparingIdx ? { ...p, selected: true } : p));
                    setComparingIdx(null);
                  }}>Remplacer par WordPress</Button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* STEP 3: Progress */}
        {step === 3 && (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-2">
              {!importDone ? <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /> : <Check className="h-8 w-8 mx-auto text-green-500" />}
              <p className="text-sm font-medium">{importDone ? 'Import terminé !' : 'Import en cours...'}</p>
            </div>
            <Progress value={importTotal > 0 ? (importProgress / importTotal) * 100 : 0} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">{importProgress} / {importTotal}</p>
            {importDone && (
              <div className="flex justify-center">
                <Button onClick={handleClose}>Fermer</Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
