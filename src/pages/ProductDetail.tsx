import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useProduct } from '@/hooks/useProducts';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import ProductImageGallery from '@/components/product/ProductImageGallery';
import ProductInfo from '@/components/product/ProductInfo';
import ProductOptions from '@/components/product/ProductOptions';

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
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left: Image Gallery */}
          <ProductImageGallery image={product.image} name={product.name} videoUrl={product.videoUrl} />

          {/* Right: Product Details */}
          <div className="space-y-6">
            <ProductInfo product={product} />
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
