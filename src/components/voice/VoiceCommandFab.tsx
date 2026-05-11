import { useEffect, useRef, useState } from 'react';
import { Mic, Loader2, Check, ShoppingCart, MapPin, Truck, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useApp } from '@/context/AppContext';
import { useCart } from '@/context/CartContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

type SR = any;
const TEST_MODE_KEY = 'voice_test_mode';
const VOICE_ADDR_KEY = 'voice_address';
const VOICE_DELIVERY_KEY = 'voice_delivery';

interface VoiceCommandFabProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

interface VoiceAddress {
  name?: string;
  address?: string;
  zip?: string;
  city?: string;
  phone?: string;
  email?: string;
}

function describeAction(action: any, products: any[]): string {
  if (!action?.type) return '—';
  const findP = () =>
    products.find((x) => x.id === action.productId) ||
    products.find((x) => x.name?.toLowerCase().includes((action.productQuery || '').toLowerCase()));
  switch (action.type) {
    case 'add_to_cart': {
      const p = findP();
      const qty = action.quantity || 1;
      const parts = [
        `Ajouter ${qty} × ${p?.name || action.productQuery || '?'}`,
        action.size && `taille ${action.size}`,
        action.color && `couleur ${action.color}`,
      ].filter(Boolean);
      return `${parts.join(' · ')} au panier`;
    }
    case 'remove_from_cart': {
      const p = findP();
      return `Retirer ${p?.name || action.productQuery || '?'} du panier`;
    }
    case 'navigate':
      return `Ouvrir ${action.destination || ''}`;
    case 'search':
      return `Rechercher : « ${action.query} »`;
    case 'set_address':
      return `Adresse : ${[action.address?.name, action.address?.address, action.address?.zip, action.address?.city].filter(Boolean).join(', ')}`;
    case 'set_delivery':
      return `Livraison : ${action.deliveryMode === 'home' ? 'à domicile' : 'point relais'}`;
    case 'apply_promo':
      return `Appliquer le code ${action.promoCode}`;
    case 'place_order':
      return 'Valider et passer la commande';
    case 'read_cart':
      return 'Lire le panier';
    case 'clarify':
      return 'Demander une précision';
    default:
      return action.type;
  }
}

export function VoiceCommandFab({ open: openProp, onOpenChange, hideTrigger }: VoiceCommandFabProps = {}) {
  const { designSettings, products, navigateToProduct } = useApp();
  const cart = useCart() as any;
  const { addItem, items, subtotal, total } = cart;
  const navigate = useNavigate();
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp !== undefined ? openProp : openInternal;
  const setOpen = (v: boolean) => {
    onOpenChange?.(v);
    if (openProp === undefined) setOpenInternal(v);
  };
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ action: any; message: string } | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [testMode, setTestMode] = useState<boolean>(() => {
    try { return localStorage.getItem(TEST_MODE_KEY) !== 'off'; } catch { return true; }
  });
  const [address, setAddress] = useState<VoiceAddress>(() => {
    try { return JSON.parse(localStorage.getItem(VOICE_ADDR_KEY) || '{}'); } catch { return {}; }
  });
  const [deliveryMode, setDeliveryMode] = useState<string>(() => {
    try { return localStorage.getItem(VOICE_DELIVERY_KEY) || ''; } catch { return ''; }
  });
  const recRef = useRef<SR | null>(null);

  useEffect(() => {
    try { localStorage.setItem(TEST_MODE_KEY, testMode ? 'on' : 'off'); } catch {}
  }, [testMode]);
  useEffect(() => {
    try { localStorage.setItem(VOICE_ADDR_KEY, JSON.stringify(address)); } catch {}
  }, [address]);
  useEffect(() => {
    try { localStorage.setItem(VOICE_DELIVERY_KEY, deliveryMode); } catch {}
  }, [deliveryMode]);

  if (!designSettings.voiceCommandEnabled) return null;

  const speak = (text: string) => {
    try {
      if (!text) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'fr-FR';
      u.rate = 1.05;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch { /* ignore */ }
  };

  const startListening = () => {
    const SpeechRecognition: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Reconnaissance vocale non supportée par ce navigateur");
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = 'fr-FR';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setTranscript(text);
      setListening(false);
      handleCommand(text);
    };
    rec.onerror = () => { setListening(false); toast.error("Erreur micro"); };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    setTranscript('');
    setReply('');
    setPending(null);
    rec.start();
  };

  const addressComplete = (a: VoiceAddress) =>
    !!(a.name && a.address && a.zip && a.city && a.phone);

  const executeAction = async (action: any) => {
    switch (action?.type) {
      case 'add_to_cart': {
        const p = products.find((x) => x.id === action.productId)
          || products.find((x) => x.name.toLowerCase().includes((action.productQuery || '').toLowerCase()));
        if (p) {
          addItem({ ...p, quantity: action.quantity || 1, size: action.size, color: action.color });
          toast.success(`${p.name} ajouté au panier`);
        } else {
          toast.error('Produit introuvable');
        }
        break;
      }
      case 'navigate': {
        if (action.destination === 'cart') navigate('/panier');
        else if (action.destination === 'checkout') navigate('/checkout');
        else if (action.destination === 'shop') navigate('/boutique');
        else if (action.destination === 'home') navigate('/');
        else if (action.destination === 'product') {
          const p = products.find((x) => x.id === action.productId)
            || products.find((x) => x.name.toLowerCase().includes((action.productQuery || '').toLowerCase()));
          if (p) navigateToProduct(p);
        }
        break;
      }
      case 'search':
        navigate(`/boutique?q=${encodeURIComponent(action.query || transcript)}`);
        break;
      case 'search_products':
      case 'recommend': {
        try {
          const lite = products.slice(0, 120).map((p) => ({
            id: p.id, name: p.name, category: p.category, price: p.price,
            sizes: p.sizes, colors: p.colors, description: p.description,
          }));
          const { data, error } = await supabase.functions.invoke('voice-command', {
            body: { mode: action.type === 'recommend' ? 'recommend' : 'search', transcript: action.query || transcript, products: lite },
          });
          if (error) throw error;
          const ids: string[] = data?.productIds || [];
          const found = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean);
          setResults(found);
          const spoken = data?.spoken || (found.length ? `J'ai trouvé ${found.length} produit${found.length > 1 ? 's' : ''}` : 'Aucun résultat');
          speak(spoken);
          setReply(spoken);
        } catch (e) {
          toast.error('Recherche impossible');
        }
        break;
      }
      case 'select_result': {
        const idx = (action.resultIndex || 1) - 1;
        const p = results[idx];
        if (!p) {
          speak('Je n\'ai pas trouvé ce résultat. Reformulez votre choix.');
          break;
        }
        addItem({ ...p, quantity: action.quantity || 1, size: action.size, color: action.color });
        speak(`${p.name} ajouté au panier`);
        toast.success(`${p.name} ajouté au panier`);
        break;
      }
      case 'set_address': {
        const next = { ...address, ...(action.address || {}) };
        setAddress(next);
        toast.success('Adresse enregistrée');
        break;
      }
      case 'set_delivery':
        setDeliveryMode(action.deliveryMode || '');
        toast.success(`Livraison ${action.deliveryMode === 'home' ? 'à domicile' : 'en point relais'}`);
        break;
      case 'apply_promo':
        if (cart.applyPromoCode && action.promoCode) {
          await cart.applyPromoCode(action.promoCode);
        } else if (action.promoCode) {
          // Fallback: persist for checkout
          try { sessionStorage.setItem('voice_promo', action.promoCode); } catch {}
          toast.info(`Code ${action.promoCode} mémorisé pour le checkout`);
        }
        break;
      case 'read_cart': {
        const summary = items.length === 0
          ? 'Votre panier est vide.'
          : `${items.length} article${items.length > 1 ? 's' : ''} dans votre panier. Total : ${total.toFixed(2)} euros.`;
        speak(summary);
        toast.message(summary);
        break;
      }
      case 'place_order': {
        if (items.length === 0) {
          speak('Votre panier est vide');
          toast.error('Panier vide');
          break;
        }
        // Persist voice context for checkout pre-fill
        try {
          sessionStorage.setItem('voice_checkout', JSON.stringify({ address, deliveryMode }));
        } catch {}
        navigate('/checkout');
        speak('Direction le paiement');
        break;
      }
    }
  };

  const handleCommand = async (text: string) => {
    setBusy(true);
    try {
      const lite = products.slice(0, 80).map((p) => ({
        id: p.id, name: p.name, category: p.category, price: p.price, sizes: p.sizes,
      }));
      const ctx = {
        cart: items.map((i: any) => ({
          name: i.name, quantity: i.quantity, size: i.size, color: i.color, price: i.price,
        })),
        address,
        deliveryMode,
      };
      const { data, error } = await supabase.functions.invoke('voice-command', {
        body: { transcript: text, products: lite, context: ctx },
      });
      if (error) throw error;

      // Backend can return a structured error payload
      if (data?.error && !data?.action) {
        const userMessage: string = data.userMessage || 'Service vocal indisponible';
        setReply(userMessage);
        toast.error(userMessage);
        return;
      }

      const action = data?.action || {};
      const message: string = data?.message || data?.userMessage || 'OK';
      setReply(message);

      // If backend ran in degraded mode, surface it discreetly
      if (data?.degraded) {
        toast.message('Mode vocal dégradé', {
          description: data.userMessage || 'L\'IA est temporairement indisponible, commandes simples uniquement.',
        });
      }

      const sensitive = ['add_to_cart', 'place_order', 'set_address', 'remove_from_cart', 'apply_promo'].includes(action.type);
      if (testMode && sensitive) {
        setPending({ action, message });
        speak(message);
      } else {
        speak(message);
        await executeAction(action);
      }
    } catch (e: any) {
      // Network / unknown errors
      const status = e?.context?.status ?? e?.status;
      let msg = "Service vocal indisponible. Réessayez dans un instant.";
      if (status === 429 || /429/.test(e?.message || '')) msg = 'Trop de requêtes, patientez un instant.';
      else if (status === 402 || /402/.test(e?.message || '')) msg = 'Crédits IA épuisés — le service vocal est temporairement indisponible.';
      else if (status === 400) msg = 'Phrase vocale non comprise.';
      setReply(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const confirmPending = async () => {
    if (!pending) return;
    await executeAction(pending.action);
    setPending(null);
  };

  const Step = ({ done, icon: Icon, label }: any) => (
    <div className={`flex flex-col items-center gap-1 flex-1 ${done ? 'text-foreground' : 'text-muted-foreground/50'}`}>
      <div className={`h-7 w-7 flex items-center justify-center border ${done ? 'border-foreground bg-foreground text-background' : 'border-border'}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="text-[9px] uppercase tracking-wider">{label}</span>
    </div>
  );

  return (
    <>
      {!hideTrigger && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Commande vocale"
          className="fixed bottom-36 right-4 md:bottom-24 md:right-6 z-40 bg-foreground text-background w-12 h-12 flex items-center justify-center shadow-2xl hover:scale-105 transition-transform border border-foreground/20"
          style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
        >
          <Mic className="h-5 w-5" />
        </button>
      )}
      <Dialog open={open} onOpenChange={(v) => { if (!v) { recRef.current?.stop?.(); window.speechSynthesis?.cancel(); } setOpen(v); }}>
        <DialogContent className="max-w-md p-6 border-2 border-foreground/20 bg-background max-h-[90vh] overflow-y-auto">
          <DialogTitle className="text-base font-bold uppercase tracking-wider">Achat vocal</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Dites par exemple : « Ajoute le t-shirt noir taille M », « Mon adresse est… », « Livraison à domicile », « Je confirme ma commande ».
          </p>

          {/* Stepper */}
          <div className="flex items-center justify-between gap-1 py-3 border-y border-border">
            <Step done={items.length > 0} icon={ShoppingCart} label="Panier" />
            <Step done={addressComplete(address)} icon={MapPin} label="Adresse" />
            <Step done={!!deliveryMode} icon={Truck} label="Livraison" />
            <Step done={false} icon={Check} label="Confirmé" />
          </div>

          <div className="flex items-center justify-between gap-2 py-2 border-b border-border">
            <Label htmlFor="voice-test" className="text-xs uppercase tracking-wider cursor-pointer">
              Mode test (confirmation avant action)
            </Label>
            <Switch id="voice-test" checked={testMode} onCheckedChange={setTestMode} />
          </div>

          <div className="flex flex-col items-center gap-3 py-3">
            <Button
              onClick={startListening}
              disabled={listening || busy}
              size="lg"
              className="w-16 h-16 p-0"
              style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
            >
              {listening ? <Loader2 className="h-6 w-6 animate-spin" /> : <Mic className="h-6 w-6" />}
            </Button>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {listening ? 'Parlez…' : busy ? 'Traitement…' : 'Appuyez pour parler'}
            </p>
          </div>

          {transcript && (
            <div className="border border-border p-3 text-sm">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Transcription</div>
              {transcript}
            </div>
          )}

          {pending && (
            <div className="border-2 border-foreground p-3 space-y-3 bg-foreground/5 mt-2">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Action reconnue</div>
                <div className="text-sm font-medium">{describeAction(pending.action, products)}</div>
              </div>
              {pending.message && (
                <div className="text-xs text-muted-foreground italic">« {pending.message} »</div>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 text-xs uppercase tracking-wider" onClick={() => { setPending(null); startListening(); }}>
                  Réessayer
                </Button>
                <Button size="sm" className="flex-1 text-xs uppercase tracking-wider gap-1" onClick={confirmPending}>
                  <Check className="h-3 w-3" /> Confirmer
                </Button>
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="border-2 border-foreground/30 mt-2 divide-y divide-border">
              <div className="px-3 py-2 text-[10px] uppercase tracking-wider bg-foreground/5 flex items-center justify-between">
                <span>{results.length} résultat{results.length > 1 ? 's' : ''}</span>
                <button onClick={() => setResults([])} className="text-muted-foreground hover:text-foreground">×</button>
              </div>
              {results.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 p-2">
                  <div className="text-[10px] font-bold w-5 text-center">{i + 1}</div>
                  <img src={p.image || '/placeholder.svg'} alt={p.name} className="w-12 h-12 object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{p.name}</div>
                    <div className="text-[10px] text-muted-foreground">{(p.salePrice ?? p.price)?.toFixed?.(2)} €</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[10px] uppercase tracking-wider h-7"
                    onClick={() => { addItem({ ...p, quantity: 1 }); toast.success(`${p.name} ajouté`); speak(`${p.name} ajouté au panier`); }}
                  >
                    + Panier
                  </Button>
                </div>
              ))}
              <div className="px-3 py-2 text-[10px] text-muted-foreground italic">
                Dites par exemple : « Ajoute le numéro 2 en taille M »
              </div>
            </div>
          )}

          {!pending && reply && (
            <div className="border border-border p-3 text-sm bg-muted/30 mt-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Assistant</div>
              {reply}
            </div>
          )}

          {/* Context snapshot */}
          {(addressComplete(address) || deliveryMode || items.length > 0) && (
            <div className="text-[10px] text-muted-foreground space-y-1 pt-2 border-t border-border mt-2">
              {items.length > 0 && (
                <div className="flex items-center gap-1"><ShoppingCart className="h-3 w-3" /> {items.length} article{items.length > 1 ? 's' : ''} · {subtotal.toFixed(2)}€</div>
              )}
              {address.address && (
                <div className="flex items-start gap-1"><MapPin className="h-3 w-3 mt-0.5" /> <span className="truncate">{[address.name, address.address, address.zip, address.city].filter(Boolean).join(', ')}</span></div>
              )}
              {deliveryMode && (
                <div className="flex items-center gap-1"><Truck className="h-3 w-3" /> {deliveryMode === 'home' ? 'Domicile' : 'Point relais'}</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
