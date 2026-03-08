import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useProduct } from '@/hooks/useProducts';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import ProductImageGallery from '@/components/product/ProductImageGallery';
import ProductInfo from '@/components/product/ProductInfo';
import ProductOptions from '@/components/product/ProductOptions';
import RelatedProducts from '@/components/product/RelatedProducts';

export default function ProductDetail() {
  const { slugOrId, id } = useParams<{ slugOrId?: string; id?: string }>();
  const productId = slugOrId || id || '';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNewImport = searchParams.get('new') === '1';
  const { toast } = useToast();
  const { data: product, isLoading } = useProduct(productId);
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
              {[1/4, 3/4, 1/3, 1].map((w, i) => (
                <div key={i} className="bg-card/30 rounded animate-pulse" style={{ height: i === 3 ? 128 : i === 1 ? 48 : 32, width: `${w * 100}%` }} />
              ))}
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
          <Button onClick={() => navigate('/boutique')}>Retour à la boutique</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 md:py-8">

        {/* "Freshly imported" banner */}
        <AnimatePresence>
          {isNewImport && (
            <motion.div
              className="mb-6 flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3"
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <Sparkles className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-bold hud-text">PRODUIT IMPORTÉ AVEC SUCCÈS</p>
                <p className="text-xs text-muted-foreground">Couleurs, tailles et description ont été extraites automatiquement par l'IA depuis votre maquette.</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-xs"
                onClick={() => navigate(`/admin/products`, { replace: true })}
              >
                Retour admin
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Back Button */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 md:mb-6 h-9 md:h-10 text-sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-12">
          {/* Left: Image Gallery */}
          <ProductImageGallery
            image={product.image}
            name={product.name}
            videoUrl={product.videoUrl}
            colorOptions={product.colorOptions}
            selectedColor={selectedColor}
            onColorChange={setSelectedColor}
          />

          {/* Right: Product Details */}
          <div className="space-y-6">
            <ProductInfo product={product} isNew={isNewImport} />
            <ProductOptions
              product={product}
              selectedSize={selectedSize}
              selectedColor={selectedColor}
              quantity={quantity}
              onSizeChange={setSelectedSize}
              onColorChange={setSelectedColor}
              onQuantityChange={setQuantity}
              onAddToCart={handleAddToCart}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
