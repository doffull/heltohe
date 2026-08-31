import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Send } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  email: string;
  customerName?: string;
}

const TEMPLATES: Record<string, { label: string; subject: string; body: (name: string) => string }> = {
  free: { label: 'Message libre', subject: '', body: () => '' },
  order: {
    label: 'Information commande',
    subject: 'Information sur votre commande',
    body: (n) =>
      `Bonjour ${n || ''},\n\nNous revenons vers vous au sujet de votre commande.\n\n**Précisions :**\n- \n\nBien à vous,\nL'équipe HELVETICA-MP`,
  },
  document: {
    label: 'Demande de document',
    subject: 'Document complémentaire nécessaire',
    body: (n) =>
      `Bonjour ${n || ''},\n\nAfin de finaliser le traitement de votre dossier, merci de nous transmettre en réponse à cet e-mail :\n- une pièce d'identité\n- un justificatif de domicile\n\nMerci d'avance,\nL'équipe HELVETICA-MP`,
  },
};

export function CustomerEmailDialog({ open, onOpenChange, email, customerName }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const firstName = (customerName || '').split(' ')[0] || '';
  const [template, setTemplate] = useState('free');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const pickTemplate = (key: string) => {
    setTemplate(key);
    const t = TEMPLATES[key];
    if (t) {
      setSubject(t.subject);
      setMessage(t.body(firstName));
    }
  };

  const send = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-customer-email', {
        body: { to: email, subject, message, emailType: 'admin_manual' },
      });
      if (error) {
        let detail = error.message;
        if (error instanceof FunctionsHttpError) {
          const body = await error.context.json().catch(() => null);
          detail = body?.error || detail;
        }
        throw new Error(detail);
      }
      toast({ title: 'E-mail envoyé', description: `${email}${(data as any)?.id ? ` · ${(data as any).id}` : ''}` });
      qc.invalidateQueries({ queryKey: ['customer-email-log', email] });
      qc.invalidateQueries({ queryKey: ['customer-email-log'] });
      onOpenChange(false);
      setSubject('');
      setMessage('');
      setTemplate('free');
    } catch (e: any) {
      toast({ title: "L'e-mail n'est pas parti", description: e?.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const valid = subject.trim().length >= 2 && message.trim().length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="hud-text flex items-center gap-2">
            <Mail className="h-4 w-4" /> ENVOYER UN E-MAIL
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground border border-border rounded px-3 py-2">
            <p>Destinataire : <span className="text-foreground font-medium">{email}</span></p>
            <p className="mt-1">Expéditeur : adresse d'envoi du site (domaine vérifié).</p>
          </div>

          <div>
            <Label className="hud-text text-xs">Modèle</Label>
            <Select value={template} onValueChange={pickTemplate}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TEMPLATES).map(([k, t]) => (
                  <SelectItem key={k} value={k}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="hud-text text-xs">Objet</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Objet de l'e-mail" maxLength={200} />
          </div>

          <div>
            <Label className="hud-text text-xs">Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              placeholder={'Bonjour,\n\n...\n\n**Texte en gras** avec des étoiles.'}
              maxLength={10000}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Les sauts de ligne sont conservés. Entourez un mot de <code>**</code> pour le mettre en gras.
            </p>
          </div>

          <Button className="w-full" disabled={!valid || sending} onClick={send}>
            <Send className="h-4 w-4 mr-2" /> {sending ? 'Envoi...' : "Envoyer l'e-mail"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
