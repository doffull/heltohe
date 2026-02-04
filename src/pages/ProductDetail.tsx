import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProduct } from '@/hooks/useProducts';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  ShoppingCart, 
  Heart, 
  Share2, 
  Truck,
  Shield,
  RotateCcw,
  Plus,
  Minus,
  Check
} from 'lucide-react';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: product, isLoading } = useProduct(id || '');
  const { addItem } = useCart();

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = async () => {
    if (!product) return;

    if (product.sizes?.length && !selectedSize) {
      toast({
        title: 'Sélectionnez une taille',
        description: 'Veuillez choisir une taille avant d\'ajouter au panier',
        variant: 'destructive',
      });
      return;
    }

    await addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      salePrice: product.salePrice,
      image: product.image,
      size: selectedSize || undefined,
      color: selectedColor || undefined,
      quantity,
    });

    toast({
      title: 'Ajouté au panier',
      description: `${product.name} a été ajouté à votre panier`,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-2 gap-12">
            <div className="chamfer-hud-lg bg-card/30 animate-pulse aspect-square" />
            <div className="space-y-6">
              <div className="h-8 bg-card/30 rounded w-1/4 animate-pulse" />
              <div className="h-12 bg-card/30 rounded w-3/4 animate-pulse" />
              <div className="h-6 bg-card/30 rounded w-1/3 animate-pulse" />
              <div className="h-32 bg-card/30 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Produit non trouvé</h1>
          <Button onClick={() => navigate('/boutique')}>
            Retour à la boutique
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Product Image */}
          <div className="chamfer-hud-lg overflow-hidden bg-card/30">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover aspect-square"
            />
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Category & SKU */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground uppercase tracking-wider">
                {product.category}
              </span>
              <span className="text-xs text-muted-foreground">
                SKU: {product.sku}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold hud-text">{product.name}</h1>
            {product.subtitle && (
              <p className="text-lg text-muted-foreground">{product.subtitle}</p>
            )}

            {/* Price */}
            <div className="flex items-center gap-4">
              {product.salePrice ? (
                <>
                  <span className="text-4xl font-bold text-primary">
                    {product.salePrice}€
                  </span>
                  <span className="text-2xl line-through text-muted-foreground">
                    {product.price}€
                  </span>
                  <span className="bg-destructive text-destructive-foreground px-3 py-1 text-sm font-bold">
                    -{Math.round((1 - product.salePrice / product.price) * 100)}%
                  </span>
                </>
              ) : (
                <span className="text-4xl font-bold">{product.price}€</span>
              )}
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-2">
              {product.stock > 0 ? (
                <>
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="text-sm">
                    {product.stock > 10 ? 'En stock' : `Plus que ${product.stock} en stock`}
                  </span>
                </>
              ) : (
                <span className="text-destructive">Rupture de stock</span>
              )}
            </div>

            {/* Size Selection */}
            {product.sizes && product.sizes.length > 0 && (
              <div>
                <label className="text-sm font-bold hud-text mb-3 block">
                  TAILLE
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <Button
                      key={size}
                      variant={selectedSize === size ? 'default' : 'outline'}
                      className="min-w-[48px]"
                      onClick={() => setSelectedSize(size)}
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Selection */}
            {product.colors && product.colors.length > 0 && (
              <div>
                <label className="text-sm font-bold hud-text mb-3 block">
                  COULEUR
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => (
                    <Button
                      key={color}
                      variant={selectedColor === color ? 'default' : 'outline'}
                      onClick={() => setSelectedColor(color)}
                    >
                      {color}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="text-sm font-bold hud-text mb-3 block">
                QUANTITÉ
              </label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-bold text-lg">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Add to Cart */}
            <div className="flex gap-4">
              <Button
                className="flex-1 h-14 text-lg chamfer-hud-sm"
                onClick={handleAddToCart}
                disabled={product.stock === 0}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                AJOUTER AU PANIER
              </Button>
              <Button variant="outline" size="icon" className="h-14 w-14">
                <Heart className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="icon" className="h-14 w-14">
                <Share2 className="h-5 w-5" />
              </Button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 py-6 border-y border-border">
              <div className="text-center">
                <Truck className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-xs text-muted-foreground">Livraison gratuite dès 100€</p>
              </div>
              <div className="text-center">
                <Shield className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-xs text-muted-foreground">Garantie 2 ans</p>
              </div>
              <div className="text-center">
                <RotateCcw className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-xs text-muted-foreground">Retours sous 30 jours</p>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <h2 className="text-lg font-bold hud-text mb-3">DESCRIPTION</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {/* Attributes */}
            {product.attributes && Object.keys(product.attributes).length > 0 && (
              <div>
                <h2 className="text-lg font-bold hud-text mb-3">CARACTÉRISTIQUES</h2>
                <div className="space-y-2">
                  {Object.entries(product.attributes).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Material & Care */}
            {(product.material || product.careInstructions) && (
              <div className="grid md:grid-cols-2 gap-6">
                {product.material && (
                  <div>
                    <h3 className="text-sm font-bold hud-text mb-2">MATIÈRE</h3>
                    <p className="text-sm text-muted-foreground">{product.material}</p>
                  </div>
                )}
                {product.careInstructions && (
                  <div>
                    <h3 className="text-sm font-bold hud-text mb-2">ENTRETIEN</h3>
                    <p className="text-sm text-muted-foreground">{product.careInstructions}</p>
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
