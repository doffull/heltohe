import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useAdminConfig } from '@/hooks/useAdminConfig';
import { useCheckoutConfig, computeShippingCost } from '@/hooks/useCheckoutConfig';
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

import { PayPalCheckout, type PayPalCheckoutPayload } from '@/components/payments/PayPalCheckout';
import { PayPalMessaging } from '@/components/payments/PayPalMessaging';
import { PayPlugCheckout } from '@/components/payments/PayPlugCheckout';

export default function Checkout() {

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { designSettings } = useApp();
  const { data: adminConfig } = useAdminConfig();
  const { data: checkoutConfig } = useCheckoutConfig();
  const { items, subtotal, promoDiscount, promoCode, total, clearCart } = useCart();

  const [step, setStep] = useState<Step>('address');
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>(() => {
    try {
      const raw = sessionStorage.getItem('voice_checkout');
      if (raw) {
        const d = JSON.parse(raw)?.deliveryMode;
        if (d === 'home' || d === 'relay') return d;
      }
    } catch {}
    return 'relay';
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const payplugEnabled = Boolean(
    checkoutConfig?.paymentMethods?.find(pm => pm.key === 'payplug')?.enabled,
  );
  const [paidMethod, setPaidMethod] = useState<string | null>(null);
  const paidWithPaypal = paidMethod !== null;

  // Retour depuis la page de paiement PayPlug : on vérifie le statut côté serveur.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get('payplug');
    if (!flag) return;
    const num = params.get('order') || '';
    window.history.replaceState({}, '', '/checkout');
    if (flag === 'cancel' || !num) {
      toast({ title: 'Paiement annulé', description: 'Vous pouvez réessayer quand vous le souhaitez.' });
      return;
    }
    (async () => {
      setIsProcessing(true);
      try {
        const { data, error } = await supabase.functions.invoke('payplug', {
          body: { action: 'check-order', orderNumber: num },
        });
        if (error) throw error;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = data as any;
        if (res?.paid) {
          setPaidMethod('PayPlug (carte bancaire)');
          setOrderNumber(num);
          clearCart();
          setStep('confirmation');
        } else {
          toast({
            title: 'Paiement non confirmé',
            description: 'Le paiement PayPlug n’a pas été validé. Veuillez réessayer.',
            variant: 'destructive',
          });
        }
      } catch {
        toast({
          title: 'Vérification impossible',
          description: 'Impossible de vérifier votre paiement PayPlug.',
          variant: 'destructive',
        });
      } finally {
        setIsProcessing(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);




  // Relay point state
  const [relayPoints, setRelayPoints] = useState<RelayPoint[]>([]);
  const [selectedRelay, setSelectedRelay] = useState<RelayPoint | null>(null);
  const [relaySearchZip, setRelaySearchZip] = useState('');
  const [isSearchingRelays, setIsSearchingRelays] = useState(false);

  const voicePrefill = (() => {
    try {
      const raw = sessionStorage.getItem('voice_checkout');
      if (!raw) return null;
      const data = JSON.parse(raw);
      sessionStorage.removeItem('voice_checkout');
      return data;
    } catch { return null; }
  })();
  const va = voicePrefill?.address || {};
  const vName = (va.name || '').trim().split(' ');
  const [form, setForm] = useState({
    firstName: vName[0] || '',
    lastName: vName.slice(1).join(' ') || '',
    email: va.email || user?.email || '',
    phone: va.phone || '',
    address: va.address || '',
    address2: '',
    city: va.city || '',
    zip: va.zip || '',
    country: 'France',
    relayInfo: '',
  });

  const relayCost = computeShippingCost(checkoutConfig, subtotal, 'relay');
  const homeCost = computeShippingCost(checkoutConfig, subtotal, 'home');
  const freeThreshold = checkoutConfig?.freeShippingThreshold ?? 99;
  const shippingCost = deliveryMode === 'relay' ? relayCost : homeCost;

  const orderTotal = subtotal - promoDiscount + shippingCost;
  const tax = orderTotal * 0.2 / 1.2;

  const updateForm = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const validateAddress = () => {
    const required = ['firstName', 'lastName', 'email', 'address', 'city', 'zip'];
    return required.every(f => form[f as keyof typeof form].trim());
  };

  const searchRelayPoints = async (rawZip: string) => {
    const zip = (rawZip || '').replace(/\s+/g, '');
    const dept = parseInt(zip.slice(0, 2), 10);
    const isValidZip = /^\d{5}$/.test(zip) && ((dept >= 1 && dept <= 95) || zip.startsWith('980'));
    if (!isValidZip) {
      toast({ title: 'Code postal invalide', description: 'Saisissez un code postal français valide (01000 à 95999)', variant: 'destructive' });
      return;
    }
    setIsSearchingRelays(true);
    setRelayPoints([]);
    setSelectedRelay(null);
    try {
      const { data, error } = await supabase.functions.invoke('colissimo-proxy', {
        body: { action: 'getRelayPoints', zipCode: zip, city: form.city || '', countryCode: 'FR' },
      });
      if (error && !data) throw error;
      if (data?.error) {
        toast({ title: data.error, description: data.details || undefined, variant: 'destructive' });
        return;
      }
      if (data?.success && data.points?.length > 0) {
        setRelayPoints(data.points.slice(0, 5));
      } else {
        toast({ title: 'Aucun point relais trouvé', description: 'Essayez un autre code postal', variant: 'destructive' });
      }
    } catch (err: any) {
      // `invoke` masque le corps des réponses non-2xx : on le relit pour afficher
      // le vrai motif renvoyé par La Poste (code postal, date, indisponibilité…).
      let details = err?.message || 'Impossible de récupérer les points relais';
      try {
        const raw = await err?.context?.text?.();
        if (raw) details = JSON.parse(raw)?.details || JSON.parse(raw)?.error || raw.slice(0, 200);
      } catch { /* corps illisible : on garde le message générique */ }
      console.error('Relay search error:', details);
      toast({ title: 'Erreur lors de la recherche', description: details, variant: 'destructive' });
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

  /** Charge utile envoyée au serveur PayPal : les prix sont recalculés côté serveur. */
  const buildPaypalPayload = (): PayPalCheckoutPayload | null => {
    if (!items.length) return null;
    if (deliveryMode === 'relay' && !selectedRelay) {
      toast({ title: 'Point relais requis', description: 'Veuillez sélectionner un point relais', variant: 'destructive' });
      return null;
    }
    if (!form.email || !form.firstName || !form.lastName || !form.address || !form.city || !form.zip) {
      toast({ title: 'Adresse incomplète', description: 'Complétez vos coordonnées de livraison', variant: 'destructive' });
      return null;
    }
    const customerAddress = deliveryMode === 'relay' && form.relayInfo
      ? `Point Relais: ${form.relayInfo} — ${form.address}`
      : form.address;

    return {
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
      })),
      promoCode: promoCode || '',
      deliveryMode,
      orderData: {
        order_number: `HMP-${Date.now().toString(36).toUpperCase()}`,
        user_id: user?.id || '',
        customer_email: form.email,
        customer_name: `${form.firstName} ${form.lastName}`,
        customer_phone: form.phone || '',
        customer_address: customerAddress,
        customer_city: form.city,
        customer_zip: form.zip,
        customer_country: form.country,
      },
    };
  };


  const handlePlaceOrder = async () => {
    if (deliveryMode === 'relay' && !selectedRelay) {
      toast({ title: 'Point relais requis', description: 'Veuillez sélectionner un point relais', variant: 'destructive' });
      return;
    }
    setIsProcessing(true);
    try {
      const num = `HMP-${Date.now().toString(36).toUpperCase()}`;

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
      <div className="min-h-screen bg-background flex items-center justify-center p-3 sm:p-4">
        <div className="chamfer-hud bg-card/50 p-5 sm:p-8 max-w-lg w-full text-center space-y-5 sm:space-y-6 border-t-4" style={{ borderTopColor: `hsl(var(--step-confirm))` }}>
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: `hsl(var(--step-confirm)/0.15)` }}>
              <CheckCircle className="h-10 w-10" style={{ color: `hsl(var(--step-confirm))` }} />
            </div>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold hud-text mb-2">COMMANDE CONFIRMÉE</h1>
            <p className="text-muted-foreground text-sm">Merci {form.firstName} ! Votre commande a été enregistrée.</p>
            <p className="text-xs text-muted-foreground mt-1 break-all">N° {orderNumber}</p>
          </div>

          <div className="bg-secondary/30 chamfer-hud-sm p-3 sm:p-4 text-left space-y-3">
            <p className="text-sm font-bold hud-text flex items-center gap-2">
              <Shield className="h-4 w-4" style={{ color: `hsl(var(--step-confirm))` }} />
              INFORMATIONS DE PAIEMENT
            </p>

            {paidWithPaypal ? (
              <>
                <p className="text-[11px] sm:text-xs text-muted-foreground break-words">
                  Votre paiement {paidMethod} a été accepté. Aucune action supplémentaire n'est requise.
                </p>
                <div className="border border-border chamfer-hud-sm p-3 text-[11px] sm:text-xs space-y-1 font-mono">
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground shrink-0">Moyen :</span><span className="text-right break-words">{paidMethod}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground shrink-0">Montant :</span><span className="font-bold" style={{ color: `hsl(var(--step-confirm))` }}>{orderTotal.toFixed(2)} €</span></div>
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground shrink-0">Référence :</span><span className="text-right break-all">{orderNumber}</span></div>
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground break-words">
                  Une confirmation vous sera envoyée à <span className="font-medium text-foreground break-all">{form.email}</span>.
                </p>
              </>
            ) : (
              <>
                <p className="text-[11px] sm:text-xs text-muted-foreground break-words">
                  Votre commande est en attente de paiement. Veuillez effectuer un virement bancaire avec la référence <span className="font-bold text-foreground break-all">{orderNumber}</span>.
                </p>
                <div className="border border-border chamfer-hud-sm p-3 text-[11px] sm:text-xs space-y-1 font-mono">
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground shrink-0">Bénéficiaire :</span><span className="text-right break-words">HELVETICA-MP Concept</span></div>
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground shrink-0">Montant :</span><span className="font-bold" style={{ color: `hsl(var(--step-confirm))` }}>{orderTotal.toFixed(2)} €</span></div>
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground shrink-0">Référence :</span><span className="text-right break-all">{orderNumber}</span></div>
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground break-words">
                  Une confirmation vous sera envoyée à <span className="font-medium text-foreground break-all">{form.email}</span> dès réception du paiement.
                </p>
              </>
            )}

          </div>

          {deliveryMode === 'relay' && selectedRelay && (
            <div className="chamfer-hud-sm p-3 text-left border" style={{ borderColor: `hsl(var(--step-confirm)/0.3)`, backgroundColor: `hsl(var(--step-confirm)/0.1)` }}>
              <p className="text-xs font-bold hud-text mb-1 flex items-center gap-1"><MapPin className="h-3 w-3" style={{ color: `hsl(var(--step-confirm))` }} />POINT RELAIS SÉLECTIONNÉ</p>
              <p className="text-xs text-foreground font-medium break-words">{selectedRelay.nom}</p>
              <p className="text-xs text-muted-foreground break-words">{selectedRelay.adresse1}, {selectedRelay.codePostal} {selectedRelay.localite}</p>
            </div>
          )}

          <div className="chamfer-hud-sm p-3 border" style={{ borderColor: `hsl(var(--step-confirm)/0.3)`, backgroundColor: `hsl(var(--step-confirm)/0.1)` }}>
            <p className="text-xs flex items-start gap-2" style={{ color: `hsl(var(--step-confirm))` }}>
              <Truck className="h-3 w-3 flex-shrink-0 mt-0.5" />
              <span className="break-words text-left">Expédition Colissimo {deliveryMode === 'relay' ? 'Point Relais' : 'Domicile'} dès validation du paiement</span>
            </p>
          </div>

          <Button
            className="w-full chamfer-hud-sm h-12 text-white hover:opacity-90"
            style={{ backgroundColor: `hsl(var(--step-confirm))` }}
            onClick={() => navigate('/boutique')}
          >
            Continuer mes achats
          </Button>
        </div>
      </div>
    );
  }

  const steps: Step[] = ['address', 'delivery', 'confirmation'];
  const stepLabels = { address: 'Adresse', delivery: 'Livraison', confirmation: 'Confirmation' };
  const stepColorVar: Record<Step, string> = {
    address: '--step-address',
    delivery: '--step-delivery',
    confirmation: '--step-confirm',
  };
  const currentColor = `hsl(var(${stepColorVar[step]}))`;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Button variant="ghost" onClick={() => navigate('/panier')} className="mb-3 sm:mb-4 h-9 px-2 sm:px-3">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au panier
          </Button>
          <h1 className="text-lg sm:text-3xl font-bold hud-text flex items-center gap-2 sm:gap-3 flex-wrap">
            <ClipboardCheck className="h-5 w-5 sm:h-8 sm:w-8" style={{ color: currentColor }} />
            FINALISER LA COMMANDE
          </h1>
        </div>

        {/* Progress steps */}
        <div className="flex items-start justify-between gap-1 sm:gap-4 mb-6 sm:mb-8 px-1">
          {steps.map((s, i) => {
            const color = `hsl(var(${stepColorVar[s]}))`;
            const idx = (steps as string[]).indexOf(step);
            const isActive = step === s;
            const isPast = idx > i;
            return (
              <div key={s} className="flex items-center gap-1 sm:gap-2 flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1 min-w-0">
                  <button
                    onClick={() => {
                      if (s === 'address') setStep('address');
                      if (s === 'delivery') setStep('delivery');
                    }}
                    className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-sm font-bold transition-colors"
                    style={{
                      backgroundColor: isActive || isPast ? color : 'hsl(var(--secondary))',
                      color: isActive || isPast ? 'white' : 'hsl(var(--muted-foreground))',
                      opacity: isPast && !isActive ? 0.65 : 1,
                      clipPath: 'polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)',
                    }}
                  >
                    {isPast ? <CheckCircle className="h-4 w-4" /> : i + 1}
                  </button>
                  <span
                    className="text-[10px] sm:text-xs font-medium leading-tight text-center"
                    style={{ color: isActive ? color : 'hsl(var(--muted-foreground))' }}
                  >
                    {stepLabels[s]}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className="h-px flex-1 mt-4 sm:mt-5"
                    style={{ backgroundColor: isPast ? color : 'hsl(var(--border))' }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">

            {/* STEP 1: ADDRESS */}
            {step === 'address' && (
              <div className="chamfer-hud bg-card/50 p-4 sm:p-6 space-y-4 border-l-4" style={{ borderLeftColor: `hsl(var(--step-address))` }}>
                <h2 className="text-base sm:text-lg font-bold hud-text flex items-center gap-2">
                  <Home className="h-5 w-5" style={{ color: `hsl(var(--step-address))` }} />
                  ADRESSE DE LIVRAISON
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label className="hud-text text-xs">PRÉNOM *</Label>
                    <Input value={form.firstName} onChange={e => updateForm('firstName', e.target.value)} className="bg-secondary/50 text-base" maxLength={100} />
                  </div>
                  <div className="space-y-2">
                    <Label className="hud-text text-xs">NOM *</Label>
                    <Input value={form.lastName} onChange={e => updateForm('lastName', e.target.value)} className="bg-secondary/50 text-base" maxLength={100} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label className="hud-text text-xs">EMAIL *</Label>
                    <Input type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} className="bg-secondary/50 text-base" maxLength={255} />
                  </div>
                  <div className="space-y-2">
                    <Label className="hud-text text-xs">TÉLÉPHONE</Label>
                    <Input type="tel" value={form.phone} onChange={e => updateForm('phone', e.target.value)} className="bg-secondary/50 text-base" maxLength={20} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="hud-text text-xs">ADRESSE *</Label>
                  <Input value={form.address} onChange={e => updateForm('address', e.target.value)} placeholder="Numéro et nom de rue" className="bg-secondary/50 text-base" maxLength={300} />
                </div>

                <div className="space-y-2">
                  <Label className="hud-text text-xs">COMPLÉMENT D'ADRESSE</Label>
                  <Input value={form.address2} onChange={e => updateForm('address2', e.target.value)} placeholder="Appartement, étage, etc." className="bg-secondary/50 text-base" maxLength={200} />
                </div>

                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label className="hud-text text-xs">CP *</Label>
                    <Input value={form.zip} onChange={e => updateForm('zip', e.target.value)} className="bg-secondary/50 text-base" maxLength={10} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label className="hud-text text-xs">VILLE *</Label>
                    <Input value={form.city} onChange={e => updateForm('city', e.target.value)} className="bg-secondary/50 text-base" maxLength={100} />
                  </div>
                </div>

                <Button
                  className="w-full chamfer-hud-sm h-12 text-white hover:opacity-90"
                  style={{ backgroundColor: `hsl(var(--step-address))` }}
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
              <div className="chamfer-hud bg-card/50 p-4 sm:p-6 space-y-4 border-l-4" style={{ borderLeftColor: `hsl(var(--step-delivery))` }}>
                <h2 className="text-base sm:text-lg font-bold hud-text flex items-center gap-2">
                  <Truck className="h-5 w-5" style={{ color: `hsl(var(--step-delivery))` }} />
                  MODE DE LIVRAISON
                </h2>

                <p className="text-xs text-muted-foreground">Livraison assurée par Colissimo (La Poste)</p>

                <div className="space-y-3">
                  {/* Relay */}
                  <div
                    className={cn(
                      'border transition-all chamfer-hud-sm',
                      deliveryMode === 'relay' ? 'bg-[hsl(var(--step-delivery)/0.06)]' : 'border-border',
                    )}
                    style={deliveryMode === 'relay' ? { borderColor: `hsl(var(--step-delivery))` } : undefined}
                  >
                    <button
                      onClick={() => setDeliveryMode('relay')}
                      className="w-full p-3 sm:p-4 text-left"
                    >
                      <div className="flex items-start sm:items-center justify-between gap-2">
                        <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                          <div
                            className={cn('w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5 sm:mt-0')}
                            style={{ borderColor: deliveryMode === 'relay' ? `hsl(var(--step-delivery))` : 'hsl(var(--muted-foreground))' }}
                          >
                            {deliveryMode === 'relay' && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: `hsl(var(--step-delivery))` }} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm leading-tight">Colissimo Point Relais</p>
                            <p className="text-[11px] sm:text-xs text-muted-foreground leading-tight mt-0.5">Livraison en 3-5 jours ouvrés</p>
                          </div>
                        </div>
                        <span className="font-bold text-sm whitespace-nowrap shrink-0">
                          {relayCost === 0 ? <span style={{ color: `hsl(var(--step-delivery))` }}>GRATUIT</span> : `${relayCost.toFixed(2)}€`}
                        </span>
                      </div>
                    </button>

                    {deliveryMode === 'relay' && (
                      <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3 border-t border-border pt-3">
                        {/* Relay search */}
                        <div>
                          <Label className="hud-text text-xs mb-2 block">RECHERCHER UN POINT RELAIS</Label>
                          <div className="flex gap-2">
                            <Input
                              value={relaySearchZip}
                              onChange={e => setRelaySearchZip(e.target.value)}
                              placeholder="Code postal (ex: 75001)"
                              className="bg-secondary/50 flex-1 text-base"
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
                          <div className="space-y-2 max-h-72 overflow-y-auto -mx-1 px-1">
                            {relayPoints.map(point => {
                              const isSel = selectedRelay?.identifiant === point.identifiant;
                              return (
                                <button
                                  key={point.identifiant}
                                  onClick={() => selectRelay(point)}
                                  className={cn(
                                    'w-full text-left p-2.5 sm:p-3 chamfer-hud-sm border transition-all',
                                    isSel ? '' : 'border-border hover:border-foreground/30 bg-secondary/20'
                                  )}
                                  style={isSel ? { borderColor: `hsl(var(--step-delivery))`, backgroundColor: `hsl(var(--step-delivery)/0.1)` } : undefined}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start gap-2">
                                        <div
                                          className="w-3 h-3 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5"
                                          style={{ borderColor: isSel ? `hsl(var(--step-delivery))` : 'hsl(var(--muted-foreground))' }}
                                        >
                                          {isSel && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `hsl(var(--step-delivery))` }} />}
                                        </div>
                                        <p className="font-bold text-xs leading-tight break-words flex-1">{point.nom}</p>
                                      </div>
                                      <p className="text-[11px] text-muted-foreground mt-0.5 ml-5 break-words">{point.adresse1}</p>
                                      <p className="text-[11px] text-muted-foreground ml-5">{point.codePostal} {point.localite}</p>
                                      {point.horairesOuvertureLundi && (
                                        <div className="flex items-start gap-1 mt-1 ml-5">
                                          <Clock className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                                          <span className="text-[11px] text-muted-foreground leading-tight">Lun: {formatHoraires(point.horairesOuvertureLundi)} · Sam: {formatHoraires(point.horairesOuvertureSamedi)}</span>
                                        </div>
                                      )}
                                    </div>
                                    {point.distanceEnMetre !== undefined && (
                                      <span className="text-[11px] sm:text-xs font-bold shrink-0" style={{ color: `hsl(var(--step-delivery))` }}>{formatDistance(point.distanceEnMetre)}</span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {selectedRelay && (
                          <div
                            className="flex items-start gap-2 chamfer-hud-sm p-3 border"
                            style={{ borderColor: `hsl(var(--step-delivery)/0.3)`, backgroundColor: `hsl(var(--step-delivery)/0.1)` }}
                          >
                            <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: `hsl(var(--step-delivery))` }} />
                            <div className="text-xs min-w-0 flex-1">
                              <p className="font-bold" style={{ color: `hsl(var(--step-delivery))` }}>Point relais sélectionné</p>
                              <p className="text-foreground break-words">{selectedRelay.nom} — {selectedRelay.adresse1}, {selectedRelay.codePostal} {selectedRelay.localite}</p>
                            </div>
                          </div>
                        )}

                        {!selectedRelay && relayPoints.length === 0 && (
                          <p className="text-[11px] sm:text-xs text-muted-foreground">Recherchez un point relais par code postal pour sélectionner votre lieu de retrait.</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Home */}
                  <button
                    onClick={() => setDeliveryMode('home')}
                    className={cn(
                      'w-full p-3 sm:p-4 text-left border transition-all chamfer-hud-sm',
                      deliveryMode === 'home' ? '' : 'border-border hover:border-foreground/30',
                    )}
                    style={deliveryMode === 'home' ? { borderColor: `hsl(var(--step-delivery))`, backgroundColor: `hsl(var(--step-delivery)/0.06)` } : undefined}
                  >
                    <div className="flex items-start sm:items-center justify-between gap-2">
                      <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                        <div
                          className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5 sm:mt-0"
                          style={{ borderColor: deliveryMode === 'home' ? `hsl(var(--step-delivery))` : 'hsl(var(--muted-foreground))' }}
                        >
                          {deliveryMode === 'home' && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: `hsl(var(--step-delivery))` }} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm leading-tight">Colissimo à Domicile</p>
                          <p className="text-[11px] sm:text-xs text-muted-foreground leading-tight mt-0.5">2-3 jours ouvrés — Suivi inclus</p>
                        </div>
                      </div>
                      <span className="font-bold text-sm whitespace-nowrap shrink-0">
                        {homeCost === 0 ? <span style={{ color: `hsl(var(--step-delivery))` }}>GRATUIT</span> : `${homeCost.toFixed(2)}€`}
                      </span>
                    </div>
                  </button>
                </div>

                {subtotal < freeThreshold && (
                  <div
                    className="px-3 py-2.5 chamfer-hud-sm border"
                    style={{ borderColor: `hsl(var(--step-delivery)/0.3)`, backgroundColor: `hsl(var(--step-delivery)/0.1)` }}
                  >
                    <p className="text-[11px] sm:text-xs" style={{ color: `hsl(var(--step-delivery))` }}>
                      <Truck className="h-3 w-3 inline mr-1" />
                      Plus que {(freeThreshold - subtotal).toFixed(2)}€ pour la livraison gratuite en point relais — domicile {(checkoutConfig?.shippingHomePrice ?? 15).toFixed(2)}€
                    </p>
                  </div>
                )}

                {/* Summary before placing order */}
                <div className="bg-secondary/30 p-3 chamfer-hud-sm">
                  <div className="flex items-start gap-2 text-[11px] sm:text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                    <span className="break-words min-w-0">{form.firstName} {form.lastName} — {form.address}, {form.zip} {form.city}</span>
                  </div>
                </div>

                {/* PayPal : compte PayPal, 3x/4x sans frais, carte & wallets */}
                <div className="space-y-3">
                  <PayPalMessaging amount={orderTotal} placement="payment" />
                  <PayPalCheckout
                    buildPayload={buildPaypalPayload}
                    disabled={isProcessing || (deliveryMode === 'relay' && !selectedRelay)}
                    onPaid={({ orderNumber: num }) => {
                      setPaidMethod('PayPal');
                      setOrderNumber(num);
                      clearCart();
                      setStep('confirmation');
                    }}
                  />
                </div>

                {/* PayPlug : carte bancaire (page de paiement sécurisée) */}
                {payplugEnabled && (
                  <PayPlugCheckout
                    buildPayload={buildPaypalPayload}
                    amount={orderTotal}
                    disabled={isProcessing || (deliveryMode === 'relay' && !selectedRelay)}
                  />
                )}


                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button variant="outline" onClick={() => setStep('address')} className="sm:flex-1 h-11">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour
                  </Button>
                  <Button
                    className="sm:flex-1 chamfer-hud-sm h-12 text-sm sm:text-base font-bold text-white hover:opacity-90"
                    style={{ backgroundColor: `hsl(var(--step-delivery))` }}
                    onClick={handlePlaceOrder}
                    disabled={isProcessing || (deliveryMode === 'relay' && !selectedRelay)}
                  >
                    {isProcessing ? (
                      <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Traitement...</>
                    ) : (
                      <><CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" /><span className="truncate">CONFIRMER {orderTotal.toFixed(2)}€</span></>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="chamfer-hud bg-card/50 p-4 sm:p-6 lg:sticky lg:top-4">
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
                  <span>Sous-total TTC</span>
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
