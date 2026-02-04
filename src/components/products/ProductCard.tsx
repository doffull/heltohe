import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { Product } from '@/types';
import { Badge } from '@/components/ui/badge';

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const { t } = useApp();
  const hasDiscount = product.salePrice && product.salePrice < product.price;
  const isLowStock = product.stock <= 5 && product.stock > 0;
  const isOutOfStock = product.stock === 0;
  
  return (
    <div 
      onClick={onClick}
      className={cn(
        "group relative bg-card border border-border/30 overflow-hidden cursor-pointer",
        "transition-all duration-300 hover:border-primary/50 hover:shadow-hud",
        "chamfer-hud"
      )}
    >
      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {hasDiscount && (
            <Badge className="bg-hud-danger text-white hud-text text-[10px] px-2 py-1">
              {t('onSale')}
            </Badge>
          )}
          {isLowStock && (
            <Badge className="bg-hud-warning text-black hud-text text-[10px] px-2 py-1">
              {t('lowStock')}
            </Badge>
          )}
          {isOutOfStock && (
            <Badge className="bg-muted text-muted-foreground hud-text text-[10px] px-2 py-1">
              {t('outOfStock')}
            </Badge>
          )}
        </div>
        
        {/* Quick view button */}
        <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0">
          <button className="w-full py-3 bg-primary text-primary-foreground hud-text text-xs tracking-wider chamfer-hud-sm hover:bg-primary/90 transition-colors">
            {t('acquire')}
          </button>
        </div>
      </div>
      
      {/* Info */}
      <div className="p-4 space-y-2">
        <div className="hud-text text-[10px] text-muted-foreground tracking-wider">
          {product.category.toUpperCase()}
        </div>
        
        <h3 className="hud-text text-sm font-medium truncate">
          {product.name}
        </h3>
        
        {product.subtitle && (
          <p className="text-[10px] text-muted-foreground truncate">
            {product.subtitle}
          </p>
        )}
        
        <div className="flex items-center gap-2 pt-1">
          {hasDiscount ? (
            <>
              <span className="hud-text text-sm text-primary font-bold">
                {product.salePrice}€
              </span>
              <span className="hud-text text-xs text-muted-foreground line-through">
                {product.price}€
              </span>
            </>
          ) : (
            <span className="hud-text text-sm text-primary font-bold">
              {product.price}€
            </span>
          )}
        </div>
        
        {/* Color options preview */}
        {product.colors && product.colors.length > 0 && (
          <div className="flex items-center gap-1 pt-1">
            {product.colors.slice(0, 4).map((color, index) => (
              <div 
                key={index}
                className="w-4 h-4 border border-border/50"
                style={{ backgroundColor: color }}
              />
            ))}
            {product.colors.length > 4 && (
              <span className="text-[10px] text-muted-foreground ml-1">
                +{product.colors.length - 4}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ProductGridProps {
  products: Product[];
  onProductClick?: (product: Product) => void;
}

export function ProductGrid({ products, onProductClick }: ProductGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product, index) => (
        <div
          key={product.id}
          className="animate-slide-in-up"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <ProductCard 
            product={product} 
            onClick={() => onProductClick?.(product)}
          />
        </div>
      ))}
    </div>
  );
}
