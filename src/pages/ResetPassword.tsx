import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, KeyRound, CheckCircle2, Mail } from 'lucide-react';

/**
 * Page publique de définition d'un nouveau mot de passe.
 * Cible des liens de récupération envoyés depuis Admin → Rôles.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) { setHasSession(true); setReady(true); }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: 'Mot de passe trop court', description: '8 caractères minimum.', variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Les mots de passe ne correspondent pas', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast({ title: 'Échec', description: error.message, variant: 'destructive' });
      return;
    }
    setDone(true);
    toast({ title: 'Mot de passe enregistré', description: 'Vous êtes connecté.' });
    setTimeout(() => navigate('/'), 1800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-16">
      <Card className="w-full max-w-md p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-[0.2em] uppercase">HELVETICA-MP</h1>
          <p className="text-sm text-muted-foreground">Définir votre mot de passe</p>
        </div>

        {!ready ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : done ? (
          <div className="text-center space-y-3 py-4">
            <CheckCircle2 className="h-10 w-10 mx-auto text-green-500" />
            <p className="text-sm">Mot de passe enregistré. Redirection…</p>
          </div>
        ) : !hasSession ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Ce lien a expiré ou a déjà été utilisé. Saisissez votre adresse e-mail pour
              recevoir un nouveau lien.
            </p>
            <div className="space-y-2">
              <Label htmlFor="resend-email">Votre e-mail</Label>
              <Input id="resend-email" type="email" autoComplete="email" value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)} placeholder="vous@exemple.com" />
            </div>
            <Button onClick={resendLink} className="w-full gap-2" disabled={resending}>
              {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Recevoir un nouveau lien
            </Button>
            <Button variant="outline" onClick={() => navigate('/auth')} className="w-full">
              Retour à la connexion
            </Button>
          </div>

        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <Input id="new-password" type="password" autoComplete="new-password" value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="8 caractères minimum" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer</Label>
              <Input id="confirm-password" type="password" autoComplete="new-password" value={confirm}
                onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Enregistrer le mot de passe
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
