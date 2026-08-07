import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useVisualEditor } from '../VisualEditorProvider';
import { GripVertical, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PageSection } from '@/hooks/usePages';
import { resolveFeedSections, feedBlockId, FEED_BLOCK_PREFIX } from '@/config/homeFeedSections';

interface Block { id: string; visible: boolean; label?: string; settings?: Record<string, any> }
type BuiltinId = 'hero' | 'categories' | 'storeFinder' | 'featured' | 'flash' | 'newArrivals' | 'voiceBanner' | 'loyalty' | 'newsletter';

const BUILTIN_LABELS: Record<BuiltinId, string> = {
  hero: 'Hero',
  categories: 'Catégories',
  storeFinder: 'Nos boutiques',
  featured: 'Top ventes',
  flash: 'Flash promo',
  newArrivals: 'Nouveautés',
  voiceBanner: 'Bannière vocale',
  loyalty: 'Fidélité',
  newsletter: 'Newsletter',
};

function sectionLabel(s: PageSection): string {
  const c = s.content || {};
  return (c.name as string) || (c.title as string) || (c.subtitle as string) || `Section ${s.type}`;
}

function SortableRow({ b, onToggle }: { b: Block; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: b.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2.5 rounded border transition-colors ${b.visible ? 'border-border bg-background' : 'border-border/50 bg-muted/30'}`}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-1">
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/60" />
      </button>
      <span className={`flex-1 text-xs min-w-0 truncate ${b.visible ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
        {b.label || b.id}
      </span>
      <button
        onClick={onToggle}
        className={`flex-shrink-0 p-1 rounded transition-colors ${b.visible ? 'text-primary hover:text-primary/70' : 'text-muted-foreground hover:text-foreground'}`}
        title={b.visible ? 'Masquer' : 'Afficher'}
      >
        {b.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export function SectionsEditorTab() {
  const { designSettings, updateDesignSettings, flushDesignSettings } = useApp();
  const { setIsDirty } = useVisualEditor();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [synced, setSynced] = useState<boolean>(true);

  // Single source of truth — same key used by Home.tsx and the desktop admin.
  const saved = ((designSettings as any).homePageBlocks || []) as Block[];
  const customSections = ((designSettings as any).homeCustomSections || []) as PageSection[];
  const feedSections = resolveFeedSections((designSettings as any).homeFeedSections);
  const feedMap = new Map(feedSections.map((f) => [feedBlockId(f.id), `Feed — ${f.title}`]));

  // Merge defaults so every known block is visible in the list.
  const allIds = Object.keys(BUILTIN_LABELS) as BuiltinId[];
  const customMap = new Map(customSections.map((s) => [`custom:${s.id}`, sectionLabel(s)]));
  const merged: Block[] = (() => {
    const present = new Set(saved.map((b) => b.id));
    const out: Block[] = saved
      .filter((b) =>
        b.id.startsWith('custom:')
          ? customMap.has(b.id)
          : b.id.startsWith(FEED_BLOCK_PREFIX)
            ? feedMap.has(b.id)
            : (b.id in BUILTIN_LABELS),
      )
      .map((b) => ({
        ...b,
        label: b.id.startsWith('custom:')
          ? customMap.get(b.id)
          : b.id.startsWith(FEED_BLOCK_PREFIX)
            ? feedMap.get(b.id)
            : BUILTIN_LABELS[b.id as BuiltinId],
      }));
    allIds.forEach((id) => { if (!present.has(id)) out.push({ id, visible: true, label: BUILTIN_LABELS[id] }); });
    feedSections.forEach((f) => {
      const id = feedBlockId(f.id);
      if (!present.has(id)) out.push({ id, visible: true, label: `Feed — ${f.title}` });
    });
    customSections.forEach((s) => {
      const id = `custom:${s.id}`;
      if (!present.has(id)) out.push({ id, visible: true, label: sectionLabel(s) });
    });
    return out;
  })();

  useEffect(() => () => { if (flushTimerRef.current) clearTimeout(flushTimerRef.current); }, []);

  const update = (next: Block[]) => {
    // Persist locally for instant UI feedback
    updateDesignSettings({ homePageBlocks: next } as any);
    setIsDirty(true);
    setSynced(false);
    // Debounced flush to DB → keeps admin "Icône Accueil" in sync without manual save.
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => {
      flushDesignSettings({ homePageBlocks: next } as any).then(() => setSynced(true)).catch(() => setSynced(false));
    }, 500);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oi = merged.findIndex((s) => s.id === active.id);
    const ni = merged.findIndex((s) => s.id === over.id);
    update(arrayMove(merged, oi, ni));
  };

  const toggle = (id: string) =>
    update(merged.map((b) => (b.id === id ? { ...b, visible: !b.visible } : b)));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-muted-foreground">Glissez pour réordonner.</p>
        <span className={`flex items-center gap-1 text-[10px] font-semibold ${synced ? 'text-green-600' : 'text-orange-500'}`}>
          <CheckCircle2 className="w-3 h-3" />
          {synced ? 'Synchronisé' : 'Enregistrement…'}
        </span>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={merged.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {merged.map((b) => (
              <SortableRow key={b.id} b={b} onToggle={() => toggle(b.id)} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
