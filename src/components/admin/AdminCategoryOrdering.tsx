import { useMemo, useState, useEffect } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useCategoryOrders, useSaveCategoryOrder, useResetCategoryOrder } from '@/hooks/useCategoryOrder';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GripVertical, RotateCcw, Save, Shuffle } from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Product } from '@/types';

interface RowProps {
  product: Product;
  index: number;
}

function SortableRow({ product, index }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 border border-border/40 bg-card px-3 py-2 hover:border-primary/40 transition-colors"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        aria-label="Déplacer"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="w-8 text-xs font-mono text-muted-foreground">{index + 1}</span>
      {product.image ? (
        <img src={product.image} alt={product.name} className="h-10 w-10 object-cover border border-border/30" />
      ) : (
        <div className="h-10 w-10 bg-muted" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{product.name}</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {product.category} · {(product.salePrice ?? product.price).toFixed(0)}€
        </p>
      </div>
    </div>
  );
}

export function AdminCategoryOrdering() {
  const { data: products = [] } = useProducts();
  const { data: dbCategories = [] } = useCategories();
  const { data: orders = [] } = useCategoryOrders();
  const save = useSaveCategoryOrder();
  const reset = useResetCategoryOrder();

  // Build category list: root categories from DB + hardcoded fallbacks
  const categoryNames = useMemo(() => {
    const names = new Set<string>();
    dbCategories.filter((c) => !c.parentId).forEach((c) => names.add(c.title));
    products.forEach((p) => p.category && names.add(p.category));
    return Array.from(names).sort();
  }, [dbCategories, products]);

  const [selected, setSelected] = useState<string>('');
  useEffect(() => {
    if (!selected && categoryNames.length > 0) setSelected(categoryNames[0]);
  }, [categoryNames, selected]);

  // Products for this category (or all if "Tout")
  const categoryProducts = useMemo(
    () => products.filter((p) => (selected === 'Tout' ? true : p.category === selected)),
    [products, selected],
  );

  // Compute initial ordered list (existing manual order first, then the rest by name)
  const initialOrder = useMemo(() => {
    if (!selected) return [] as Product[];
    const rows = orders.filter((o) => o.category_slug === selected);
    const posById = new Map(rows.map((r) => [r.product_id, r.position]));
    const pinned = categoryProducts
      .filter((p) => posById.has(p.id))
      .sort((a, b) => posById.get(a.id)! - posById.get(b.id)!);
    const rest = categoryProducts
      .filter((p) => !posById.has(p.id))
      .sort((a, b) => a.name.localeCompare(b.name));
    return [...pinned, ...rest];
  }, [categoryProducts, orders, selected]);

  const [order, setOrder] = useState<Product[]>([]);
  const [dirty, setDirty] = useState(false);

  // Reset when category changes or DB data reloads (unless the user has edits)
  useEffect(() => {
    if (!dirty) setOrder(initialOrder);
  }, [initialOrder, dirty]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = order.findIndex((p) => p.id === active.id);
    const to = order.findIndex((p) => p.id === over.id);
    if (from < 0 || to < 0) return;
    setOrder((cur) => arrayMove(cur, from, to));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!selected) return;
    try {
      await save.mutateAsync({ categorySlug: selected, productIds: order.map((p) => p.id) });
      toast.success(`Ordre enregistré pour "${selected}"`);
      setDirty(false);
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'enregistrement");
    }
  };

  const handleReset = async () => {
    if (!selected) return;
    try {
      await reset.mutateAsync(selected);
      toast.success(`Ordre remis à zéro pour "${selected}" (shuffle actif)`);
      setDirty(false);
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest">Rangement par catégorie</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Glissez-déposez pour ordonner. Sans rangement, la catégorie est <strong>mélangée aléatoirement</strong> à chaque visite.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selected} onValueChange={(v) => { setSelected(v); setDirty(false); }}>
            <SelectTrigger className="w-52 h-9 text-xs">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              {categoryNames.map((n) => (
                <SelectItem key={n} value={n}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={reset.isPending || !selected}
            className="gap-2"
            title="Retirer l'ordre manuel — la catégorie repasse en shuffle aléatoire"
          >
            <Shuffle className="h-3.5 w-3.5" /> Shuffle
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!dirty || save.isPending || !selected}
            className="gap-2"
          >
            <Save className="h-3.5 w-3.5" /> Enregistrer
          </Button>
        </div>
      </div>

      {order.length === 0 ? (
        <div className="border border-dashed border-border/40 p-8 text-center text-sm text-muted-foreground">
          Aucun produit dans cette catégorie.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={order.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
              {order.map((p, i) => (
                <SortableRow key={p.id} product={p} index={i} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      {dirty && (
        <div className="flex items-center gap-2 text-xs text-primary">
          <RotateCcw className="h-3 w-3" /> Modifications non enregistrées
        </div>
      )}
    </div>
  );
}
