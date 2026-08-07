import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { GripVertical, Plus, Trash2, Save, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { resolveFeedSections, feedBlockId, type FeedSectionConfig } from '@/config/homeFeedSections';

interface Block { id: string; visible: boolean }

function Row({
  s,
  visible,
  onToggle,
  onChange,
  onRemove,
}: {
  s: FeedSectionConfig;
  visible: boolean;
  onToggle: () => void;
  onChange: (next: FeedSectionConfig) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: feedBlockId(s.id) });
  const [open, setOpen] = useState(false);
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="rounded border border-border bg-background"
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-1">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
        <button onClick={() => setOpen((v) => !v)} className="flex-1 text-left min-w-0">
          <p className={`text-sm font-semibold truncate ${visible ? '' : 'line-through text-muted-foreground'}`}>{s.title}</p>
          <p className="text-[10px] text-muted-foreground truncate">
            {s.layout === 'carousel' ? 'Carrousel' : 'Grille'} · {s.limit} produits · {s.tags.join(', ') || '—'}
          </p>
        </button>
        <Button variant="ghost" size="icon" onClick={onToggle} title={visible ? 'Masquer' : 'Afficher'}>
          {visible ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={onRemove} className="text-destructive">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {open && (
        <div className="border-t border-border/60 p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Titre</Label>
            <Input value={s.title} onChange={(e) => onChange({ ...s, title: e.target.value })} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Sur-titre</Label>
            <Input value={s.eyebrow} onChange={(e) => onChange({ ...s, eyebrow: e.target.value })} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tags (séparés par des virgules)</Label>
            <Input
              value={s.tags.join(', ')}
              onChange={(e) => onChange({ ...s, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Catégories</Label>
            <Input
              value={s.categories.join(', ')}
              onChange={(e) =>
                onChange({ ...s, categories: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })
              }
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Disposition</Label>
            <Select value={s.layout} onValueChange={(v) => onChange({ ...s, layout: v as FeedSectionConfig['layout'] })}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="carousel">Carrousel (recommandé mobile)</SelectItem>
                <SelectItem value="grid">Grille</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Fond</Label>
            <Select value={s.bg || 'default'} onValueChange={(v) => onChange({ ...s, bg: v as FeedSectionConfig['bg'] })}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Normal</SelectItem>
                <SelectItem value="muted">Contrasté</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Colonnes mobile : {s.colsMobile}</Label>
            <Slider
              value={[s.colsMobile]}
              min={1}
              max={3}
              step={1}
              onValueChange={([v]) => onChange({ ...s, colsMobile: v as FeedSectionConfig['colsMobile'] })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Colonnes ordinateur : {s.colsDesktop}</Label>
            <Slider
              value={[s.colsDesktop]}
              min={2}
              max={5}
              step={1}
              onValueChange={([v]) => onChange({ ...s, colsDesktop: v as FeedSectionConfig['colsDesktop'] })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nombre de produits : {s.limit}</Label>
            <Slider value={[s.limit]} min={2} max={16} step={1} onValueChange={([v]) => onChange({ ...s, limit: v })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Lien « Tout voir »</Label>
            <Input value={s.href || ''} onChange={(e) => onChange({ ...s, href: e.target.value })} className="h-9" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminFeedSections() {
  const { designSettings, updateDesignSettings, flushDesignSettings } = useApp();
  const [sections, setSections] = useState<FeedSectionConfig[]>(() =>
    resolveFeedSections((designSettings as any).homeFeedSections),
  );
  const [blocks, setBlocks] = useState<Block[]>(() => ((designSettings as any).homePageBlocks || []) as Block[]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const isVisible = (id: string) => {
    const b = blocks.find((x) => x.id === feedBlockId(id));
    return b ? b.visible : true;
  };

  const push = (nextSections: FeedSectionConfig[], nextBlocks: Block[]) => {
    setSections(nextSections);
    setBlocks(nextBlocks);
    updateDesignSettings({ homeFeedSections: nextSections, homePageBlocks: nextBlocks } as any);
  };

  const toggle = (id: string) => {
    const bid = feedBlockId(id);
    const exists = blocks.find((b) => b.id === bid);
    const next = exists
      ? blocks.map((b) => (b.id === bid ? { ...b, visible: !b.visible } : b))
      : [...blocks, { id: bid, visible: false }];
    push(sections, next);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oi = sections.findIndex((s) => feedBlockId(s.id) === active.id);
    const ni = sections.findIndex((s) => feedBlockId(s.id) === over.id);
    const nextSections = arrayMove(sections, oi, ni);
    // Reflect the new order inside homePageBlocks so the homepage follows it.
    const ordered = nextSections.map((s) => feedBlockId(s.id));
    const others = blocks.filter((b) => !ordered.includes(b.id));
    const feedBlocks = ordered.map(
      (id) => blocks.find((b) => b.id === id) || { id, visible: true },
    );
    const anchor = others.findIndex((b) => b.id === 'newArrivals');
    const nextBlocks =
      anchor >= 0
        ? [...others.slice(0, anchor + 1), ...feedBlocks, ...others.slice(anchor + 1)]
        : [...others, ...feedBlocks];
    push(nextSections, nextBlocks);
  };

  const save = async () => {
    try {
      await flushDesignSettings({ homeFeedSections: sections, homePageBlocks: blocks } as any);
      toast.success('Sections enregistrées');
    } catch {
      toast.error("Échec de l'enregistrement");
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-tight">Sections du feed</h1>
          <p className="text-xs text-muted-foreground">
            Tendance, cagoules, vestes… Remplissage automatique par tag/catégorie, surchargeable manuellement.
          </p>
        </div>
        <Button onClick={save} className="gap-2">
          <Save className="w-4 h-4" /> Enregistrer
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm uppercase tracking-wider">Sections</CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => {
              const id = `section-${Date.now()}`;
              push(
                [
                  ...sections,
                  {
                    id,
                    title: 'Nouvelle section',
                    eyebrow: '// SECTION',
                    tags: [],
                    categories: [],
                    limit: 8,
                    colsMobile: 2,
                    colsDesktop: 4,
                    layout: 'carousel',
                    href: '/boutique',
                    bg: 'default',
                  },
                ],
                [...blocks, { id: feedBlockId(id), visible: true }],
              );
            }}
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-[11px] text-muted-foreground">
            Glissez pour réordonner. L’ordre et la visibilité sont partagés avec l’éditeur mobile et l’accueil.
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={sections.map((s) => feedBlockId(s.id))} strategy={verticalListSortingStrategy}>
              {sections.map((s, idx) => (
                <Row
                  key={s.id}
                  s={s}
                  visible={isVisible(s.id)}
                  onToggle={() => toggle(s.id)}
                  onChange={(next) => push(sections.map((x, k) => (k === idx ? next : x)), blocks)}
                  onRemove={() =>
                    push(
                      sections.filter((_, k) => k !== idx),
                      blocks.filter((b) => b.id !== feedBlockId(s.id)),
                    )
                  }
                />
              ))}
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>
    </div>
  );
}
