import { useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, ShoppingCart } from 'lucide-react';
import { useProduct } from '@/hooks/useProducts';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import ProductImageGallery from '@/components/product/ProductImageGallery';
import ProductInfo from '@/components/product/ProductInfo';
import ProductOptions from '@/components/product/ProductOptions';
import RelatedProducts from '@/components/product/RelatedProducts';
import { useProductLooks } from '@/hooks/useProductLooks';
import { useProducts } from '@/hooks/useProducts';

export default function ProductDetail() {
  const { slugOrId, id } = useParams<{ slugOrId?: string; id?: string }>();
  const productId = slugOrId || id || '';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNewImport = searchParams.get('new') === '1';
  const colorFromUrl = searchParams.get('color');
  const { toast } = useToast();
  const { data: product, isLoading } = useProduct(productId);
  const { addItem } = useCart();

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(colorFromUrl);
  const [quantity, setQuantity] = useState(1);

  // Ref to scroll to image when color changes
  const imageRef = useRef<HTMLDivElement>(null);

  const scrollToImage = useCallback(() => {
    imageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleColorChange = useCallback((color: string) => {
    setSelectedColor(color);
    // Small delay so image switches first, then scroll
    setTimeout(scrollToImage, 50);
  }, [scrollToImage]);

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
          {/* Left: Image Gallery — ref for scroll target */}
          <div ref={imageRef}>
            <ProductImageGallery
              image={product.image}
              name={product.name}
              videoUrl={product.videoUrl}
              colorOptions={product.colorOptions}
              selectedColor={selectedColor}
              onColorChange={handleColorChange}
            />
          </div>

          {/* Right: Product Details */}
          <div className="space-y-6">
            <ProductInfo product={product} isNew={isNewImport} />
            <ProductOptions
              product={product}
              selectedSize={selectedSize}
              selectedColor={selectedColor}
              quantity={quantity}
              onSizeChange={setSelectedSize}
              onColorChange={handleColorChange}
              onQuantityChange={setQuantity}
              onAddToCart={handleAddToCart}
            />
          </div>
        </div>

        {/* Related products */}
        <RelatedProducts category={product.category} currentId={product.id} />
      </div>

      {/* Floating Color Variant Popup — visible when product has colors */}
      {(product.colorOptions?.length ?? 0) > 0 && (
        <FloatingColorPicker
          colorOptions={product.colorOptions!}
          selectedColor={selectedColor}
          onColorChange={handleColorChange}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Floating Color Picker                                                */
/* ------------------------------------------------------------------ */
import { Palette, X } from 'lucide-react';
import { ColorOption } from '@/types';
import { cn } from '@/lib/utils';

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length < 6) return false;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

function FloatingColorPicker({
  colorOptions,
  selectedColor,
  onColorChange,
}: {
  colorOptions: ColorOption[];
  selectedColor: string | null;
  onColorChange: (c: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-start gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            className="bg-background/95 backdrop-blur-md border border-border chamfer-hud-sm shadow-xl p-3 flex flex-col gap-2 mb-2"
            initial={{ opacity: 0, x: -20, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          >
            <p className="text-[10px] font-bold hud-text uppercase tracking-widest text-muted-foreground mb-1">Couleur</p>
            {colorOptions.map((co) => (
              <motion.button
                key={co.color}
                onClick={() => {
                  onColorChange(co.color);
                  setOpen(false);
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className={cn(
                  'w-9 h-9 rounded-sm border-2 overflow-hidden relative transition-all',
                  selectedColor === co.color
                    ? 'border-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]'
                    : 'border-border/40 hover:border-border'
                )}
                title={co.label}
              >
                {co.image ? (
                  <img src={co.image} alt={co.label} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: co.color }}>
                    {selectedColor === co.color && (
                      <span className="text-[10px] font-bold" style={{ color: isLightColor(co.color) ? '#000' : '#fff' }}>✓</span>
                    )}
                  </div>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle pill */}
      <motion.button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 bg-foreground text-background flex items-center justify-center chamfer-hud-sm shadow-lg hover:opacity-90 transition-opacity"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Changer la couleur"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="h-4 w-4" />
            </motion.span>
          ) : (
            <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <Palette className="h-4 w-4" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
