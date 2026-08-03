import { useEffect, useState } from 'react';
import {
  CreditCard,
  Loader2,
  Save,
  ShieldCheck,
  RefreshCw,
  Webhook,
  Receipt,
  AlertTriangle,
  Copy,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  PayPalConfig,
  usePayPalConfig,
  useSavePayPalConfig,
  usePayPalTransactions,
  usePayPalWebhookEvents,
  usePayPalCredentialStatus,
  useRefundPayPal,
} from '@/hooks/usePayPalConfig';
import { PayPalMessaging } from '@/components/payments/PayPalMessaging';

const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paypal-webhook`;

const RECOMMENDED_EVENTS = [
  'CHECKOUT.ORDER.APPROVED',
  'PAYMENT.CAPTURE.COMPLETED',
  'PAYMENT.CAPTURE.DENIED',
  'PAYMENT.CAPTURE.REFUNDED',
  'CUSTOMER.DISPUTE.CREATED',
];

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      {ok ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <XCircle className="h-3.5 w-3.5 text-destructive" />
      )}
      {label}
    </span>
  );
}

export default function AdminPayPal() {
  const { toast } = useToast();
  const { data: config, isLoading } = usePayPalConfig();
  const save = useSavePayPalConfig();
  const { data: creds, refetch: refetchCreds } = usePayPalCredentialStatus();
  const { data: transactions, refetch: refetchTx, isFetching: txFetching } = usePayPalTransactions();
  const { data: events, refetch: refetchEvents } = usePayPalWebhookEvents();
  const refund = useRefundPayPal();

  const [form, setForm] = useState<PayPalConfig | null>(null);
  const [testing, setTesting] = useState<'sandbox' | 'live' | null>(null);
  const [refundNote, setRefundNote] = useState('');

  useEffect(() => {
    if (config && !form) setForm(config);
  }, [config, form]);

  const patch = (p: Partial<PayPalConfig>) => setForm(f => (f ? { ...f, ...p } : f));

  const handleSave = async () => {
    if (!form) return;
    try {
      await save.mutateAsync(form);
      toast({ title: 'Configuration PayPal enregistrée' });
    } catch (e) {
      toast({
        title: 'Erreur',
        description: e instanceof Error ? e.message : 'Enregistrement impossible',
        variant: 'destructive',
      });
    }
  };

  const handleTest = async (environment: 'sandbox' | 'live') => {
    setTesting(environment);
    try {
      const { data, error } = await supabase.functions.invoke('paypal', {
        body: { action: 'test-credentials', environment },
      });
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: `Connexion ${environment} réussie` });
      refetchCreds();
    } catch (e) {
      toast({
        title: `Connexion ${environment} échouée`,
        description: e instanceof Error ? e.message : 'Vérifiez les identifiants',
        variant: 'destructive',
      });
    } finally {
      setTesting(null);
    }
  };

  const handleRefund = async (id: string, max: number) => {
    const input = window.prompt(`Montant à rembourser (max ${max.toFixed(2)} €)`, max.toFixed(2));
    if (input === null) return;
    const amount = Number(input.replace(',', '.'));
    if (!(amount > 0)) {
      toast({ title: 'Montant invalide', variant: 'destructive' });
      return;
    }
    try {
      await refund.mutateAsync({ transactionId: id, amount, note: refundNote });
      toast({ title: 'Remboursement effectué' });
    } catch (e) {
      toast({
        title: 'Remboursement refusé',
        description: e instanceof Error ? e.message : 'Erreur PayPal',
        variant: 'destructive',
      });
    }
  };

  if (isLoading || !form) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-16 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement de l'espace PayPal…
      </div>
    );
  }

  const activeConfigured = form.environment === 'live' ? creds?.liveConfigured : creds?.sandboxConfigured;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold hud-text flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-[#0070BA]" />
            ESPACE PAYPAL
          </h1>
          <p className="text-sm text-muted-foreground">
            Boutons PayPal, paiement en 3x/4x sans frais, cartes, wallets, remboursements et webhooks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={form.environment === 'live' ? 'default' : 'secondary'}>
            {form.environment === 'live' ? 'PRODUCTION' : 'TEST (SANDBOX)'}
          </Badge>
          <Button onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer
          </Button>
        </div>
      </header>

      {!activeConfigured && (
        <div className="flex items-start gap-2 border border-amber-500/40 bg-amber-500/10 p-3 rounded-md text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
          <p>
            Les identifiants serveur PayPal ({form.environment}) ne sont pas encore renseignés. Les
            boutons resteront masqués sur le site jusqu'à leur ajout.
          </p>
        </div>
      )}

      <Tabs defaultValue="general">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="methods">Moyens de paiement</TabsTrigger>
          <TabsTrigger value="style">Boutons & bannières</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        {/* GENERAL */}
        <TabsContent value="general" className="space-y-4 pt-4">
          <div className="border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold">Activer PayPal sur le site</Label>
                <p className="text-xs text-muted-foreground">Affiche les boutons dans le tunnel de commande.</p>
              </div>
              <Switch checked={form.enabled} onCheckedChange={v => patch({ enabled: v })} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Environnement</Label>
                <Select
                  value={form.environment}
                  onValueChange={v => patch({ environment: v as 'sandbox' | 'live' })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Test (sandbox)</SelectItem>
                    <SelectItem value="live">Production (live)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Intention de paiement</Label>
                <Select value={form.intent} onValueChange={v => patch({ intent: v as 'capture' | 'authorize' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="capture">Capture immédiate</SelectItem>
                    <SelectItem value="authorize">Autorisation seule</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Client ID sandbox (public)</Label>
                <Input
                  value={form.clientIdSandbox}
                  onChange={e => patch({ clientIdSandbox: e.target.value })}
                  placeholder="AX...sandbox"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Client ID production (public)</Label>
                <Input
                  value={form.clientIdLive}
                  onChange={e => patch({ clientIdLive: e.target.value })}
                  placeholder="AX...live"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nom de marque affiché</Label>
                <Input value={form.brandName} onChange={e => patch({ brandName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Devise</Label>
                <Select value={form.currency} onValueChange={v => patch({ currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['EUR', 'USD', 'GBP', 'CHF'].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Langue du checkout</Label>
                <Select value={form.locale} onValueChange={v => patch({ locale: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['fr_FR', 'en_US', 'de_DE', 'es_ES', 'it_IT', 'nl_NL'].map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Clés secrètes serveur
              </div>
              <p className="text-xs text-muted-foreground">
                Les clés secrètes ne sont jamais stockées ni affichées dans le navigateur : elles vivent
                uniquement dans le coffre-fort serveur et sont utilisées par les fonctions PayPal.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <StatusPill ok={!!creds?.sandboxConfigured} label="Sandbox configurée" />
                <StatusPill ok={!!creds?.liveConfigured} label="Production configurée" />
                <Button size="sm" variant="outline" onClick={() => handleTest('sandbox')} disabled={testing !== null}>
                  {testing === 'sandbox' ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : null}
                  Tester sandbox
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleTest('live')} disabled={testing !== null}>
                  {testing === 'live' ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : null}
                  Tester production
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* METHODS */}
        <TabsContent value="methods" className="space-y-3 pt-4">
          {[
            { key: 'enablePaypalButton' as const, title: 'Bouton PayPal', desc: 'Paiement par compte PayPal.' },
            { key: 'enablePayLater' as const, title: 'Paiement en 3x / 4x sans frais', desc: 'PayPal Pay Later : le client paie en plusieurs fois, vous êtes payé immédiatement.' },
            { key: 'enableCardFields' as const, title: 'Carte bancaire', desc: 'Champs carte hébergés par PayPal (aucune donnée bancaire ne transite par le site).' },
            { key: 'enableWallets' as const, title: 'Apple Pay / Google Pay', desc: 'Wallets proposés automatiquement selon l’appareil du client.' },
            { key: 'enableVenmo' as const, title: 'Venmo', desc: 'Réservé aux comptes marchands américains.' },
            { key: 'enableMessaging' as const, title: 'Bannières promotionnelles', desc: 'Messages « Payez en 4x sans frais » sur le site.' },
          ].map(item => (
            <div key={item.key} className="flex items-start justify-between gap-4 border border-border rounded-lg p-4">
              <div>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                checked={Boolean(form[item.key])}
                onCheckedChange={v => patch({ [item.key]: v } as Partial<PayPalConfig>)}
              />
            </div>
          ))}
        </TabsContent>

        {/* STYLE */}
        <TabsContent value="style" className="space-y-4 pt-4">
          <div className="border border-border rounded-lg p-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Disposition</Label>
              <Select
                value={form.buttonStyle.layout}
                onValueChange={v => patch({ buttonStyle: { ...form.buttonStyle, layout: v as 'vertical' | 'horizontal' } })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vertical">Verticale (recommandé)</SelectItem>
                  <SelectItem value="horizontal">Horizontale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Couleur</Label>
              <Select
                value={form.buttonStyle.color}
                onValueChange={v => patch({ buttonStyle: { ...form.buttonStyle, color: v as PayPalConfig['buttonStyle']['color'] } })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['gold', 'blue', 'silver', 'white', 'black'].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Forme</Label>
              <Select
                value={form.buttonStyle.shape}
                onValueChange={v => patch({ buttonStyle: { ...form.buttonStyle, shape: v as PayPalConfig['buttonStyle']['shape'] } })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['rect', 'pill', 'sharp'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Libellé</Label>
              <Select
                value={form.buttonStyle.label}
                onValueChange={v => patch({ buttonStyle: { ...form.buttonStyle, label: v as PayPalConfig['buttonStyle']['label'] } })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['paypal', 'checkout', 'buynow', 'pay'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Hauteur ({form.buttonStyle.height}px)</Label>
              <Input
                type="number"
                min={25}
                max={55}
                value={form.buttonStyle.height}
                onChange={e => patch({ buttonStyle: { ...form.buttonStyle, height: Number(e.target.value) || 45 } })}
              />
            </div>
            <div className="flex items-center justify-between sm:col-span-2">
              <Label>Afficher la mention PayPal sous les boutons</Label>
              <Switch
                checked={form.buttonStyle.tagline}
                onCheckedChange={v => patch({ buttonStyle: { ...form.buttonStyle, tagline: v } })}
              />
            </div>
          </div>

          <div className="border border-border rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold">Emplacements des bannières 3x/4x</p>
            {([
              ['product', 'Page produit'],
              ['cart', 'Panier'],
              ['checkout', 'Tunnel de commande'],
              ['home', 'Page d’accueil'],
            ] as const).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="text-sm font-normal">{label}</Label>
                <Switch
                  checked={form.messagingPlacements[key]}
                  onCheckedChange={v =>
                    patch({ messagingPlacements: { ...form.messagingPlacements, [key]: v } })
                  }
                />
              </div>
            ))}
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Aperçu (montant test 250 €)</p>
              <PayPalMessaging amount={250} placement="product" />
            </div>
          </div>
        </TabsContent>

        {/* TRANSACTIONS */}
        <TabsContent value="transactions" className="space-y-3 pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4" /> {transactions?.length ?? 0} transaction(s)
            </p>
            <Button size="sm" variant="outline" onClick={() => refetchTx()} disabled={txFetching}>
              <RefreshCw className={`h-3.5 w-3.5 mr-2 ${txFetching ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
          <Textarea
            placeholder="Note de remboursement facultative (visible par le client)"
            value={refundNote}
            onChange={e => setRefundNote(e.target.value)}
            className="text-xs"
            rows={2}
          />
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="p-2">Date</th>
                  <th className="p-2">Commande PayPal</th>
                  <th className="p-2">Acheteur</th>
                  <th className="p-2">Montant</th>
                  <th className="p-2">Remboursé</th>
                  <th className="p-2">Statut</th>
                  <th className="p-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {(transactions ?? []).map(tx => {
                  const remaining = Number(tx.amount) - Number(tx.refunded_amount || 0);
                  return (
                    <tr key={tx.id} className="border-t border-border">
                      <td className="p-2 whitespace-nowrap">{new Date(tx.created_at).toLocaleString('fr-FR')}</td>
                      <td className="p-2 font-mono">{tx.paypal_order_id}</td>
                      <td className="p-2">{tx.payer_email || tx.payer_name || '—'}</td>
                      <td className="p-2 whitespace-nowrap">{Number(tx.amount).toFixed(2)} {tx.currency}</td>
                      <td className="p-2 whitespace-nowrap">{Number(tx.refunded_amount || 0).toFixed(2)}</td>
                      <td className="p-2">
                        <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>{tx.status}</Badge>
                      </td>
                      <td className="p-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!tx.capture_id || remaining <= 0 || refund.isPending}
                          onClick={() => handleRefund(tx.id, remaining)}
                        >
                          Rembourser
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {(transactions ?? []).length === 0 && (
                  <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Aucune transaction PayPal</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* WEBHOOKS */}
        <TabsContent value="webhooks" className="space-y-4 pt-4">
          <div className="border border-border rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold flex items-center gap-2"><Webhook className="h-4 w-4" /> Configuration</p>
            <div className="space-y-1.5">
              <Label>URL à déclarer dans PayPal</Label>
              <div className="flex gap-2">
                <Input readOnly value={WEBHOOK_URL} className="font-mono text-xs" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(WEBHOOK_URL);
                    toast({ title: 'URL copiée' });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Webhook ID PayPal (pour la vérification des signatures)</Label>
              <Input
                value={form.webhookId}
                onChange={e => patch({ webhookId: e.target.value })}
                placeholder="WH-XXXXXXXX"
                className="font-mono text-xs"
              />
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Événements à cocher dans PayPal :</p>
              <ul className="list-disc pl-5 font-mono">
                {RECOMMENDED_EVENTS.map(e => <li key={e}>{e}</li>)}
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{events?.length ?? 0} événement(s) reçu(s)</p>
            <Button size="sm" variant="outline" onClick={() => refetchEvents()}>
              <RefreshCw className="h-3.5 w-3.5 mr-2" /> Actualiser
            </Button>
          </div>
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="p-2">Date</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Signature</th>
                  <th className="p-2">Traité</th>
                  <th className="p-2">Erreur</th>
                </tr>
              </thead>
              <tbody>
                {(events ?? []).map(ev => (
                  <tr key={ev.id} className="border-t border-border">
                    <td className="p-2 whitespace-nowrap">{new Date(ev.created_at).toLocaleString('fr-FR')}</td>
                    <td className="p-2 font-mono">{ev.event_type}</td>
                    <td className="p-2">{ev.verification_status || '—'}</td>
                    <td className="p-2">{ev.processed ? 'Oui' : 'Non'}</td>
                    <td className="p-2 text-destructive">{ev.error_message || ''}</td>
                  </tr>
                ))}
                {(events ?? []).length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Aucun événement reçu</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
