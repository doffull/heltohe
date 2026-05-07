import { useEffect, useRef, useState } from 'react';
import { Mic, Loader2, ArrowRight, Check } from 'lucide-react';
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

interface VoiceCommandFabProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
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
    case 'navigate': {
      if (action.destination === 'cart') return 'Ouvrir le panier';
      if (action.destination === 'checkout') return 'Aller au paiement';
      if (action.destination === 'shop') return 'Ouvrir la boutique';
      if (action.destination === 'product') return `Ouvrir la fiche produit ${findP()?.name || action.productQuery || ''}`;
      return 'Naviguer';
    }
    case 'search':
      return `Rechercher : « ${action.query} »`;
    case 'clarify':
      return 'Demander une précision';
    default:
      return action.type;
  }
}

export function VoiceCommandFab({ open: openProp, onOpenChange, hideTrigger }: VoiceCommandFabProps = {}) {
  const { designSettings, products, navigateToProduct } = useApp();
  const { addItem } = useCart() as any;
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
  const [testMode, setTestMode] = useState<boolean>(() => {
    try { return localStorage.getItem(TEST_MODE_KEY) !== 'off'; } catch { return true; }
  });
  const recRef = useRef<SR | null>(null);

  useEffect(() => {
    try { localStorage.setItem(TEST_MODE_KEY, testMode ? 'on' : 'off'); } catch {}
  }, [testMode]);

  if (!designSettings.voiceCommandEnabled) return null;

  const speak = (text: string) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'fr-FR';
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

  const executeAction = (action: any) => {
    switch (action?.type) {
      case 'add_to_cart': {
        const p = products.find(x => x.id === action.productId)
          || products.find(x => x.name.toLowerCase().includes((action.productQuery || '').toLowerCase()));
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
        else if (action.destination === 'product') {
          const p = products.find(x => x.id === action.productId)
            || products.find(x => x.name.toLowerCase().includes((action.productQuery || '').toLowerCase()));
          if (p) navigateToProduct(p);
        }
        break;
      }
      case 'search': {
        navigate(`/boutique?q=${encodeURIComponent(action.query || transcript)}`);
        break;
      }
    }
  };

  const handleCommand = async (text: string) => {
    setBusy(true);
    try {
      const lite = products.slice(0, 50).map(p => ({
        id: p.id, name: p.name, category: p.category, price: p.price, sizes: p.sizes,
      }));
      const { data, error } = await supabase.functions.invoke('voice-command', {
        body: { transcript: text, products: lite },
      });
      if (error) throw error;
      const action = data?.action || {};
      const message: string = data?.message || 'OK';
      setReply(message);

      if (testMode) {
        setPending({ action, message });
      } else {
        speak(message);
        executeAction(action);
      }
    } catch (e: any) {
      const msg = e?.message?.includes('429')
        ? 'Trop de requêtes, réessayez dans un instant'
        : "Erreur lors du traitement vocal";
      setReply(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const confirmPending = () => {
    if (!pending) return;
    speak(pending.message);
    executeAction(pending.action);
    setPending(null);
    setOpen(false);
  };

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
      <Dialog open={open} onOpenChange={(v) => { if (!v) { recRef.current?.stop?.(); } setOpen(v); }}>
        <DialogContent className="max-w-md p-6 border-2 border-foreground/20 bg-background">
          <DialogTitle className="text-base font-bold uppercase tracking-wider">Commande vocale</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Exemples : « Ajoute le t-shirt noir taille M », « Ouvre mon panier », « Cherche les vestes »
          </p>

          <div className="flex items-center justify-between gap-2 py-2 border-y border-border">
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
            <div className="border-2 border-foreground p-3 space-y-3 bg-foreground/5">
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

          {!pending && reply && (
            <div className="border border-border p-3 text-sm bg-muted/30">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Assistant</div>
              {reply}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
