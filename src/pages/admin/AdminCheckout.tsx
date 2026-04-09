import { useState, useEffect } from 'react';
import { useCheckoutConfig, useSaveCheckoutConfig, type CheckoutConfig, type PaymentMethod, PAYMENT_GATEWAYS, DEFAULT_RELAY_MAP_SETTINGS } from '@/hooks/useCheckoutConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import {
  Truck,
  CreditCard,
  MapPin,
  Palette,
  Save,
  Loader2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function AdminCheckout() {
  const { data: config, isLoading } = useCheckoutConfig();
  const saveConfig = useSaveCheckoutConfig();
  const { toast } = useToast();

  const [form, setForm] = useState<CheckoutConfig>({
    shippingHomePrice: 6.5,
    shippingRelayPrice: 4.5,
    freeShippingThreshold: 200,
    homeDeliveryEnabled: true,
    relayEnabled: true,
    paymentMethods: PAYMENT_GATEWAYS,
    checkoutMessage: '',
    relayMapSettings: DEFAULT_RELAY_MAP_SETTINGS,
  });

  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (config) setForm(config);
  }, [config]);

  const handleSave = async () => {
    try {
      await saveConfig.mutateAsync(form);
      toast({ title: 'Configuration sauvegardée' });
    } catch {
      toast({ title: 'Erreur lors de la sauvegarde', variant: 'destructive' });
    }
  };

  const updateGateway = (key: string, updates: Partial<PaymentMethod>) => {
    setForm(prev => ({
      ...prev,
      paymentMethods: prev.paymentMethods.map(pm =>
        pm.key === key ? { ...pm, ...updates } : pm
      ),
    }));
  };

  const toggleKeyVisibility = (key: string) => {
    setVisibleKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold hud-text">Commandes & Livraison</h1>
          <p className="text-sm text-muted-foreground">Gérez les tarifs, passerelles de paiement et le tunnel de commande</p>
        </div>
        <Button onClick={handleSave} disabled={saveConfig.isPending}>
          {saveConfig.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Sauvegarder
        </Button>
      </div>

      <Tabs defaultValue="shipping" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="shipping" className="gap-2 text-xs sm:text-sm">
            <Truck className="h-4 w-4 hidden sm:block" />Livraison
          </TabsTrigger>
          <TabsTrigger value="payment" className="gap-2 text-xs sm:text-sm">
            <CreditCard className="h-4 w-4 hidden sm:block" />Paiement
          </TabsTrigger>
          <TabsTrigger value="relay" className="gap-2 text-xs sm:text-sm">
            <MapPin className="h-4 w-4 hidden sm:block" />Points Relais
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2 text-xs sm:text-sm">
            <Palette className="h-4 w-4 hidden sm:block" />Apparence
          </TabsTrigger>
        </TabsList>

        {/* ── LIVRAISON ── */}
        <TabsContent value="shipping" className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <h3 className="font-semibold text-lg">Tarifs Colissimo</h3>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-4 p-4 border border-border rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Livraison à domicile</Label>
                  <Switch checked={form.homeDeliveryEnabled} onCheckedChange={v => setForm(prev => ({ ...prev, homeDeliveryEnabled: v }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Prix (€)</Label>
                  <Input type="number" step="0.01" min="0" value={form.shippingHomePrice} onChange={e => setForm(prev => ({ ...prev, shippingHomePrice: parseFloat(e.target.value) || 0 }))} disabled={!form.homeDeliveryEnabled} />
                </div>
              </div>
              <div className="space-y-4 p-4 border border-border rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Livraison en point relais</Label>
                  <Switch checked={form.relayEnabled} onCheckedChange={v => setForm(prev => ({ ...prev, relayEnabled: v }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Prix (€)</Label>
                  <Input type="number" step="0.01" min="0" value={form.shippingRelayPrice} onChange={e => setForm(prev => ({ ...prev, shippingRelayPrice: parseFloat(e.target.value) || 0 }))} disabled={!form.relayEnabled} />
                </div>
              </div>
            </div>
            <div className="space-y-2 max-w-sm">
              <Label className="font-medium">Seuil de livraison gratuite (€)</Label>
              <Input type="number" step="1" min="0" value={form.freeShippingThreshold} onChange={e => setForm(prev => ({ ...prev, freeShippingThreshold: parseFloat(e.target.value) || 0 }))} />
              <p className="text-xs text-muted-foreground">Au-dessus de ce montant, la livraison est offerte. Mettez 0 pour toujours offrir la livraison.</p>
            </div>
          </div>
        </TabsContent>

        {/* ── PAIEMENT ── */}
        <TabsContent value="payment" className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-lg">Passerelles de paiement</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Configurez vos passerelles de paiement. Activez une passerelle, entrez vos clés API, puis sauvegardez.
              </p>
            </div>

            <div className="space-y-4">
              {form.paymentMethods.map((pm) => (
                <div key={pm.key} className="border border-border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-4 bg-secondary/20">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{pm.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{pm.label}</span>
                          {pm.configured ? (
                            <Badge variant="default" className="text-[10px] gap-1 bg-green-600 hover:bg-green-700">
                              <CheckCircle2 className="h-3 w-3" /> Configuré
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] gap-1">
                              <XCircle className="h-3 w-3" /> Non configuré
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{pm.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={pm.enabled}
                      onCheckedChange={() => updateGateway(pm.key, { enabled: !pm.enabled })}
                    />
                  </div>

                  {pm.key !== 'bank_transfer' && (
                    <div className="p-4 space-y-3">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Clé API publique</Label>
                          <div className="relative">
                            <Input
                              type={visibleKeys[`${pm.key}_pub`] ? 'text' : 'password'}
                              placeholder={`pk_live_...`}
                              value={pm.publicKey || ''}
                              onChange={e => updateGateway(pm.key, { publicKey: e.target.value, configured: !!(e.target.value) })}
                              className="pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => toggleKeyVisibility(`${pm.key}_pub`)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {visibleKeys[`${pm.key}_pub`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Clé API secrète</Label>
                          <div className="relative">
                            <Input
                              type="password"
                              placeholder="sk_live_... (stockée côté serveur)"
                              disabled
                              className="pr-10"
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Les clés secrètes sont gérées de manière sécurisée côté serveur.
                          </p>
                        </div>
                      </div>
                      {pm.docUrl && (
                        <a href={pm.docUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <ExternalLink className="h-3 w-3" /> Documentation {pm.label}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 bg-secondary/30 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Note :</strong> Pour connecter une passerelle de paiement, vous aurez besoin d'un compte chez le fournisseur.
                Créez votre compte, récupérez vos clés API dans leur tableau de bord, puis entrez-les ici.
                Les clés secrètes seront stockées de manière sécurisée côté serveur lorsque vous configurerez la passerelle.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* ── POINTS RELAIS ── */}
        <TabsContent value="relay" className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <h3 className="font-semibold text-lg">Points Relais Colissimo</h3>

            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <p className="font-medium">Activer les points relais</p>
                <p className="text-xs text-muted-foreground">Les clients pourront choisir un point relais Colissimo lors du checkout</p>
              </div>
              <Switch checked={form.relayEnabled} onCheckedChange={v => setForm(prev => ({ ...prev, relayEnabled: v }))} />
            </div>

            <div className="p-4 bg-secondary/30 rounded-lg space-y-3">
              <p className="text-sm font-medium">Configuration Colissimo</p>
              <p className="text-xs text-muted-foreground">
                Les identifiants Colissimo et la configuration de l'expéditeur sont gérés dans l'espace dédié.
              </p>
              <Link to="/admin/colissimo">
                <Button variant="outline" size="sm" className="gap-2">
                  <ExternalLink className="h-3 w-3" />
                  Ouvrir l'espace Colissimo
                </Button>
              </Link>
            </div>
          </div>
        </TabsContent>

        {/* ── APPARENCE ── */}
        <TabsContent value="appearance" className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <h3 className="font-semibold text-lg">Personnalisation du checkout</h3>

            <div className="space-y-2">
              <Label className="font-medium">Message de confirmation</Label>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[100px] resize-y"
                placeholder="Message affiché sur la page de confirmation de commande (optionnel)"
                value={form.checkoutMessage}
                onChange={e => setForm(prev => ({ ...prev, checkoutMessage: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Ce message sera affiché sur la page de confirmation après la commande.</p>
            </div>

            <div className="p-4 bg-secondary/30 rounded-lg">
              <p className="text-sm font-medium mb-2">Aperçu du tunnel</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded">1. Adresse</div>
                <div className="w-4 h-px bg-border" />
                <div className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded">2. Livraison</div>
                <div className="w-4 h-px bg-border" />
                <div className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded">3. Confirmation</div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Modes actifs : {form.homeDeliveryEnabled && 'Domicile'}{form.homeDeliveryEnabled && form.relayEnabled && ' · '}{form.relayEnabled && 'Point Relais'}
                {!form.homeDeliveryEnabled && !form.relayEnabled && <span className="text-destructive">Aucun mode activé !</span>}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Passerelles actives : {form.paymentMethods.filter(pm => pm.enabled).map(pm => pm.label).join(' · ') || <span className="text-destructive">Aucune</span>}
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
