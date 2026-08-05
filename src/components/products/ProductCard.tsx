import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Product } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import { useReviewStats } from '@/hooks/useProductReviews';
import { getSwatchStyle } from '@/lib/swatch';
import { LimitedEditionBadge } from '@/components/product/LimitedEditionBadge';


export type CardHoverEffect = 'fade' | 'zoom' | 'slide';

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
  onAddToCart?: () => void;
  onNavigate?: (productId: string, selectedColor: string | null) => void;
  swatchStyle?: 'round' | 'square' | 'separated' | 'geometric';
  /** Effet de swap d'image au survol */
  hoverEffect?: CardHoverEffect;
  hoverEnabled?: boolean;
  hoverDuration?: number;
  /** Affiche l'overlay des tailles disponibles */
  showSizes?: boolean;
}

export function ProductCard({
  product,
  onClick,
  onAddToCart,
  onNavigate,
  swatchStyle = 'round',
  hoverEffect = 'fade',
  hoverEnabled = true,
  hoverDuration = 500,
  showSizes = true,
}: ProductCardProps) {
  const [selectedColorIndex, setSelectedColorIndex] = useState<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const { data: reviewStats } = useReviewStats(product.id);
  const hasDiscount = product.salePrice && product.salePrice < product.price;
  const isLowStock = product.stock <= 5 && product.stock > 0;
  const isOutOfStock = product.stock === 0;

  const swatchClasses: Record<string, string> = {
    round: 'w-5 h-5 rounded-full',
    square: 'w-5 h-5 rounded-sm',
    separated: 'w-5 h-5 rounded-full ring-2 ring-background ring-offset-1 ring-offset-border',
    geometric: 'w-5 h-5 rotate-45',
  };

  // Les pastilles marquées `filterOnly` ne servent qu'aux filtres boutique → non affichées.
  const visibleColorOptions = (product.colorOptions || []).filter(o => !o.filterOnly);
  const hasColorOptions = visibleColorOptions.length > 0;

  // Determine which image to show: clicked color image > default image
  const activeColorOpt = hasColorOptions && selectedColorIndex !== null
    ? visibleColorOptions[selectedColorIndex]
    : null;


  const displayImage = activeColorOpt?.image
    ? activeColorOpt.image
    : product.image;

  // Image de survol : image dédiée si définie, sinon 2e image de la galerie
  const gallerySecond = (product.galleryImages || []).find(img => img && img !== displayImage);
  const hoverImage = hoverEnabled ? (product.hoverImage || gallerySecond) : undefined;
  const canSwap = !!hoverImage && hoverImage !== displayImage;

  const activeColorLabel = activeColorOpt?.label ?? null;

  const handleSwatchClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setSelectedColorIndex(prev => prev === index ? null : index);
  };


  return (
    <div
      className={cn(
        "group relative bg-card border border-border overflow-hidden cursor-pointer",
        "transition-all duration-300 hover:border-foreground hover:shadow-hmp",
        "bevel-corners"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div
        className="relative aspect-[3/4] overflow-hidden"
        onTouchStart={() => setHovered(true)}
        onClick={() => {
          if (onNavigate) {
            onNavigate(product.id, activeColorOpt?.color ?? null);
          } else {
            onClick?.();
          }
        }}
      >
        <img
          key={`${product.id}-${selectedColorIndex ?? 'default'}`}
          src={displayImage}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className={cn(
            "w-full h-full object-cover transition-all animate-fade-in",
            canSwap && hovered
              ? hoverEffect === 'slide'
                ? 'opacity-0 -translate-x-3'
                : hoverEffect === 'zoom'
                  ? 'opacity-0 scale-110'
                  : 'opacity-0'
              : 'opacity-100 group-hover:scale-105'
          )}
          style={{ transitionDuration: `${hoverDuration}ms` }}
        />

        {/* Image de survol (swap) */}
        {canSwap && (
          <img
            src={hoverImage}
            alt={`${product.name} — vue alternative`}
            loading="lazy"
            decoding="async"
            aria-hidden="true"
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-all pointer-events-none",
              hovered
                ? 'opacity-100 translate-x-0 scale-100'
                : hoverEffect === 'slide'
                  ? 'opacity-0 translate-x-3'
                  : hoverEffect === 'zoom'
                    ? 'opacity-0 scale-95'
                    : 'opacity-0'
            )}
            style={{ transitionDuration: `${hoverDuration}ms` }}
          />
        )}

        {/* Active color tint overlay (subtle) */}
        {activeColorOpt && !activeColorOpt.image && (
          <div
            className="absolute inset-0 opacity-10 pointer-events-none transition-opacity duration-300"
            style={{ backgroundColor: activeColorOpt.color, mixBlendMode: 'color' }}
          />
        )}

        {/* Tailles disponibles — bas de l'image, apparition au survol */}
        {showSizes && (
          <div className="absolute inset-x-0 bottom-0 z-[1] translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 bg-gradient-to-t from-background/95 via-background/80 to-transparent pt-8 pb-3 px-2 pointer-events-none">
            <p className="text-[10px] uppercase tracking-wider text-center mb-2 text-muted-foreground">Tailles disponibles</p>
            <div className="flex gap-1.5 justify-center flex-wrap">
              {(product.sizes || ['XS', 'S', 'M', 'L', 'XL']).slice(0, 5).map((size) => (
                <span key={size} className="w-7 h-7 border border-foreground bg-background/60 flex items-center justify-center text-[10px] font-medium">
                  {size}
                </span>
              ))}
            </div>
          </div>
        )}


        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 items-start">
          <LimitedEditionBadge product={product} compact animate={false} />

          {hasDiscount && (
            <Badge className="bg-foreground text-background uppercase text-[10px] px-2 py-1 rounded-none">
              Promo
            </Badge>
          )}
          {isLowStock && (
            <Badge className="bg-destructive text-destructive-foreground uppercase text-[10px] px-2 py-1 rounded-none">
              Stock limité
            </Badge>
          )}
          {isOutOfStock && (
            <Badge className="bg-muted text-muted-foreground uppercase text-[10px] px-2 py-1 rounded-none">
              Épuisé
            </Badge>
          )}
        </div>


        {/* Selected color badge (bottom-left of image) */}
        {activeColorLabel && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-background/90 px-2 py-1 text-[10px] uppercase tracking-wider font-medium backdrop-blur-sm">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: activeColorOpt!.color }}
            />
            {activeColorLabel}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <div className="text-[10px] text-muted-foreground tracking-wider uppercase">
          {product.category}
        </div>

        <h3 className="text-sm font-bold uppercase tracking-tight truncate">
          {product.name}
        </h3>

        {product.subtitle && (
          <p className="text-[10px] uppercase text-muted-foreground truncate">
            {product.subtitle}
          </p>
        )}

        {/* Rating */}
        {reviewStats && reviewStats.count > 0 && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="font-medium text-foreground">{reviewStats.average.toFixed(1)}</span>
            <span>({reviewStats.count})</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-2 pt-1">
          {hasDiscount ? (
            <>
              <span className="text-base font-bold">{product.salePrice}€</span>
              <span className="text-xs text-muted-foreground line-through">{product.price}€</span>
            </>
          ) : (
            <span className="text-base font-bold">{product.price}€</span>
          )}
        </div>

        {/* Color swatches — clickable */}
        {hasColorOptions ? (
          <div className="flex items-center gap-1.5 pt-1 flex-wrap">
            {visibleColorOptions.slice(0, 6).map((opt, index) => (
              <button
                key={index}
                className={cn(
                  swatchClasses[swatchStyle],
                  "border border-border/60 transition-all duration-200 hover:scale-110 flex-shrink-0 overflow-hidden",
                  selectedColorIndex === index
                    ? "ring-2 ring-offset-1 ring-foreground scale-110"
                    : "hover:ring-1 hover:ring-foreground/50"
                )}
                style={getSwatchStyle(opt)}
                title={opt.label}
                onClick={(e) => handleSwatchClick(e, index)}
                aria-label={`Couleur: ${opt.label}`}
                aria-pressed={selectedColorIndex === index}
              />
            ))}
            {visibleColorOptions.length > 6 && (
              <span className="text-[10px] text-muted-foreground ml-1">
                +{visibleColorOptions.length - 6}
              </span>
            )}

          </div>
        ) : product.colors && product.colors.length > 0 ? (
          <div className="flex items-center gap-1.5 pt-1">
            {product.colors.slice(0, 6).map((color, index) => (
              <div
                key={index}
                className={cn(swatchClasses[swatchStyle], "border border-border")}
                style={{ backgroundColor: color }}
              />
            ))}
            {product.colors.length > 6 && (
              <span className="text-[10px] text-muted-foreground ml-1">
                +{product.colors.length - 6}
              </span>
            )}
          </div>
        ) : null}
      </div>

      {/* Add to Cart */}
      {onAddToCart && (
        <button
          className="product-card-footer text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart();
          }}
        >
          {isOutOfStock ? 'Épuisé' : 'Ajouter au panier'}
        </button>
      )}
    </div>
  );
}

interface ProductGridProps {
  products: Product[];
  onProductClick?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  onNavigate?: (productId: string, selectedColor: string | null) => void;
  swatchStyle?: 'round' | 'square' | 'separated' | 'geometric';
}

export function ProductGrid({ products, onProductClick, onAddToCart, onNavigate, swatchStyle }: ProductGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product, index) => (
        <div
          key={product.id}
          className="animate-slide-in-up"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <ProductCard
            product={product}
            onClick={onNavigate ? undefined : () => onProductClick?.(product)}
            onNavigate={onNavigate}
            onAddToCart={onAddToCart ? () => onAddToCart(product) : undefined}
            swatchStyle={swatchStyle}
          />
        </div>
      ))}
    </div>
  );
}
