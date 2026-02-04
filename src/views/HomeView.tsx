import { HeroSlider } from '@/components/home/HeroSlider';
import { CategoryGrid } from '@/components/home/CategoryGrid';
import { ProductSections } from '@/components/home/ProductSections';
import { HUDStats, HUDUnitID, HUDLogo } from '@/components/hud/HUDOverlays';

export function HomeView() {
  return (
    <div className="relative">
      {/* HUD Overlays - positioned over the hero */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <HUDLogo className="pointer-events-auto" />
        <HUDStats className="pointer-events-auto hidden lg:block" />
        <HUDUnitID className="pointer-events-auto hidden lg:block" />
      </div>
      
      {/* Hero Slider */}
      <HeroSlider />
      
      {/* Categories */}
      <CategoryGrid />
      
      {/* Product Sections */}
      <ProductSections />
    </div>
  );
}
