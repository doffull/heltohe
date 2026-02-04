import { cn } from '@/lib/utils';
import { Product } from '@/types';
import { Badge } from '@/components/ui/badge';

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
  onAddToCart?: () => void;
}

export function ProductCard({ product, onClick, onAddToCart }: ProductCardProps) {
  const hasDiscount = product.salePrice && product.salePrice < product.price;
  const isLowStock = product.stock <= 5 && product.stock > 0;
  const isOutOfStock = product.stock === 0;
  
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
        onClick={onClick}
      >
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Overlay on hover - Show available sizes */}
        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xs uppercase tracking-wider mb-3">Available Sizes</p>
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
              Sale
            </Badge>
          )}
          {isLowStock && (
            <Badge className="bg-destructive text-destructive-foreground uppercase text-[10px] px-2 py-1 rounded-none">
              Low Stock
            </Badge>
          )}
          {isOutOfStock && (
            <Badge className="bg-muted text-muted-foreground uppercase text-[10px] px-2 py-1 rounded-none">
              Sold Out
            </Badge>
          )}
        </div>
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
        
        {/* Price aligned left */}
        <div className="flex items-center gap-2 pt-1">
          {hasDiscount ? (
            <>
              <span className="text-base font-bold">
                {product.salePrice}€
              </span>
              <span className="text-xs text-muted-foreground line-through">
                {product.price}€
              </span>
            </>
          ) : (
            <span className="text-base font-bold">
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
                className="w-4 h-4 border border-border"
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

      {/* Add to Cart - Full width footer button */}
      {onAddToCart && (
        <button 
          className="product-card-footer text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart();
          }}
        >
          Add to Cart
        </button>
      )}
    </div>
  );
}

interface ProductGridProps {
  products: Product[];
  onProductClick?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
}

export function ProductGrid({ products, onProductClick, onAddToCart }: ProductGridProps) {
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
            onClick={() => onProductClick?.(product)}
            onAddToCart={onAddToCart ? () => onAddToCart(product) : undefined}
          />
        </div>
      ))}
    </div>
  );
}
