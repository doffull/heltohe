import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  Truck,
  MapPin,
  CreditCard,
  Shield,
  Package,
  CheckCircle,
  Loader2,
  Home,
  Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';

type DeliveryMode = 'home' | 'relay';
type Step = 'address' | 'delivery' | 'payment';

const COLISSIMO_RATES = {
  home: 6.5,
  relay: 4.5,
  free_threshold: 200,
};

export default function Checkout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { items, subtotal, promoDiscount, total, clearCart } = useCart();

  const [step, setStep] = useState<Step>('address');
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('relay');
  const [isProcessing, setIsProcessing] = useState(false);

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

  const shippingCost = subtotal >= COLISSIMO_RATES.free_threshold ? 0 : COLISSIMO_RATES[deliveryMode];
  const orderTotal = subtotal - promoDiscount + shippingCost;
  const tax = orderTotal * 0.2 / 1.2;

  const updateForm = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const validateAddress = () => {
    const required = ['firstName', 'lastName', 'email', 'address', 'city', 'zip'];
    return required.every(f => form[f as keyof typeof form].trim());
  };

  const handlePayment = async () => {
    if (!validateAddress()) {
      toast({ title: 'Formulaire incomplet', description: 'Veuillez remplir tous les champs obligatoires.', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);

    try {
      // Generate order number
      const orderNumber = `LVTK-${Date.now().toString(36).toUpperCase()}`;

      // Create order in DB
      const orderItems = items.map(item => ({
        productId: item.productId,
        name: item.name,
        price: item.salePrice || item.price,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        image: item.image,
      }));

      const { data: order, error: orderError } = await supabase.from('orders').insert({
        order_number: orderNumber,
        user_id: user?.id || null,
        customer_email: form.email,
        customer_name: `${form.firstName} ${form.lastName}`,
        customer_phone: form.phone || null,
        customer_address: deliveryMode === 'relay' && form.relayInfo
          ? `Point Relais: ${form.relayInfo} — ${form.address}`
          : form.address,
        customer_city: form.city,
        customer_zip: form.zip,
        customer_country: form.country,
        items: orderItems,
        subtotal: subtotal - promoDiscount,
        shipping_cost: shippingCost,
        tax: tax,
        total: orderTotal,
        payment_method: 'payplug',
        payment_status: 'pending',
        status: 'pending',
        shipping_carrier: 'colissimo',
      }).select().single();

      if (orderError) throw orderError;

      // Call PayPlug edge function
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('payplug-checkout', {
        body: {
          orderId: order.id,
          orderNumber,
          amount: Math.round(orderTotal * 100), // centimes
          currency: 'EUR',
          customer: {
            email: form.email,
            first_name: form.firstName,
            last_name: form.lastName,
          },
          successUrl: `${window.location.origin}/commande-confirmee?order=${orderNumber}`,
          cancelUrl: `${window.location.origin}/checkout`,
        },
      });

      if (paymentError || !paymentData?.payment_url) {
        // If PayPlug not configured, show demo success
        if (paymentError?.message?.includes('PAYPLUG_SECRET_KEY')) {
          toast({
            title: '⚙️ PayPlug non configuré',
            description: 'Ajoutez votre clé secrète PayPlug dans les paramètres admin.',
            variant: 'destructive',
          });
          setIsProcessing(false);
          return;
        }
        throw paymentError || new Error('No payment URL');
      }

      // Redirect to PayPlug
      clearCart();
      window.location.href = paymentData.payment_url;

    } catch (err) {
      console.error('Checkout error:', err);
      toast({
        title: 'Erreur lors du paiement',
        description: 'Veuillez réessayer ou contacter le support.',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
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
            <CreditCard className="h-8 w-8 text-primary" />
            FINALISER LA COMMANDE
          </h1>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-4 mb-8">
          {(['address', 'delivery', 'payment'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (s === 'address') setStep('address');
                  if (s === 'delivery' && step === 'payment') setStep('delivery');
                }}
                className={cn(
                  'w-8 h-8 flex items-center justify-center text-sm font-bold transition-colors',
                  step === s ? 'bg-primary text-primary-foreground' :
                  (step === 'delivery' && s === 'address') || (step === 'payment') ? 'bg-foreground/20 text-foreground' : 'bg-secondary text-muted-foreground',
                )}
                style={{ clipPath: 'polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%)' }}
              >
                {(step === 'delivery' && s === 'address') || step === 'payment' && s !== 'payment' ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </button>
              <span className={cn('text-xs font-medium hidden sm:block', step === s ? 'text-foreground' : 'text-muted-foreground')}>
                {s === 'address' ? 'Adresse' : s === 'delivery' ? 'Livraison' : 'Paiement'}
              </span>
              {i < 2 && <div className="w-8 h-px bg-border" />}
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="hud-text text-xs">PRÉNOM *</Label>
                    <Input value={form.firstName} onChange={e => updateForm('firstName', e.target.value)} className="bg-secondary/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="hud-text text-xs">NOM *</Label>
                    <Input value={form.lastName} onChange={e => updateForm('lastName', e.target.value)} className="bg-secondary/50" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="hud-text text-xs">EMAIL *</Label>
                    <Input type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} className="bg-secondary/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="hud-text text-xs">TÉLÉPHONE</Label>
                    <Input type="tel" value={form.phone} onChange={e => updateForm('phone', e.target.value)} className="bg-secondary/50" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="hud-text text-xs">ADRESSE *</Label>
                  <Input value={form.address} onChange={e => updateForm('address', e.target.value)} placeholder="Numéro et nom de rue" className="bg-secondary/50" />
                </div>

                <div className="space-y-2">
                  <Label className="hud-text text-xs">COMPLÉMENT D'ADRESSE</Label>
                  <Input value={form.address2} onChange={e => updateForm('address2', e.target.value)} placeholder="Appartement, étage, etc." className="bg-secondary/50" />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="hud-text text-xs">CODE POSTAL *</Label>
                    <Input value={form.zip} onChange={e => updateForm('zip', e.target.value)} className="bg-secondary/50" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label className="hud-text text-xs">VILLE *</Label>
                    <Input value={form.city} onChange={e => updateForm('city', e.target.value)} className="bg-secondary/50" />
                  </div>
                </div>

                <Button
                  className="w-full chamfer-hud-sm h-12"
                  onClick={() => {
                    if (!validateAddress()) {
                      toast({ title: 'Champs obligatoires manquants', variant: 'destructive' });
                      return;
                    }
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
                  <button
                    onClick={() => setDeliveryMode('relay')}
                    className={cn(
                      'w-full p-4 text-left border transition-all chamfer-hud-sm',
                      deliveryMode === 'relay' ? 'border-primary bg-primary/5' : 'border-border hover:border-foreground/30',
                    )}
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
                        {subtotal >= COLISSIMO_RATES.free_threshold ? <span className="text-primary">GRATUIT</span> : `${COLISSIMO_RATES.relay.toFixed(2)}€`}
                      </span>
                    </div>
                    {deliveryMode === 'relay' && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <Label className="hud-text text-xs">INDIQUER VOTRE POINT RELAIS PRÉFÉRÉ</Label>
                        <Input
                          value={form.relayInfo}
                          onChange={e => updateForm('relayInfo', e.target.value)}
                          placeholder="Nom ou adresse du point relais (optionnel)"
                          className="mt-2 bg-secondary/50 text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Nous vous contacterons pour confirmer le point relais disponible à proximité.</p>
                      </div>
                    )}
                  </button>

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
                        {subtotal >= COLISSIMO_RATES.free_threshold ? <span className="text-primary">GRATUIT</span> : `${COLISSIMO_RATES.home.toFixed(2)}€`}
                      </span>
                    </div>
                  </button>
                </div>

                {subtotal < COLISSIMO_RATES.free_threshold && (
                  <div className="bg-primary/10 border border-primary/20 px-4 py-3 chamfer-hud-sm">
                    <p className="text-xs text-primary">
                      <Truck className="h-3 w-3 inline mr-1" />
                      Plus que {(COLISSIMO_RATES.free_threshold - subtotal).toFixed(2)}€ d'achats pour la livraison gratuite en point relais !
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('address')} className="flex-1">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour
                  </Button>
                  <Button className="flex-1 chamfer-hud-sm h-12" onClick={() => setStep('payment')}>
                    Continuer vers le paiement
                    <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: PAYMENT */}
            {step === 'payment' && (
              <div className="chamfer-hud bg-card/50 p-6 space-y-4">
                <h2 className="text-lg font-bold hud-text flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  PAIEMENT SÉCURISÉ
                </h2>

                {/* Summary */}
                <div className="bg-secondary/30 p-4 chamfer-hud-sm space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <MapPin className="h-3 w-3" />
                    <span>{form.firstName} {form.lastName} — {form.address}, {form.zip} {form.city}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Truck className="h-3 w-3" />
                    <span>Colissimo {deliveryMode === 'relay' ? 'Point Relais' : 'Domicile'} — {shippingCost === 0 ? 'GRATUIT' : `${shippingCost.toFixed(2)}€`}</span>
                  </div>
                </div>

                {/* PayPlug */}
                <div className="border border-border chamfer-hud p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary text-primary-foreground px-3 py-1 text-xs font-bold">PayPlug</div>
                    <span className="text-sm text-muted-foreground">Paiement 100% sécurisé</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Vous serez redirigé vers la page de paiement sécurisée PayPlug pour finaliser votre commande par carte bancaire.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    <span>Cryptage SSL 256-bit — Certifié PCI DSS</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('delivery')} className="flex-1">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour
                  </Button>
                  <Button
                    className="flex-1 chamfer-hud-sm h-12 text-base font-bold"
                    onClick={handlePayment}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Traitement...</>
                    ) : (
                      <><CreditCard className="h-5 w-5 mr-2" />PAYER {orderTotal.toFixed(2)}€</>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
