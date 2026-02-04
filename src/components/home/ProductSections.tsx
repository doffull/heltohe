import { useApp } from '@/context/AppContext';
import { ProductGrid } from '@/components/products/ProductCard';

export function ProductSections() {
  const { designSettings, products, navigateToProduct, language } = useApp();
  const { homeSections } = designSettings;
  
  // Filter products for different sections
  const topProducts = products.slice(0, 4);
  const trendingProducts = products.filter(p => p.stock > 10).slice(0, 4);
  const styleProducts = products.filter(p => p.category === 'Homme').slice(0, 4);
  const promoProducts = products.filter(p => p.salePrice).slice(0, 4);
  
  const sectionProducts: Record<string, typeof products> = {
    top: topProducts,
    trending: trendingProducts,
    style: styleProducts,
    promo: promoProducts,
  };
  
  const visibleSections = homeSections.filter(s => s.isVisible);
  
  return (
    <div className="space-y-16 py-16">
      {visibleSections.map((section, sectionIndex) => {
        const sectionItems = sectionProducts[section.id] || [];
        if (sectionItems.length === 0) return null;
        
        return (
          <section 
            key={section.id}
            className="animate-fade-in"
            style={{ animationDelay: `${sectionIndex * 200}ms` }}
          >
            <div className="px-6 lg:px-12 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="hud-text text-xs text-primary tracking-[0.3em] mb-2">
                    // {section.id.toUpperCase()}_SECTION
                  </h2>
                  <h3 className="text-2xl font-bold tracking-tight">
                    {section.title}
                  </h3>
                </div>
                <button className="hud-text text-xs text-muted-foreground hover:text-primary transition-colors chamfer-hud-sm border border-border/30 px-4 py-2 hover:border-primary/30">
                  {language === 'FR' ? 'VOIR TOUT' : 'VIEW ALL'}
                </button>
              </div>
              <div className="h-px bg-gradient-to-r from-primary/50 to-transparent w-full mt-4" />
            </div>
            
            <div className="px-6 lg:px-12">
              <ProductGrid 
                products={sectionItems}
                onProductClick={navigateToProduct}
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}
