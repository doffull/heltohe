import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Send } from 'lucide-react';

interface Props {
  userId: string;
  email: string;
}

function strength(pwd: string): { label: string; className: string; score: number } {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 2) return { label: 'Faible', className: 'text-destructive', score };
  if (score === 3) return { label: 'Moyen', className: 'text-amber-500', score };
  return { label: 'Robuste', className: 'text-green-500', score };
}

async function invokeError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json().catch(() => null);
    if (body?.error) return body.error as string;
  }
  return error instanceof Error ? error.message : String(error);
}

/** Actions mot de passe réservées à l'admin, pour les membres de l'équipe. */
export function UserPasswordManager({ userId, email }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [password, setPassword] = useState('');
  const [showSet, setShowSet] = useState(false);
  const [busy, setBusy] = useState<'link' | 'set' | null>(null);

  const refreshLog = () => {
    qc.invalidateQueries({ queryKey: ['customer-email-log', email] });
    qc.invalidateQueries({ queryKey: ['customer-email-log'] });
  };

  const sendResetLink = async () => {
    setBusy('link');
    try {
      const { error } = await supabase.functions.invoke('admin-set-user-password', {
        body: { action: 'reset-link', userId, redirectTo: `${window.location.origin}/reset-password` },
      });
      if (error) throw new Error(await invokeError(error));
      toast({ title: 'Lien envoyé', description: `${email} peut choisir son mot de passe.` });
      refreshLog();
    } catch (e: any) {
      toast({ title: 'Envoi impossible', description: e?.message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const setNewPassword = async () => {
    setBusy('set');
    try {
      const { error } = await supabase.functions.invoke('admin-set-user-password', {
        body: { action: 'set-password', userId, password },
      });
      if (error) throw new Error(await invokeError(error));
      toast({ title: 'Mot de passe défini', description: `${email} a été informé par e-mail.` });
      setPassword('');
      setShowSet(false);
      refreshLog();
    } catch (e: any) {
      toast({ title: 'Modification impossible', description: e?.message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const s = strength(password);

  return (
    <div className="space-y-2 pt-2 border-t border-border">
      <Label className="hud-text text-xs flex items-center gap-1">
        <KeyRound className="h-3 w-3" /> Mot de passe du membre
      </Label>
      <Button variant="outline" size="sm" className="w-full" disabled={busy !== null} onClick={sendResetLink}>
        <Send className="h-3 w-3 mr-2" /> {busy === 'link' ? 'Envoi...' : 'Envoyer un lien de réinitialisation'}
      </Button>

      {!showSet ? (
        <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowSet(true)}>
          Définir un mot de passe manuellement
        </Button>
      ) : (
        <div className="space-y-2 border border-border rounded p-2">
          <Input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nouveau mot de passe (8 caractères min.)"
            autoComplete="new-password"
          />
          {password.length > 0 && (
            <p className={`text-[11px] font-medium ${s.className}`}>Robustesse : {s.label}</p>
          )}
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" disabled={password.length < 8 || busy !== null} onClick={setNewPassword}>
              {busy === 'set' ? 'Application...' : 'Appliquer'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowSet(false); setPassword(''); }}>Annuler</Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Le membre reçoit un e-mail l'informant du changement. Un autre administrateur ne peut pas être modifié ici.
          </p>
        </div>
      )}
    </div>
  );
}
