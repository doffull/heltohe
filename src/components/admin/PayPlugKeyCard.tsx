import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useSaveGatewaySecret, useDeleteGatewaySecret, type GatewaySecretStatus } from '@/hooks/useGatewaySecrets';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';

interface Props {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  status?: GatewaySecretStatus;
}

interface VerifyResult {
  valid: boolean;
  mode?: 'test' | 'live';
  message?: string;
}

/**
 * Module PayPlug : une seule clé API secrète (sk_live_… ou sk_test_…),
 * stockée côté serveur puis vérifiée réellement auprès de l'API PayPlug.
 */
export function PayPlugKeyCard({ enabled, onToggle, status }: Props) {
  const { toast } = useToast();
  const saveSecret = useSaveGatewaySecret();
  const deleteSecret = useDeleteGatewaySecret();

  const [draft, setDraft] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState<'save' | 'verify' | 'delete' | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const draftMode = draft.startsWith('sk_live_') ? 'live' : draft.startsWith('sk_test_') ? 'test' : null;
  const formatOk = /^sk_(test|live)_[A-Za-z0-9]{8,}$/.test(draft.trim());
  const savedMode = result?.mode ?? null;

  const verify = async (silent = false) => {
    setBusy('verify');
    try {
      const { data, error } = await supabase.functions.invoke('payplug', { body: { action: 'verify' } });
      if (error) throw error;
      const res = data as VerifyResult & { error?: string };
      if (res?.error) throw new Error(res.error);
      setResult(res);
      if (!silent) {
        toast({
          title: res.valid ? 'Clé PayPlug valide' : 'Clé PayPlug refusée',
          description: res.message,
          variant: res.valid ? undefined : 'destructive',
        });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Vérification impossible';
      setResult({ valid: false, message });
      if (!silent) toast({ title: 'Vérification impossible', description: message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const saveAndVerify = async () => {
    const secretKey = draft.trim();
    if (!formatOk) {
      toast({
        title: 'Format invalide',
        description: 'La clé doit commencer par sk_live_ (production) ou sk_test_ (test).',
        variant: 'destructive',
      });
      return;
    }
    setBusy('save');
    try {
      await saveSecret.mutateAsync({ gateway: 'payplug', secretKey });
      setDraft('');
      setVisible(false);
      toast({ title: 'Clé enregistrée', description: 'Vérification auprès de PayPlug…' });
      await verify(true);
      setBusy(null);
    } catch (e) {
      setBusy(null);
      toast({
        title: 'Enregistrement impossible',
        description: e instanceof Error ? e.message : 'Erreur inconnue',
        variant: 'destructive',
      });
    }
  };

  const remove = async () => {
    setBusy('delete');
    try {
      await deleteSecret.mutateAsync('payplug');
      setResult(null);
      toast({ title: 'Clé PayPlug supprimée' });
    } catch (e) {
      toast({
        title: 'Suppression impossible',
        description: e instanceof Error ? e.message : 'Erreur inconnue',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-secondary/20">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🇫🇷</span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">PayPlug</span>
              {status ? (
                <Badge variant="default" className="text-[10px] gap-1 bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="h-3 w-3" /> Clé enregistrée
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <XCircle className="h-3 w-3" /> Non configuré
                </Badge>
              )}
              {savedMode && (
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-mono">
                  Mode {savedMode}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Cartes bancaires 3-D Secure, solution française</p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>

      <div className="p-4 space-y-4">
        <div className="space-y-1.5 max-w-xl">
          <Label className="text-xs text-muted-foreground">
            Clé API secrète PayPlug — unique clé nécessaire
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={visible ? 'text' : 'password'}
                autoComplete="off"
                spellCheck={false}
                placeholder={status ? `•••••••••••••${status.last4 ?? ''}` : 'sk_live_...'}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                className="pr-10 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setVisible(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={visible ? 'Masquer la clé' : 'Afficher la clé'}
              >
                {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button type="button" onClick={saveAndVerify} disabled={!draft.trim() || busy !== null}>
              {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer et vérifier'}
            </Button>
          </div>
          {draft.trim() && (
            <p className={`text-[11px] ${formatOk ? 'text-muted-foreground' : 'text-destructive'}`}>
              {formatOk
                ? draftMode === 'live'
                  ? 'Clé LIVE détectée : les paiements seront réellement encaissés.'
                  : 'Clé de TEST détectée : aucun encaissement réel.'
                : 'Format attendu : sk_live_… ou sk_test_…'}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">
            PayPlug ne fournit qu'une clé de test et une clé live. Copiez la clé secrète depuis votre portail
            PayPlug (Paramètres → Clés API). Elle est chiffrée côté serveur et jamais renvoyée au navigateur.
          </p>
        </div>

        {status && (
          <div className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
              <span>
                Clé active •••{status.last4} — enregistrée le{' '}
                {new Date(status.updated_at).toLocaleDateString('fr-FR')}
              </span>
            </div>
            {result && (
              <p className={`text-xs ${result.valid ? 'text-green-600' : 'text-destructive'}`}>
                {result.valid ? '✓ ' : '✕ '}
                {result.message}
              </p>
            )}
            {result?.valid && result.mode === 'test' && enabled && (
              <p className="flex items-start gap-1.5 text-xs text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                PayPlug est activé sur la boutique avec une clé de TEST : remplacez-la par votre clé
                sk_live_… pour encaisser réellement.
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <Button type="button" size="sm" variant="outline" onClick={() => verify()} disabled={busy !== null}>
                {busy === 'verify' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Tester la clé'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={remove}
                disabled={busy !== null}
              >
                {busy === 'delete' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <><Trash2 className="h-3.5 w-3.5 mr-1" />Supprimer</>
                )}
              </Button>
            </div>
          </div>
        )}

        <a
          href="https://docs.payplug.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" /> Documentation PayPlug
        </a>
      </div>
    </div>
  );
}

export default PayPlugKeyCard;
