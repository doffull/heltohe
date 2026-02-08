import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useSidebarOptional } from '@/context/SidebarContext';
import { Product } from '@/types';
import { Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { StatBar } from './StatBar';

const DEFAULT_STATS = [
  { label: 'Durability', value: 85 },
  { label: 'Price', value: 45 },
  { label: 'Fashion', value: 92 },
];

export function SidebarProductHUD() {
  const { designSettings, selectedProduct, products } = useApp();
  const sidebarContext = useSidebarOptional();
  const navigate = useNavigate();
  const [galleryIndex, setGalleryIndex] = useState(0);

  // Priority: hovered > selected > first product as fallback
  const activeProduct: Product | null = 
    sidebarContext?.hoveredProduct || selectedProduct || products[0] || null;

  // Collect all images for the gallery
  const galleryImages: string[] = [];
  if (activeProduct) {
    galleryImages.push(activeProduct.image);
    if (activeProduct.colorOptions) {
      activeProduct.colorOptions.forEach(opt => {
        if (opt.image && !galleryImages.includes(opt.image)) {
          galleryImages.push(opt.image);
        }
      });
    }
  }

  const safeGalleryIndex = galleryImages.length > 0 ? galleryIndex % galleryImages.length : 0;

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

  // Extract product number from SKU
  const productNumber = activeProduct?.sku 
    ? activeProduct.sku.split('-').pop()?.replace(/\D/g, '').padStart(3, '0') || '001'
    : '001';

  // Sizes - use admin-configured sizes, fallback to product sizes
  const sizes = designSettings.sidebarSizes?.length > 0 
    ? designSettings.sidebarSizes 
    : (activeProduct?.sizes || ['S', 'M', 'L', 'XL']);

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

      {/* Center Zone: Product Card + Sizes */}
      <div className="flex-1 flex flex-col justify-center gap-4">
        {/* Product Info Card */}
        {designSettings.showSidebarProductCard && activeProduct && (
          <div className="sidebar-product-card">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-foreground/80 flex items-center justify-center bevel-corners-sm">
                <Play className="h-3 w-3 text-background fill-background" />
              </div>
              <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-foreground/60">
                {designSettings.sidebarBrandName || 'LVTK6'}
              </span>
            </div>
            <h3 className="font-bold text-base uppercase tracking-wider text-foreground mb-1">
              {designSettings.sidebarProductTitle || activeProduct.name}
            </h3>
            <p className="font-mono text-[11px] text-foreground/50 leading-relaxed line-clamp-2">
              {designSettings.sidebarProductDescription || activeProduct.subtitle || activeProduct.description?.slice(0, 80) || ''}
            </p>
          </div>
        )}

        {/* Size Selectors */}
        {designSettings.showSidebarSizes && (
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => (
              <div key={size} className="sidebar-size-badge">
                <span className="font-mono text-[10px] tracking-wider text-foreground/60">Size</span>
                <span className="font-bold text-xs uppercase text-foreground">{size}</span>
              </div>
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

      {/* Bottom Zone: HUD Buttons + Gallery + Info */}
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

        {/* Mini Gallery */}
        {designSettings.showSidebarGallery && galleryImages.length > 0 && (
          <div className="sidebar-gallery">
            <div className="relative w-full aspect-[4/3] overflow-hidden bevel-corners-sm">
              <img 
                src={galleryImages[safeGalleryIndex]} 
                alt="Preview" 
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
