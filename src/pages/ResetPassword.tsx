import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, Eye, EyeOff } from 'lucide-react';

/**
 * Page publique de choix d'un nouveau mot de passe.
 * Le lien de récupération ouvre cette page avec une session « recovery » :
 * on ne demande donc pas l'ancien mot de passe.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const submit = async () => {
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
    toast({ title: 'Mot de passe mis à jour', description: 'Vous êtes connecté.' });
    navigate('/');
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16 bg-background">
      <div className="w-full max-w-md chamfer-hud bg-card/60 border border-border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          <h1 className="text-lg font-bold hud-text">NOUVEAU MOT DE PASSE</h1>
        </div>

        {!ready ? (
          <p className="text-sm text-muted-foreground">Vérification du lien...</p>
        ) : !hasSession ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ce lien de réinitialisation est invalide ou expiré. Demandez-en un nouveau depuis la page de connexion.
            </p>
            <Button variant="outline" className="w-full" onClick={() => navigate('/auth')}>Aller à la connexion</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="hud-text text-xs">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="8 caractères minimum"
                />
                <button
                  type="button"
                  aria-label={show ? 'Masquer' : 'Afficher'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShow(v => !v)}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="hud-text text-xs">Confirmation</Label>
              <Input
                type={show ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <Button className="w-full" disabled={saving} onClick={submit}>
              {saving ? 'Enregistrement...' : 'Enregistrer le mot de passe'}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
