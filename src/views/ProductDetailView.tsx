import { useState } from 'react';
import { ArrowLeft, Minus, Plus, ShoppingCart, Heart, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function ProductDetailView() {
  const { selectedProduct, setCurrentView, t, language } = useApp();
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  
  if (!selectedProduct) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="hud-text text-muted-foreground">
          {language === 'FR' ? 'Produit non trouvé' : 'Product not found'}
        </p>
      </div>
    );
  }
  
  const hasDiscount = selectedProduct.salePrice && selectedProduct.salePrice < selectedProduct.price;
  const currentImage = selectedProduct.colorOptions?.[selectedColor]?.image || selectedProduct.image;
  
  return (
    <div className="min-h-screen py-8">
      {/* Back button */}
      <div className="px-6 lg:px-12 mb-8">
        <button
          onClick={() => setCurrentView('Shop')}
          className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hud-text text-xs">
            {language === 'FR' ? 'RETOUR À LA BOUTIQUE' : 'BACK TO SHOP'}
          </span>
        </button>
      </div>
      
      <div className="px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-[3/4] overflow-hidden chamfer-hud bg-secondary/20">
              <img 
                src={currentImage}
                alt={selectedProduct.name}
                className="w-full h-full object-cover"
              />
              
              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {hasDiscount && (
                  <Badge className="bg-hud-danger text-white hud-text text-xs px-3 py-1">
                    {t('onSale')}
                  </Badge>
                )}
                {selectedProduct.stock <= 5 && selectedProduct.stock > 0 && (
                  <Badge className="bg-hud-warning text-black hud-text text-xs px-3 py-1">
                    {t('lowStock')}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Color swatches as thumbnails */}
            {selectedProduct.colorOptions && selectedProduct.colorOptions.length > 1 && (
              <div className="flex gap-2">
                {selectedProduct.colorOptions.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedColor(index)}
                    className={cn(
                      "w-16 h-20 overflow-hidden border-2 transition-all duration-200",
                      selectedColor === index ? "border-primary" : "border-border/30 hover:border-border"
                    )}
                  >
                    <img 
                      src={option.image}
                      alt={option.label}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <p className="hud-text text-xs text-muted-foreground mb-2">
                {selectedProduct.category.toUpperCase()} // {selectedProduct.sku}
              </p>
              <h1 className="text-3xl lg:text-4xl font-bold mb-2">
                {selectedProduct.name}
              </h1>
              {selectedProduct.subtitle && (
                <p className="text-muted-foreground">
                  {selectedProduct.subtitle}
                </p>
              )}
            </div>
            
            {/* Price */}
            <div className="flex items-center gap-4">
              {hasDiscount ? (
                <>
                  <span className="text-3xl font-bold text-primary">
                    {selectedProduct.salePrice}€
                  </span>
                  <span className="text-xl text-muted-foreground line-through">
                    {selectedProduct.price}€
                  </span>
                  <Badge className="bg-hud-danger/20 text-hud-danger">
                    -{Math.round((1 - selectedProduct.salePrice! / selectedProduct.price) * 100)}%
                  </Badge>
                </>
              ) : (
                <span className="text-3xl font-bold text-primary">
                  {selectedProduct.price}€
                </span>
              )}
            </div>
            
            <div className="h-px bg-border" />
            
            {/* Color Selection */}
            {selectedProduct.colorOptions && selectedProduct.colorOptions.length > 0 && (
              <div className="space-y-3">
                <p className="hud-text text-xs text-muted-foreground">
                  {language === 'FR' ? 'COULEUR' : 'COLOR'}: {selectedProduct.colorOptions[selectedColor]?.label}
                </p>
                <div className="flex gap-2">
                  {selectedProduct.colorOptions.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedColor(index)}
                      className={cn(
                        "w-10 h-10 border-2 transition-all duration-200",
                        selectedColor === index ? "border-primary scale-110" : "border-border/30 hover:border-border"
                      )}
                      style={{ backgroundColor: option.color }}
                      title={option.label}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Size Selection */}
            {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
              <div className="space-y-3">
                <p className="hud-text text-xs text-muted-foreground">
                  {language === 'FR' ? 'TAILLE' : 'SIZE'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={cn(
                        "px-4 py-2 hud-text text-xs border transition-all duration-200 chamfer-hud-sm",
                        selectedSize === size
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary/30 text-foreground border-border/30 hover:border-primary/50"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Quantity */}
            <div className="space-y-3">
              <p className="hud-text text-xs text-muted-foreground">
                {language === 'FR' ? 'QUANTITÉ' : 'QUANTITY'}
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-border/30 chamfer-hud-sm">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-3 hover:bg-secondary/50 transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-12 text-center hud-text">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(selectedProduct.stock, quantity + 1))}
                    className="p-3 hover:bg-secondary/50 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-sm text-muted-foreground">
                  {selectedProduct.stock} {language === 'FR' ? 'en stock' : 'in stock'}
                </span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                className={cn(
                  "flex-1 py-6 hud-text text-sm tracking-wider chamfer-hud",
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                  "glitch-effect"
                )}
                data-text={t('acquire')}
                disabled={selectedProduct.stock === 0}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                {t('acquire')}
              </Button>
              <Button
                variant="outline"
                className="p-6 chamfer-hud-sm border-border/30 hover:border-primary/50"
              >
                <Heart className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                className="p-6 chamfer-hud-sm border-border/30 hover:border-primary/50"
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="h-px bg-border" />
            
            {/* Description */}
            {selectedProduct.description && (
              <div className="space-y-3">
                <p className="hud-text text-xs text-primary">
                  // {language === 'FR' ? 'DESCRIPTION' : 'DESCRIPTION'}
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  {selectedProduct.description}
                </p>
              </div>
            )}
            
            {/* Attributes */}
            {selectedProduct.attributes && Object.keys(selectedProduct.attributes).length > 0 && (
              <div className="space-y-3">
                <p className="hud-text text-xs text-primary">
                  // {language === 'FR' ? 'SPÉCIFICATIONS' : 'SPECIFICATIONS'}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(selectedProduct.attributes).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center py-2 border-b border-border/20">
                      <span className="hud-text text-xs text-muted-foreground">{key}</span>
                      <span className="hud-text text-xs text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Material & Care */}
            {(selectedProduct.material || selectedProduct.careInstructions) && (
              <div className="space-y-3">
                {selectedProduct.material && (
                  <div className="flex justify-between items-center py-2 border-b border-border/20">
                    <span className="hud-text text-xs text-muted-foreground">
                      {language === 'FR' ? 'MATÉRIAU' : 'MATERIAL'}
                    </span>
                    <span className="hud-text text-xs text-foreground">{selectedProduct.material}</span>
                  </div>
                )}
                {selectedProduct.careInstructions && (
                  <div className="py-2">
                    <span className="hud-text text-xs text-muted-foreground block mb-1">
                      {language === 'FR' ? 'ENTRETIEN' : 'CARE'}
                    </span>
                    <span className="text-xs text-foreground">{selectedProduct.careInstructions}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
