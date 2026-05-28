import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { GripVertical, Save, Eye, EyeOff, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PageSection } from '@/hooks/usePages';

type BuiltinId = 'hero' | 'categories' | 'featured' | 'flash' | 'newArrivals' | 'voiceBanner' | 'loyalty' | 'newsletter';
interface Block { id: string; visible: boolean; label?: string }

const BUILTIN_LABELS: Record<BuiltinId, string> = {
  hero: 'Hero (slider ou techwear)',
  categories: 'Grille catégories',
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

function Row({ b, onToggle, isCustom }: { b: Block; onToggle: () => void; isCustom: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: b.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 border rounded bg-background">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-1">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      {isCustom && <Sparkles className="h-4 w-4 text-primary" />}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{b.label || b.id}</div>
        <div className="text-[10px] text-muted-foreground truncate">{isCustom ? 'Section personnalisée' : b.id}</div>
      </div>
      {b.visible ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
      <Switch checked={b.visible} onCheckedChange={onToggle} />
    </div>
  );
}

export function HomeBlocksEditor() {
  const { designSettings, updateDesignSettings, flushDesignSettings } = useApp();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const customSections = ((designSettings as any).homeCustomSections || []) as PageSection[];

  // Merge: keep saved order, add missing customs at bottom, drop deleted ones.
  const merged = useMemo<Block[]>(() => {
    const saved = ((designSettings as any).homePageBlocks || []) as Block[];
    const customIds = new Set(customSections.map((s) => `custom:${s.id}`));
    const customLabelMap = new Map(customSections.map((s) => [`custom:${s.id}`, sectionLabel(s)]));

    const validSaved = saved.filter((b) =>
      b.id.startsWith('custom:') ? customIds.has(b.id) : (b.id in BUILTIN_LABELS)
    ).map((b) => ({
      ...b,
      label: b.id.startsWith('custom:') ? customLabelMap.get(b.id) || 'Section' : BUILTIN_LABELS[b.id as BuiltinId],
    }));

    // Add missing builtins
    DEFAULT_BUILTIN.forEach((d) => { if (!validSaved.find((b) => b.id === d.id)) validSaved.push({ id: d.id, visible: d.visible, label: d.label }); });
    // Add missing customs at the end
    customSections.forEach((s) => {
      const id = `custom:${s.id}`;
      if (!validSaved.find((b) => b.id === id)) validSaved.push({ id, visible: true, label: sectionLabel(s) });
    });
    return validSaved;
  }, [designSettings, customSections]);

  const [blocks, setBlocks] = useState<Block[]>(merged);
  useEffect(() => { setBlocks(merged); /* eslint-disable-next-line */ }, [JSON.stringify(merged.map(b => b.id))]);

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
    setBlocks(arrayMove(blocks, oi, ni));
  };

  const toggle = (id: string) => setBlocks(blocks.map((b) => b.id === id ? { ...b, visible: !b.visible } : b));

  const save = async () => {
    await flushDesignSettings({ homePageBlocks: blocks } as any);
    toast.success("Ordre des sections enregistré");
  };

  const reset = () => setBlocks(DEFAULT_BUILTIN.concat(customSections.map((s) => ({
    id: `custom:${s.id}`, visible: true, label: sectionLabel(s),
  }))));

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
              {blocks.map((b) => (
                <Row key={b.id} b={b} onToggle={() => toggle(b.id)} isCustom={b.id.startsWith('custom:')} />
              ))}
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
