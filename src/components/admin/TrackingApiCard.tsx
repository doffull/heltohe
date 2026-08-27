import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Radio,
  KeyRound,
  Loader2,
  CheckCircle2,
  XCircle,
  Copy,
  RefreshCw,
  Trash2,
  Webhook,
  Info,
} from 'lucide-react';
import {
  useTrackingKeyStatus,
  useSaveTrackingKey,
  useDeleteTrackingKey,
  useTestTrackingKey,
  usePollTrackingNow,
  useWebhookToken,
  carrierWebhookUrl,
} from '@/hooks/useTrackingKey';

/** Configuration de la clé de suivi La Poste/Colissimo + webhook temps réel. */
export default function TrackingApiCard() {
  const { data: status, isLoading } = useTrackingKeyStatus();
  const save = useSaveTrackingKey();
  const remove = useDeleteTrackingKey();
  const test = useTestTrackingKey();
  const poll = usePollTrackingNow();
  const { reveal, rotate } = useWebhookToken();

  const [apiKey, setApiKey] = useState('');
  const [token, setToken] = useState<string | null>(null);

  const configured = !!status?.configured;

  async function handleSave() {
    try {
      const res = await save.mutateAsync(apiKey.trim());
      setApiKey('');
      toast.success(res.message || 'Clé enregistrée et validée');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Échec de la validation');
    }
  }

  async function handleTest() {
    try {
      const res = await test.mutateAsync();
      toast.success(res.message || 'Clé valide');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Clé invalide');
    }
  }

  async function handlePoll() {
    try {
      const res = await poll.mutateAsync();
      const r = res.result as { checked?: number; degraded?: boolean } | undefined;
      toast.success(
        r?.degraded
          ? 'Aucune clé active : suivi en mode dégradé.'
          : `Suivi actualisé (${r?.checked ?? 0} commande(s) vérifiée(s)).`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Échec de la synchronisation');
    }
  }

  async function handleReveal() {
    try {
      const res = await reveal.mutateAsync();
      setToken(res.token);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Aucun jeton');
    }
  }

  async function handleRotate() {
    try {
      const res = await rotate.mutateAsync();
      setToken(res.token);
      toast.success('Nouveau jeton généré');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Échec');
    }
  }

  const webhookUrl = carrierWebhookUrl(token);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Radio className="h-4 w-4" />
            Suivi automatique du colis (API La Poste / Colissimo)
            {isLoading ? null : configured ? (
              <Badge variant="default" className="ml-1 text-[10px] uppercase tracking-wider">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Actif
              </Badge>
            ) : (
              <Badge variant="outline" className="ml-1 text-[10px] uppercase tracking-wider">
                <XCircle className="h-3 w-3 mr-1" /> Non configuré
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              Clé « Okapi » de l'API <strong>Suivi v2</strong> de La Poste (developer.laposte.fr). Elle est stockée
              chiffrée côté serveur : jamais renvoyée au navigateur. Sans clé, le suivi reste en mode dégradé (seuls les
              statuts saisis manuellement sont notifiés).
            </p>
          </div>

          {configured && (
            <p className="text-sm text-muted-foreground">
              Clé enregistrée&nbsp;
              {status?.last4 ? (
                <span className="font-mono">••••{status.last4}</span>
              ) : (
                <span>(secret backend)</span>
              )}
              {status?.updatedAt
                ? ` — mise à jour le ${new Date(status.updatedAt).toLocaleDateString('fr-FR')}`
                : ''}
            </p>
          )}

          <div className="space-y-2">
            <Label>Clé API de suivi</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="password"
                autoComplete="off"
                placeholder="Collez votre clé Okapi La Poste"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <Button onClick={handleSave} disabled={apiKey.trim().length < 10 || save.isPending} className="gap-2">
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Valider et enregistrer
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              La clé est testée auprès de La Poste avant d'être enregistrée.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={handleTest} disabled={!configured || test.isPending} className="gap-2">
              {test.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Tester la clé
            </Button>
            <Button variant="outline" size="sm" onClick={handlePoll} disabled={poll.isPending} className="gap-2">
              {poll.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Synchroniser maintenant
            </Button>
            {status?.source === 'database' && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-destructive"
                onClick={async () => {
                  await remove.mutateAsync();
                  toast.success('Clé supprimée');
                }}
                disabled={remove.isPending}
              >
                <Trash2 className="h-4 w-4" /> Supprimer
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Webhook transporteur (temps réel)
            {status?.webhookConfigured && (
              <Badge variant="secondary" className="ml-1 text-[10px] uppercase tracking-wider">
                Jeton actif
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Si votre contrat Colissimo inclut les notifications « push », communiquez cette URL au transporteur : chaque
            changement d'état est enregistré et notifié instantanément, sans attendre la synchronisation horaire (qui
            reste active en secours).
          </p>

          <div className="space-y-2">
            <Label>URL de rappel</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input readOnly value={webhookUrl} className="font-mono text-xs" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard?.writeText(webhookUrl);
                  toast.success('URL copiée');
                }}
                className="gap-2"
              >
                <Copy className="h-4 w-4" /> Copier
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Le jeton peut aussi être envoyé dans l'en-tête <code className="bg-muted px-1 rounded">x-webhook-token</code>.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {status?.webhookConfigured && (
              <Button variant="outline" size="sm" onClick={handleReveal} disabled={reveal.isPending} className="gap-2">
                {reveal.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Afficher le jeton
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleRotate} disabled={rotate.isPending} className="gap-2">
              {rotate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {status?.webhookConfigured ? 'Régénérer le jeton' : 'Générer un jeton'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
