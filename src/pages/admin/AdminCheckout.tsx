import { useState, useEffect } from 'react';
import { useCheckoutConfig, useSaveCheckoutConfig, type CheckoutConfig, type PaymentMethod } from '@/hooks/useCheckoutConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import {
  Truck,
  CreditCard,
  MapPin,
  Palette,
  Save,
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
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
    paymentMethods: [
      { key: 'bank_transfer', label: 'Virement bancaire', enabled: true },
    ],
    checkoutMessage: '',
  });

  const [newPaymentLabel, setNewPaymentLabel] = useState('');

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

  const togglePayment = (key: string) => {
    setForm(prev => ({
      ...prev,
      paymentMethods: prev.paymentMethods.map(pm =>
        pm.key === key ? { ...pm, enabled: !pm.enabled } : pm
      ),
    }));
  };

  const addPaymentMethod = () => {
    if (!newPaymentLabel.trim()) return;
    const key = newPaymentLabel.trim().toLowerCase().replace(/\s+/g, '_');
    if (form.paymentMethods.some(pm => pm.key === key)) return;
    setForm(prev => ({
      ...prev,
      paymentMethods: [...prev.paymentMethods, { key, label: newPaymentLabel.trim(), enabled: false }],
    }));
    setNewPaymentLabel('');
  };

  const removePaymentMethod = (key: string) => {
    setForm(prev => ({
      ...prev,
      paymentMethods: prev.paymentMethods.filter(pm => pm.key !== key),
    }));
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
          <p className="text-sm text-muted-foreground">Gérez les tarifs, moyens de paiement et le tunnel de commande</p>
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
                  <Switch
                    checked={form.homeDeliveryEnabled}
                    onCheckedChange={v => setForm(prev => ({ ...prev, homeDeliveryEnabled: v }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Prix (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.shippingHomePrice}
                    onChange={e => setForm(prev => ({ ...prev, shippingHomePrice: parseFloat(e.target.value) || 0 }))}
                    disabled={!form.homeDeliveryEnabled}
                  />
                </div>
              </div>

              <div className="space-y-4 p-4 border border-border rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Livraison en point relais</Label>
                  <Switch
                    checked={form.relayEnabled}
                    onCheckedChange={v => setForm(prev => ({ ...prev, relayEnabled: v }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Prix (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.shippingRelayPrice}
                    onChange={e => setForm(prev => ({ ...prev, shippingRelayPrice: parseFloat(e.target.value) || 0 }))}
                    disabled={!form.relayEnabled}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 max-w-sm">
              <Label className="font-medium">Seuil de livraison gratuite (€)</Label>
              <Input
                type="number"
                step="1"
                min="0"
                value={form.freeShippingThreshold}
                onChange={e => setForm(prev => ({ ...prev, freeShippingThreshold: parseFloat(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground">
                Au-dessus de ce montant, la livraison est offerte. Mettez 0 pour toujours offrir la livraison.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* ── PAIEMENT ── */}
        <TabsContent value="payment" className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <h3 className="font-semibold text-lg">Moyens de paiement</h3>
            <p className="text-sm text-muted-foreground">
              Activez ou désactivez les moyens de paiement disponibles au checkout. L'intégration de passerelles bancaires (Stripe, SogeCommerce) nécessite une configuration supplémentaire.
            </p>

            <div className="space-y-3">
              {form.paymentMethods.map((pm) => (
                <div key={pm.key} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{pm.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={pm.enabled}
                      onCheckedChange={() => togglePayment(pm.key)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => removePaymentMethod(pm.key)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Nom du moyen de paiement"
                value={newPaymentLabel}
                onChange={e => setNewPaymentLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPaymentMethod()}
                className="max-w-xs"
              />
              <Button variant="outline" onClick={addPaymentMethod} disabled={!newPaymentLabel.trim()}>
                <Plus className="h-4 w-4 mr-1" />Ajouter
              </Button>
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
              <Switch
                checked={form.relayEnabled}
                onCheckedChange={v => setForm(prev => ({ ...prev, relayEnabled: v }))}
              />
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
              <p className="text-xs text-muted-foreground">
                Ce message sera affiché sur la page de confirmation après la commande. Laissez vide pour le message par défaut.
              </p>
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
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
