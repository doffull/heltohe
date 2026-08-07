import { useState, useEffect } from 'react';
import { useNotificationConfig, useUpsertNotificationConfig, useNotificationLogs } from '@/hooks/useNotificationConfig';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Mail, MessageSquare, Save, Loader2, Clock, CheckCircle, XCircle, Settings2, FileText, History } from 'lucide-react';

const DEFAULT_EMAIL_TEMPLATES = {
  identity_verified: { subject: "Commande {{order_number}} - Identité vérifiée", body: "Bonjour {{customer_name}},\n\nVotre identité a été vérifiée pour la commande {{order_number}}.\n\nCordialement,\nL'équipe HELVETICA-MP" },
  payment_verified: { subject: "Commande {{order_number}} - Paiement confirmé", body: "Bonjour {{customer_name}},\n\nLe paiement de votre commande {{order_number}} a été confirmé.\n\nCordialement,\nL'équipe HELVETICA-MP" },
  all_validated: { subject: "Commande {{order_number}} - Commande validée", body: "Bonjour {{customer_name}},\n\nVotre commande {{order_number}} est entièrement validée et sera expédiée prochainement.\n\nCordialement,\nL'équipe HELVETICA-MP" },
};

const DEFAULT_SMS_TEMPLATES = {
  identity_verified: "HELVETICA-MP: Votre identité est vérifiée pour la commande {{order_number}}.",
  payment_verified: "HELVETICA-MP: Paiement confirmé pour la commande {{order_number}}.",
  all_validated: "HELVETICA-MP: Commande {{order_number}} validée ! Expédition prochaine.",
};

const TEMPLATE_LABELS: Record<string, string> = {
  identity_verified: "Identité vérifiée",
  payment_verified: "Paiement confirmé",
  all_validated: "Commande validée",
};

export default function AdminNotifications() {
  const { toast } = useToast();
  const { data: config, isLoading } = useNotificationConfig();
  const upsert = useUpsertNotificationConfig();
  const { data: logs = [] } = useNotificationLogs();

  const [channels, setChannels] = useState({ email: true, sms: false });
  const [smsFromNumber, setSmsFromNumber] = useState('');
  const [triggers, setTriggers] = useState({ identity: false, payment: false, all: true });
  const [emailTemplates, setEmailTemplates] = useState<Record<string, { subject: string; body: string }>>(DEFAULT_EMAIL_TEMPLATES);
  const [smsTemplates, setSmsTemplates] = useState<Record<string, string>>(DEFAULT_SMS_TEMPLATES);

  useEffect(() => {
    if (config) {
      setChannels(config.notification_channels || { email: true, sms: false });
      setSmsFromNumber(config.sms_from_number || '');
      setTriggers({
        identity: config.notify_on_identity_verified,
        payment: config.notify_on_payment_verified,
        all: config.notify_on_all_validated,
      });
      setEmailTemplates(config.email_templates || DEFAULT_EMAIL_TEMPLATES);
      setSmsTemplates(config.sms_templates || DEFAULT_SMS_TEMPLATES);
    }
  }, [config]);

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({
        notification_channels: channels as any,
        sms_from_number: smsFromNumber,
        notify_on_identity_verified: triggers.identity,
        notify_on_payment_verified: triggers.payment,
        notify_on_all_validated: triggers.all,
        email_templates: emailTemplates as any,
        sms_templates: smsTemplates as any,
      });
      toast({ title: 'Configuration sauvegardée' });
    } catch {
      toast({ title: 'Erreur de sauvegarde', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl lg:text-3xl font-bold hud-text flex items-center gap-2">
            <Bell className="h-5 w-5 lg:h-6 lg:w-6 shrink-0" /> NOTIFICATIONS
          </h1>
          <p className="text-muted-foreground text-xs lg:text-sm mt-1">
            Configurez les notifications automatiques envoyées aux clients
          </p>
        </div>
        <Button onClick={handleSave} disabled={upsert.isPending} className="w-full sm:w-auto">
          {upsert.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Sauvegarder
        </Button>
      </div>

      <Tabs defaultValue="channels" className="space-y-4">
        <TabsList className="w-full overflow-x-auto justify-start">
          <TabsTrigger value="channels" className="gap-1 text-xs sm:text-sm"><Settings2 className="h-3.5 w-3.5" />Canaux</TabsTrigger>
          <TabsTrigger value="triggers" className="gap-1 text-xs sm:text-sm"><Bell className="h-3.5 w-3.5" />Déclencheurs</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1 text-xs sm:text-sm"><FileText className="h-3.5 w-3.5" />Templates</TabsTrigger>
          <TabsTrigger value="history" className="gap-1 text-xs sm:text-sm"><History className="h-3.5 w-3.5" />Historique</TabsTrigger>
        </TabsList>

        {/* Channels */}
        <TabsContent value="channels">
          <div className="chamfer-hud bg-card/50 p-6 space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-xs text-muted-foreground">Notifications par email via Resend</p>
                </div>
              </div>
              <Switch checked={channels.email} onCheckedChange={(v) => setChannels({ ...channels, email: v })} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">SMS</p>
                  <p className="text-xs text-muted-foreground">Notifications par SMS via Twilio</p>
                </div>
              </div>
              <Switch checked={channels.sms} onCheckedChange={(v) => setChannels({ ...channels, sms: v })} />
            </div>

            {channels.sms && (
              <div className="p-4 rounded-lg border border-border space-y-3">
                <Label className="text-sm font-medium">Numéro expéditeur SMS</Label>
                <Input
                  value={smsFromNumber}
                  onChange={(e) => setSmsFromNumber(e.target.value)}
                  placeholder="+33612345678"
                />
                <p className="text-xs text-muted-foreground">
                  Numéro Twilio depuis lequel les SMS seront envoyés. Nécessite le connecteur Twilio.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Triggers */}
        <TabsContent value="triggers">
          <div className="chamfer-hud bg-card/50 p-6 space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Choisissez à quel moment notifier le client durant le processus de validation.
            </p>

            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div>
                <p className="font-medium text-blue-500">🔵 Identité vérifiée</p>
                <p className="text-xs text-muted-foreground">Envoyer une notification quand l'identité est validée par l'IA</p>
              </div>
              <Switch checked={triggers.identity} onCheckedChange={(v) => setTriggers({ ...triggers, identity: v })} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div>
                <p className="font-medium text-green-500">🟢 Paiement confirmé</p>
                <p className="text-xs text-muted-foreground">Envoyer une notification quand le paiement est validé</p>
              </div>
              <Switch checked={triggers.payment} onCheckedChange={(v) => setTriggers({ ...triggers, payment: v })} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div>
                <p className="font-medium text-purple-500">🟣 Commande entièrement validée</p>
                <p className="text-xs text-muted-foreground">Envoyer une notification quand les 3 étapes sont validées</p>
              </div>
              <Switch checked={triggers.all} onCheckedChange={(v) => setTriggers({ ...triggers, all: v })} />
            </div>
          </div>
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates">
          <div className="space-y-6">
            {Object.entries(TEMPLATE_LABELS).map(([key, label]) => (
              <div key={key} className="chamfer-hud bg-card/50 p-6 space-y-4">
                <h3 className="font-bold text-sm hud-text">{label}</h3>

                {channels.email && (
                  <div className="space-y-3 p-4 rounded-lg border border-blue-500/20 bg-blue-500/5">
                    <div className="flex items-center gap-2 text-blue-500 text-xs font-bold"><Mail className="h-3.5 w-3.5" />EMAIL</div>
                    <div className="space-y-2">
                      <Label className="text-xs">Sujet</Label>
                      <Input
                        value={emailTemplates[key as keyof typeof emailTemplates]?.subject || ''}
                        onChange={(e) => setEmailTemplates({ ...emailTemplates, [key]: { ...emailTemplates[key as keyof typeof emailTemplates], subject: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Corps du message</Label>
                      <Textarea
                        value={emailTemplates[key as keyof typeof emailTemplates]?.body || ''}
                        onChange={(e) => setEmailTemplates({ ...emailTemplates, [key]: { ...emailTemplates[key as keyof typeof emailTemplates], body: e.target.value } })}
                        rows={4}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Variables : {"{{customer_name}}"}, {"{{order_number}}"}</p>
                  </div>
                )}

                {channels.sms && (
                  <div className="space-y-3 p-4 rounded-lg border border-green-500/20 bg-green-500/5">
                    <div className="flex items-center gap-2 text-green-500 text-xs font-bold"><MessageSquare className="h-3.5 w-3.5" />SMS</div>
                    <div className="space-y-2">
                      <Label className="text-xs">Message SMS</Label>
                      <Textarea
                        value={smsTemplates[key as keyof typeof smsTemplates] || ''}
                        onChange={(e) => setSmsTemplates({ ...smsTemplates, [key]: e.target.value })}
                        rows={2}
                        maxLength={160}
                      />
                      <p className="text-[10px] text-muted-foreground">{(smsTemplates[key as keyof typeof smsTemplates] || '').length}/160 caractères</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* History */}
        <TabsContent value="history">
          <div className="chamfer-hud bg-card/50 overflow-hidden">
            {logs.length === 0 ? (
              <div className="p-12 text-center">
                <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucune notification envoyée</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left p-3 text-xs font-bold hud-text">DATE</th>
                      <th className="text-left p-3 text-xs font-bold hud-text">CANAL</th>
                      <th className="text-left p-3 text-xs font-bold hud-text">TYPE</th>
                      <th className="text-left p-3 text-xs font-bold hud-text">DESTINATAIRE</th>
                      <th className="text-left p-3 text-xs font-bold hud-text">STATUT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log: any) => (
                      <tr key={log.id} className="border-b border-border last:border-0">
                        <td className="p-3 text-xs">{new Date(log.created_at).toLocaleString('fr-FR')}</td>
                        <td className="p-3">
                          {log.channel === 'email' ? (
                            <span className="flex items-center gap-1 text-xs text-blue-500"><Mail className="h-3 w-3" />Email</span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-green-500"><MessageSquare className="h-3 w-3" />SMS</span>
                          )}
                        </td>
                        <td className="p-3 text-xs">{TEMPLATE_LABELS[log.notification_type] || log.notification_type}</td>
                        <td className="p-3 text-xs text-muted-foreground truncate max-w-[200px]">{log.recipient}</td>
                        <td className="p-3">
                          {log.status === 'sent' ? (
                            <span className="flex items-center gap-1 text-xs text-green-500"><CheckCircle className="h-3 w-3" />Envoyé</span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-destructive" title={log.error_message}><XCircle className="h-3 w-3" />Échoué</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
