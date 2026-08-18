import { useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, ShoppingCart, ChevronRight, Pencil } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

import { useProduct } from '@/hooks/useProducts';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import ProductImageGallery from '@/components/product/ProductImageGallery';
import ProductHeaderBlock from '@/components/product/ProductHeaderBlock';
import ProductBuyBox from '@/components/product/ProductBuyBox';
import ProductTrustBar from '@/components/product/ProductTrustBar';
import ProductInfoAccordion from '@/components/product/ProductInfoAccordion';
import MobileBuyBar from '@/components/product/MobileBuyBar';
import RelatedProducts from '@/components/product/RelatedProducts';
import { excludeMarketplaceProducts, isMarketplaceCategory } from '@/lib/shopVisibility';
import { useProductLooks } from '@/hooks/useProductLooks';
import { useProducts } from '@/hooks/useProducts';
import { usePageTemplate, useDefaultTemplate } from '@/hooks/usePageTemplates';
import ProductTemplateRenderer from '@/components/product/ProductTemplateRenderer';
import VirtualTryOnButton from '@/components/product/VirtualTryOnButton';
import ProductReviews from '@/components/product/ProductReviews';
import ColorVariantsStrip from '@/components/product/ColorVariantsStrip';
import ProductStrip from '@/components/product/ProductStrip';
import { useTrackProductView, useRecommendedProducts } from '@/hooks/useRecentlyViewed';

export default function ProductDetail() {
  const { slugOrId, id } = useParams<{ slugOrId?: string; id?: string }>();
  const productId = slugOrId || id || '';
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [searchParams] = useSearchParams();
  const isNewImport = searchParams.get('new') === '1';
  const colorFromUrl = searchParams.get('color');
  const { toast } = useToast();
  const { data: product, isLoading } = useProduct(productId);
  const { data: assignedTemplate } = usePageTemplate(product?.templateId || undefined);
  const { data: defaultTemplate } = useDefaultTemplate('product');
  const activeTemplate = assignedTemplate || defaultTemplate;
  const { addItem } = useCart();

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(colorFromUrl);
  const [quantity, setQuantity] = useState(1);

  // Historique de consultation → recommandations personnalisées
  useTrackProductView(product?.id);
  const { data: rawProducts = [] } = useProducts();
  // Produits marketplace (Collab) : jamais recommandés hors de leur page dédiée
  const allProducts = isMarketplaceCategory(product?.category)
    ? rawProducts.filter((p) => isMarketplaceCategory(p.category))
    : excludeMarketplaceProducts(rawProducts);
  const recommended = useRecommendedProducts(allProducts, product?.id);

  // Refs : galerie (scroll au changement de couleur) + ancre barre d'achat mobile
  const imageRef = useRef<HTMLDivElement>(null);
  const buyBoxRef = useRef<HTMLDivElement>(null);

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
      buyBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

  // Brouillon ou produit en corbeille : invisible pour les visiteurs.
  if (product && !isAdmin && (product.deletedAt || product.status === 'draft')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Produit non trouvé</h1>
          <Button onClick={() => navigate('/boutique')}>Retour à la boutique</Button>
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

  // If a template is assigned (or a default exists), use the dynamic renderer
  if (activeTemplate) {
    return (
      <>
        <ProductTemplateRenderer template={activeTemplate} product={product} />
        <div className="container mx-auto px-4 pb-10">
          <ColorVariantsStrip product={product} className="mb-6" />
          <ProductStrip eyebrow="RECOMMANDÉ POUR VOUS" title="Sélection basée sur vos visites" products={recommended} />
        </div>
        <VirtualTryOnButton product={product} selectedColor={selectedColor} />
      </>
    );
  }

  const gallery = (
    <div ref={imageRef} style={{ scrollMarginTop: '80px' }}>
      <ProductImageGallery
        image={product.image}
        name={product.name}
        videoUrl={product.videoUrl}
        galleryImages={product.galleryImages}
        colorOptions={product.colorOptions}
        selectedColor={selectedColor}
        onColorChange={handleColorChange}
        modelHeight={(product as any).modelHeight}
        modelSizeWorn={(product as any).modelSizeWorn}
        product={product}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-3 md:py-8 max-w-[1500px]">

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
                onClick={() => navigate(`/admin/produits`, { replace: true })}
              >
                Retour admin
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fil d'ariane + retour */}
        <motion.div
          className="flex items-center gap-1 mb-3 md:mb-5 text-xs text-muted-foreground"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 px-2 text-xs">
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            Retour
          </Button>
          <ChevronRight className="h-3 w-3 opacity-50" />
          <button onClick={() => navigate('/boutique')} className="uppercase tracking-wider hover:text-foreground transition-colors">
            Boutique
          </button>
          <ChevronRight className="h-3 w-3 opacity-50" />
          <span className="uppercase tracking-wider text-foreground/80 truncate">{product.category}</span>

          {product.status === 'draft' && (
            <span className="ml-2 shrink-0 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600">
              Brouillon — non visible publiquement
            </span>
          )}

          {isAdmin && (
            <Button
              size="sm"
              onClick={() => navigate(`/admin/produits?edit=${product.id}`)}
              className="ml-auto h-8 gap-1.5 px-3 text-[11px] font-bold uppercase tracking-wider chamfer-hud-sm shrink-0"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Modifier le produit</span>
              <span className="sm:hidden">Modifier</span>
            </Button>
          )}
        </motion.div>


        {/* ---------- Bloc principal ---------- */}
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-6 md:gap-8 lg:gap-10 xl:gap-14 items-start">

          {/* 1. Identité (mobile : tout en haut / desktop : colonne droite) */}
          <ProductHeaderBlock product={product} isNew={isNewImport} className="md:hidden" />

          {/* 2. Galerie */}
          <div className="md:sticky md:top-24">
            {gallery}
          </div>

          {/* 3. Colonne achat */}
          <div ref={buyBoxRef} className="flex flex-col gap-6 md:sticky md:top-24">
            <ProductHeaderBlock product={product} isNew={isNewImport} className="hidden md:flex" />
            <ProductBuyBox
              product={product}
              selectedSize={selectedSize}
              selectedColor={selectedColor}
              quantity={quantity}
              onSizeChange={setSelectedSize}
              onColorChange={handleColorChange}
              onQuantityChange={setQuantity}
              onAddToCart={handleAddToCart}
            />
            <ProductTrustBar category={product.category} />
          </div>
        </div>

        {/* 4. Description / caractéristiques / matière & entretien */}
        <ProductInfoAccordion product={product} className="mt-8 md:mt-14" />

        {/* Customer reviews */}
        <ProductReviews productId={product.id} productName={product.name} />

        {/* Related products */}
        <RelatedProducts category={product.category} currentId={product.id} />

        {/* Personalized recommendations from browsing history */}
        <ProductStrip eyebrow="RECOMMANDÉ POUR VOUS" title="Sélection basée sur vos visites" products={recommended} />

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

      {/* Barre d'achat collante mobile */}
      <MobileBuyBar
        product={product}
        selectedSize={selectedSize}
        onAddToCart={handleAddToCart}
        anchorRef={buyBoxRef}
      />
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
  const lookProducts = excludeMarketplaceProducts(allProducts).filter(p => otherProductIds.includes(p.id));

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
