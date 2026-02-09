import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useSidebarOptional } from '@/context/SidebarContext';
import { Product } from '@/types';
import { Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { StatBar } from './StatBar';
import { cn } from '@/lib/utils';

const DEFAULT_STATS = [
  { label: 'Durability', value: 85 },
  { label: 'Price', value: 45 },
  { label: 'Fashion', value: 92 },
];

function ProductSlide({ product, designSettings }: { product: Product; designSettings: any }) {
  const navigate = useNavigate();
  const [galleryIndex, setGalleryIndex] = useState(0);

  const galleryImages: string[] = [];
  galleryImages.push(product.image);
  if (product.colorOptions) {
    product.colorOptions.forEach(opt => {
      if (opt.image && !galleryImages.includes(opt.image)) {
        galleryImages.push(opt.image);
      }
    });
  }
  const safeGalleryIndex = galleryImages.length > 0 ? galleryIndex % galleryImages.length : 0;

  const productNumber = product.sku
    ? product.sku.split('-').pop()?.replace(/\D/g, '').padStart(3, '0') || '001'
    : '001';

  const sizes = designSettings.sidebarSizes?.length > 0
    ? designSettings.sidebarSizes
    : (product.sizes || ['S', 'M', 'L', 'XL']);

  return (
    <div className="flex flex-col gap-4">
      {/* Product Info Card */}
      {designSettings.showSidebarProductCard && (
        <div className="sidebar-product-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-foreground/80 flex items-center justify-center bevel-corners-sm">
              <Play className="h-3 w-3 text-background fill-background" />
            </div>
            <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-foreground/60">
              {designSettings.sidebarBrandName || 'LVTK6'}
            </span>
          </div>
          <h3 
            className="font-bold text-base uppercase tracking-wider text-foreground mb-1 cursor-pointer hover:text-primary transition-colors"
            onClick={() => navigate(`/produit/${product.id}`)}
          >
            {product.name}
          </h3>
          <p className="font-mono text-[11px] text-foreground/50 leading-relaxed line-clamp-2">
            {product.subtitle || product.description?.slice(0, 80) || ''}
          </p>
          {/* Price */}
          <div className="flex items-center gap-2 mt-2">
            {product.salePrice && product.salePrice < product.price ? (
              <>
                <span className="font-bold text-sm text-primary">{product.salePrice}€</span>
                <span className="text-xs text-foreground/40 line-through">{product.price}€</span>
              </>
            ) : (
              <span className="font-bold text-sm text-foreground">{product.price}€</span>
            )}
          </div>
        </div>
      )}

      {/* Size Selectors */}
      {designSettings.showSidebarSizes && (
        <div className="flex flex-wrap gap-2">
          {sizes.map((size: string) => (
            <div key={size} className="sidebar-size-badge">
              <span className="font-mono text-[10px] tracking-wider text-foreground/60">Size</span>
              <span className="font-bold text-xs uppercase text-foreground">{size}</span>
            </div>
          ))}
        </div>
      )}

      {/* Mini Gallery */}
      {designSettings.showSidebarGallery && galleryImages.length > 0 && (
        <div className="sidebar-gallery">
          <div className="relative w-full aspect-[4/3] overflow-hidden bevel-corners-sm">
            <img
              src={galleryImages[safeGalleryIndex]}
              alt={product.name}
              className="w-full h-full object-cover transition-opacity duration-300"
            />
            {galleryImages.length > 1 && (
              <>
                <button
                  onClick={() => setGalleryIndex(prev => (prev - 1 + galleryImages.length) % galleryImages.length)}
                  className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-foreground/60 text-background flex items-center justify-center hover:bg-foreground/80 transition-colors"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <button
                  onClick={() => setGalleryIndex(prev => (prev + 1) % galleryImages.length)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-foreground/60 text-background flex items-center justify-center hover:bg-foreground/80 transition-colors"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              </>
            )}
            <div className="absolute bottom-2 left-2 flex items-center gap-2">
              <span className="font-mono text-[9px] tracking-wider text-background bg-foreground/60 px-2 py-0.5">
                Preview
              </span>
              <span className="font-mono text-[9px] text-background bg-foreground/40 px-1.5 py-0.5">
                {safeGalleryIndex + 1}/{galleryImages.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SidebarProductHUD() {
  const { designSettings, selectedProduct, products } = useApp();
  const sidebarContext = useSidebarOptional();
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const sliderEnabled = designSettings.sidebarSliderEnabled !== false;
  const sliderSpeed = designSettings.sidebarSliderSpeed || 6000;
  const maxProducts = designSettings.sidebarSliderMaxProducts || 5;

  // Build product list for the slider
  const sliderProducts = products.slice(0, maxProducts);
  const hasMultiple = sliderProducts.length > 1 && sliderEnabled;

  // If a product is hovered, show it instead of the slider
  const hoveredProduct = sidebarContext?.hoveredProduct;
  const manualProduct = hoveredProduct || selectedProduct;

  // Auto-cycle through products
  useEffect(() => {
    if (!hasMultiple || manualProduct) return;
    const timer = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setActiveIndex(prev => (prev + 1) % sliderProducts.length);
        setIsTransitioning(false);
      }, 300);
    }, sliderSpeed);
    return () => clearInterval(timer);
  }, [hasMultiple, sliderSpeed, sliderProducts.length, manualProduct]);

  const activeProduct: Product | null = manualProduct || sliderProducts[activeIndex] || null;

  const goTo = useCallback((index: number) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveIndex(index);
      setIsTransitioning(false);
    }, 300);
  }, []);

  // Stats from admin settings or context
  const stats = designSettings.stats && designSettings.stats.length > 0
    ? designSettings.stats.map(s => ({ label: s.label, value: s.value }))
    : sidebarContext
      ? [
          { label: 'Durability', value: sidebarContext.currentStats.durability },
          { label: 'Price', value: sidebarContext.currentStats.price },
          { label: 'Fashion', value: sidebarContext.currentStats.fashion },
        ]
      : DEFAULT_STATS;

  const productNumber = activeProduct?.sku
    ? activeProduct.sku.split('-').pop()?.replace(/\D/g, '').padStart(3, '0') || '001'
    : '001';

  return (
    <div className="relative z-20 h-full flex flex-col justify-between p-6 pt-28">
      {/* Top Zone: Brand + Product Number */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-bold text-lg tracking-[0.15em] uppercase text-foreground">
            {designSettings.sidebarBrandName || 'LVTK6'}
          </h2>
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/50">
            {designSettings.sidebarBrandSubtitle || 'NEW EDITION'}
          </span>
        </div>

        {designSettings.showSidebarProductNumber && (
          <div className="sidebar-product-number">
            <span className="font-mono text-sm font-bold text-background">
              {productNumber}
            </span>
          </div>
        )}
      </div>

      {/* Center Zone: Product Slider */}
      <div className="flex-1 flex flex-col justify-center gap-4">
        {activeProduct && (
          <div className={cn(
            "transition-all duration-300",
            isTransitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
          )}>
            <ProductSlide product={activeProduct} designSettings={designSettings} />
          </div>
        )}

        {/* Navigation Dots */}
        {hasMultiple && !manualProduct && (
          <div className="flex items-center justify-center gap-2 mt-2">
            {sliderProducts.map((_, index) => (
              <button
                key={index}
                onClick={() => goTo(index)}
                className={cn(
                  "transition-all duration-300",
                  index === activeIndex
                    ? "w-6 h-1.5 bg-foreground"
                    : "w-1.5 h-1.5 bg-foreground/30 hover:bg-foreground/50"
                )}
              />
            ))}
          </div>
        )}

        {/* Stats */}
        {designSettings.showSidebarStats && (
          <div className="mt-4">
            <div className="mb-3">
              <h3 className="font-mono text-[11px] tracking-[0.2em] uppercase text-foreground/70 mb-1">
                Model Interface
              </h3>
              <div className="w-8 h-px bg-foreground/30" />
            </div>
            {stats.map((stat, index) => (
              <StatBar
                key={stat.label}
                label={stat.label}
                value={stat.value}
                delay={index * 200}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Zone: HUD Buttons + Info */}
      <div className="space-y-3">
        {/* HUD Buttons */}
        {designSettings.hudButtons && designSettings.hudButtons.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {designSettings.hudButtons.map((btn) => (
              <button
                key={btn.id}
                onClick={() => navigate(btn.url)}
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-200 hover:scale-105 bevel-corners-sm"
                style={{
                  backgroundColor: btn.style.bg,
                  color: btn.style.text,
                  fontSize: btn.style.fontSize ? `${btn.style.fontSize}px` : '10px',
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}

        {/* Info bar */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/40">
            {designSettings.sidebarInfoText || `Model ${productNumber}`}
          </span>
          {activeProduct && (
            <span className="font-mono text-[10px] text-foreground/30">
              {activeProduct.category}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
