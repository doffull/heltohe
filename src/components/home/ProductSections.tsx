import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/hooks/use-toast';
import { ProductGrid } from '@/components/products/ProductCard';

export function ProductSections() {
  const { designSettings, products, navigateToProduct, navigateToCategory, language } = useApp();
  const { addItem } = useCart();
  const { toast } = useToast();
  const { homeSections } = designSettings;

  const byTag = (tag: string) => products.filter(p => p.tags?.includes(tag));

  const topTagged = byTag('top');
  const trendingTagged = byTag('trending');
  const styleTagged = byTag('style');
  const promoTagged = byTag('promo');

  const sectionProducts: Record<string, typeof products> = {
    top: topTagged.length > 0 ? topTagged.slice(0, 8) : products.slice(0, 4),
    trending: trendingTagged.length > 0 ? trendingTagged.slice(0, 8) : products.filter(p => p.stock > 10).slice(0, 4),
    style: styleTagged.length > 0 ? styleTagged.slice(0, 8) : products.filter(p => p.category === 'Homme').slice(0, 4),
    promo: promoTagged.length > 0 ? promoTagged.slice(0, 8) : products.filter(p => p.salePrice).slice(0, 4),
  };

  const visibleSections = homeSections.filter(s => s.isVisible);

  const handleAddToCart = async (product: typeof products[0]) => {
    await addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      salePrice: product.salePrice,
      image: product.image,
      quantity: 1,
    });
    toast({
      title: 'Ajouté au panier',
      description: `${product.name} a été ajouté`,
    });
  };

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
                <button
                  className="hud-text text-xs text-muted-foreground hover:text-primary transition-colors chamfer-hud-sm border border-border/30 px-4 py-2 hover:border-primary/30"
                  onClick={() => navigateToCategory('Tout')}
                >
                  {language === 'FR' ? 'VOIR TOUT' : 'VIEW ALL'}
                </button>
              </div>
              <div className="h-px bg-gradient-to-r from-primary/50 to-transparent w-full mt-4" />
            </div>

            <div className="px-6 lg:px-12">
              <ProductGrid
                products={sectionItems}
                onProductClick={navigateToProduct}
                onAddToCart={handleAddToCart}
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}
