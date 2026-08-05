import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';
import { useProducts } from '@/hooks/useProducts';
import { getFamilyVariants } from '@/lib/productFamily';
import { getSwatchStyle } from '@/lib/swatch';
import { isMarketplaceCategory } from '@/lib/shopVisibility';

interface ColorVariantsStripProps {
  product: Product;
  className?: string;
}

/**
 * Autres coloris disponibles du même modèle (produits distincts au même nom).
 * Affiché juste sous les options produit pour éviter toute recherche.
 */
export default function ColorVariantsStrip({ product, className }: ColorVariantsStripProps) {
  const navigate = useNavigate();
  const { data: allProducts = [] } = useProducts();

  // Un produit Collab ne propose que des variantes Collab, et inversement.
  const scoped = useMemo(() => {
    const isCollab = isMarketplaceCategory(product.category);
    return allProducts.filter((p) => isMarketplaceCategory(p.category) === isCollab);
  }, [allProducts, product.category]);

  const variants = useMemo(() => getFamilyVariants(scoped, product), [scoped, product]);
  if (!variants.length) return null;

  return (
    <div className={cn('border border-border/60 bg-card/30 p-3', className)}>
      <p className="hud-text text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
        Autres coloris de ce modèle
      </p>
      <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {variants.map((v) => {
          const swatch = v.colorOptions?.[0];
          return (
            <button
              key={v.id}
              onClick={() => navigate(`/boutique/${v.id}`)}
              className="shrink-0 w-20 text-left group"
              title={`${v.name}${v.subtitle ? ` — ${v.subtitle}` : ''}`}
            >
              <div className="relative w-20 h-24 overflow-hidden bg-muted/30 mb-1">
                <img
                  src={v.colorOptions?.[0]?.image || v.image}
                  alt={v.name}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {swatch && (
                  <span
                    className="absolute bottom-1 right-1 w-4 h-4 rounded-full border border-background"
                    style={getSwatchStyle(swatch)}
                  />
                )}
              </div>
              <p className="text-[10px] uppercase truncate text-muted-foreground group-hover:text-primary transition-colors">
                {v.subtitle || v.colorOptions?.[0]?.label || v.name}
              </p>
              <p className="text-[11px] font-bold">{v.salePrice || v.price}€</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
