import { useMemo } from 'react';
import { useProducts, useProduct } from '@/hooks/useProducts';
import { Skeleton } from '@/components/ui/skeleton';
import ProductStrip from './ProductStrip';
import { productFamilyKey } from '@/lib/productFamily';

interface RelatedProductsProps {
  category: string;
  currentId: string;
}

/**
 * Produits associés : coloris du même modèle en priorité, puis même catégorie
 * et tags communs (score décroissant).
 */
export default function RelatedProducts({ category, currentId }: RelatedProductsProps) {
  const { data: allProducts, isLoading } = useProducts();
  const { data: current } = useProduct(currentId);

  const related = useMemo(() => {
    const list = (allProducts || []).filter((p) => p.id !== currentId && p.isActive !== false);
    const familyKey = current ? productFamilyKey(current) : '';
    const currentTags = new Set(current?.tags || []);

    return list
      .map((p) => {
        let score = 0;
        if (familyKey && productFamilyKey(p) === familyKey) score += 100;
        if (p.category === category) score += 10;
        (p.tags || []).forEach((t) => { if (currentTags.has(t)) score += 3; });
        const base = current ? (current.salePrice || current.price) : 0;
        const price = p.salePrice || p.price;
        if (base) score += Math.max(0, 2 - Math.abs(price - base) / base);
        return { p, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((x) => x.p);
  }, [allProducts, currentId, category, current]);

  if (isLoading) {
    return (
      <section className="mt-16 pb-8 flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-52 shrink-0 space-y-2">
            <Skeleton className="w-52 h-64 rounded-none" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </section>
    );
  }

  if (related.length === 0) return null;

  return (
    <ProductStrip
      className="mt-16 pb-8"
      eyebrow="VOUS AIMEREZ AUSSI"
      title="Produits associés"
      products={related}
    />
  );
}
