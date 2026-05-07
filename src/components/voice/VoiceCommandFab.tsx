import { useEffect, useRef, useState } from 'react';
import { Mic, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useApp } from '@/context/AppContext';
import { useCart } from '@/context/CartContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Minimal Web Speech API typing
type SR = any;

export function VoiceCommandFab() {
  const { designSettings, products, navigateToProduct } = useApp();
  const { addItem } = useCart() as any;
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const recRef = useRef<SR | null>(null);

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
    rec.start();
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
      speak(message);

      switch (action.type) {
        case 'add_to_cart': {
          const p = products.find(x => x.id === action.productId)
            || products.find(x => x.name.toLowerCase().includes((action.productQuery || '').toLowerCase()));
          if (p) {
            addItem({ ...p, quantity: action.quantity || 1, size: action.size, color: action.color });
            toast.success(`${p.name} ajouté au panier`);
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
          navigate(`/boutique?q=${encodeURIComponent(action.query || text)}`);
          break;
        }
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

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Commande vocale"
        className="fixed bottom-36 right-4 md:bottom-24 md:right-6 z-40 bg-foreground text-background rounded-full w-12 h-12 flex items-center justify-center shadow-2xl hover:scale-105 transition-transform border-2 border-background/20"
      >
        <Mic className="h-5 w-5" />
      </button>
      <Dialog open={open} onOpenChange={(v) => { if (!v) { recRef.current?.stop?.(); } setOpen(v); }}>
        <DialogContent className="max-w-md p-6">
          <DialogTitle className="text-base font-bold uppercase tracking-wider">Commande vocale</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Exemples : « Ajoute le t-shirt noir taille M », « Ouvre mon panier », « Cherche les vestes »
          </p>
          <div className="flex flex-col items-center gap-4 py-4">
            <Button
              onClick={startListening}
              disabled={listening || busy}
              size="lg"
              className="rounded-full w-20 h-20 p-0"
            >
              {listening ? <Loader2 className="h-8 w-8 animate-spin" /> : <Mic className="h-8 w-8" />}
            </Button>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {listening ? 'Parlez…' : busy ? 'Traitement…' : 'Appuyez pour parler'}
            </p>
          </div>
          {transcript && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Vous</div>
              {transcript}
            </div>
          )}
          {reply && (
            <div className="rounded-md bg-foreground/5 p-3 text-sm">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Assistant</div>
              {reply}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
