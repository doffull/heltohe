import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ArrowRight, Check, Eye, Loader2, RefreshCw } from 'lucide-react';

interface WcProduct {
  name: string;
  sku: string;
  price: number;
  sale_price: number | null;
  image: string;
  images: string[];
  category: string;
  stock: number;
  description: string | null;
  short_description: string | null;
  sizes: string[];
  colors: string[];
  attributes: Record<string, string>;
  tags: string[];
  is_active: boolean;
  isDuplicate: boolean;
  localProduct: {
    id: string;
    sku: string;
    name: string;
    price: number;
    sale_price: number | null;
    image: string;
    stock: number;
    category: string;
    description: string | null;
  } | null;
}

const LS_KEY = 'wc_sync_credentials';

function loadCredentials() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
  } catch {
    return {};
  }
}

export function WordPressSyncDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const saved = loadCredentials();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [storeUrl, setStoreUrl] = useState(saved.storeUrl || '');
  const [consumerKey, setConsumerKey] = useState(saved.consumerKey || '');
  const [consumerSecret, setConsumerSecret] = useState(saved.consumerSecret || '');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<(WcProduct & { selected: boolean })[]>([]);
  const [comparingIdx, setComparingIdx] = useState<number | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importDone, setImportDone] = useState(false);

  const handleFetchPreview = async () => {
    if (!storeUrl || !consumerKey || !consumerSecret) {
      toast({ title: 'Remplissez tous les champs', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ storeUrl, consumerKey, consumerSecret }));
      const { data, error } = await supabase.functions.invoke('woocommerce-import', {
        body: { storeUrl, consumerKey, consumerSecret, mode: 'preview' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const fetched: WcProduct[] = data.products || [];
      setProducts(fetched.map(p => ({ ...p, selected: !p.isDuplicate })));
      setStep(2);
    } catch (err: any) {
      toast({ title: 'Erreur de connexion', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const selectedCount = products.filter(p => p.selected).length;
  const duplicateCount = products.filter(p => p.isDuplicate).length;

  const handleImport = async () => {
    const selected = products.filter(p => p.selected);
    if (selected.length === 0) return;
    setStep(3);
    setImportTotal(selected.length);
    setImportProgress(0);
    setImportDone(false);

    try {
      const { data, error } = await supabase.functions.invoke('woocommerce-import', {
        body: {
          storeUrl,
          consumerKey,
          consumerSecret,
          importProducts: true,
          selectedSkus: selected.map(p => p.sku),
        },
      });
      if (error) throw error;
      setImportProgress(selected.length);
      setImportDone(true);
      const errCount = data?.errors?.length || 0;
      toast({
        title: `${data?.products || 0} produit(s) importé(s)`,
        description: errCount > 0 ? `${errCount} erreur(s)` : undefined,
      });
    } catch (err: any) {
      toast({ title: 'Erreur d\'import', description: err.message, variant: 'destructive' });
      setImportDone(true);
    }
  };

  const toggleAll = (checked: boolean) => {
    setProducts(prev => prev.map(p => ({ ...p, selected: checked })));
  };

  const toggleOne = (idx: number) => {
    setProducts(prev => prev.map((p, i) => i === idx ? { ...p, selected: !p.selected } : p));
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep(1);
      setProducts([]);
      setComparingIdx(null);
      setImportDone(false);
      setImportProgress(0);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Synchronisation WordPress — Étape {step}/3
          </DialogTitle>
        </DialogHeader>

        {/* ─── STEP 1: Connection ─── */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connectez votre boutique WooCommerce pour récupérer vos produits.
              Les clés API se trouvent dans WooCommerce → Réglages → API.
            </p>
            <div className="space-y-3">
              <div>
                <Label>URL de la boutique</Label>
                <Input placeholder="https://maboutique.com" value={storeUrl} onChange={e => setStoreUrl(e.target.value)} />
              </div>
              <div>
                <Label>Clé client (Consumer Key)</Label>
                <Input placeholder="ck_..." value={consumerKey} onChange={e => setConsumerKey(e.target.value)} />
              </div>
              <div>
                <Label>Secret client (Consumer Secret)</Label>
                <Input type="password" placeholder="cs_..." value={consumerSecret} onChange={e => setConsumerSecret(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleFetchPreview} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                Analyser la boutique
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: Preview ─── */}
        {step === 2 && comparingIdx === null && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {products.length} produit(s) trouvé(s) • {duplicateCount} doublon(s)
              </p>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedCount === products.length}
                  onCheckedChange={(v) => toggleAll(!!v)}
                />
                <span className="text-xs text-muted-foreground">Tout sélectionner</span>
              </div>
            </div>

            <div className="max-h-[50vh] overflow-y-auto space-y-2">
              {products.map((p, idx) => (
                <div
                  key={p.sku}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    p.isDuplicate ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-card/50'
                  }`}
                >
                  <Checkbox checked={p.selected} onCheckedChange={() => toggleOne(idx)} />
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-12 h-12 object-cover rounded" />
                  ) : (
                    <div className="w-12 h-12 bg-muted rounded flex items-center justify-center text-xs">N/A</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">SKU: {p.sku} • {p.category}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">{p.price.toFixed(2)} €</p>
                    <p className="text-xs text-muted-foreground">Stock: {p.stock}</p>
                  </div>
                  {p.isDuplicate ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="border-amber-500 text-amber-500 text-[10px]">Doublon</Badge>
                      <Button variant="ghost" size="sm" onClick={() => setComparingIdx(idx)}>
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Badge className="bg-green-600 text-[10px] shrink-0">Nouveau</Badge>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />Retour
              </Button>
              <Button onClick={handleImport} disabled={selectedCount === 0}>
                <Check className="h-4 w-4 mr-2" />
                Importer {selectedCount} produit(s)
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: Compare view ─── */}
        {step === 2 && comparingIdx !== null && (() => {
          const wp = products[comparingIdx];
          const local = wp.localProduct;
          if (!local) return null;
          return (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Comparaison — SKU: {wp.sku}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 p-3 rounded-lg border bg-card/50">
                  <Badge className="text-[10px]">Local (actuel)</Badge>
                  {local.image && <img src={local.image} alt="" className="w-full h-32 object-cover rounded" />}
                  <p className="text-sm font-medium">{local.name}</p>
                  <p className="text-xs">{local.price.toFixed(2)} € • Stock: {local.stock}</p>
                  <p className="text-xs text-muted-foreground">{local.category}</p>
                  {local.description && <p className="text-xs text-muted-foreground line-clamp-3">{local.description}</p>}
                </div>
                <div className="space-y-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <Badge variant="outline" className="border-primary text-primary text-[10px]">WordPress</Badge>
                  {wp.image && <img src={wp.image} alt="" className="w-full h-32 object-cover rounded" />}
                  <p className="text-sm font-medium">{wp.name}</p>
                  <p className="text-xs">{wp.price.toFixed(2)} € • Stock: {wp.stock}</p>
                  <p className="text-xs text-muted-foreground">{wp.category}</p>
                  {wp.description && <p className="text-xs text-muted-foreground line-clamp-3">{wp.description}</p>}
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setComparingIdx(null)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />Retour à la liste
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => {
                    toggleOne(comparingIdx);
                    setProducts(prev => prev.map((p, i) => i === comparingIdx ? { ...p, selected: false } : p));
                    setComparingIdx(null);
                  }}>
                    Garder local
                  </Button>
                  <Button onClick={() => {
                    setProducts(prev => prev.map((p, i) => i === comparingIdx ? { ...p, selected: true } : p));
                    setComparingIdx(null);
                  }}>
                    Remplacer par WordPress
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ─── STEP 3: Import progress ─── */}
        {step === 3 && (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-2">
              {!importDone ? (
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              ) : (
                <Check className="h-8 w-8 mx-auto text-green-500" />
              )}
              <p className="text-sm font-medium">
                {importDone ? 'Import terminé !' : 'Import en cours...'}
              </p>
            </div>
            <Progress value={importTotal > 0 ? (importProgress / importTotal) * 100 : 0} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              {importProgress} / {importTotal} produit(s)
            </p>
            {importDone && (
              <div className="flex justify-center">
                <Button onClick={handleClose}>
                  Fermer
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
