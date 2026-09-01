import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, MailX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { SeoHead } from '@/components/seo/SeoHead';

type Mode = 'confirm' | 'unsubscribe';
type State = 'loading' | 'ok' | 'already' | 'error';

/** Page publique de confirmation / désabonnement newsletter (double opt-in). */
export default function NewsletterConfirm({ mode }: { mode: Mode }) {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState<State>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setState('error');
        setMessage('Lien invalide : aucun jeton fourni.');
        return;
      }
      const { data, error } = await supabase.functions.invoke('newsletter-confirm', {
        body: { token, action: mode === 'unsubscribe' ? 'unsubscribe' : 'confirm' },
      });
      if (cancelled) return;
      const payload = data as { ok?: boolean; status?: string; error?: string } | null;
      if (error || payload?.error) {
        setState('error');
        setMessage(payload?.error || "Ce lien n'est plus valide.");
        return;
      }
      setState(payload?.status === 'already' ? 'already' : 'ok');
    })();
    return () => {
      cancelled = true;
    };
  }, [token, mode]);

  const title = mode === 'unsubscribe' ? 'Désabonnement' : 'Inscription confirmée';

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <SeoHead title={`${title} — Newsletter`} description="Gestion de votre inscription à notre newsletter." forceNoIndex />
      <div className="chamfer-hud bg-card/50 p-8 max-w-md w-full text-center space-y-4">
        {state === 'loading' && <Loader2 className="h-10 w-10 mx-auto animate-spin text-muted-foreground" />}
        {state === 'error' && <XCircle className="h-10 w-10 mx-auto text-destructive" />}
        {state !== 'loading' && state !== 'error' && (
          mode === 'unsubscribe'
            ? <MailX className="h-10 w-10 mx-auto text-muted-foreground" />
            : <CheckCircle2 className="h-10 w-10 mx-auto text-primary" />
        )}

        <h1 className="text-lg font-bold uppercase tracking-widest">{title}</h1>

        <p className="text-sm text-muted-foreground">
          {state === 'loading' && 'Vérification de votre lien…'}
          {state === 'error' && message}
          {state === 'ok' && mode === 'confirm' && 'Merci ! Votre inscription est confirmée, vous recevrez nos prochaines actualités.'}
          {state === 'already' && mode === 'confirm' && 'Votre inscription était déjà confirmée.'}
          {state !== 'loading' && state !== 'error' && mode === 'unsubscribe' && 'Vous ne recevrez plus nos e-mails. Vous pouvez vous réinscrire à tout moment.'}
        </p>

        <Button asChild variant="outline">
          <Link to="/">Retour à la boutique</Link>
        </Button>
      </div>
    </main>
  );
}
