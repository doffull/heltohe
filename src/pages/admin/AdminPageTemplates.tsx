import { useState, useMemo, useRef } from 'react';
import {
  Plus, Trash2, Edit, Star, Copy, Sparkles, Upload, Download,
  Search, Eye, MoreVertical, Layers, Palette, Type, Settings2, Layout,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  usePageTemplates, useUpsertTemplate, useDeleteTemplate,
} from '@/hooks/usePageTemplates';
import {
  TEMPLATE_PRESETS, BLOCK_LABELS, newBlock,
  type PageTemplate, type BlockType, type TemplateBlock,
} from '@/config/templatePresets';
import { BLOCK_VARIANTS, GOOGLE_FONTS } from '@/config/blockVariants';

export default function AdminPageTemplates() {
  const { data: templates = [], isLoading } = usePageTemplates();
  const upsert = useUpsertTemplate();
  const del = useDeleteTemplate();
  const { toast } = useToast();
  const fileImportRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState<(PageTemplate & { id?: string }) | null>(null);
  const [mockupOpen, setMockupOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'product' | 'category'>('all');

  const filtered = useMemo(() => {
    return templates.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [templates, search, filterType]);

  const createFromPreset = async (preset: PageTemplate) => {
    const copy: PageTemplate = {
      ...preset,
      name: `${preset.name} (copie)`,
      slug: `${preset.slug}-${Date.now().toString(36)}`,
      isDefault: false,
    };
    try {
      const id = await upsert.mutateAsync(copy);
      toast({ title: '✓ Template créé', description: copy.name });
      setEditing({ ...copy, id });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  const exportTemplate = (t: PageTemplate) => {
    const { id, ...exportable } = t as any;
    const blob = new Blob([JSON.stringify(exportable, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${t.slug}.template.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const importTemplate = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.name || !parsed.type || !parsed.theme || !parsed.layout) {
        throw new Error('Format invalide (name, type, theme, layout requis)');
      }
      const copy: PageTemplate = { ...parsed, isDefault: false, slug: `${parsed.slug || 'imported'}-${Date.now().toString(36)}` };
      await upsert.mutateAsync(copy);
      toast({ title: '✓ Template importé', description: copy.name });
    } catch (e: any) {
      toast({ title: 'Import échoué', description: e.message, variant: 'destructive' });
    }
  };

  const setAsDefault = async (t: PageTemplate & { id: string }) => {
    try {
      await upsert.mutateAsync({ ...t, isDefault: true });
      toast({ title: '✓ Défini comme template par défaut', description: t.name });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Premium header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 p-6 md:p-8 text-white shadow-xl">
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Templates de pages</h1>
            <p className="text-white/80 text-sm mt-1">Composez des pages Produit & Catégorie premium, 100 % personnalisables.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" onClick={() => fileImportRef.current?.click()} className="bg-white/15 hover:bg-white/25 text-white border-white/20">
              <Upload className="w-4 h-4 mr-2" /> Importer JSON
            </Button>
            <input ref={fileImportRef} type="file" accept="application/json" className="hidden"
                   onChange={e => { const f = e.target.files?.[0]; if (f) importTemplate(f); e.target.value = ''; }} />
            <Button variant="secondary" onClick={() => setMockupOpen(true)} className="bg-white/15 hover:bg-white/25 text-white border-white/20">
              <Sparkles className="w-4 h-4 mr-2" /> Importer maquette (IA)
            </Button>
          </div>
        </div>
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 bg-indigo-300/20 rounded-full blur-3xl" />
      </div>

      {/* Presets gallery */}
      <Card className="p-6 border-2">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-purple-600" />
          <h2 className="font-bold text-lg">Démarrer depuis un preset</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {TEMPLATE_PRESETS.map(p => (
            <button key={p.slug} onClick={() => createFromPreset(p)}
                    className="group text-left rounded-xl overflow-hidden border-2 border-transparent hover:border-purple-500 hover:shadow-xl transition-all bg-white">
              <div className="aspect-[4/3] bg-muted overflow-hidden">
                {p.previewImage ? (
                  <img src={p.previewImage} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs"
                       style={{ background: p.theme.colors.bg, color: p.theme.colors.fg }}>
                    {p.name}
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="font-bold text-sm">{p.name}</div>
                <div className="text-xs text-muted-foreground capitalize">{p.type}</div>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un template…" className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="product">Produit</SelectItem>
            <SelectItem value="category">Catégorie</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates grid */}
      <div>
        <h2 className="font-bold text-lg mb-3">Mes templates <span className="text-muted-foreground font-normal">({filtered.length})</span></h2>
        {isLoading ? (
          <div className="text-sm text-muted-foreground p-8 text-center">Chargement…</div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <Layout className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <div className="text-sm text-muted-foreground">Aucun template. Démarrez depuis un preset ci-dessus.</div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(t => (
              <Card key={t.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                <div className="aspect-[4/3] relative bg-muted overflow-hidden">
                  {t.previewImage ? (
                    <img src={t.previewImage} alt={t.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: t.theme.colors.bg, color: t.theme.colors.fg }}>
                      <span className="text-sm font-semibold">{t.name}</span>
                    </div>
                  )}
                  {t.isDefault && (
                    <Badge className="absolute top-2 left-2 bg-yellow-500 text-yellow-950 hover:bg-yellow-500">
                      <Star className="w-3 h-3 mr-1 fill-current" /> Par défaut
                    </Badge>
                  )}
                  <Badge className="absolute top-2 right-2 capitalize" variant="secondary">{t.type}</Badge>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <div className="font-bold">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.layout.blocks.length} blocs · {t.theme.fontHeading || 'Default font'}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => setEditing(t)}>
                      <Edit className="w-3.5 h-3.5 mr-1" /> Éditer
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline"><MoreVertical className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => createFromPreset(t)}><Copy className="w-4 h-4 mr-2" />Dupliquer</DropdownMenuItem>
                        {!t.isDefault && (
                          <DropdownMenuItem onClick={() => setAsDefault(t)}><Star className="w-4 h-4 mr-2" />Définir par défaut</DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => exportTemplate(t)}><Download className="w-4 h-4 mr-2" />Exporter JSON</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />Supprimer
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer ce template ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible. Les produits et catégories utilisant ce template repasseront au template par défaut.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => del.mutate(t.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Supprimer définitivement
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <TemplateEditorDialog
          template={editing}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
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
      toast({ title: '✓ Template enregistré', description: t.name });
      onSaved();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message || 'Échec de l\'enregistrement', variant: 'destructive' });
    }
  };

  const updateBlock = (id: string, patch: Partial<TemplateBlock>) => {
    setT({ ...t, layout: { ...t.layout, blocks: t.layout.blocks.map(b => b.id === id ? { ...b, ...patch } : b) } });
  };
  const updateBlockProps = (id: string, patch: Record<string, any>) => {
    setT({
      ...t,
      layout: {
        ...t.layout,
        blocks: t.layout.blocks.map(b => b.id === id ? { ...b, props: { ...(b.props || {}), ...patch } } : b),
      },
    });
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
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" /> Édition · {t.name}
          </DialogTitle>
          <DialogDescription>Tous les changements sont enregistrés à la sauvegarde.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info">
          <TabsList className="w-full justify-start admin-tabs-scroll w-full h-auto">
            <TabsTrigger value="info"><Settings2 className="w-4 h-4 mr-1" /> Infos</TabsTrigger>
            <TabsTrigger value="theme"><Palette className="w-4 h-4 mr-1" /> Thème</TabsTrigger>
            <TabsTrigger value="typo"><Type className="w-4 h-4 mr-1" /> Typo</TabsTrigger>
            <TabsTrigger value="layout"><Layout className="w-4 h-4 mr-1" /> Disposition</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-3 mt-4">
            <div>
              <Label>Nom *</Label>
              <Input value={t.name} onChange={e => setT({ ...t, name: e.target.value })} />
            </div>
            <div>
              <Label>Slug (auto-corrigé)</Label>
              <Input value={t.slug} onChange={e => setT({ ...t, slug: e.target.value })} />
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

          <TabsContent value="theme" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(['bg', 'fg', 'primary', 'accent', 'muted', 'card', 'border'] as const).map(k => (
                <div key={k}>
                  <Label className="capitalize text-xs">{k}</Label>
                  <div className="flex gap-1">
                    <Input type="color" value={t.theme.colors[k]} className="w-12 p-1 h-10"
                           onChange={e => setT({ ...t, theme: { ...t.theme, colors: { ...t.theme.colors, [k]: e.target.value } } })} />
                    <Input value={t.theme.colors[k]} className="text-xs"
                           onChange={e => setT({ ...t, theme: { ...t.theme, colors: { ...t.theme.colors, [k]: e.target.value } } })} />
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Rayon des coins</Label>
                <Input value={t.theme.radius || ''} placeholder="8px"
                       onChange={e => setT({ ...t, theme: { ...t.theme, radius: e.target.value } })} />
              </div>
              <div>
                <Label>Ombre</Label>
                <Input value={t.theme.shadow || ''} placeholder="0 2px 8px rgba(0,0,0,0.06)"
                       onChange={e => setT({ ...t, theme: { ...t.theme, shadow: e.target.value } })} />
              </div>
              <div>
                <Label>Espacement de base ({t.theme.spacing || 16}px)</Label>
                <Slider min={4} max={48} step={2} value={[t.theme.spacing || 16]}
                        onValueChange={([v]) => setT({ ...t, theme: { ...t.theme, spacing: v } })} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="typo" className="space-y-4 mt-4">
            <div>
              <Label>Police des titres (Google Font)</Label>
              <Select value={t.theme.fontHeading || ''} onValueChange={v => setT({ ...t, theme: { ...t.theme, fontHeading: v } })}>
                <SelectTrigger><SelectValue placeholder="Choisir une police…" /></SelectTrigger>
                <SelectContent>
                  {GOOGLE_FONTS.map(f => <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Police du corps (Google Font)</Label>
              <Select value={t.theme.fontBody || ''} onValueChange={v => setT({ ...t, theme: { ...t.theme, fontBody: v } })}>
                <SelectTrigger><SelectValue placeholder="Choisir une police…" /></SelectTrigger>
                <SelectContent>
                  {GOOGLE_FONTS.map(f => <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Police personnalisée (CSS font-family avancée)</Label>
              <Input value={t.theme.font || ''} placeholder="'Helvetica Neue', sans-serif"
                     onChange={e => setT({ ...t, theme: { ...t.theme, font: e.target.value } })} />
            </div>
          </TabsContent>

          <TabsContent value="layout" className="space-y-3 mt-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <Label>Colonnes</Label>
                <Input type="number" min={1} max={12} value={t.layout.grid.cols} className="w-24"
                       onChange={e => setT({ ...t, layout: { ...t.layout, grid: { ...t.layout.grid, cols: Number(e.target.value) } } })} />
              </div>
              <div>
                <Label>Espacement (px)</Label>
                <Input type="number" value={t.layout.grid.gap} className="w-24"
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
              {t.layout.blocks.map((b, i) => {
                const variants = BLOCK_VARIANTS[b.type];
                return (
                  <Card key={b.id} className="p-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex flex-col">
                        <button onClick={() => moveBlock(i, -1)} className="text-xs hover:text-primary" aria-label="Monter">▲</button>
                        <button onClick={() => moveBlock(i, 1)} className="text-xs hover:text-primary" aria-label="Descendre">▼</button>
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
                    {variants && variants.length > 0 && (
                      <div className="pl-7">
                        <Label className="text-xs text-muted-foreground">Variante</Label>
                        <Select value={b.variant || variants[0].id} onValueChange={v => updateBlock(b.id, { variant: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {variants.map(v => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Per-block: text + typography + colors */}
                    <div className="pl-7 pt-2 border-t space-y-2">
                      {b.type === 'custom_html' ? (
                        <div>
                          <Label className="text-xs text-muted-foreground">HTML</Label>
                          <Textarea
                            rows={3}
                            value={b.props?.html || ''}
                            onChange={e => updateBlockProps(b.id, { html: e.target.value })}
                            placeholder="<div>…</div>"
                            className="text-xs font-mono"
                          />
                        </div>
                      ) : b.type !== 'gallery' && b.type !== 'divider' && b.type !== 'spacer' && b.type !== 'related_products' ? (
                        <div>
                          <Label className="text-xs text-muted-foreground">Libellé / texte personnalisé</Label>
                          <Input
                            className="h-8 text-xs"
                            value={b.props?.label || ''}
                            onChange={e => updateBlockProps(b.id, { label: e.target.value })}
                            placeholder="(par défaut)"
                          />
                        </div>
                      ) : null}

                      {b.type !== 'gallery' && b.type !== 'divider' && b.type !== 'spacer' && (
                        <>
                          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                            <div className="col-span-2">
                              <Label className="text-[10px] text-muted-foreground">Police</Label>
                              <Select
                                value={b.props?.fontFamily || '__inherit'}
                                onValueChange={v => updateBlockProps(b.id, { fontFamily: v === '__inherit' ? '' : v })}
                              >
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__inherit">— Hériter —</SelectItem>
                                  {GOOGLE_FONTS.map(f => <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Taille</Label>
                              <Input type="number" className="h-8 text-xs" placeholder="px"
                                     value={b.props?.fontSize ?? ''}
                                     onChange={e => updateBlockProps(b.id, { fontSize: e.target.value === '' ? undefined : Number(e.target.value) })} />
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Graisse</Label>
                              <Select
                                value={String(b.props?.fontWeight || '__inherit')}
                                onValueChange={v => updateBlockProps(b.id, { fontWeight: v === '__inherit' ? undefined : Number(v) })}
                              >
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__inherit">—</SelectItem>
                                  {[300, 400, 500, 600, 700, 800, 900].map(w => <SelectItem key={w} value={String(w)}>{w}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Casse</Label>
                              <Select
                                value={b.props?.textTransform || '__inherit'}
                                onValueChange={v => updateBlockProps(b.id, { textTransform: v === '__inherit' ? undefined : v })}
                              >
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__inherit">—</SelectItem>
                                  <SelectItem value="none">Normal</SelectItem>
                                  <SelectItem value="uppercase">UPPER</SelectItem>
                                  <SelectItem value="lowercase">lower</SelectItem>
                                  <SelectItem value="capitalize">Capitalize</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Align</Label>
                              <Select
                                value={b.props?.textAlign || '__inherit'}
                                onValueChange={v => updateBlockProps(b.id, { textAlign: v === '__inherit' ? undefined : v })}
                              >
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__inherit">—</SelectItem>
                                  <SelectItem value="left">Gauche</SelectItem>
                                  <SelectItem value="center">Centre</SelectItem>
                                  <SelectItem value="right">Droite</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            {(['color', 'bgColor', 'accentColor'] as const).map((k) => {
                              const label = k === 'color' ? 'Texte' : k === 'bgColor' ? 'Fond' : 'Accent';
                              const val = (b.props?.[k] as string) || '';
                              return (
                                <div key={k}>
                                  <Label className="text-[10px] text-muted-foreground">{label}</Label>
                                  <div className="flex gap-1">
                                    <Input type="color" className="w-10 h-8 p-1"
                                           value={val || '#000000'}
                                           onChange={e => updateBlockProps(b.id, { [k]: e.target.value })} />
                                    <Input className="h-8 text-xs flex-1" placeholder="hérite"
                                           value={val}
                                           onChange={e => updateBlockProps(b.id, { [k]: e.target.value })} />
                                    {val && (
                                      <Button size="sm" variant="ghost" className="h-8 px-2 text-[10px]"
                                              onClick={() => updateBlockProps(b.id, { [k]: '' })}>×</Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t mt-4 sticky bottom-0 bg-background">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={save} disabled={upsert.isPending} className="min-w-[120px]">
            {upsert.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
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
      toast({ title: '✓ Template généré par IA' });
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
          <DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-600" /> Importer une maquette</DialogTitle>
          <DialogDescription>L'IA analyse votre maquette et génère un template prêt à éditer.</DialogDescription>
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
