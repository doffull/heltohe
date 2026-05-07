import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { GripVertical, Save, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type BlockId = 'hero' | 'categories' | 'featured' | 'flash' | 'newArrivals' | 'loyalty' | 'newsletter';
interface Block { id: BlockId; visible: boolean }

const LABELS: Record<BlockId, string> = {
  hero: 'Hero (slider ou techwear)',
  categories: 'Grille catégories',
  featured: 'Produits en vedette',
  flash: 'Flash promo (compte à rebours)',
  newArrivals: 'Dernières arrivées',
  loyalty: 'Bandeau fidélité',
  newsletter: 'Newsletter CTA',
};

const DEFAULT_BLOCKS: Block[] = [
  { id: 'hero', visible: true },
  { id: 'categories', visible: true },
  { id: 'featured', visible: true },
  { id: 'flash', visible: true },
  { id: 'newArrivals', visible: true },
  { id: 'loyalty', visible: true },
  { id: 'newsletter', visible: true },
];

function Row({ b, onToggle }: { b: Block; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: b.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 border rounded bg-background">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-1">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="flex-1">
        <div className="text-sm font-medium">{LABELS[b.id]}</div>
        <div className="text-[10px] text-muted-foreground">{b.id}</div>
      </div>
      {b.visible ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
      <Switch checked={b.visible} onCheckedChange={onToggle} />
    </div>
  );
}

export function HomeBlocksEditor() {
  const { designSettings, updateDesignSettings } = useApp();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const initial = ((designSettings as any).homePageBlocks?.length
    ? (designSettings as any).homePageBlocks
    : DEFAULT_BLOCKS) as Block[];
  const [blocks, setBlocks] = useState<Block[]>(initial);

  useEffect(() => {
    const cur = (designSettings as any).homePageBlocks;
    if (cur?.length) setBlocks(cur);
  }, [designSettings]);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oi = blocks.findIndex((b) => b.id === active.id);
    const ni = blocks.findIndex((b) => b.id === over.id);
    setBlocks(arrayMove(blocks, oi, ni));
  };

  const toggle = (id: BlockId) => setBlocks(blocks.map((b) => b.id === id ? { ...b, visible: !b.visible } : b));

  const save = async () => {
    await updateDesignSettings({ ...(designSettings as any), homePageBlocks: blocks } as any);
    toast.success("Ordre des sections enregistré");
  };

  const reset = () => setBlocks(DEFAULT_BLOCKS);

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle>Sections de la page d'accueil</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Glissez pour réordonner les grands blocs de la home. Désactivez ceux que vous ne voulez pas afficher.</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {blocks.map((b) => <Row key={b.id} b={b} onToggle={() => toggle(b.id)} />)}
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
