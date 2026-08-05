import { forwardRef, useState } from 'react';
import { LucideIcon, Shield, Package, Layers, Move } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { MannequinHotspotConfig, MarkerType } from '@/types';
import { useShopProducts as useProducts } from '@/hooks/useShopProducts';

const ICON_MAP: Record<string, LucideIcon> = {
  Shield,
  Package,
  Layers,
  Move,
};

function getMediaType(url: string): 'video' | 'image' {
  const ext = url.split('.').pop()?.toLowerCase() || '';
  if (['mp4', 'webm', 'ogg'].includes(ext)) return 'video';
  return 'image';
}

const MarkerShape = forwardRef<HTMLDivElement, { type?: MarkerType }>(function MarkerShape({ type = 'dot' }, _ref) {
  switch (type) {
    case 'cross':
      return (
        <svg className="w-full h-full" viewBox="0 0 12 12">
          <line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" strokeWidth="2" />
          <line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case 'diamond':
      return (
        <svg className="w-full h-full" viewBox="0 0 12 12">
          <polygon points="6,1 11,6 6,11 1,6" fill="currentColor" />
        </svg>
      );
    case 'square':
      return (
        <svg className="w-full h-full" viewBox="0 0 12 12">
          <rect x="1" y="1" width="10" height="10" fill="currentColor" />
        </svg>
      );
    case 'ring':
      return (
        <svg className="w-full h-full" viewBox="0 0 12 12">
          <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case 'dot':
    default:
      return <div className="hotspot-point" />;
  }
});

interface HotspotProps {
  hotspot: MannequinHotspotConfig;
  products?: any[];
}

function Hotspot({ hotspot, products }: HotspotProps) {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = ICON_MAP[hotspot.icon] || Shield;

  const xNum = parseInt(hotspot.x);
  const tooltipPosition = xNum > 50 ? 'right' : 'left';
  const hasMedia = !!hotspot.media;
  const mediaType = hotspot.mediaType || (hotspot.media ? getMediaType(hotspot.media) : 'image');

  // Resolve product data if contentMode === 'product'
  const linkedProduct = hotspot.contentMode === 'product' && hotspot.productId && products
    ? products.find(p => p.id === hotspot.productId)
    : null;

  const displayName = linkedProduct?.name || hotspot.productName || hotspot.label;
  const displayDetails = linkedProduct?.subtitle || hotspot.details;
  const displayPrice = linkedProduct?.price || hotspot.productPrice;
  const displaySalePrice = linkedProduct?.salePrice || linkedProduct?.sale_price || hotspot.productSalePrice;
  const displayImage = linkedProduct?.image || hotspot.media;
  const displaySizes = linkedProduct?.sizes || hotspot.productSizes;
  const isProductMode = hotspot.contentMode === 'product' || hotspot.contentMode === 'manual';

  return (
    <div
      className="mannequin-hotspot"
      style={{ left: hotspot.x, top: hotspot.y }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {hotspot.markerType && hotspot.markerType !== 'dot' ? (
        <div className="w-full h-full text-foreground/80 hotspot-marker-custom">
          <MarkerShape type={hotspot.markerType} />
        </div>
      ) : (
        <div className="hotspot-point" />
      )}
      
      <div 
        className={`hotspot-tooltip ${tooltipPosition} ${isHovered ? 'visible' : ''}`}
        style={isProductMode || hasMedia ? { minWidth: '220px' } : undefined}
      >
        {/* Media / Product image preview */}
        {displayImage && isHovered && (
          <div className="mb-2 rounded overflow-hidden border border-border/30" style={{ width: '200px', height: '130px' }}>
            {mediaType === 'video' && hotspot.media ? (
              <video
                src={hotspot.media}
                className="w-full h-full object-cover"
                autoPlay muted loop playsInline
              />
            ) : (
              <img
                src={displayImage}
                alt={displayName}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
              />
            )}
          </div>
        )}

        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-3 h-3" />
          <span className="font-bold tracking-wider">{displayName}</span>
        </div>
        <p className="text-foreground/70">{displayDetails}</p>

        {/* Price info */}
        {displayPrice != null && (
          <div className="mt-2 flex items-center gap-2">
            {displaySalePrice ? (
              <>
                <span className="font-bold">{displaySalePrice}€</span>
                <span className="line-through text-foreground/50 text-[10px]">{displayPrice}€</span>
              </>
            ) : (
              <span className="font-bold">{displayPrice}€</span>
            )}
          </div>
        )}

        {/* Sizes */}
        {displaySizes && displaySizes.length > 0 && (
          <div className="mt-1 flex gap-1 flex-wrap">
            {displaySizes.map(s => (
              <span key={s} className="text-[9px] border border-foreground/30 px-1 rounded-sm">{s}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function MannequinHotspots() {
  const { designSettings } = useApp();
  const { data: products = [] } = useProducts();

  // Respect the global "showOverlays" toggle
  if (!designSettings.showOverlays) return null;

  // Use only persisted hotspots — no hardcoded fallback
  const hotspots = (designSettings.mannequinHotspots || []).filter(h => h.enabled !== false);

  if (hotspots.length === 0) return null;

  return (
    <>
      {hotspots.map((hotspot) => (
        <Hotspot key={hotspot.id} hotspot={hotspot} products={products} />
      ))}
    </>
  );
}
