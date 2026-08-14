import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { MediaLibraryDialog } from '@/components/visual-editor/MediaLibraryDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GripVertical, Save, Eye, EyeOff, Sparkles, Pencil, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PageSection } from '@/hooks/usePages';
import { resolveFeedSections, feedBlockId, FEED_BLOCK_PREFIX } from '@/config/homeFeedSections';

const EDIT_ROUTE: Record<string, string> = {
  hero: '/admin/design#techwear-hero',
  categories: '/admin/categories',
  storeFinder: '/admin/boutiques',
  featured: '/admin/products',
  newArrivals: '/admin/products',
  flash: '/admin/marketing#flash',
  loyalty: '/admin/marketing#fidelite',
  newsletter: '/admin/marketing#newsletter',
  voiceBanner: '/admin/home-icons#unified-fab',
};

type BuiltinId = 'hero' | 'categories' | 'storeFinder' | 'featured' | 'flash' | 'newArrivals' | 'voiceBanner' | 'loyalty' | 'newsletter';
interface Block { id: string; visible: boolean; label?: string; settings?: Record<string, any> }

// Blocs disposant d'un éditeur inline (panneau pliable au lieu de naviguer)
const INLINE_EDITABLE = new Set<string>(['categories', 'storeFinder']);

const BUILTIN_LABELS: Record<BuiltinId, string> = {
  hero: 'Hero (slider ou techwear)',
  categories: 'Grille catégories',
  storeFinder: 'Nos boutiques (recherche + carte)',
  featured: 'Produits en vedette',
  flash: 'Flash promo (compte à rebours)',
  newArrivals: 'Dernières arrivées',
  voiceBanner: 'Bannière Commandes vocales + IGRA',
  loyalty: 'Bandeau fidélité',
  newsletter: 'Newsletter CTA',
};

const DEFAULT_BUILTIN: Block[] = (Object.keys(BUILTIN_LABELS) as BuiltinId[]).map((id) => ({
  id, visible: true, label: BUILTIN_LABELS[id],
}));

function sectionLabel(s: PageSection): string {
  const c = s.content || {};
  return (
    (c.name as string) || (c.title as string) || (c.subtitle as string) ||
    (typeof c.text === 'string' ? c.text.slice(0, 40) : '') ||
    `Section ${s.type}`
  );
}

// ============== Inline editor for the "categories" block ==============
const CATEGORY_SHAPES = [
  { v: 'square', label: 'Carré' },
  { v: 'rounded', label: 'Arrondi' },
  { v: 'circle', label: 'Cercle' },
  { v: 'triangle', label: 'Triangle' },
  { v: 'chamfer', label: 'Biseauté (HUD)' },
  { v: 'pill', label: 'Pill' },
] as const;

const CATEGORY_HOVERS = [
  { v: 'zoom', label: 'Zoom' },
  { v: 'brightness', label: 'Luminosité' },
  { v: 'none', label: 'Aucun' },
] as const;

function CategoriesBlockInlineEditor({
  settings,
  onChange,
}: {
  settings: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
}) {
  const shape = settings.shape || 'chamfer';
  const orientation = settings.orientation || 'vertical';
  const columns = String(settings.columns || 3);
  const hoverEffect = settings.hoverEffect || 'zoom';
  const titleAlign = settings.titleAlign || 'left';
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border-t bg-muted/20">
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider">Forme</Label>
        <Select value={shape} onValueChange={(v) => onChange({ ...settings, shape: v })}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORY_SHAPES.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider">Orientation</Label>
        <Select value={orientation} onValueChange={(v) => onChange({ ...settings, orientation: v })}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="vertical">Vertical (grille)</SelectItem>
            <SelectItem value="horizontal">Horizontal (bandeaux)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider">Colonnes</Label>
        <Select value={columns} onValueChange={(v) => onChange({ ...settings, columns: parseInt(v, 10) })}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2 colonnes</SelectItem>
            <SelectItem value="3">3 colonnes</SelectItem>
            <SelectItem value="4">4 colonnes</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider">Effet au survol</Label>
        <Select value={hoverEffect} onValueChange={(v) => onChange({ ...settings, hoverEffect: v })}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORY_HOVERS.map((h) => <SelectItem key={h.v} value={h.v}>{h.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider">Alignement des titres</Label>
        <Select value={titleAlign} onValueChange={(v) => onChange({ ...settings, titleAlign: v })}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="left">À gauche</SelectItem>
            <SelectItem value="center">Au milieu</SelectItem>
            <SelectItem value="right">À droite</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="text-[10px] text-muted-foreground md:col-span-2">
        Astuce : l'orientation horizontale présente chaque catégorie comme un large bandeau (image à gauche, titre à droite).
      </p>
    </div>
  );
}

// ============== Inline editor for the "storeFinder" block ==============
function StoreFinderBlockInlineEditor({
  settings,
  onChange,
}: {
  settings: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
}) {
  const [pick, setPick] = useState(false);
  const set = (patch: Record<string, any>) => onChange({ ...settings, ...patch });
  const align = settings.titleAlign || 'left';
  const overlay = typeof settings.overlayOpacity === 'number' ? settings.overlayOpacity : 70;
  const on = (v: boolean | undefined) => v !== false;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border-t bg-muted/20">
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider">Sur-titre</Label>
        <Input
          className="h-9"
          placeholder="// BOUTIQUES"
          value={settings.eyebrow ?? ''}
          onChange={(e) => set({ eyebrow: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider">Titre</Label>
        <Input
          className="h-9"
          placeholder="Où nous trouver"
          value={settings.title ?? ''}
          onChange={(e) => set({ title: e.target.value })}
        />
      </div>
      <div className="space-y-1 md:col-span-2">
        <Label className="text-[10px] uppercase tracking-wider">Sous-titre</Label>
        <Textarea
          rows={2}
          placeholder="Trouvez la boutique ou le stand le plus proche de chez vous."
          value={settings.subtitle ?? ''}
          onChange={(e) => set({ subtitle: e.target.value })}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider">Alignement du titre</Label>
        <Select value={align} onValueChange={(v) => set({ titleAlign: v })}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="left">À gauche</SelectItem>
            <SelectItem value="center">Au milieu</SelectItem>
            <SelectItem value="right">À droite</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider">Image de fond</Label>
        <div className="flex items-center gap-2">
          {settings.backgroundImage ? (
            <img src={settings.backgroundImage} alt="" className="h-9 w-14 object-cover border border-border" />
          ) : (
            <div className="h-9 w-14 border border-dashed border-border" />
          )}
          <Button variant="outline" size="sm" onClick={() => setPick(true)}>Choisir</Button>
          {settings.backgroundImage && (
            <Button variant="ghost" size="sm" onClick={() => set({ backgroundImage: '' })}>Retirer</Button>
          )}
        </div>
      </div>

      {settings.backgroundImage && (
        <div className="space-y-1 md:col-span-2">
          <Label className="text-[10px] uppercase tracking-wider">Opacité du voile ({overlay}%)</Label>
          <Slider value={[overlay]} min={0} max={95} step={5} onValueChange={([v]) => set({ overlayOpacity: v })} />
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border border-border p-2">
        <span className="text-xs">Bouton « Près de chez moi »</span>
        <Switch checked={on(settings.showLocate)} onCheckedChange={(v) => set({ showLocate: v })} />
      </div>
      <div className="flex items-center justify-between gap-2 border border-border p-2">
        <span className="text-xs">Bouton « Toutes les boutiques »</span>
        <Switch checked={on(settings.showAll)} onCheckedChange={(v) => set({ showAll: v })} />
      </div>
      <div className="flex items-center justify-between gap-2 border border-border p-2 md:col-span-2">
        <span className="text-xs">Lien vers la page complète des boutiques</span>
        <Switch checked={on(settings.showPageLink)} onCheckedChange={(v) => set({ showPageLink: v })} />
      </div>

      <MediaLibraryDialog
        open={pick}
        onOpenChange={setPick}
        onSelect={(url) => { set({ backgroundImage: url }); setPick(false); }}
      />
    </div>
  );
}

// ============== Inline editor for product blocks (featured / newArrivals) ==============
function ProductBlockInlineEditor({
  blockId,
  settings,
  onChange,
  onOpenProducts,
}: {
  blockId: string;
  settings: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
  onOpenProducts: () => void;
}) {
  const set = (patch: Record<string, any>) => onChange({ ...settings, ...patch });
  const align = settings.titleAlign || (blockId === 'newArrivals' ? 'center' : 'left');
  const columns = String(settings.columns || (blockId === 'newArrivals' ? 3 : 4));
  const limit = String(settings.limit || 8);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border-t bg-muted/20">
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider">Sur-titre</Label>
        <Input
          className="h-9"
          placeholder={blockId === 'newArrivals' ? '// hiver 2026' : '// SÉLECTION'}
          value={settings.eyebrow ?? ''}
          onChange={(e) => set({ eyebrow: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider">Titre</Label>
        <Input
          className="h-9"
          placeholder={blockId === 'newArrivals' ? 'NOUVEAUTÉS' : 'Top ventes'}
          value={settings.title ?? ''}
          onChange={(e) => set({ title: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider">Alignement du titre</Label>
        <Select value={align} onValueChange={(v) => set({ titleAlign: v })}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="left">À gauche</SelectItem>
            <SelectItem value="center">Au milieu</SelectItem>
            <SelectItem value="right">À droite</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider">Colonnes (ordinateur)</Label>
        <Select value={columns} onValueChange={(v) => set({ columns: parseInt(v, 10) })}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2 colonnes</SelectItem>
            <SelectItem value="3">3 colonnes</SelectItem>
            <SelectItem value="4">4 colonnes</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider">Nombre de produits</Label>
        <Select value={limit} onValueChange={(v) => set({ limit: parseInt(v, 10) })}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[2, 3, 4, 6, 8, 12].map((n) => <SelectItem key={n} value={String(n)}>{n} produits</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between gap-2 border border-border p-2">
        <span className="text-xs">Bouton « Tout voir »</span>
        <Switch checked={settings.showCta !== false} onCheckedChange={(v) => set({ showCta: v })} />
      </div>
      <div className="md:col-span-2 flex items-center justify-between gap-2 border border-dashed border-border p-2">
        <span className="text-[11px] text-muted-foreground">Choisir les produits mis en avant (catalogue)</span>
        <Button variant="outline" size="sm" onClick={onOpenProducts}>Ouvrir le catalogue</Button>
      </div>
    </div>
  );
}



function Row({ b, onToggle, isCustom, onEdit, expanded, hasInline }: { b: Block; onToggle: () => void; isCustom: boolean; onEdit?: () => void; expanded?: boolean; hasInline?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: b.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 border rounded bg-background">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-1" aria-label="Réorganiser">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      {isCustom && <Sparkles className="h-4 w-4 text-primary" />}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{b.label || b.id}</div>
        <div className="text-[10px] text-muted-foreground truncate">{isCustom ? 'Section personnalisée' : b.id}</div>
      </div>
      {onEdit && (
        <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onEdit} title={hasInline ? (expanded ? 'Replier' : 'Configurer ce bloc') : 'Éditer ce bloc'}>
          {hasInline ? <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} /> : <Pencil className="h-3.5 w-3.5" />}
        </Button>
      )}
      {b.visible ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
      <Switch checked={b.visible} onCheckedChange={onToggle} aria-label="Visible" />
    </div>
  );
}

export function HomeBlocksEditor() {
  const { designSettings, updateDesignSettings, flushDesignSettings } = useApp();
  const navigate = useNavigate();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const dirtyRef = useRef(false);

  const customSections = ((designSettings as any).homeCustomSections || []) as PageSection[];
  const feedSections = resolveFeedSections((designSettings as any).homeFeedSections);

  // Merge: keep saved order, add missing customs at bottom, drop deleted ones.
  const merged = useMemo<Block[]>(() => {
    const saved = ((designSettings as any).homePageBlocks || []) as Block[];
    const customIds = new Set(customSections.map((s) => `custom:${s.id}`));
    const customLabelMap = new Map(customSections.map((s) => [`custom:${s.id}`, sectionLabel(s)]));

    const feedLabelMap = new Map(feedSections.map((f) => [feedBlockId(f.id), `Feed — ${f.title}`]));

    const validSaved = saved.filter((b) =>
      b.id.startsWith('custom:')
        ? customIds.has(b.id)
        : b.id.startsWith(FEED_BLOCK_PREFIX)
          ? feedLabelMap.has(b.id)
          : (b.id in BUILTIN_LABELS)
    ).map((b) => ({
      ...b,
      label: b.id.startsWith('custom:')
        ? customLabelMap.get(b.id) || 'Section'
        : b.id.startsWith(FEED_BLOCK_PREFIX)
          ? feedLabelMap.get(b.id)
          : BUILTIN_LABELS[b.id as BuiltinId],
    }));

    // Add missing builtins
    DEFAULT_BUILTIN.forEach((d) => { if (!validSaved.find((b) => b.id === d.id)) validSaved.push({ id: d.id, visible: d.visible, label: d.label }); });
    // Add missing feed sections right after "Dernières arrivées"
    feedSections.forEach((f) => {
      const id = feedBlockId(f.id);
      if (!validSaved.find((b) => b.id === id)) {
        const anchor = validSaved.findIndex((b) => b.id === 'newArrivals');
        const entry = { id, visible: true, label: `Feed — ${f.title}` };
        if (anchor >= 0) validSaved.splice(anchor + 1, 0, entry);
        else validSaved.push(entry);
      }
    });
    // Add missing customs at the end
    customSections.forEach((s) => {
      const id = `custom:${s.id}`;
      if (!validSaved.find((b) => b.id === id)) validSaved.push({ id, visible: true, label: sectionLabel(s) });
    });
    return validSaved;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designSettings, customSections, JSON.stringify(feedSections.map((f) => [f.id, f.title]))]);

  const [blocks, setBlocks] = useState<Block[]>(merged);
  // Reset dirty state on mount → always pick up the latest server snapshot when
  // the admin opens this page (e.g. after live-editing on the home).
  useEffect(() => { dirtyRef.current = false; setBlocks(merged); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  // Sync only when user has no pending edits — sinon on écraserait un changement local.
  useEffect(() => {
    if (dirtyRef.current) return;
    setBlocks(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(merged)]);

  const goEdit = (id: string) => {
    if (id.startsWith('custom:')) {
      document.getElementById('custom-sections')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (INLINE_EDITABLE.has(id)) {
      setExpandedId((cur) => (cur === id ? null : id));
      return;
    }
    const route = EDIT_ROUTE[id];
    if (!route) { toast.info("Pas d'éditeur dédié pour ce bloc"); return; }
    if (route.includes('#')) {
      const [path, hash] = route.split('#');
      navigate(path);
      setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
    } else {
      navigate(route);
    }
  };

  const markDirty = () => { dirtyRef.current = true; };

  // Listen to global "collect" event so the page-level "Tout enregistrer" picks up our local state
  useEffect(() => {
    const handler = () => { updateDesignSettings({ homePageBlocks: blocks } as any); };
    window.addEventListener('homeicons:collect', handler);
    return () => window.removeEventListener('homeicons:collect', handler);
  }, [blocks, updateDesignSettings]);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oi = blocks.findIndex((b) => b.id === active.id);
    const ni = blocks.findIndex((b) => b.id === over.id);
    markDirty();
    setBlocks(arrayMove(blocks, oi, ni));
  };

  const toggle = (id: string) => { markDirty(); setBlocks(blocks.map((b) => b.id === id ? { ...b, visible: !b.visible } : b)); };

  const updateSettings = (id: string, settings: Record<string, any>) => {
    markDirty();
    setBlocks(blocks.map((b) => b.id === id ? { ...b, settings } : b));
  };

  const save = async () => {
    await flushDesignSettings({ homePageBlocks: blocks } as any);
    dirtyRef.current = false;
    toast.success('Configuration des sections enregistrée');
  };

  const reset = () => { markDirty(); setBlocks(DEFAULT_BUILTIN.concat(customSections.map((s) => ({
    id: `custom:${s.id}`, visible: true, label: sectionLabel(s),
  })))); };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle>Sections de la page d'accueil</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Glissez pour réordonner les blocs (incluant vos sections personnalisées). Désactivez ceux à masquer.
          Les sections marquées <Sparkles className="inline h-3 w-3 text-primary" /> sont vos sections personnalisées.
        </p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {blocks.map((b) => {
                const hasInline = INLINE_EDITABLE.has(b.id);
                const expanded = expandedId === b.id;
                return (
                  <div key={b.id} className="space-y-0">
                    <Row
                      b={b}
                      onToggle={() => toggle(b.id)}
                      isCustom={b.id.startsWith('custom:')}
                      onEdit={() => goEdit(b.id)}
                      hasInline={hasInline}
                      expanded={expanded}
                    />
                    {hasInline && expanded && b.id === 'categories' && (
                      <div className="rounded border border-t-0 -mt-px">
                        <CategoriesBlockInlineEditor
                          settings={b.settings || {}}
                          onChange={(next) => updateSettings(b.id, next)}
                        />
                      </div>
                    )}
                    {hasInline && expanded && b.id === 'storeFinder' && (
                      <div className="rounded border border-t-0 -mt-px">
                        <StoreFinderBlockInlineEditor
                          settings={b.settings || {}}
                          onChange={(next) => updateSettings(b.id, next)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
        <div className="flex justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={reset}>Réinitialiser</Button>
          <Button onClick={save} className="gap-2"><Save className="h-4 w-4" /> Enregistrer</Button>
        </div>
      </CardContent>
    </Card>
  );
}
