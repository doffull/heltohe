import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RelatedProductsProps {
  category: string;
  currentId: string;
}

export default function RelatedProducts({ category, currentId }: RelatedProductsProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: allProducts, isLoading } = useProducts();

  const related = (allProducts || [])
    .filter(p => p.category === category && p.id !== currentId)
    .slice(0, 8);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -240 : 240, behavior: 'smooth' });
  };

  if (!isLoading && related.length === 0) return null;

  return (
    <section className="mt-16 pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="hud-text text-xs text-primary mb-1">// MÊME CATÉGORIE</p>
          <h2 className="text-xl font-bold">Produits similaires</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => scroll('left')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => scroll('right')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-52 shrink-0 space-y-2">
                <Skeleton className="w-52 h-64 rounded-none" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))
          : related.map(product => {
              const hasDiscount = product.salePrice && product.salePrice < product.price;
              return (
                <button
                  key={product.id}
                  onClick={() => navigate(`/boutique/${product.id}`)}
                  className="w-52 shrink-0 text-left group"
                >
                  <div className="relative overflow-hidden bg-muted/30 aspect-[3/4] mb-2">
                    <img
                      src={product.image}
                      alt={product.name}
                      className={cn(
                        'w-full h-full object-cover transition-transform duration-500',
                        'group-hover:scale-105'
                      )}
                    />
                    {hasDiscount && (
                      <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground hud-text text-[10px] px-1.5 py-0.5">
                        SOLDE
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                    {product.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {hasDiscount ? (
                      <>
                        <span className="text-sm font-bold text-primary">{product.salePrice}€</span>
                        <span className="text-xs text-muted-foreground line-through">{product.price}€</span>
                      </>
                    ) : (
                      <span className="text-sm font-bold text-primary">{product.price}€</span>
                    )}
                  </div>
                </button>
              );
            })}
      </div>
    </section>
  );
}
