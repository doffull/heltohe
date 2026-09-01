import { useState } from 'react';
import { User, Lock, Loader2, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export default function AccountProfile() {
  const { user } = useAuth();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const changePassword = async (e: React.FormEvent) => {
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
    const { error } = await supabase.auth.updateUser(
      current ? { password, current_password: current } as never : { password },
    );
    setSaving(false);
    if (error) {
      const msg = /current password/i.test(error.message)
        ? 'Mot de passe actuel requis ou incorrect.'
        : error.message;
      toast({ title: 'Échec', description: msg, variant: 'destructive' });
      return;
    }
    setCurrent(''); setPassword(''); setConfirm('');
    toast({ title: 'Mot de passe mis à jour' });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl sm:text-3xl font-bold hud-text mb-6 sm:mb-8">MON PROFIL</h1>

        <div className="chamfer-hud bg-card/50 p-6 mb-6 flex items-center gap-4">
          <User className="h-8 w-8 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Compte</p>
            <p className="text-sm font-medium truncate">{user?.email || '—'}</p>
          </div>
        </div>

        <form onSubmit={changePassword} className="chamfer-hud bg-card/50 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <h2 className="text-sm font-semibold hud-text">CHANGER MON MOT DE PASSE</h2>
          </div>
          <div className="space-y-2">
            <Label htmlFor="current-password">Mot de passe actuel</Label>
            <Input id="current-password" type="password" autoComplete="current-password"
              value={current} onChange={(e) => setCurrent(e.target.value)}
              placeholder="Requis si votre compte a déjà un mot de passe" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">Nouveau mot de passe</Label>
            <Input id="new-password" type="password" autoComplete="new-password" value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="8 caractères minimum" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-new-password">Confirmer</Label>
            <Input id="confirm-new-password" type="password" autoComplete="new-password" value={confirm}
              onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Enregistrer
          </Button>
        </form>
      </div>
    </div>
  );
}
