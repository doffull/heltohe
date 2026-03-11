import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Product } from '@/types';
import { Badge } from '@/components/ui/badge';

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
  onAddToCart?: () => void;
  onNavigate?: (productId: string, selectedColor: string | null) => void;
  swatchStyle?: 'round' | 'square' | 'separated' | 'geometric';
}

export function ProductCard({ product, onClick, onAddToCart, onNavigate, swatchStyle = 'round' }: ProductCardProps) {
  const [selectedColorIndex, setSelectedColorIndex] = useState<number | null>(null);
  const hasDiscount = product.salePrice && product.salePrice < product.price;
  const isLowStock = product.stock <= 5 && product.stock > 0;
  const isOutOfStock = product.stock === 0;

  const swatchClasses: Record<string, string> = {
    round: 'w-5 h-5 rounded-full',
    square: 'w-5 h-5 rounded-sm',
    separated: 'w-5 h-5 rounded-full ring-2 ring-background ring-offset-1 ring-offset-border',
    geometric: 'w-5 h-5 rotate-45',
  };

  const hasColorOptions = product.colorOptions && product.colorOptions.length > 0;

  // Determine which image to show: clicked color image > default image
  const activeColorOpt = hasColorOptions && selectedColorIndex !== null
    ? product.colorOptions![selectedColorIndex]
    : null;

  const displayImage = activeColorOpt?.image
    ? activeColorOpt.image
    : product.image;

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
    >
      {/* Image */}
      <div
        className="relative aspect-[3/4] overflow-hidden"
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
          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105 animate-fade-in"
        />

        {/* Active color tint overlay (subtle) */}
        {activeColorOpt && !activeColorOpt.image && (
          <div
            className="absolute inset-0 opacity-10 pointer-events-none transition-opacity duration-300"
            style={{ backgroundColor: activeColorOpt.color, mixBlendMode: 'color' }}
          />
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xs uppercase tracking-wider mb-3">Tailles disponibles</p>
            <div className="flex gap-1.5 justify-center">
              {(product.sizes || ['XS', 'S', 'M', 'L', 'XL']).slice(0, 5).map((size) => (
                <span key={size} className="w-8 h-8 border border-foreground flex items-center justify-center text-xs font-medium">
                  {size}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
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
          <p className="text-[10px] text-muted-foreground truncate">
            {product.subtitle}
          </p>
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
            {product.colorOptions!.slice(0, 6).map((opt, index) => (
              <button
                key={index}
                className={cn(
                  swatchClasses[swatchStyle],
                  "border border-border/60 transition-all duration-200 hover:scale-110 flex-shrink-0",
                  selectedColorIndex === index
                    ? "ring-2 ring-offset-1 ring-foreground scale-110"
                    : "hover:ring-1 hover:ring-foreground/50"
                )}
                style={{ backgroundColor: opt.color }}
                title={opt.label}
                onClick={(e) => handleSwatchClick(e, index)}
                aria-label={`Couleur: ${opt.label}`}
                aria-pressed={selectedColorIndex === index}
              />
            ))}
            {product.colorOptions!.length > 6 && (
              <span className="text-[10px] text-muted-foreground ml-1">
                +{product.colorOptions!.length - 6}
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
