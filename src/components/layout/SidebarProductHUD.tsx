import { forwardRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useSidebarOptional } from '@/context/SidebarContext';
import { Product } from '@/types';
import { Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { StatBar } from './StatBar';
import { excludeMarketplaceProducts } from '@/lib/shopVisibility';

const DEFAULT_STATS = [
  { label: 'Durabilité', value: 85 },
  { label: 'Rapport qualité/prix', value: 45 },
  { label: 'Tendance', value: 92 },
];

const ProductSlide = forwardRef<HTMLDivElement, { product: Product; designSettings: any }>(function ProductSlide({ product, designSettings }, _ref) {
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

  const sizes = designSettings.sidebarSizes?.length > 0
    ? designSettings.sidebarSizes
    : (product.sizes || ['S', 'M', 'L', 'XL']);

  return (
    <div className="flex flex-col gap-4">
      {/* Product Info Card */}
      {designSettings.showSidebarProductCard && (
        <div className="sidebar-product-card">
          {designSettings.sidebarBrandName && (
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-foreground/80 flex items-center justify-center bevel-corners-sm">
                <Play className="h-3 w-3 text-background fill-background" />
              </div>
              <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-foreground/60">
                {designSettings.sidebarBrandName}
              </span>
            </div>
          )}
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
                <span className="text-[10px] text-foreground/40">TTC</span>
                <span className="text-xs text-foreground/40 line-through">{product.price}€</span>
              </>
            ) : (
              <>
                <span className="font-bold text-sm text-foreground">{product.price}€</span>
                <span className="text-[10px] text-foreground/40">TTC</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Size Selectors */}
      {designSettings.showSidebarSizes && (
        <div className="flex flex-wrap gap-2">
          {sizes.map((size: string) => (
            <div key={size} className="sidebar-size-badge">
              <span className="font-mono text-[10px] tracking-wider text-foreground/60">Taille</span>
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
                Aperçu
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
});

function BrandBlock({ designSettings }: { designSettings: any }) {
  const brandName = designSettings.sidebarBrandName;
  const brandSubtitle = designSettings.sidebarBrandSubtitle;

  if (!brandName && !brandSubtitle) return null;

  return (
    <div>
      {brandName && (
        <h2 className="font-bold text-lg tracking-[0.15em] uppercase text-foreground">
          {brandName}
        </h2>
      )}
      {brandSubtitle && (
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/50">
          {brandSubtitle}
        </span>
      )}
    </div>
  );
}

export function SidebarProductHUD() {
  const { designSettings, selectedProduct, products: allProducts } = useApp();
  const products = excludeMarketplaceProducts(allProducts);
  const sidebarContext = useSidebarOptional();
  const navigate = useNavigate();

  // If a product is hovered, show it instead of the first product
  const hoveredProduct = sidebarContext?.hoveredProduct;
  const activeProduct: Product | null = hoveredProduct || selectedProduct || products[0] || null;

  const brandPosition = (designSettings as any).sidebarBrandPosition ?? 'top';

  const productNumber = activeProduct?.sku
    ? activeProduct.sku.split('-').pop()?.replace(/\D/g, '').padStart(3, '0') || '001'
    : '001';

  // Stats from admin settings or context
  const stats = designSettings.stats && designSettings.stats.length > 0
    ? designSettings.stats.map(s => ({ label: s.label, value: s.value }))
    : sidebarContext
      ? [
          { label: 'Durabilité', value: sidebarContext.currentStats.durability },
          { label: 'Rapport qualité/prix', value: sidebarContext.currentStats.price },
          { label: 'Tendance', value: sidebarContext.currentStats.fashion },
        ]
      : DEFAULT_STATS;

  return (
    <div className="relative z-20 h-full flex flex-col justify-between p-6 pt-28">
      {/* Top Zone */}
      <div className="flex items-start justify-between">
        {brandPosition === 'top' && <BrandBlock designSettings={designSettings} />}
        {brandPosition !== 'top' && <div />}

        {designSettings.showSidebarProductNumber && (
          <div className="sidebar-product-number">
            <span className="font-mono text-sm font-bold text-background">
              {productNumber}
            </span>
          </div>
        )}
      </div>

      {/* Center Zone: Product + optional brand */}
      <div className="flex-1 flex flex-col justify-center gap-4">
        {brandPosition === 'center' && <BrandBlock designSettings={designSettings} />}

        {activeProduct && (
          <ProductSlide product={activeProduct} designSettings={designSettings} />
        )}

        {/* Stats */}
        {designSettings.showSidebarStats && (
          <div className="mt-4">
            <div className="mb-3">
              <h3 className="font-mono text-[11px] tracking-[0.2em] uppercase text-foreground/70 mb-1">
                Caractéristiques
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

      {/* Bottom Zone: brand (if bottom), HUD Buttons + Info */}
      <div className="space-y-3">
        {brandPosition === 'bottom' && <BrandBlock designSettings={designSettings} />}

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
          {designSettings.sidebarInfoText ? (
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/40">
              {designSettings.sidebarInfoText}
            </span>
          ) : <span />}
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
