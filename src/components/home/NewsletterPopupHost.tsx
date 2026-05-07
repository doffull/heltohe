import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useActiveNewsletterPopups, subscribeToNewsletter, recordPopupView, type NewsletterPopup } from '@/hooks/useNewsletterPopups';

const SEEN_KEY = (id: string) => `nl_popup_seen_${id}`;
const SESSION_KEY = 'nl_popup_session';
function getSessionId() {
  let s = sessionStorage.getItem(SESSION_KEY);
  if (!s) { s = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem(SESSION_KEY, s); }
  return s;
}

export function NewsletterPopupHost() {
  const { data: popups = [] } = useActiveNewsletterPopups();
  const [active, setActive] = useState<NewsletterPopup | null>(null);
  const [email, setEmail] = useState('');
  const [hp, setHp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const mountedAt = useRef(Date.now());
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (triggeredRef.current || popups.length === 0) return;
    const eligible = popups.find((p) => {
      const seen = localStorage.getItem(SEEN_KEY(p.id));
      if (!seen) return true;
      const ageDays = (Date.now() - Number(seen)) / 86400_000;
      return ageDays >= p.frequency_days;
    });
    if (!eligible) return;
    triggeredRef.current = true;

    const open = () => setActive(eligible);

    if (eligible.display_trigger === 'on_load') {
      open();
      return;
    }
    if (eligible.display_trigger === 'delay') {
      const t = setTimeout(open, (eligible.delay_seconds || 5) * 1000);
      return () => clearTimeout(t);
    }
    if (eligible.display_trigger === 'scroll_50') {
      const onScroll = () => {
        const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight);
        if (pct >= 0.5) {
          open();
          window.removeEventListener('scroll', onScroll);
        }
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => window.removeEventListener('scroll', onScroll);
    }
    if (eligible.display_trigger === 'exit_intent') {
      const onLeave = (e: MouseEvent) => {
        if (e.clientY <= 0) {
          open();
          document.removeEventListener('mouseleave', onLeave);
        }
      };
      document.addEventListener('mouseleave', onLeave);
      return () => document.removeEventListener('mouseleave', onLeave);
    }
  }, [popups]);

  const close = () => {
    if (active) localStorage.setItem(SEEN_KEY(active.id), String(Date.now()));
    setActive(null);
    setEmail('');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hp) return;
    if (Date.now() - mountedAt.current < 3000) {
      toast.error('Veuillez patienter');
      return;
    }
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error('Email invalide');
      return;
    }
    setSubmitting(true);
    try {
      await subscribeToNewsletter(email);
      toast.success('Merci pour votre inscription !');
      close();
    } catch (err: any) {
      if (err?.code === '23505') {
        toast.success('Vous êtes déjà inscrit !');
        close();
      } else toast.error("Erreur d'inscription");
    } finally {
      setSubmitting(false);
    }
  };

  if (!active) return null;

  return (
    <Dialog open={!!active} onOpenChange={(v) => !v && close()}>
      <DialogContent
        className="max-w-md p-0 overflow-hidden border-0"
        style={{ background: active.bg_color || '#000', color: active.text_color || '#fff' }}
      >
        <DialogTitle className="sr-only">{active.title}</DialogTitle>
        <button
          onClick={close}
          className="absolute right-3 top-3 z-20 p-1.5 rounded-full bg-white/10 hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </button>
        {active.image_url && (
          <img src={active.image_url} alt="" className="w-full h-40 object-cover" />
        )}
        <div className="p-6 text-center space-y-4">
          <Mail className="h-8 w-8 mx-auto opacity-80" />
          <h2 className="text-xl font-bold uppercase tracking-wider">{active.title}</h2>
          {active.subtitle && <p className="text-sm opacity-80">{active.subtitle}</p>}
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="text"
              value={hp}
              onChange={(e) => setHp(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
            />
            <Input
              type="email"
              placeholder="email@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-center bg-white/10 border-white/20 text-current placeholder:text-current/50"
              disabled={submitting}
            />
            <Button
              type="submit"
              className="w-full font-bold uppercase tracking-wider"
              variant="secondary"
              disabled={submitting}
            >
              {submitting ? '…' : active.cta_label}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
