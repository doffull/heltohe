import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { productCategories } from '@/lib/productCategories';
import { useProducts } from '@/hooks/useProducts';
import { excludeMarketplaceProducts } from '@/lib/shopVisibility';
import { useApp } from '@/context/AppContext';
import { useQuickAdd } from '@/hooks/useQuickAdd';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/products/ProductCard';
import { EditableText } from '@/components/visual-editor/EditableText';
import { cn } from '@/lib/utils';
import type { FeedSectionConfig } from '@/config/homeFeedSections';
import type { Product } from '@/types';

const MOBILE_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
};
const DESKTOP_COLS: Record<number, string> = {
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
};
const CAROUSEL_WIDTH: Record<number, string> = {
  1: 'w-[78vw]',
  2: 'w-[46vw]',
  3: 'w-[31vw]',
};

function norm(v: string) {
  return v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** Resolve the products of a feed section: curation → tags → categories. */
export function resolveFeedProducts(
  section: FeedSectionConfig,
  products: Product[],
  curated: Record<string, string[]> | undefined,
): Product[] {
  const ids = curated?.[section.id];
  if (Array.isArray(ids) && ids.length > 0) {
    const ordered = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean) as Product[];
    if (ordered.length > 0) return ordered.slice(0, section.limit);
  }
  const tags = (section.tags || []).map(norm);
  const cats = (section.categories || []).map(norm);
  const matched = products.filter((p) => {
    const pTags = (p.tags || []).map(norm);
    if (tags.some((t) => pTags.includes(t))) return true;
    const pCats = productCategories(p).map(norm);
    const pSub = norm((p as any).subcategory || '');
    return cats.some((c) => c && (pSub === c || pSub.includes(c) || pCats.some((pc) => pc === c || pc.includes(c))));
  });
  return matched.slice(0, section.limit);
}

export function ProductFeedSection({ section }: { section: FeedSectionConfig }) {
  const navigate = useNavigate();
  const { requestAdd, quickAddDialog } = useQuickAdd();
  const { designSettings } = useApp();
  const { data: allProducts = [] } = useProducts();
  const products = excludeMarketplaceProducts(allProducts);
  const curated = (designSettings as any).homeSectionProducts as Record<string, string[]> | undefined;

  const items = resolveFeedProducts(section, products, curated);
  if (items.length === 0) return null;

  const siteSpacing = (designSettings as any).siteSpacing || 'compact';
  const sectionPy =
    siteSpacing === 'spacious' ? 'py-8 lg:py-20' : siteSpacing === 'normal' ? 'py-4 lg:py-10' : 'py-2 lg:py-6';

  // La taille est demandée avant l'ajout (cf. `useQuickAdd`).
  const handleAddToCart = (product: Product) => {
    void requestAdd(product);
  };

  const goTo = (id: string, color: string | null) =>
    navigate(`/boutique/${id}${color ? `?color=${encodeURIComponent(color)}` : ''}`);

  return (
    <section className={cn(sectionPy, section.bg === 'muted' && 'bg-secondary/30')}>
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between gap-3 mb-3 lg:mb-6">
          <div className="min-w-0">
            <p className="font-mono text-[10px] lg:text-xs tracking-[0.25em] text-muted-foreground mb-1 truncate">
              {section.eyebrow}
            </p>
            <EditableText
              textKey={`feed-${section.id}-title`}
              defaultValue={section.title}
              as="h2"
              className="text-lg sm:text-3xl lg:text-5xl font-bold uppercase tracking-tight leading-none truncate"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 uppercase tracking-wider text-[10px] lg:text-xs"
            onClick={() => navigate(section.href || '/boutique')}
          >
            Tout voir
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>

        {section.layout === 'carousel' ? (
          <div className="-mx-4 px-4 flex gap-3 lg:gap-6 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {items.map((product) => (
              <div
                key={product.id}
                className={cn('shrink-0 snap-start lg:w-auto lg:flex-1 lg:min-w-0', CAROUSEL_WIDTH[section.colsMobile] || 'w-[46vw]')}
              >
                <ProductCard
                  product={product}
                  onNavigate={goTo}
                  onAddToCart={() => handleAddToCart(product)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div
            className={cn(
              'grid gap-3 lg:gap-6',
              MOBILE_COLS[section.colsMobile] || 'grid-cols-2',
              DESKTOP_COLS[section.colsDesktop] || 'lg:grid-cols-4',
            )}
          >
            {items.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onNavigate={goTo}
                onAddToCart={() => handleAddToCart(product)}
              />
            ))}
          </div>
        )}
      </div>

      {quickAddDialog}
    </section>
  );
}
