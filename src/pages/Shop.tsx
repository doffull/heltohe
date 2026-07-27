import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useDesignSettings } from '@/hooks/useDesignSettings';
import { useCart } from '@/context/CartContext';
import { useSidebarOptional } from '@/context/SidebarContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Product } from '@/types';
import {
  Search,
  Filter,
  Grid3X3,
  LayoutList,
  Heart,
  SlidersHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { ProductCard } from '@/components/products/ProductCard';

type LayoutId = 'classic' | 'compact' | 'editorial' | 'gallery' | 'masonry' | 'minimal';

function getLayoutClasses(layout: LayoutId): { wrapper: string; item?: (i: number) => string } {
  switch (layout) {
    case 'compact':
      return { wrapper: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 lg:gap-3' };
    case 'editorial':
      return {
        wrapper: 'grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6',
        item: (i) => (i === 0 ? 'col-span-2 md:row-span-2' : ''),
      };
    case 'gallery':
      return { wrapper: 'grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-10' };
    case 'masonry':
      return { wrapper: 'columns-2 md:columns-3 gap-4 lg:gap-6 [&>*]:mb-4 lg:[&>*]:mb-6 [&>*]:break-inside-avoid' };
    case 'minimal':
      return { wrapper: 'grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4' };
    case 'classic':
    default:
      return { wrapper: 'grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6' };
  }
}


const SORT_OPTIONS = [
  { value: 'newest', label: 'Nouveautés' },
  { value: 'price-asc', label: 'Prix croissant' },
  { value: 'price-desc', label: 'Prix décroissant' },
  { value: 'name', label: 'Nom A-Z' },
];

export default function Shop({ categoryFromSlug, hideHeader }: { categoryFromSlug?: string; hideHeader?: boolean }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { data: products = [], isLoading } = useProducts();
  const { addItem } = useCart();
  const sidebarContext = useSidebarOptional();
  const { data: dbCategories = [] } = useCategories();
  const { data: designSettings } = useDesignSettings();

  // Build category list from DB
  const rootCategories = dbCategories.filter(c => !c.parentId);
  const CATEGORIES = ['Tout', ...rootCategories.map(c => c.title)];

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(categoryFromSlug || searchParams.get('category') || 'Tout');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');

  // Sync category from slug prop or URL params when they change
  useEffect(() => {
    if (categoryFromSlug) {
      setSelectedCategory(categoryFromSlug);
      setSelectedSubCategory(null);
    } else {
      const urlCategory = searchParams.get('category') || 'Tout';
      setSelectedCategory(urlCategory);
      setSelectedSubCategory(null);
    }
  }, [searchParams, categoryFromSlug]);

  // SEO: Set meta tags for category pages
  const activeCategory = dbCategories.find(c => c.title === selectedCategory);
  useEffect(() => {
    if (activeCategory?.metaTitle) {
      document.title = activeCategory.metaTitle;
    } else if (selectedCategory !== 'Tout') {
      document.title = `${selectedCategory} — Boutique`;
    } else {
      document.title = 'Boutique';
    }
    const metaDesc = document.querySelector('meta[name="description"]');
    if (activeCategory?.metaDescription) {
      if (metaDesc) metaDesc.setAttribute('content', activeCategory.metaDescription);
      else {
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = activeCategory.metaDescription;
        document.head.appendChild(meta);
      }
    }
    return () => { document.title = 'LVTK6 Concept'; };
  }, [activeCategory, selectedCategory]);

  // Get sub-categories for selected category
  const subCategories = useMemo(() => {
    if (selectedCategory === 'Tout') return [];
    const parent = rootCategories.find(c => c.title === selectedCategory);
    if (!parent) return [];
    return dbCategories.filter(c => c.parentId === parent.id);
  }, [selectedCategory, dbCategories, rootCategories]);

  const handleProductHover = (product: Product) => {
    sidebarContext?.setHoveredProduct(product);
  };
  const handleProductLeave = () => {
    sidebarContext?.setHoveredProduct(null);
  };

  const filteredProducts = useMemo(() => {
    let filtered = [...products];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
    }
    if (selectedCategory !== 'Tout') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    switch (sortBy) {
      case 'price-asc':
        filtered.sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price));
        break;
      case 'price-desc':
        filtered.sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price));
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }
    return filtered;
  }, [products, searchQuery, selectedCategory, sortBy]);

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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 lg:py-12">
        {/* Header — hidden when a CategoryPageRouter provides its own hero */}
        {!hideHeader && (
          <div className="mb-6 lg:mb-10">
            <p className="font-mono text-[10px] lg:text-xs tracking-[0.3em] text-muted-foreground mb-2">// CATALOGUE</p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-tight mb-2">Boutique</h1>
            <p className="text-sm text-muted-foreground">
              {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''} disponible{filteredProducts.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Product count when header is hidden */}
        {hideHeader && (
          <p className="text-sm text-muted-foreground mb-4">
            {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''} disponible{filteredProducts.length !== 1 ? 's' : ''}
          </p>
        )}

        {/* Filters Bar */}
        <div className="bg-secondary/50 p-4 lg:p-6 mb-6 lg:mb-8 bevel-corners">
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 lg:gap-4">
            <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-background border-0"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[180px] h-12 bg-background border-0">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[180px] h-12 bg-background border-0">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex border border-border">
              <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" className="rounded-none h-12 w-12" onClick={() => setViewMode('grid')} aria-label="Affichage en grille" aria-pressed={viewMode === 'grid'}>
                <Grid3X3 className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" className="rounded-none h-12 w-12" onClick={() => setViewMode('list')} aria-label="Affichage en liste" aria-pressed={viewMode === 'list'}>
                <LayoutList className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-4 lg:mt-6">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setSelectedCategory(cat); setSelectedSubCategory(null); }}
                className={cn(
                  "uppercase tracking-wider text-[10px] sm:text-xs px-2.5 py-1.5 sm:px-3 sm:py-2 h-auto",
                  selectedCategory !== cat && "bg-secondary/40 border-border/40 text-muted-foreground hover:bg-secondary/70"
                )}
              >
                {cat}
              </Button>
            ))}
          </div>
          {/* Sub-category filters */}
          {subCategories.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              <Button
                variant={selectedSubCategory === null ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedSubCategory(null)}
                className="text-xs"
              >
                Tout {selectedCategory}
              </Button>
              {subCategories.map((sub) => (
                <Button
                  key={sub.id}
                  variant={selectedSubCategory === sub.title ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedSubCategory(sub.title)}
                  className="text-xs"
                >
                  {sub.title}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Products */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bevel-corners bg-secondary/30 animate-pulse aspect-[3/4]" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="bevel-corners bg-secondary/30 inline-block p-12">
              <Search className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-bold uppercase mb-2">Aucun produit trouvé</h2>
              <p className="text-muted-foreground mb-6">Essayez d'ajuster vos filtres</p>
              <Button onClick={() => { setSearchQuery(''); setSelectedCategory('Tout'); }}>
                Réinitialiser
              </Button>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          (() => {
            const layoutId = ((designSettings as any)?.productGridLayout ?? 'classic') as LayoutId;
            const { wrapper, item } = getLayoutClasses(layoutId);
            return (
              <div className={wrapper}>
                {filteredProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className={cn('animate-fade-in', item?.(index))}
                    style={{ animationDelay: `${index * 50}ms` }}
                    onMouseEnter={() => handleProductHover(product)}
                    onMouseLeave={handleProductLeave}
                  >
                    <ProductCard
                      product={product}
                      onNavigate={(id, color) => navigate(`/boutique/${id}${color ? `?color=${encodeURIComponent(color)}` : ''}`)}
                      onAddToCart={() => handleAddToCart(product)}
                    />
                  </div>
                ))}
              </div>
            );
          })()
        ) : (
          <div className="space-y-4">
            {filteredProducts.map((product, index) => (
              <div
                key={product.id}
                className="bevel-corners-sm bg-card p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-8 border border-border hover:border-foreground transition-all animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
                onMouseEnter={() => handleProductHover(product)}
                onMouseLeave={handleProductLeave}
              >
                <div className="w-full sm:w-40 h-48 flex-shrink-0 bevel-corners-sm overflow-hidden cursor-pointer" onClick={() => navigate(`/boutique/${product.id}`)}>
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{product.category}</p>
                    <h3 className="font-bold text-lg sm:text-xl uppercase tracking-tight cursor-pointer hover:text-muted-foreground transition-colors" onClick={() => navigate(`/boutique/${product.id}`)}>
                      {product.name}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{product.description}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
                    <div>
                      {product.salePrice ? (
                        <div className="flex items-center gap-3">
                          <span className="text-xl sm:text-2xl font-bold">{product.salePrice}€</span>
                          <span className="text-sm sm:text-base line-through text-muted-foreground">{product.price}€</span>
                        </div>
                      ) : (
                        <span className="text-xl sm:text-2xl font-bold">{product.price}€</span>
                      )}
                    </div>
                    <div className="flex gap-2 sm:gap-3">
                      <Button variant="outline" size="icon" className="h-10 w-10 sm:h-12 sm:w-12" aria-label="Ajouter aux favoris"><Heart className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" /></Button>
                      <Button className="h-10 sm:h-12 px-4 sm:px-8 uppercase tracking-wider text-xs sm:text-sm" onClick={() => handleAddToCart(product)} disabled={product.stock === 0}>
                        {product.stock === 0 ? 'Épuisé' : 'Ajouter'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
