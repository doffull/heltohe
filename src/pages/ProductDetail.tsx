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
    imageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
          <div ref={imageRef} style={{ scrollMarginTop: '80px' }}>
            <ProductImageGallery
              image={product.image}
              name={product.name}
              videoUrl={product.videoUrl}
              colorOptions={product.colorOptions}
              selectedColor={selectedColor}
              onColorChange={handleColorChange}
              modelHeight={(product as any).modelHeight}
              modelSizeWorn={(product as any).modelSizeWorn}
            />
          </div>

          {/* Right: Product Details */}
          <div className="flex flex-col gap-6">
            <div className="order-1">
              <ProductInfo product={product} isNew={isNewImport} headerOnly />
            </div>
            <div className="order-2 lg:order-3">
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
            <div className="order-3 lg:order-2 flex flex-col gap-6">
              <ProductInfo product={product} detailsOnly />
            </div>
          </div>
        </div>

        {/* Related products */}
        <RelatedProducts category={product.category} currentId={product.id} />

        {/* Complete the look */}
        <CompleteLook productId={product.id} onAddToCart={addItem} />
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
/* Complete The Look Section                                            */
/* ------------------------------------------------------------------ */
function CompleteLook({ productId, onAddToCart }: { productId: string; onAddToCart: (item: any) => Promise<void> }) {
  const { data: looks = [] } = useProductLooks();
  const { data: allProducts = [] } = useProducts();
  const { toast } = useToast();

  // Find looks that include this product
  const myLooks = looks.filter(l => l.isActive && l.productIds.includes(productId));
  if (myLooks.length === 0) return null;

  // Get all other products from those looks (deduplicated, excluding current product)
  const otherProductIds = [...new Set(myLooks.flatMap(l => l.productIds.filter(id => id !== productId)))];
  const lookProducts = allProducts.filter(p => otherProductIds.includes(p.id));

  if (lookProducts.length === 0) return null;

  const handleAdd = async (p: typeof lookProducts[0]) => {
    await onAddToCart({
      productId: p.id,
      name: p.name,
      price: p.price,
      salePrice: p.salePrice,
      image: p.image,
      quantity: 1,
    });
    toast({ title: `${p.name} ajouté au panier` });
  };

  return (
    <motion.section
      className="mt-12"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <ShoppingCart className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold hud-text">COMPLÉTER LE LOOK</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {lookProducts.map((p) => (
          <motion.div
            key={p.id}
            className="chamfer-hud bg-card/30 overflow-hidden group"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="aspect-square overflow-hidden relative">
              <img
                src={p.image}
                alt={p.name}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              {p.salePrice && (
                <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 chamfer-hud-sm font-bold">
                  SOLDE
                </span>
              )}
            </div>
            <div className="p-3 space-y-2">
              <p className="text-sm font-bold truncate">{p.name}</p>
              {p.subtitle && <p className="text-xs text-muted-foreground truncate">{p.subtitle}</p>}
              <div className="flex items-center gap-2">
                {p.salePrice ? (
                  <>
                    <span className="font-bold text-sm text-primary">{p.salePrice}€</span>
                    <span className="text-xs line-through text-muted-foreground">{p.price}€</span>
                  </>
                ) : (
                  <span className="font-bold text-sm">{p.price}€</span>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full chamfer-hud-sm text-xs h-8"
                onClick={() => handleAdd(p)}
              >
                <ShoppingCart className="h-3 w-3 mr-1" />
                Ajouter
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
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
