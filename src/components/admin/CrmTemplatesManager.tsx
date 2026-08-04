import { useState } from 'react';
import { Plus, Pencil, Trash2, Eye, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  useCrmMessageTemplates, useSaveCrmMessageTemplate, useDeleteCrmMessageTemplate,
  type CrmMessageTemplate,
} from '@/hooks/useCrm';
import { TEMPLATE_VARS, renderTemplate, sampleContext, extractVars } from '@/lib/crmTemplateVars';

function TemplateEditor({
  open, onOpenChange, template,
}: { open: boolean; onOpenChange: (v: boolean) => void; template: CrmMessageTemplate | null }) {
  const save = useSaveCrmMessageTemplate();
  const [form, setForm] = useState({
    name: '', category: 'general', subject: '', body: '', is_active: true, sort_order: 0,
  });
  const [preview, setPreview] = useState(false);

  const key = `${open}-${template?.id ?? 'new'}`;
  const [lastKey, setLastKey] = useState('');
  if (key !== lastKey) {
    setLastKey(key);
    setForm({
      name: template?.name || '',
      category: template?.category || 'general',
      subject: template?.subject || '',
      body: template?.body || '',
      is_active: template?.is_active ?? true,
      sort_order: template?.sort_order ?? 0,
    });
    setPreview(false);
  }

  const insertVar = (v: string) => setForm((f) => ({ ...f, body: `${f.body}{{${v}}}` }));

  const submit = async () => {
    if (!form.name.trim() || !form.body.trim()) {
      toast({ title: 'Nom et contenu obligatoires', variant: 'destructive' });
      return;
    }
    try {
      await save.mutateAsync({ id: template?.id, ...form });
      toast({ title: template ? 'Modèle mis à jour' : 'Modèle créé' });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  const ctx = sampleContext();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? 'Modifier le modèle' : 'Nouveau modèle'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nom du modèle *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Suivi de commande" />
            </div>
            <div className="space-y-1.5">
              <Label>Catégorie</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="commande, sav, general…" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Objet de l'e-mail</Label>
            <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Re: {{objet}}" />
          </div>

          <div className="space-y-1.5">
            <Label>Contenu *</Label>
            <Textarea
              rows={10}
              className="font-mono text-xs"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder={'Bonjour {{prenom}},\n\n…\n\n{{signature}}'}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Insérer une variable</Label>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_VARS.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  title={v.label}
                  onClick={() => insertVar(v.key)}
                  className="text-[11px] font-mono px-2 py-1 rounded-md border border-border bg-muted/50 hover:bg-muted transition-colors"
                >
                  {`{{${v.key}}}`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Modèle actif</p>
              <p className="text-xs text-muted-foreground">Visible dans le sélecteur de réponse rapide.</p>
            </div>
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
          </div>

          <Button type="button" variant="outline" size="sm" onClick={() => setPreview((p) => !p)}>
            <Eye className="h-4 w-4 mr-1.5" /> {preview ? 'Masquer' : 'Aperçu'} avec valeurs d'exemple
          </Button>

          {preview && (
            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                Objet : <span className="text-foreground font-medium">{renderTemplate(form.subject, ctx) || '—'}</span>
              </p>
              <p className="text-sm whitespace-pre-wrap">{renderTemplate(form.body, ctx)}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={save.isPending}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CrmTemplatesManager() {
  const { data: templates = [] } = useCrmMessageTemplates();
  const save = useSaveCrmMessageTemplate();
  const remove = useDeleteCrmMessageTemplate();
  const [editor, setEditor] = useState<{ open: boolean; template: CrmMessageTemplate | null }>({ open: false, template: null });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Modèles de réponse</h2>
          <p className="text-xs text-muted-foreground">
            Réponses pré-écrites avec variables dynamiques, pour répondre en un clic depuis la messagerie.
          </p>
        </div>
        <Button size="sm" onClick={() => setEditor({ open: true, template: null })}>
          <Plus className="h-4 w-4 mr-1.5" /> Nouveau modèle
        </Button>
      </div>

      <div className="divide-y divide-border rounded-lg border border-border">
        {templates.map((t) => (
          <div key={t.id} className="flex items-start gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium truncate">{t.name}</p>
                <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                {!t.is_active && <Badge variant="secondary" className="text-[10px]">Inactif</Badge>}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.body}</p>
              {!!extractVars(t.body).length && (
                <p className="text-[10px] font-mono text-muted-foreground mt-1">
                  {extractVars(t.body).map((v) => `{{${v}}}`).join(' · ')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                title="Dupliquer"
                onClick={async () => {
                  await save.mutateAsync({ ...t, id: undefined, name: `${t.name} (copie)` });
                  toast({ title: 'Modèle dupliqué' });
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setEditor({ open: true, template: t })}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={async () => {
                  if (!confirm(`Supprimer le modèle « ${t.name} » ?`)) return;
                  await remove.mutateAsync(t.id);
                  toast({ title: 'Modèle supprimé' });
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {!templates.length && (
          <p className="text-sm text-muted-foreground p-6 text-center">Aucun modèle pour le moment.</p>
        )}
      </div>

      <TemplateEditor
        open={editor.open}
        onOpenChange={(v) => setEditor({ open: v, template: v ? editor.template : null })}
        template={editor.template}
      />
    </div>
  );
}

export default CrmTemplatesManager;
