import { productInCategory } from '@/lib/productCategories';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useQuickAdd } from '@/hooks/useQuickAdd';
import { ProductGrid } from '@/components/products/ProductCard';
import { InlineEditable } from '@/components/visual-editor/InlineEditable';
import { useVisualEditor } from '@/components/visual-editor/VisualEditorProvider';
import { excludeMarketplaceProducts } from '@/lib/shopVisibility';

export function ProductSections() {
  const { designSettings, updateDesignSettings, products, navigateToCategory, language } = useApp();
  const navigate = useNavigate();
  const { requestAdd, quickAddDialog } = useQuickAdd();
  const { setIsDirty } = useVisualEditor();
  const { homeSections } = designSettings;

  const shopProducts = excludeMarketplaceProducts(products);
  const byTag = (tag: string) => shopProducts.filter(p => p.tags?.includes(tag));

  const featuredTagged = byTag('featured');
  const newTagged = byTag('new');
  const topTagged = byTag('top');
  const trendingTagged = byTag('trending');
  const styleTagged = byTag('style');
  const promoTagged = byTag('promo');

  const sectionProducts: Record<string, typeof products> = {
    featured: featuredTagged.length > 0 ? featuredTagged.slice(0, 8) : shopProducts.slice(0, 4),
    new: newTagged.length > 0 ? newTagged.slice(0, 8) : shopProducts.slice(0, 4),
    top: topTagged.length > 0 ? topTagged.slice(0, 8) : shopProducts.slice(0, 4),
    trending: trendingTagged.length > 0 ? trendingTagged.slice(0, 8) : shopProducts.filter(p => p.stock > 10).slice(0, 4),
    style: styleTagged.length > 0 ? styleTagged.slice(0, 8) : shopProducts.filter(p => productInCategory(p, 'Homme')).slice(0, 4),
    promo: promoTagged.length > 0 ? promoTagged.slice(0, 8) : shopProducts.filter(p => p.salePrice).slice(0, 4),
  };

  // Manual curation from the admin wins over the automatic tag logic.
  const curated = designSettings.homeSectionProducts || {};
  for (const [sectionId, ids] of Object.entries(curated)) {
    if (!Array.isArray(ids) || ids.length === 0) continue;
    const ordered = ids
      .map(id => shopProducts.find(p => p.id === id))
      .filter((p): p is typeof products[0] => Boolean(p))
      .slice(0, 8);
    if (ordered.length > 0) sectionProducts[sectionId] = ordered;
  }


  const visibleSections = homeSections.filter(s => s.isVisible);

  // La taille est demandée avant l'ajout (cf. `useQuickAdd`).
  const handleAddToCart = (product: typeof products[0]) => {
    void requestAdd(product);
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
                    <InlineEditable
                      fieldKey={`section-title-${section.id}`}
                      value={section.title}
                      onChange={(v) => {
                        const next = designSettings.homeSections.map(s =>
                          s.id === section.id ? { ...s, title: v } : s
                        );
                        updateDesignSettings({ homeSections: next });
                        setIsDirty(true);
                      }}
                      as="span"
                      className="text-2xl font-bold tracking-tight"
                    />
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
                onNavigate={(id, color) => navigate(`/boutique/${id}${color ? `?color=${encodeURIComponent(color)}` : ''}`)}
                onAddToCart={handleAddToCart}
              />
            </div>
          </section>
        );
      })}

      {quickAddDialog}
    </div>
  );
}
