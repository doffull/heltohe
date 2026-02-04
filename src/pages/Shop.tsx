import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useProducts } from '@/hooks/useProducts';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Filter, 
  Grid3X3, 
  List,
  ShoppingCart,
  Heart,
  ChevronRight,
  SlidersHorizontal
} from 'lucide-react';

const CATEGORIES = ['Tout', 'Vestes', 'Pantalons', 'Gilets', 'Accessoires'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Plus récents' },
  { value: 'price-asc', label: 'Prix croissant' },
  { value: 'price-desc', label: 'Prix décroissant' },
  { value: 'name', label: 'Nom A-Z' },
];

export default function Shop() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { data: products = [], isLoading } = useProducts();
  const { addItem } = useCart();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'Tout');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory !== 'Tout') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Sort
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
        // newest - keep default order
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
      description: `${product.name} a été ajouté à votre panier`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold hud-text mb-2">
            ÉQUIPEMENT TACTIQUE
          </h1>
          <p className="text-muted-foreground">
            {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''} disponible{filteredProducts.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Filters Bar */}
        <div className="chamfer-hud bg-card/50 p-4 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex border border-border rounded">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                className="rounded-r-none"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                className="rounded-l-none"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className="text-xs"
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Products Grid/List */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="chamfer-hud bg-card/30 animate-pulse h-80" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="chamfer-hud bg-card/30 inline-block p-12">
              <Search className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-bold mb-2">Aucun produit trouvé</h2>
              <p className="text-muted-foreground mb-4">
                Essayez de modifier vos filtres de recherche
              </p>
              <Button onClick={() => {
                setSearchQuery('');
                setSelectedCategory('Tout');
              }}>
                Réinitialiser les filtres
              </Button>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div 
                key={product.id}
                className="group chamfer-hud bg-card/50 overflow-hidden hover:bg-card/70 transition-all duration-300"
              >
                {/* Image */}
                <div 
                  className="relative aspect-square overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/boutique/${product.id}`)}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  
                  {/* Sale Badge */}
                  {product.salePrice && (
                    <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground px-2 py-1 text-xs font-bold">
                      PROMO
                    </div>
                  )}
                  
                  {/* Stock Badge */}
                  {product.stock <= 5 && product.stock > 0 && (
                    <div className="absolute top-2 right-2 bg-warning/90 text-warning-foreground px-2 py-1 text-xs">
                      Stock limité
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="secondary" className="h-8 w-8">
                      <Heart className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">{product.category}</p>
                  <h3 
                    className="font-bold text-sm hud-text line-clamp-1 cursor-pointer hover:text-primary"
                    onClick={() => navigate(`/boutique/${product.id}`)}
                  >
                    {product.name}
                  </h3>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div>
                      {product.salePrice ? (
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-primary">
                            {product.salePrice}€
                          </span>
                          <span className="text-sm line-through text-muted-foreground">
                            {product.price}€
                          </span>
                        </div>
                      ) : (
                        <span className="text-lg font-bold">{product.price}€</span>
                      )}
                    </div>
                    
                    <Button
                      size="icon"
                      className="h-8 w-8 chamfer-hud-sm"
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock === 0}
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // List View
          <div className="space-y-4">
            {filteredProducts.map((product) => (
              <div 
                key={product.id}
                className="chamfer-hud bg-card/50 p-4 flex gap-6 hover:bg-card/70 transition-all"
              >
                <div 
                  className="w-32 h-32 flex-shrink-0 chamfer-hud-sm overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/boutique/${product.id}`)}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">{product.category}</p>
                  <h3 
                    className="font-bold text-lg hud-text cursor-pointer hover:text-primary"
                    onClick={() => navigate(`/boutique/${product.id}`)}
                  >
                    {product.name}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {product.description}
                  </p>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div>
                      {product.salePrice ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-primary">
                            {product.salePrice}€
                          </span>
                          <span className="text-sm line-through text-muted-foreground">
                            {product.price}€
                          </span>
                        </div>
                      ) : (
                        <span className="text-xl font-bold">{product.price}€</span>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon">
                        <Heart className="h-4 w-4" />
                      </Button>
                      <Button
                        className="chamfer-hud-sm"
                        onClick={() => handleAddToCart(product)}
                        disabled={product.stock === 0}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Ajouter
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
