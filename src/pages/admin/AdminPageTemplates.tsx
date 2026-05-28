import { useState } from 'react';
import { Plus, Trash2, Edit, Star, Copy, Sparkles, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  usePageTemplates, useUpsertTemplate, useDeleteTemplate,
} from '@/hooks/usePageTemplates';
import {
  TEMPLATE_PRESETS, BLOCK_LABELS, newBlock,
  type PageTemplate, type BlockType, type TemplateBlock,
} from '@/config/templatePresets';

export default function AdminPageTemplates() {
  const { data: templates = [], isLoading } = usePageTemplates();
  const upsert = useUpsertTemplate();
  const del = useDeleteTemplate();
  const { toast } = useToast();

  const [editing, setEditing] = useState<(PageTemplate & { id?: string }) | null>(null);
  const [mockupOpen, setMockupOpen] = useState(false);

  const createFromPreset = async (preset: PageTemplate) => {
    const copy: PageTemplate = {
      ...preset,
      name: `${preset.name} (copie)`,
      slug: `${preset.slug}-${Date.now().toString(36)}`,
      isDefault: false,
    };
    try {
      const id = await upsert.mutateAsync(copy);
      toast({ title: 'Template créé', description: copy.name });
      setEditing({ ...copy, id });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Templates de pages</h1>
          <p className="text-sm text-muted-foreground">Créez et personnalisez vos pages Produit / Catégorie.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setMockupOpen(true)}>
            <Sparkles className="w-4 h-4 mr-2" /> Importer une maquette (IA)
          </Button>
        </div>
      </div>

      {/* Presets quick-start */}
      <Card className="p-4">
        <h2 className="font-semibold mb-3">Démarrer depuis un preset</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TEMPLATE_PRESETS.map(p => (
            <button key={p.slug} onClick={() => createFromPreset(p)}
                    className="text-left p-4 border rounded-lg hover:border-primary transition-colors group">
              <div className="h-20 rounded mb-2 flex items-center justify-center text-xs font-mono"
                   style={{ background: p.theme.colors.bg, color: p.theme.colors.fg, border: `1px solid ${p.theme.colors.border}` }}>
                <span style={{ color: p.theme.colors.accent }}>● </span>{p.name}
              </div>
              <div className="font-semibold text-sm">{p.name}</div>
              <div className="text-xs text-muted-foreground capitalize">{p.type}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Existing templates */}
      <Card className="p-4">
        <h2 className="font-semibold mb-3">Mes templates ({templates.length})</h2>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Chargement…</div>
        ) : templates.length === 0 ? (
          <div className="text-sm text-muted-foreground">Aucun template. Démarrez depuis un preset ci-dessus.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map(t => (
              <div key={t.id} className="border rounded-lg p-3 flex flex-col gap-2">
                <div className="h-20 rounded flex items-center justify-center text-xs"
                     style={{ background: t.theme.colors.bg, color: t.theme.colors.fg, border: `1px solid ${t.theme.colors.border}` }}>
                  <span style={{ color: t.theme.colors.accent }}>●</span>&nbsp;{t.name}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm flex items-center gap-2">
                      {t.name} {t.isDefault && <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">{t.type} · {t.layout.blocks.length} blocs</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(t)}>
                    <Edit className="w-3.5 h-3.5 mr-1" /> Éditer
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => createFromPreset(t)}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost"
                          onClick={() => { if (confirm(`Supprimer ${t.name} ?`)) del.mutate(t.id); }}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {editing && (
        <TemplateEditorDialog
          template={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); }}
        />
      )}

      {mockupOpen && (
        <MockupImportDialog
          onClose={() => setMockupOpen(false)}
          onTemplateReady={(t) => { setMockupOpen(false); setEditing(t); }}
        />
      )}
    </div>
  );
}

// ============ Editor Dialog ============

function TemplateEditorDialog({ template, onClose, onSaved }:
  { template: PageTemplate & { id?: string }; onClose: () => void; onSaved: () => void }) {
  const [t, setT] = useState<PageTemplate & { id?: string }>(template);
  const upsert = useUpsertTemplate();
  const { toast } = useToast();

  const save = async () => {
    try {
      await upsert.mutateAsync(t);
      toast({ title: 'Template enregistré' });
      onSaved();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  const updateBlock = (id: string, patch: Partial<TemplateBlock>) => {
    setT({ ...t, layout: { ...t.layout, blocks: t.layout.blocks.map(b => b.id === id ? { ...b, ...patch } : b) } });
  };
  const removeBlock = (id: string) => {
    setT({ ...t, layout: { ...t.layout, blocks: t.layout.blocks.filter(b => b.id !== id) } });
  };
  const addBlock = (type: BlockType) => {
    setT({ ...t, layout: { ...t.layout, blocks: [...t.layout.blocks, newBlock(type)] } });
  };
  const moveBlock = (idx: number, dir: -1 | 1) => {
    const arr = [...t.layout.blocks];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setT({ ...t, layout: { ...t.layout, blocks: arr } });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Édition du template</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Infos</TabsTrigger>
            <TabsTrigger value="theme">Thème</TabsTrigger>
            <TabsTrigger value="layout">Disposition</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-3 mt-4">
            <div>
              <Label>Nom</Label>
              <Input value={t.name} onChange={e => setT({ ...t, name: e.target.value })} />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={t.slug} onChange={e => setT({ ...t, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={t.type} onValueChange={(v: any) => setT({ ...t, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Produit</SelectItem>
                  <SelectItem value="category">Catégorie</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={!!t.isDefault} onCheckedChange={v => setT({ ...t, isDefault: v })} />
              <Label>Template par défaut pour ce type</Label>
            </div>
          </TabsContent>

          <TabsContent value="theme" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              {(['bg', 'fg', 'primary', 'accent', 'muted', 'card', 'border'] as const).map(k => (
                <div key={k}>
                  <Label className="capitalize">{k}</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={t.theme.colors[k]} className="w-14 p-1 h-10"
                           onChange={e => setT({ ...t, theme: { ...t.theme, colors: { ...t.theme.colors, [k]: e.target.value } } })} />
                    <Input value={t.theme.colors[k]}
                           onChange={e => setT({ ...t, theme: { ...t.theme, colors: { ...t.theme.colors, [k]: e.target.value } } })} />
                  </div>
                </div>
              ))}
            </div>
            <div>
              <Label>Police (CSS font-family)</Label>
              <Input value={t.theme.font || ''} onChange={e => setT({ ...t, theme: { ...t.theme, font: e.target.value } })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Rayon des coins</Label>
                <Input value={t.theme.radius || ''} onChange={e => setT({ ...t, theme: { ...t.theme, radius: e.target.value } })} />
              </div>
              <div>
                <Label>Ombre</Label>
                <Input value={t.theme.shadow || ''} onChange={e => setT({ ...t, theme: { ...t.theme, shadow: e.target.value } })} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="layout" className="space-y-3 mt-4">
            <div className="flex items-center gap-3">
              <div>
                <Label>Colonnes</Label>
                <Input type="number" min={1} max={12} value={t.layout.grid.cols}
                       onChange={e => setT({ ...t, layout: { ...t.layout, grid: { ...t.layout.grid, cols: Number(e.target.value) } } })} />
              </div>
              <div>
                <Label>Espacement (px)</Label>
                <Input type="number" value={t.layout.grid.gap}
                       onChange={e => setT({ ...t, layout: { ...t.layout, grid: { ...t.layout.grid, gap: Number(e.target.value) } } })} />
              </div>
              <div className="flex-1 flex justify-end">
                <Select value="" onValueChange={(v: BlockType) => addBlock(v)}>
                  <SelectTrigger className="w-56"><SelectValue placeholder="+ Ajouter un bloc" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(BLOCK_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              {t.layout.blocks.map((b, i) => (
                <div key={b.id} className="border rounded-lg p-2 flex items-center gap-2 flex-wrap">
                  <div className="flex flex-col">
                    <button onClick={() => moveBlock(i, -1)} className="text-xs">▲</button>
                    <button onClick={() => moveBlock(i, 1)} className="text-xs">▼</button>
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <div className="font-semibold text-sm">{BLOCK_LABELS[b.type]}</div>
                    <div className="text-xs text-muted-foreground">{b.type}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Label className="text-xs">Col</Label>
                    <Input type="number" min={1} max={12} value={b.col || 1} className="w-16 h-8"
                           onChange={e => updateBlock(b.id, { col: Number(e.target.value) })} />
                  </div>
                  <div className="flex items-center gap-1">
                    <Label className="text-xs">Span</Label>
                    <Input type="number" min={1} max={12} value={b.span || 12} className="w-16 h-8"
                           onChange={e => updateBlock(b.id, { span: Number(e.target.value) })} />
                  </div>
                  <Switch checked={b.visible !== false}
                          onCheckedChange={v => updateBlock(b.id, { visible: v })} />
                  <Button size="sm" variant="ghost" onClick={() => removeBlock(b.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={save} disabled={upsert.isPending}>Enregistrer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ Mockup Import Dialog ============

function MockupImportDialog({ onClose, onTemplateReady }:
  { onClose: () => void; onTemplateReady: (t: PageTemplate & { id?: string }) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [html, setHtml] = useState('');
  const [name, setName] = useState('Template depuis maquette');
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const run = async () => {
    setBusy(true);
    try {
      let imageBase64: string | undefined;
      if (file) {
        imageBase64 = await new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(String(r.result));
          r.onerror = rej;
          r.readAsDataURL(file);
        });
      }
      const { data, error } = await supabase.functions.invoke('template-from-mockup', {
        body: { imageBase64, html: html || undefined, name },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Template généré par IA' });
      onTemplateReady(data.template);
    } catch (e: any) {
      toast({ title: 'Erreur IA', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importer une maquette (IA)</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nom du template</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <Label>Image de la maquette (PNG, JPG)</Label>
            <Input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>
          <div>
            <Label>… ou collez du HTML</Label>
            <Textarea rows={6} value={html} onChange={e => setHtml(e.target.value)}
                      placeholder="<html>…</html>" />
          </div>
          <p className="text-xs text-muted-foreground">
            L'IA analyse la maquette et génère couleurs + disposition. Vous pourrez l'éditer ensuite.
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={run} disabled={busy || (!file && !html)}>
            {busy ? 'Analyse…' : <><Sparkles className="w-4 h-4 mr-2" /> Générer</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
