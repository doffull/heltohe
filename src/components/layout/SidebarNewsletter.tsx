import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { subscribeToNewsletter } from '@/hooks/useNewsletterPopups';
import { useApp } from '@/context/AppContext';

export function SidebarNewsletter() {
  const { designSettings } = useApp();
  const [email, setEmail] = useState('');
  const [hp, setHp] = useState(''); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const mountedAt = useRef(Date.now());

  useEffect(() => { mountedAt.current = Date.now(); }, []);

  if (!designSettings.showSidebarNewsletter) return null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hp) return; // bot caught
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
      setEmail('');
    } catch (err: any) {
      if (err?.code === '23505') toast.success('Vous êtes déjà inscrit !');
      else toast.error("Erreur d'inscription");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="px-3 py-3 border-t border-white/10 space-y-2">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/60">
        <Mail className="h-3 w-3" />
        {designSettings.sidebarNewsletterTitle || 'Newsletter'}
      </div>
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
        className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/40"
        disabled={submitting}
      />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        className="w-full h-8 text-[10px] uppercase tracking-wider border-white/20 bg-transparent text-white hover:bg-white/10"
        disabled={submitting}
      >
        {submitting ? '…' : (designSettings.sidebarNewsletterCta || "Je m'inscris")}
      </Button>
    </form>
  );
}
