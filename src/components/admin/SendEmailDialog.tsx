import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useEmailTemplates, useSendCustomEmail } from '@/hooks/useEmailTemplates';
import { Mail, Send, Loader2 } from 'lucide-react';

export interface SendEmailTarget {
  email: string;
  firstName?: string;
  orderNumber?: string;
  total?: number | string;
  trackingNumber?: string;
  orderId?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Un ou plusieurs destinataires (envoi groupé). */
  targets: SendEmailTarget[];
}

/** Fenêtre d'envoi d'e-mail au client depuis l'admin (SMTP interne, modèles réutilisables). */
export function SendEmailDialog({ open, onOpenChange, targets }: Props) {
  const { toast } = useToast();
  const { data: templates = [] } = useEmailTemplates();
  const send = useSendCustomEmail();
  const [templateKey, setTemplateKey] = useState('custom');
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');

  const first = targets[0];

  useEffect(() => {
    const tpl = templates.find(t => t.template_key === templateKey);
    if (tpl) {
      setSubject(tpl.subject);
      setHtml(tpl.html_body);
    }
  }, [templateKey, templates]);

  const variables = useMemo(
    () => ({
      prenom: first?.firstName || '',
      orderNumber: first?.orderNumber || '',
      total: first?.total !== undefined ? String(first.total) : '',
      trackingNumber: first?.trackingNumber || '',
      trackingUrl: first?.trackingNumber
        ? `https://www.laposte.fr/outils/suivre-vos-envois?code=${first.trackingNumber}`
        : '',
    }),
    [first],
  );

  const preview = useMemo(
    () => html.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k: string) => (variables as Record<string, string>)[k] ?? ''),
    [html, variables],
  );

  const handleSend = async () => {
    if (!subject.trim() || !html.trim()) {
      toast({ title: 'Objet et message requis', variant: 'destructive' });
      return;
    }
    try {
      const res = await send.mutateAsync({
        to: targets.map(t => t.email).filter(Boolean),
        subject,
        html,
        variables,
        orderId: targets.length === 1 ? first?.orderId : undefined,
      });
      toast({
        title: `E-mail envoyé (${res.sent})`,
        description: res.failed ? `${res.failed} échec(s).` : undefined,
      });
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Envoi impossible",
        description: e instanceof Error ? e.message : 'Erreur inconnue',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" /> Écrire au client
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Destinataire{targets.length > 1 ? 's' : ''}</Label>
            <p className="text-xs text-muted-foreground break-words mt-1">
              {targets.length > 3
                ? `${targets.length} clients sélectionnés`
                : targets.map(t => t.email).join(', ') || '—'}
            </p>
          </div>

          <div>
            <Label>Modèle</Label>
            <Select value={templateKey} onValueChange={setTemplateKey}>
              <SelectTrigger><SelectValue placeholder="Choisir un modèle" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Message libre</SelectItem>
                {templates
                  .filter(t => t.template_key !== 'custom')
                  .map(t => (
                    <SelectItem key={t.template_key} value={t.template_key}>{t.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="mail-subject">Objet</Label>
            <Input id="mail-subject" value={subject} onChange={e => setSubject(e.target.value)} maxLength={200} />
          </div>

          <div>
            <Label htmlFor="mail-body">Message (HTML autorisé)</Label>
            <Textarea id="mail-body" rows={8} value={html} onChange={e => setHtml(e.target.value)} />
            <p className="text-[11px] text-muted-foreground mt-1">
              Variables : {'{{prenom}}'} {'{{orderNumber}}'} {'{{total}}'} {'{{trackingNumber}}'} {'{{trackingUrl}}'}
            </p>
          </div>

          <div>
            <Label>Aperçu</Label>
            <div className="border border-border rounded p-3 text-sm bg-background max-h-56 overflow-y-auto whitespace-pre-wrap">
              {preview.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim() || '—'}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSend} disabled={send.isPending}>
            {send.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SendEmailDialog;
