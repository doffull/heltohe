import { useState, useEffect, useMemo } from 'react';
import { useCheckoutConfigAdmin, useSaveCheckoutConfig, type CheckoutConfig, type PaymentMethod, PAYMENT_GATEWAYS, DEFAULT_RELAY_MAP_SETTINGS } from '@/hooks/useCheckoutConfig';
import { useGatewaySecrets, useSaveGatewaySecret, useDeleteGatewaySecret, type GatewaySecretStatus } from '@/hooks/useGatewaySecrets';
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
  Lock,
  ShieldCheck,
} from 'lucide-react';

export default function AdminCheckout() {
  const { data: config, isLoading } = useCheckoutConfigAdmin();
  const saveConfig = useSaveCheckoutConfig();
  const { toast } = useToast();

  const [form, setForm] = useState<CheckoutConfig>({
    shippingHomePrice: 6.5,
    shippingRelayPrice: 4.5,
    freeShippingThreshold: 99,
    freeShippingRelayOnly: true,
    homeDeliveryEnabled: true,
    relayEnabled: true,
    paymentMethods: PAYMENT_GATEWAYS,
    checkoutMessage: '',
    relayMapSettings: DEFAULT_RELAY_MAP_SETTINGS,
    autoColissimoLabel: true,
  });

  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  // ── Clés secrètes (stockées côté serveur, jamais renvoyées) ──
  const { data: secretsList } = useGatewaySecrets();
  const saveSecretMutation = useSaveGatewaySecret();
  const deleteSecretMutation = useDeleteGatewaySecret();
  const [secretDrafts, setSecretDrafts] = useState<Record<string, string>>({});
  const [savingSecret, setSavingSecret] = useState<string | null>(null);

  const secretStatus = useMemo(() => {
    const map: Record<string, GatewaySecretStatus | undefined> = {};
    (secretsList ?? []).forEach(s => { map[s.gateway] = s; });
    return map;
  }, [secretsList]);

  const saveSecret = async (gateway: string) => {
    const secretKey = (secretDrafts[gateway] || '').trim();
    if (!secretKey) return;
    setSavingSecret(gateway);
    try {
      await saveSecretMutation.mutateAsync({ gateway, secretKey });
      setSecretDrafts(prev => ({ ...prev, [gateway]: '' }));
      toast({ title: 'Clé secrète enregistrée en sécurité' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message, variant: 'destructive' });
    } finally {
      setSavingSecret(null);
    }
  };

  const removeSecret = async (gateway: string) => {
    try {
      await deleteSecretMutation.mutateAsync(gateway);
      toast({ title: 'Clé secrète supprimée' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message, variant: 'destructive' });
    }
  };

  const [dirty, setDirty] = useState(false);

  // Ne jamais écraser une saisie en cours : on ne réinitialise que si
  // le formulaire n'a pas de modification non enregistrée.
  useEffect(() => {
    if (config && !dirty) setForm(config);
  }, [config, dirty]);

  const patch = (updates: Partial<CheckoutConfig>) => {
    setDirty(true);
    setForm(prev => ({ ...prev, ...updates }));
  };


  const handleSave = async () => {
    try {
      await saveConfig.mutateAsync(form);
      setDirty(false);
      toast({
        title: 'Configuration sauvegardée',
        description: `Domicile ${form.shippingHomePrice.toFixed(2)}€ · Relais ${form.shippingRelayPrice.toFixed(2)}€ · Gratuit dès ${form.freeShippingThreshold}€${form.freeShippingRelayOnly ? ' (point relais uniquement)' : ''}`,
      });
    } catch (e: any) {
      toast({ title: 'Erreur lors de la sauvegarde', description: e?.message ?? 'Erreur inconnue', variant: 'destructive' });
    }
  };

  const updateGateway = (key: string, updates: Partial<PaymentMethod>) => {
    setDirty(true);
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
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold hud-text">Commandes & Livraison</h1>
          <p className="text-xs lg:text-sm text-muted-foreground">Gérez les tarifs, passerelles de paiement et le tunnel de commande</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {dirty && (
            <span className="text-xs text-amber-500 font-medium whitespace-nowrap">Modifications non enregistrées</span>
          )}
        <Button onClick={handleSave} disabled={saveConfig.isPending} className="w-full sm:w-auto">
          {saveConfig.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Sauvegarder
        </Button>
        </div>
      </div>

      <Tabs defaultValue="shipping" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 admin-tabs-scroll w-full h-auto">
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
                  <Switch checked={form.homeDeliveryEnabled} onCheckedChange={v => patch({ homeDeliveryEnabled: v })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Prix (€)</Label>
                  <Input type="number" step="0.01" min="0" value={form.shippingHomePrice} onChange={e => patch({ shippingHomePrice: parseFloat(e.target.value) || 0 })} disabled={!form.homeDeliveryEnabled} />
                </div>
              </div>
              <div className="space-y-4 p-4 border border-border rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Livraison en point relais</Label>
                  <Switch checked={form.relayEnabled} onCheckedChange={v => patch({ relayEnabled: v })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Prix (€)</Label>
                  <Input type="number" step="0.01" min="0" value={form.shippingRelayPrice} onChange={e => patch({ shippingRelayPrice: parseFloat(e.target.value) || 0 })} disabled={!form.relayEnabled} />
                </div>
              </div>
            </div>
            <div className="space-y-2 max-w-sm">
              <Label className="font-medium">Seuil de livraison gratuite (€)</Label>
              <Input type="number" step="1" min="0" value={form.freeShippingThreshold} onChange={e => patch({ freeShippingThreshold: parseFloat(e.target.value) || 0 })} />
              <p className="text-xs text-muted-foreground">Au-dessus de ce montant, la livraison est offerte. Mettez 0 pour toujours offrir la livraison.</p>
            </div>
            <div className="flex items-start justify-between gap-4 p-4 border border-border rounded-lg max-w-2xl">
              <div>
                <Label className="font-medium">Livraison gratuite uniquement en point relais</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Si activé : au-dessus du seuil, seul le point relais devient gratuit ; la livraison à domicile reste facturée
                  {' '}{form.shippingHomePrice.toFixed(2)}€.
                </p>
              </div>
              <Switch checked={form.freeShippingRelayOnly} onCheckedChange={v => patch({ freeShippingRelayOnly: v })} />
            </div>
            <div className="flex items-start justify-between gap-4 p-4 border border-border rounded-lg max-w-2xl">
              <div>
                <Label className="font-medium">Étiquette Colissimo automatique</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Dès qu'une commande est payée, l'étiquette est générée, le numéro de suivi enregistré et l'e-mail
                  d'expédition envoyé au client. En cas d'échec, la commande reste en préparation.
                </p>
              </div>
              <Switch checked={form.autoColissimoLabel} onCheckedChange={v => patch({ autoColissimoLabel: v })} />
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
                          <div className="flex gap-2">
                            <Input
                              type="password"
                              autoComplete="off"
                              placeholder={
                                secretStatus[pm.key]
                                  ? `•••••••••••••${secretStatus[pm.key]?.last4 ?? ''}`
                                  : 'sk_live_... (stockée côté serveur)'
                              }
                              value={secretDrafts[pm.key] ?? ''}
                              onChange={e =>
                                setSecretDrafts(prev => ({ ...prev, [pm.key]: e.target.value }))
                              }
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={
                                !(secretDrafts[pm.key] || '').trim() || savingSecret === pm.key
                              }
                              onClick={() => saveSecret(pm.key)}
                            >
                              {savingSecret === pm.key ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Lock className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          {secretStatus[pm.key] ? (
                            <div className="flex items-center gap-2 text-[10px] text-green-600">
                              <ShieldCheck className="h-3 w-3" />
                              Clé enregistrée (•••{secretStatus[pm.key]?.last4}) —{' '}
                              {new Date(secretStatus[pm.key]!.updated_at).toLocaleDateString('fr-FR')}
                              <button
                                type="button"
                                className="text-destructive hover:underline"
                                onClick={() => removeSecret(pm.key)}
                              >
                                Supprimer
                              </button>
                            </div>
                          ) : (
                            <p className="text-[10px] text-muted-foreground">
                              Chiffrée côté serveur, jamais renvoyée au navigateur.
                            </p>
                          )}
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
              <Switch checked={form.relayEnabled} onCheckedChange={v => patch({ relayEnabled: v })} />
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
                onChange={e => patch({ checkoutMessage: e.target.value })}
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
