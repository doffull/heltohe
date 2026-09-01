import { useEffect, useMemo, useState } from 'react';
import { Mail, Save, FileText, Loader2, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  DEFAULT_TEMPLATES,
  useEmailTemplates,
  useSaveEmailTemplate,
  useSeedEmailTemplates,
  useSendCustomEmail,
  type EmailTemplate,
} from '@/hooks/useEmailTemplates';
import { useDesignSettings, useSaveDesignSettings } from '@/hooks/useDesignSettings';
import { normalizeInvoiceBrand, type InvoiceBrand } from '@/lib/invoiceSettings';

const VARIABLES = ['{{prenom}}', '{{orderNumber}}', '{{total}}', '{{trackingNumber}}', '{{trackingUrl}}'];

const PREVIEW_VALUES: Record<string, string> = {
  '{{prenom}}': 'Marie',
  '{{orderNumber}}': 'HMP-1042',
  '{{total}}': '189.00',
  '{{trackingNumber}}': '6A12345678901',
  '{{trackingUrl}}': 'https://www.laposte.fr/outils/suivre-vos-envois?code=6A12345678901',
};

function renderPreview(html: string): string {
  let out = html;
  for (const [k, v] of Object.entries(PREVIEW_VALUES)) out = out.split(k).join(v);
  return out;
}

export default function AdminEmails() {
  const { toast } = useToast();
  const { data: templates = [], isLoading } = useEmailTemplates();
  const saveTemplate = useSaveEmailTemplate();
  const seed = useSeedEmailTemplates();
  const sendEmail = useSendCustomEmail();
  const { data: design } = useDesignSettings();
  const saveDesign = useSaveDesignSettings();

  const list = useMemo<Array<Partial<EmailTemplate> & { template_key: string; name: string }>>(
    () => (templates.length > 0 ? templates : DEFAULT_TEMPLATES),
    [templates],
  );

  const [activeKey, setActiveKey] = useState<string>(DEFAULT_TEMPLATES[0].template_key);
  const [draft, setDraft] = useState<Partial<EmailTemplate> & { template_key: string; name: string }>(
    DEFAULT_TEMPLATES[0],
  );
  const [testEmail, setTestEmail] = useState('');
  const [brand, setBrand] = useState<InvoiceBrand>(normalizeInvoiceBrand(null));

  useEffect(() => {
    const found = list.find(t => t.template_key === activeKey);
    if (found) setDraft({ ...found });
  }, [activeKey, list]);

  useEffect(() => {
    if (design) setBrand(normalizeInvoiceBrand((design as any).invoiceBrand));
  }, [design]);

  const handleSaveTemplate = async () => {
    try {
      await saveTemplate.mutateAsync({
        template_key: draft.template_key,
        name: draft.name,
        subject: draft.subject ?? '',
        html_body: draft.html_body ?? '',
        is_active: draft.is_active ?? true,
      });
      toast({ title: 'Modèle enregistré' });
    } catch (e) {
      toast({ title: 'Enregistrement impossible', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const handleTest = async () => {
    if (!testEmail.trim()) {
      toast({ title: 'Adresse de test requise', variant: 'destructive' });
      return;
    }
    try {
      await sendEmail.mutateAsync({
        to: testEmail.trim(),
        subject: renderPreview(draft.subject ?? ''),
        html: renderPreview(draft.html_body ?? ''),
      });
      toast({ title: 'E-mail de test envoyé', description: testEmail.trim() });
    } catch (e) {
      toast({ title: "Échec de l'envoi", description: (e as Error).message, variant: 'destructive' });
    }
  };

  const handleSaveBrand = async () => {
    if (!design) return;
    try {
      await saveDesign.mutateAsync({ ...(design as any), invoiceBrand: brand });
      toast({ title: 'Facture personnalisée enregistrée' });
    } catch (e) {
      toast({ title: 'Enregistrement impossible', description: (e as Error).message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-xl lg:text-3xl font-bold hud-text">E-MAILS &amp; FACTURES</h1>
        <p className="text-muted-foreground text-xs lg:text-sm mt-1">
          Personnalisez les e-mails envoyés aux clients et l'en-tête de vos factures.
        </p>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates"><Mail className="h-3.5 w-3.5 mr-2" />Modèles d'e-mails</TabsTrigger>
          <TabsTrigger value="invoice"><FileText className="h-3.5 w-3.5 mr-2" />Facture</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          {templates.length === 0 && !isLoading && (
            <Button variant="outline" size="sm" onClick={() => seed.mutate()} disabled={seed.isPending}>
              {seed.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Créer les modèles par défaut
            </Button>
          )}

          <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
            <Card>
              <CardHeader><CardTitle className="text-sm">Modèles</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {list.map(t => (
                  <Button
                    key={t.template_key}
                    variant={t.template_key === activeKey ? 'default' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setActiveKey(t.template_key)}
                  >
                    {t.name}
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">{draft.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Actif</Label>
                  <Switch
                    checked={draft.is_active ?? true}
                    onCheckedChange={v => setDraft(d => ({ ...d, is_active: v }))}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Nom interne</Label>
                  <Input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Objet</Label>
                  <Input
                    value={draft.subject ?? ''}
                    onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Contenu HTML</Label>
                  <Textarea
                    rows={10}
                    value={draft.html_body ?? ''}
                    onChange={e => setDraft(d => ({ ...d, html_body: e.target.value }))}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {VARIABLES.map(v => (
                    <Button
                      key={v}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px]"
                      onClick={() => setDraft(d => ({ ...d, html_body: `${d.html_body ?? ''}${v}` }))}
                    >
                      {v}
                    </Button>
                  ))}
                </div>

                <div>
                  <Label className="text-xs">Aperçu</Label>
                  <div
                    className="border rounded p-3 bg-white text-black text-sm"
                    dangerouslySetInnerHTML={{ __html: renderPreview(draft.html_body ?? '') }}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={handleSaveTemplate} disabled={saveTemplate.isPending}>
                    {saveTemplate.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Enregistrer
                  </Button>
                  <div className="flex gap-2 flex-1">
                    <Input
                      placeholder="adresse@test.com"
                      value={testEmail}
                      onChange={e => setTestEmail(e.target.value)}
                    />
                    <Button variant="outline" onClick={handleTest} disabled={sendEmail.isPending}>
                      {sendEmail.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                      Test
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoice">
          <Card>
            <CardHeader><CardTitle className="text-sm">En-tête et mentions de facture</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Nom de la société</Label>
                  <Input value={brand.companyName} onChange={e => setBrand(b => ({ ...b, companyName: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Sous-titre</Label>
                  <Input value={brand.tagline} onChange={e => setBrand(b => ({ ...b, tagline: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Logo (URL)</Label>
                  <Input value={brand.logoUrl} onChange={e => setBrand(b => ({ ...b, logoUrl: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Adresse (une ligne par retour)</Label>
                  <Textarea rows={3} value={brand.addressLines} onChange={e => setBrand(b => ({ ...b, addressLines: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">SIRET</Label>
                  <Input value={brand.siret} onChange={e => setBrand(b => ({ ...b, siret: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">N° TVA</Label>
                  <Input value={brand.vatNumber} onChange={e => setBrand(b => ({ ...b, vatNumber: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Mention de pied de facture</Label>
                  <Input value={brand.footerNote} onChange={e => setBrand(b => ({ ...b, footerNote: e.target.value }))} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={brand.showVat} onCheckedChange={v => setBrand(b => ({ ...b, showVat: v }))} />
                <Label className="text-xs">Afficher la ligne TVA sur la facture</Label>
              </div>
              <Button onClick={handleSaveBrand} disabled={saveDesign.isPending}>
                {saveDesign.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Enregistrer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
