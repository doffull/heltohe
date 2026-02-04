import { useState } from 'react';
import { Filter, Grid, List, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { ProductGrid } from '@/components/products/ProductCard';
import { Input } from '@/components/ui/input';

export function ShopView() {
  const { products, currentCategory, setCurrentCategory, navigateToProduct, language } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const categories = ['Tout', 'Homme', 'Femme', 'Enfant'];
  
  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesCategory = currentCategory === 'Tout' || product.category === currentCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.subtitle?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  
  return (
    <div className="min-h-screen py-8">
      {/* Header */}
      <div className="px-6 lg:px-12 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="hud-text text-xs text-primary tracking-[0.3em] mb-2">
              // {language === 'FR' ? 'CATALOGUE' : 'CATALOG'}
            </h1>
            <h2 className="text-3xl font-bold">
              {language === 'FR' ? 'BOUTIQUE' : 'SHOP'}
            </h2>
          </div>
          
          {/* Search */}
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={language === 'FR' ? 'Rechercher...' : 'Search...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/50 border-border/30 hud-text text-sm chamfer-hud-sm"
            />
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-primary/50 to-transparent w-full mt-4" />
      </div>
      
      {/* Filters & View Toggle */}
      <div className="px-6 lg:px-12 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Category filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground mr-2" />
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setCurrentCategory(category)}
                className={cn(
                  "px-4 py-2 hud-text text-xs tracking-wider transition-all duration-200",
                  "border chamfer-hud-sm",
                  currentCategory === category
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/30 text-muted-foreground border-border/30 hover:border-primary/50 hover:text-foreground"
                )}
              >
                {category.toUpperCase()}
              </button>
            ))}
          </div>
          
          {/* View toggle */}
          <div className="flex items-center gap-2 bg-secondary/30 p-1 chamfer-hud-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 transition-colors",
                viewMode === 'grid' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 transition-colors",
                viewMode === 'list' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Results count */}
      <div className="px-6 lg:px-12 mb-6">
        <p className="hud-text text-xs text-muted-foreground">
          {filteredProducts.length} {language === 'FR' ? 'PRODUITS TROUVÉS' : 'PRODUCTS FOUND'}
        </p>
      </div>
      
      {/* Products */}
      <div className="px-6 lg:px-12">
        {filteredProducts.length > 0 ? (
          <ProductGrid 
            products={filteredProducts}
            onProductClick={navigateToProduct}
          />
        ) : (
          <div className="text-center py-16">
            <p className="hud-text text-muted-foreground">
              {language === 'FR' ? 'Aucun produit trouvé' : 'No products found'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
