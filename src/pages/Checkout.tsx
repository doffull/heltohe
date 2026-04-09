import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useAdminConfig } from '@/hooks/useAdminConfig';
import { useCheckoutConfig } from '@/hooks/useCheckoutConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  Truck,
  MapPin,
  Shield,
  Package,
  CheckCircle,
  Loader2,
  Home,
  ClipboardCheck,
  Search,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type DeliveryMode = 'home' | 'relay';
type Step = 'address' | 'delivery' | 'confirmation';

// Rates loaded dynamically from DB via useCheckoutConfig

interface RelayPoint {
  identifiant: string;
  nom: string;
  adresse1: string;
  adresse2?: string;
  codePostal: string;
  localite: string;
  distanceEnMetre?: number;
  horairesOuvertureLundi?: string;
  horairesOuvertureSamedi?: string;
  typeDePoint?: string;
}

export default function Checkout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { designSettings } = useApp();
  const { data: adminConfig } = useAdminConfig();
  const { data: checkoutConfig } = useCheckoutConfig();
  const { items, subtotal, promoDiscount, promoCode, total, clearCart } = useCart();

  const [step, setStep] = useState<Step>('address');
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('relay');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  // Relay point state
  const [relayPoints, setRelayPoints] = useState<RelayPoint[]>([]);
  const [selectedRelay, setSelectedRelay] = useState<RelayPoint | null>(null);
  const [relaySearchZip, setRelaySearchZip] = useState('');
  const [isSearchingRelays, setIsSearchingRelays] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: '',
    address: '',
    address2: '',
    city: '',
    zip: '',
    country: 'France',
    relayInfo: '',
  });

  const rates = {
    home: checkoutConfig?.shippingHomePrice ?? 6.5,
    relay: checkoutConfig?.shippingRelayPrice ?? 4.5,
    free_threshold: checkoutConfig?.freeShippingThreshold ?? 200,
  };
  const shippingCost = subtotal >= rates.free_threshold ? 0 : rates[deliveryMode];
  const orderTotal = subtotal - promoDiscount + shippingCost;
  const tax = orderTotal * 0.2 / 1.2;

  const updateForm = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const validateAddress = () => {
    const required = ['firstName', 'lastName', 'email', 'address', 'city', 'zip'];
    return required.every(f => form[f as keyof typeof form].trim());
  };

  const searchRelayPoints = async (zip: string) => {
    if (!zip || zip.length < 5) {
      toast({ title: 'Code postal invalide', description: 'Saisissez un code postal valide (5 chiffres)', variant: 'destructive' });
      return;
    }
    setIsSearchingRelays(true);
    setRelayPoints([]);
    setSelectedRelay(null);
    try {
      const { data, error } = await supabase.functions.invoke('colissimo-proxy', {
        body: { action: 'getRelayPoints', zipCode: zip, city: form.city || '', countryCode: 'FR' },
      });
      if (error) throw error;
      if (data?.success && data.points?.length > 0) {
        setRelayPoints(data.points.slice(0, 5));
      } else {
        toast({ title: 'Aucun point relais trouvé', description: 'Essayez un autre code postal', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Relay search error:', err);
      toast({ title: 'Erreur lors de la recherche', description: 'Impossible de récupérer les points relais', variant: 'destructive' });
    } finally {
      setIsSearchingRelays(false);
    }
  };

  const selectRelay = (point: RelayPoint) => {
    setSelectedRelay(point);
    updateForm('relayInfo', `${point.nom} — ${point.adresse1}, ${point.codePostal} ${point.localite}`);
  };

  const formatDistance = (meters?: number) => {
    if (!meters) return '';
    if (meters < 1000) return `${meters}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatHoraires = (h?: string) => {
    if (!h || h === '00:00-00:00' || h === '') return 'Fermé';
    return h;
  };

  const handlePlaceOrder = async () => {
    if (deliveryMode === 'relay' && !selectedRelay) {
      toast({ title: 'Point relais requis', description: 'Veuillez sélectionner un point relais', variant: 'destructive' });
      return;
    }
    setIsProcessing(true);
    try {
      const num = `LVTK-${Date.now().toString(36).toUpperCase()}`;

      // Build minimal item list — server will re-fetch prices from DB
      const orderItemsPayload = items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
      }));

      const customerAddress = deliveryMode === 'relay' && form.relayInfo
        ? `Point Relais: ${form.relayInfo} — ${form.address}`
        : form.address;

      // Server-side RPC: validates prices, promo code, calculates totals, inserts order
      const { data: rpcResult, error: rpcError } = await supabase.rpc('validate_and_create_order', {
        p_items: orderItemsPayload,
        p_promo_code: promoCode || '',
        p_delivery_mode: deliveryMode,
        p_order_data: {
          order_number: num,
          user_id: user?.id || '',
          customer_email: form.email,
          customer_name: `${form.firstName} ${form.lastName}`,
          customer_phone: form.phone || '',
          customer_address: customerAddress,
          customer_city: form.city,
          customer_zip: form.zip,
          customer_country: form.country,
        },
      });

      if (rpcError) throw rpcError;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = rpcResult as any;
      if (result?.error) {
        throw new Error(result.error);
      }

      // Send confirmation email (fire and forget) using server-verified values
      supabase.functions.invoke('send-order-confirmation', {
        body: {
          orderNumber: num,
          customerName: `${form.firstName} ${form.lastName}`,
          customerEmail: form.email,
          items: result.items,
          subtotal: result.subtotal,
          shippingCost: result.shippingCost,
          total: result.total,
          deliveryMode,
          adminEmail: adminConfig?.adminNotificationEmail || undefined,
        },
      }).catch(() => {/* non-blocking, swallow silently */});

      setOrderNumber(num);
      clearCart();
      setStep('confirmation');
    } catch (err) {
      toast({
        title: 'Erreur lors de la commande',
        description: 'Veuillez réessayer ou contacter le support.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0 && step !== 'confirmation') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold hud-text mb-2">PANIER VIDE</h1>
          <Button onClick={() => navigate('/boutique')} className="mt-4">Retour boutique</Button>
        </div>
      </div>
    );
  }

  // CONFIRMATION PAGE
  if (step === 'confirmation') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="chamfer-hud bg-card/50 p-8 max-w-lg w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold hud-text mb-2">COMMANDE CONFIRMÉE</h1>
            <p className="text-muted-foreground text-sm">Merci {form.firstName} ! Votre commande a été enregistrée.</p>
            <p className="text-xs text-muted-foreground mt-1">N° {orderNumber}</p>
          </div>

          <div className="bg-secondary/30 chamfer-hud-sm p-4 text-left space-y-3">
            <p className="text-sm font-bold hud-text flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              INFORMATIONS DE PAIEMENT
            </p>
            <p className="text-xs text-muted-foreground">
              Votre commande est en attente de paiement. Veuillez effectuer un virement bancaire avec la référence <span className="font-bold text-foreground">{orderNumber}</span>.
            </p>
            <div className="border border-border chamfer-hud-sm p-3 text-xs space-y-1 font-mono">
              <div className="flex justify-between"><span className="text-muted-foreground">Bénéficiaire :</span><span>LVTK6 Concept</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Montant :</span><span className="text-primary font-bold">{orderTotal.toFixed(2)} €</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Référence :</span><span>{orderNumber}</span></div>
            </div>
            <p className="text-xs text-muted-foreground">
              Une confirmation vous sera envoyée à <span className="font-medium text-foreground">{form.email}</span> dès réception du paiement.
            </p>
          </div>

          {deliveryMode === 'relay' && selectedRelay && (
            <div className="bg-primary/10 border border-primary/20 chamfer-hud-sm p-3 text-left">
              <p className="text-xs font-bold hud-text mb-1 flex items-center gap-1"><MapPin className="h-3 w-3 text-primary" />POINT RELAIS SÉLECTIONNÉ</p>
              <p className="text-xs text-foreground font-medium">{selectedRelay.nom}</p>
              <p className="text-xs text-muted-foreground">{selectedRelay.adresse1}, {selectedRelay.codePostal} {selectedRelay.localite}</p>
            </div>
          )}

          <div className="bg-primary/10 border border-primary/20 chamfer-hud-sm p-3">
            <p className="text-xs text-primary flex items-center gap-2">
              <Truck className="h-3 w-3 flex-shrink-0" />
              Expédition Colissimo {deliveryMode === 'relay' ? 'Point Relais' : 'Domicile'} dès validation du paiement
            </p>
          </div>

          <Button className="w-full chamfer-hud-sm" onClick={() => navigate('/boutique')}>
            Continuer mes achats
          </Button>
        </div>
      </div>
    );
  }

  const steps: Step[] = ['address', 'delivery', 'confirmation'];
  const stepLabels = { address: 'Adresse', delivery: 'Livraison', confirmation: 'Confirmation' };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate('/panier')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au panier
          </Button>
          <h1 className="text-3xl font-bold hud-text flex items-center gap-3">
            <ClipboardCheck className="h-8 w-8 text-primary" />
            FINALISER LA COMMANDE
          </h1>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-4 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (s === 'address') setStep('address');
                  if (s === 'delivery') setStep('delivery');
                }}
                className={cn(
                  'w-8 h-8 flex items-center justify-center text-sm font-bold transition-colors',
                  step === s ? 'bg-primary text-primary-foreground' :
                  (steps as string[]).indexOf(step) > i ? 'bg-foreground/20 text-foreground' : 'bg-secondary text-muted-foreground',
                )}
                style={{ clipPath: 'polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)' }}
              >
                {(steps as string[]).indexOf(step) > i ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </button>
              <span className={cn('text-xs font-medium hidden sm:block', step === s ? 'text-foreground' : 'text-muted-foreground')}>
                {stepLabels[s]}
              </span>
              {i < steps.length - 1 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">

            {/* STEP 1: ADDRESS */}
            {step === 'address' && (
              <div className="chamfer-hud bg-card/50 p-6 space-y-4">
                <h2 className="text-lg font-bold hud-text flex items-center gap-2">
                  <Home className="h-5 w-5 text-primary" />
                  ADRESSE DE LIVRAISON
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="hud-text text-xs">PRÉNOM *</Label>
                    <Input value={form.firstName} onChange={e => updateForm('firstName', e.target.value)} className="bg-secondary/50" maxLength={100} />
                  </div>
                  <div className="space-y-2">
                    <Label className="hud-text text-xs">NOM *</Label>
                    <Input value={form.lastName} onChange={e => updateForm('lastName', e.target.value)} className="bg-secondary/50" maxLength={100} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="hud-text text-xs">EMAIL *</Label>
                    <Input type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} className="bg-secondary/50" maxLength={255} />
                  </div>
                  <div className="space-y-2">
                    <Label className="hud-text text-xs">TÉLÉPHONE</Label>
                    <Input type="tel" value={form.phone} onChange={e => updateForm('phone', e.target.value)} className="bg-secondary/50" maxLength={20} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="hud-text text-xs">ADRESSE *</Label>
                  <Input value={form.address} onChange={e => updateForm('address', e.target.value)} placeholder="Numéro et nom de rue" className="bg-secondary/50" maxLength={300} />
                </div>

                <div className="space-y-2">
                  <Label className="hud-text text-xs">COMPLÉMENT D'ADRESSE</Label>
                  <Input value={form.address2} onChange={e => updateForm('address2', e.target.value)} placeholder="Appartement, étage, etc." className="bg-secondary/50" maxLength={200} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="hud-text text-xs">CODE POSTAL *</Label>
                    <Input value={form.zip} onChange={e => updateForm('zip', e.target.value)} className="bg-secondary/50" maxLength={10} />
                  </div>
                  <div className="space-y-2 col-span-1 sm:col-span-2">
                    <Label className="hud-text text-xs">VILLE *</Label>
                    <Input value={form.city} onChange={e => updateForm('city', e.target.value)} className="bg-secondary/50" maxLength={100} />
                  </div>
                </div>

                <Button
                  className="w-full chamfer-hud-sm h-12"
                  onClick={() => {
                    if (!validateAddress()) {
                      toast({ title: 'Champs obligatoires manquants', variant: 'destructive' });
                      return;
                    }
                    setRelaySearchZip(form.zip);
                    setStep('delivery');
                  }}
                >
                  Continuer vers la livraison
                  <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                </Button>
              </div>
            )}

            {/* STEP 2: DELIVERY */}
            {step === 'delivery' && (
              <div className="chamfer-hud bg-card/50 p-6 space-y-4">
                <h2 className="text-lg font-bold hud-text flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  MODE DE LIVRAISON
                </h2>

                <p className="text-xs text-muted-foreground">Livraison assurée par Colissimo (La Poste)</p>

                <div className="space-y-3">
                  {/* Relay */}
                  <div
                    className={cn(
                      'border transition-all chamfer-hud-sm',
                      deliveryMode === 'relay' ? 'border-primary bg-primary/5' : 'border-border',
                    )}
                  >
                    <button
                      onClick={() => setDeliveryMode('relay')}
                      className="w-full p-4 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center', deliveryMode === 'relay' ? 'border-primary' : 'border-muted-foreground')}>
                            {deliveryMode === 'relay' && <div className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <div>
                            <p className="font-bold text-sm">Colissimo Point Relais</p>
                            <p className="text-xs text-muted-foreground">Livraison en 3-5 jours ouvrés</p>
                          </div>
                        </div>
                        <span className="font-bold text-sm">
                          {subtotal >= rates.free_threshold ? <span className="text-primary">GRATUIT</span> : `${rates.relay.toFixed(2)}€`}
                        </span>
                      </div>
                    </button>

                    {deliveryMode === 'relay' && (
                      <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                        {/* Relay search */}
                        <div>
                          <Label className="hud-text text-xs mb-2 block">RECHERCHER UN POINT RELAIS</Label>
                          <div className="flex gap-2">
                            <Input
                              value={relaySearchZip}
                              onChange={e => setRelaySearchZip(e.target.value)}
                              placeholder="Code postal (ex: 75001)"
                              className="bg-secondary/50 flex-1"
                              onKeyDown={e => e.key === 'Enter' && searchRelayPoints(relaySearchZip)}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => searchRelayPoints(relaySearchZip)}
                              disabled={isSearchingRelays}
                              className="shrink-0"
                            >
                              {isSearchingRelays ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>

                        {/* Relay points list */}
                        {relayPoints.length > 0 && (
                          <div className="space-y-2 max-h-72 overflow-y-auto">
                            {relayPoints.map(point => (
                              <button
                                key={point.identifiant}
                                onClick={() => selectRelay(point)}
                                className={cn(
                                  'w-full text-left p-3 chamfer-hud-sm border transition-all',
                                  selectedRelay?.identifiant === point.identifiant
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border hover:border-foreground/30 bg-secondary/20'
                                )}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <div className={cn('w-3 h-3 rounded-full border-2 flex-shrink-0 flex items-center justify-center', selectedRelay?.identifiant === point.identifiant ? 'border-primary' : 'border-muted-foreground')}>
                                        {selectedRelay?.identifiant === point.identifiant && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                      </div>
                                      <p className="font-bold text-xs truncate">{point.nom}</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5 ml-5">{point.adresse1}</p>
                                    <p className="text-xs text-muted-foreground ml-5">{point.codePostal} {point.localite}</p>
                                    {point.horairesOuvertureLundi && (
                                      <div className="flex items-center gap-1 mt-1 ml-5">
                                        <Clock className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">Lun: {formatHoraires(point.horairesOuvertureLundi)} · Sam: {formatHoraires(point.horairesOuvertureSamedi)}</span>
                                      </div>
                                    )}
                                  </div>
                                  {point.distanceEnMetre !== undefined && (
                                    <span className="text-xs font-bold text-primary shrink-0">{formatDistance(point.distanceEnMetre)}</span>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {selectedRelay && (
                          <div className="flex items-start gap-2 bg-primary/10 border border-primary/20 chamfer-hud-sm p-3">
                            <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <div className="text-xs">
                              <p className="font-bold text-primary">Point relais sélectionné</p>
                              <p className="text-foreground">{selectedRelay.nom} — {selectedRelay.adresse1}, {selectedRelay.codePostal} {selectedRelay.localite}</p>
                            </div>
                          </div>
                        )}

                        {!selectedRelay && relayPoints.length === 0 && (
                          <p className="text-xs text-muted-foreground">Recherchez un point relais par code postal pour sélectionner votre lieu de retrait.</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Home */}
                  <button
                    onClick={() => setDeliveryMode('home')}
                    className={cn(
                      'w-full p-4 text-left border transition-all chamfer-hud-sm',
                      deliveryMode === 'home' ? 'border-primary bg-primary/5' : 'border-border hover:border-foreground/30',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center', deliveryMode === 'home' ? 'border-primary' : 'border-muted-foreground')}>
                          {deliveryMode === 'home' && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <div>
                          <p className="font-bold text-sm">Colissimo à Domicile</p>
                          <p className="text-xs text-muted-foreground">Livraison en 2-3 jours ouvrés — Suivi inclus</p>
                        </div>
                      </div>
                      <span className="font-bold text-sm">
                        {subtotal >= rates.free_threshold ? <span className="text-primary">GRATUIT</span> : `${rates.home.toFixed(2)}€`}
                      </span>
                    </div>
                  </button>
                </div>

                {subtotal < rates.free_threshold && (
                  <div className="bg-primary/10 border border-primary/20 px-4 py-3 chamfer-hud-sm">
                    <p className="text-xs text-primary">
                      <Truck className="h-3 w-3 inline mr-1" />
                      Plus que {(rates.free_threshold - subtotal).toFixed(2)}€ d'achats pour la livraison gratuite !
                    </p>
                  </div>
                )}

                {/* Summary before placing order */}
                <div className="bg-secondary/30 p-4 chamfer-hud-sm space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{form.firstName} {form.lastName} — {form.address}, {form.zip} {form.city}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('address')} className="flex-1">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour
                  </Button>
                  <Button
                    className="flex-1 chamfer-hud-sm h-12 text-base font-bold"
                    onClick={handlePlaceOrder}
                    disabled={isProcessing || (deliveryMode === 'relay' && !selectedRelay)}
                  >
                    {isProcessing ? (
                      <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Traitement...</>
                    ) : (
                      <><CheckCircle className="h-5 w-5 mr-2" />CONFIRMER {orderTotal.toFixed(2)}€</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="chamfer-hud bg-card/50 p-6 sticky top-4">
              <h2 className="text-sm font-bold hud-text mb-4 pb-3 border-b border-border">VOTRE COMMANDE</h2>
              <div className="space-y-3 mb-4">
                {items.map(item => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-12 h-12 flex-shrink-0 overflow-hidden bg-muted chamfer-hud-sm">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{item.name}</p>
                      {(item.size || item.color) && (
                        <p className="text-xs text-muted-foreground">{item.size}{item.size && item.color ? ' / ' : ''}{item.color}</p>
                      )}
                      <p className="text-xs">×{item.quantity}</p>
                    </div>
                    <span className="text-xs font-bold">{((item.salePrice || item.price) * item.quantity).toFixed(2)}€</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-sm pt-3 border-t border-border">
                <div className="flex justify-between text-muted-foreground">
                  <span>Sous-total</span>
                  <span>{subtotal.toFixed(2)}€</span>
                </div>
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-primary">
                    <span>Réduction</span>
                    <span>-{promoDiscount.toFixed(2)}€</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span className="flex items-center gap-1"><Truck className="h-3 w-3" />Livraison</span>
                  <span>{shippingCost === 0 ? <span className="text-primary">GRATUIT</span> : `${shippingCost.toFixed(2)}€`}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
                  <span>TOTAL</span>
                  <span className="text-primary">{orderTotal.toFixed(2)}€</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3 w-3" />
                <span>Paiement sécurisé par virement bancaire</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
