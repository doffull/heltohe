import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  ChevronRight,
  ArrowLeft,
  Tag,
  Truck,
  Shield
} from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { isKidsProduct } from '@/lib/productFamily';
import KidsNoReturnNotice from '@/components/product/KidsNoReturnNotice';

export default function Cart() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    items, 
    itemCount, 
    subtotal, 
    updateQuantity, 
    removeItem, 
    clearCart,
    applyPromoCode,
    promoDiscount,
    promoCode
  } = useCart();

  /** Le panier n'affiche pas les frais de port : ils sont choisis au checkout. */
  const cartTotal = Math.max(0, subtotal - promoDiscount);


  const { data: catalog = [] } = useProducts();
  const [promoInput, setPromoInput] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const autoTriedRef = useRef(false);

  // Auto-apply roulette reward code if available and not yet applied
  useEffect(() => {
    if (autoTriedRef.current || promoCode || items.length === 0 || subtotal <= 0) return;
    try {
      const raw = localStorage.getItem('roulette_reward_code');
      if (!raw) return;
      const saved = JSON.parse(raw) as { code?: string; expiresAt?: string };
      if (!saved?.code) return;
      if (saved.expiresAt && new Date(saved.expiresAt).getTime() < Date.now()) {
        localStorage.removeItem('roulette_reward_code');
        return;
      }
      autoTriedRef.current = true;
      applyPromoCode(saved.code).then((res) => {
        if (res.success) {
          toast({ title: '🎁 Code roulette appliqué', description: res.message });
        }
      });
    } catch { /* ignore */ }
  }, [items.length, subtotal, promoCode, applyPromoCode, toast]);

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    
    setIsApplyingPromo(true);
    const result = await applyPromoCode(promoInput);
    
    toast({
      title: result.success ? 'Succès' : 'Erreur',
      description: result.message,
      variant: result.success ? 'default' : 'destructive',
    });
    
    if (result.success) {
      setPromoInput('');
    }
    setIsApplyingPromo(false);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="chamfer-hud bg-card/50 p-12 mb-8">
              <ShoppingCart className="h-20 w-20 mx-auto text-muted-foreground mb-6" />
              <h1 className="text-2xl font-bold hud-text mb-4">PANIER VIDE</h1>
              <p className="text-muted-foreground mb-8">
                Votre panier ne contient aucun article.
              </p>
              <Button 
                onClick={() => navigate('/boutique')}
                className="chamfer-hud-sm"
              >
                EXPLORER LA BOUTIQUE
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-xl sm:text-3xl font-bold hud-text flex items-center gap-2 sm:gap-3 flex-wrap">
              <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              MON PANIER
              <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                ({itemCount} {itemCount > 1 ? 'articles' : 'article'})
              </span>
            </h1>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={clearCart}
            className="text-destructive hover:bg-destructive hover:text-destructive-foreground self-start sm:self-auto"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Vider le panier
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div 
                key={item.id}
                className="chamfer-hud bg-card/50 p-3 sm:p-4 flex gap-3 sm:gap-4"
              >
                {/* Product Image */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 chamfer-hud-sm overflow-hidden bg-muted">
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm hud-text truncate">{item.name}</h3>
                  {(item.size || item.color) && (
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 truncate">
                      {item.size && `Taille: ${item.size}`}
                      {item.size && item.color && ' | '}
                      {item.color && `Couleur: ${item.color}`}
                    </p>
                  )}
                  {isKidsProduct(catalog.find((p) => p.id === item.productId)) && (
                    <KidsNoReturnNotice compact className="mt-2" />
                  )}

                  
                  <div className="flex items-center justify-between gap-2 mt-2 sm:mt-3 flex-wrap">
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        aria-label="Diminuer la quantité"
                      >
                        <Minus className="h-3 w-3" aria-hidden="true" />
                      </Button>
                      <span className="w-7 text-center font-bold text-sm" aria-live="polite">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        aria-label="Augmenter la quantité"
                      >
                        <Plus className="h-3 w-3" aria-hidden="true" />
                      </Button>
                      
                      {/* Remove */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => removeItem(item.id)}
                        aria-label="Retirer du panier"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>

                    {/* Price */}
                    <div className="text-right whitespace-nowrap">
                      {item.salePrice ? (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                          <span className="text-[11px] sm:text-sm line-through text-muted-foreground">
                            {(item.price * item.quantity).toFixed(2)}€
                          </span>
                          <span className="font-bold text-sm sm:text-base text-primary">
                            {(item.salePrice * item.quantity).toFixed(2)}€
                          </span>
                        </div>
                      ) : (
                        <span className="font-bold text-sm sm:text-base">
                          {(item.price * item.quantity).toFixed(2)}€
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="chamfer-hud bg-card/50 p-4 sm:p-6 lg:sticky lg:top-4">
              <h2 className="text-lg font-bold hud-text mb-6 pb-4 border-b border-border">
                RÉCAPITULATIF
              </h2>

              {/* Promo Code */}
              <div className="mb-6 pb-6 border-b border-border">
                <label className="text-xs hud-text text-muted-foreground flex items-center gap-2 mb-2">
                  <Tag className="h-3 w-3" />
                  CODE PROMO
                </label>
                {promoCode ? (
                  <div className="flex items-center justify-between bg-primary/10 p-3 rounded">
                    <span className="text-sm font-bold text-primary">{promoCode}</span>
                    <span className="text-sm">-{promoDiscount.toFixed(2)}€</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="VOTRE CODE"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                      className="text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleApplyPromo}
                      disabled={isApplyingPromo}
                    >
                      OK
                    </Button>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span>{subtotal.toFixed(2)}€</span>
                </div>
                
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-primary">
                    <span>Réduction</span>
                    <span>-{promoDiscount.toFixed(2)}€</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    Livraison
                  </span>
                  <span>
                    {shippingCost === 0 ? (
                      <span className="text-primary">GRATUIT</span>
                    ) : (
                      `${shippingCost.toFixed(2)}€`
                    )}
                  </span>
                </div>
                



                
                <div className="flex justify-between text-lg font-bold pt-3 border-t border-border">
                  <span>TOTAL</span>
                  <span className="text-primary">{total.toFixed(2)}€</span>
                </div>
              </div>

              {/* Checkout Button */}
              <Button 
                className="w-full mt-6 chamfer-hud-sm h-12 text-base sm:text-lg text-white hover:opacity-90"
                style={{ backgroundColor: `hsl(var(--step-address))` }}
                onClick={() => navigate('/checkout')}
              >
                PASSER COMMANDE
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>

              {/* Trust badges */}
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    <span>Paiement sécurisé</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Truck className="h-4 w-4" />
                    <span>Livraison rapide</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
