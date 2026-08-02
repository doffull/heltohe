import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

interface ProductStripProps {
  products: Product[];
  eyebrow?: string;
  title: string;
  compact?: boolean;
  className?: string;
}

/** Carrousel horizontal réutilisable de produits. */
export default function ProductStrip({ products, eyebrow, title, compact, className }: ProductStripProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!products.length) return null;

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -240 : 240, behavior: 'smooth' });
  };

  const cardWidth = compact ? 'w-36' : 'w-52';

  return (
    <section className={cn('mt-10', className)}>
      <div className="flex items-end justify-between mb-4">
        <div>
          {eyebrow && <p className="hud-text text-xs text-primary mb-1">// {eyebrow}</p>}
          <h2 className={cn('font-bold', compact ? 'text-base' : 'text-xl')}>{title}</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => scroll('left')} aria-label="Précédent">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => scroll('right')} aria-label="Suivant">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {products.map((product) => {
          const hasDiscount = product.salePrice && product.salePrice < product.price;
          return (
            <button
              key={product.id}
              onClick={() => navigate(`/boutique/${product.id}`)}
              className={cn(cardWidth, 'shrink-0 text-left group')}
            >
              <div className="relative overflow-hidden bg-muted/30 aspect-[3/4] mb-2">
                <img
                  src={product.image}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {hasDiscount && (
                  <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground hud-text text-[10px] px-1.5 py-0.5">
                    SOLDE
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{product.name}</p>
              {product.subtitle && (
                <p className="text-[11px] uppercase text-muted-foreground truncate">{product.subtitle}</p>
              )}
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
