import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Loader2, Mail, RotateCcw, Save, Send, Smartphone, Monitor } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  AUTH_EMAIL_KEYS,
  AUTH_EMAIL_LABELS,
  AUTH_EMAIL_SAMPLE_VARS,
  DEFAULT_AUTH_EMAIL_CONTENT,
  renderAuthEmailHtml,
  type AuthEmailContent,
  type AuthEmailKey,
} from '@/lib/authEmailTemplate';

type Row = { key: string; draft: AuthEmailContent | null; published: AuthEmailContent | null; published_at: string | null };

export default function AdminAuthEmails() {
  const [activeKey, setActiveKey] = useState<AuthEmailKey>('signup');
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [content, setContent] = useState<AuthEmailContent>(DEFAULT_AUTH_EMAIL_CONTENT.signup);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('auth_email_templates')
        .select('key, draft, published, published_at');
      if (error) {
        toast.error('Impossible de charger les modèles');
      } else {
        const map: Record<string, Row> = {};
        (data || []).forEach((r) => {
          map[r.key] = r as unknown as Row;
        });
        setRows(map);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const row = rows[activeKey];
    const draft = row?.draft && Object.keys(row.draft).length > 0 ? row.draft : null;
    setContent(draft || DEFAULT_AUTH_EMAIL_CONTENT[activeKey]);
  }, [activeKey, rows]);

  const previewHtml = useMemo(
    () => renderAuthEmailHtml(content, AUTH_EMAIL_SAMPLE_VARS),
    [content],
  );

  const isPublished = useMemo(() => {
    const pub = rows[activeKey]?.published;
    return pub ? JSON.stringify(pub) === JSON.stringify(content) : false;
  }, [rows, activeKey, content]);

  function update(patch: Partial<AuthEmailContent>) {
    setContent((c) => ({ ...c, ...patch }));
  }
  function updateBrand(patch: Partial<NonNullable<AuthEmailContent['brand']>>) {
    setContent((c) => ({ ...c, brand: { ...(c.brand || {}), ...patch } }));
  }

  async function saveDraft() {
    setSaving(true);
    const { error } = await supabase
      .from('auth_email_templates')
      .upsert({ key: activeKey, draft: content as never }, { onConflict: 'key' });
    setSaving(false);
    if (error) return toast.error('Échec de l’enregistrement');
    setRows((r) => ({
      ...r,
      [activeKey]: { ...(r[activeKey] || { key: activeKey, published: null, published_at: null }), key: activeKey, draft: content },
    }));
    toast.success('Brouillon enregistré');
  }

  async function publish() {
    setPublishing(true);
    const { error } = await supabase.from('auth_email_templates').upsert(
      {
        key: activeKey,
        draft: content as never,
        published: content as never,
        published_at: new Date().toISOString(),
      },
      { onConflict: 'key' },
    );
    setPublishing(false);
    if (error) return toast.error('Échec de la publication');
    setRows((r) => ({
      ...r,
      [activeKey]: { key: activeKey, draft: content, published: content, published_at: new Date().toISOString() },
    }));
    toast.success('Modèle publié — utilisé pour les prochains envois');
  }

  function resetDefaults() {
    setContent(DEFAULT_AUTH_EMAIL_CONTENT[activeKey]);
    toast.info('Contenu par défaut restauré (pensez à publier)');
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Modèles d’e-mails d’authentification | Admin</title>
      </Helmet>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Mail className="h-6 w-6" /> E-mails d’authentification
          </h1>
          <p className="text-sm text-muted-foreground">
            Éditez le contenu, prévisualisez en temps réel, puis publiez.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={resetDefaults}>
            <RotateCcw className="mr-2 h-4 w-4" /> Défaut
          </Button>
          <Button variant="secondary" onClick={saveDraft} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Brouillon
          </Button>
          <Button onClick={publish} disabled={publishing}>
            {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Publier
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {AUTH_EMAIL_KEYS.map((k) => (
          <Button
            key={k}
            size="sm"
            variant={k === activeKey ? 'default' : 'outline'}
            onClick={() => setActiveKey(k)}
          >
            {AUTH_EMAIL_LABELS[k]}
            {rows[k]?.published ? <Badge variant="secondary" className="ml-2">publié</Badge> : null}
          </Button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contenu — {AUTH_EMAIL_LABELS[activeKey]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Objet de l’e-mail</Label>
              <Input value={content.subject || ''} onChange={(e) => update({ subject: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Texte d’aperçu (preheader)</Label>
              <Input value={content.preheader || ''} onChange={(e) => update({ preheader: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input value={content.heading || ''} onChange={(e) => update({ heading: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Corps du message</Label>
              <Textarea
                rows={8}
                className="min-h-[180px] font-mono text-sm"
                value={content.body || ''}
                onChange={(e) => update({ body: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Variables : {'{{siteName}}'}, {'{{recipient}}'}, {'{{confirmationUrl}}'}, {'{{token}}'},{' '}
                {'{{newEmail}}'}. Une ligne vide = nouveau paragraphe.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <Label className="cursor-pointer">Afficher le bouton d’action</Label>
                <p className="text-xs text-muted-foreground">Désactivez pour les e-mails à code (OTP).</p>
              </div>
              <Switch
                checked={content.showButton !== false}
                onCheckedChange={(v) => update({ showButton: v })}
              />
            </div>
            {content.showButton !== false && (
              <div className="space-y-2">
                <Label>Libellé du bouton</Label>
                <Input
                  value={content.buttonLabel || ''}
                  onChange={(e) => update({ buttonLabel: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Pied de message</Label>
              <Textarea rows={3} value={content.footer || ''} onChange={(e) => update({ footer: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-2">
                <Label>Couleur du bouton</Label>
                <Input
                  type="color"
                  className="h-10 p-1"
                  value={content.brand?.primary || '#000000'}
                  onChange={(e) => updateBrand({ primary: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Texte du bouton</Label>
                <Input
                  type="color"
                  className="h-10 p-1"
                  value={content.brand?.primaryText || '#ffffff'}
                  onChange={(e) => updateBrand({ primaryText: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Couleur du titre</Label>
                <Input
                  type="color"
                  className="h-10 p-1"
                  value={content.brand?.headingColor || '#000000'}
                  onChange={(e) => updateBrand({ headingColor: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Couleur du texte</Label>
                <Input
                  type="color"
                  className="h-10 p-1"
                  value={content.brand?.textColor || '#55575d'}
                  onChange={(e) => updateBrand({ textColor: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>URL du logo (optionnel)</Label>
                <Input
                  placeholder="https://…/logo.png"
                  value={content.brand?.logoUrl || ''}
                  onChange={(e) => updateBrand({ logoUrl: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:sticky lg:top-4 h-fit">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">
              Aperçu en temps réel
              {isPublished ? (
                <Badge variant="secondary" className="ml-2">à jour</Badge>
              ) : (
                <Badge className="ml-2">non publié</Badge>
              )}
            </CardTitle>
            <Tabs value={device} onValueChange={(v) => setDevice(v as 'desktop' | 'mobile')}>
              <TabsList>
                <TabsTrigger value="desktop"><Monitor className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="mobile"><Smartphone className="h-4 w-4" /></TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <div className="mb-3 rounded-md border border-border bg-muted/40 p-3 text-sm">
              <p className="font-medium">Objet : {content.subject || '—'}</p>
              <p className="text-xs text-muted-foreground">
                De : HELVETICA-MP · À : {AUTH_EMAIL_SAMPLE_VARS.recipient}
              </p>
            </div>
            <div className="mx-auto overflow-hidden rounded-md border border-border" style={{ maxWidth: device === 'mobile' ? 390 : '100%' }}>
              <iframe
                title="Aperçu de l’e-mail"
                srcDoc={previewHtml}
                className="w-full bg-white"
                style={{ height: 620, border: 0 }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
