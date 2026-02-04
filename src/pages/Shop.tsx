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
  LayoutList,
  Heart,
  SlidersHorizontal
} from 'lucide-react';

const CATEGORIES = ['All', 'Jackets', 'Pants', 'Vests', 'Accessories'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name', label: 'Name A-Z' },
];

export default function Shop() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { data: products = [], isLoading } = useProducts();
  const { addItem } = useCart();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All');
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
    if (selectedCategory !== 'All') {
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
      title: 'Added to cart',
      description: `${product.name} has been added to your cart`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold uppercase tracking-tight mb-4">
            Shop
          </h1>
          <p className="text-muted-foreground">
            {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} available
          </p>
        </div>

        {/* Filters Bar */}
        <div className="bg-secondary/50 p-6 mb-8 bevel-corners">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-background border-0"
              />
            </div>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px] h-12 bg-background border-0">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] h-12 bg-background border-0">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex border border-border">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                className="rounded-none h-12 w-12"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                className="rounded-none h-12 w-12"
                onClick={() => setViewMode('list')}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-2 mt-6">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className="uppercase tracking-wider text-xs"
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Products Grid/List */}
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
              <h2 className="text-xl font-bold uppercase mb-2">No products found</h2>
              <p className="text-muted-foreground mb-6">
                Try adjusting your search or filter criteria
              </p>
              <Button onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}>
                Reset Filters
              </Button>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {filteredProducts.map((product, index) => (
              <div 
                key={product.id}
                className="group bevel-corners bg-card overflow-hidden border border-border hover:border-foreground transition-all duration-300 shadow-hmp hover:shadow-hmp-lg animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Image */}
                <div 
                  className="relative aspect-[3/4] overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/boutique/${product.id}`)}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  
                  {/* Sale Badge */}
                  {product.salePrice && (
                    <div className="absolute top-4 left-4 bg-foreground text-background px-3 py-1 text-xs font-bold uppercase">
                      Sale
                    </div>
                  )}
                  
                  {/* Stock Badge */}
                  {product.stock <= 5 && product.stock > 0 && (
                    <div className="absolute top-4 right-4 bg-destructive text-destructive-foreground px-3 py-1 text-xs uppercase">
                      Low Stock
                    </div>
                  )}

                  {/* Hover Overlay - Sizes */}
                  <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-xs uppercase tracking-wider mb-3">Available Sizes</p>
                      <div className="flex gap-1.5 justify-center">
                        {['XS', 'S', 'M', 'L', 'XL'].map((size) => (
                          <span key={size} className="w-8 h-8 border border-foreground flex items-center justify-center text-xs font-medium">
                            {size}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Quick Wishlist */}
                  <button className="absolute bottom-4 right-4 w-10 h-10 bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background">
                    <Heart className="h-5 w-5" />
                  </button>
                </div>

                {/* Info */}
                <div className="p-5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{product.category}</p>
                  <h3 
                    className="font-bold uppercase tracking-tight line-clamp-1 cursor-pointer hover:text-muted-foreground transition-colors"
                    onClick={() => navigate(`/boutique/${product.id}`)}
                  >
                    {product.name}
                  </h3>
                  
                  <div className="flex items-center gap-3 mt-3">
                    {product.salePrice ? (
                      <>
                        <span className="text-lg font-bold">
                          {product.salePrice}€
                        </span>
                        <span className="text-sm line-through text-muted-foreground">
                          {product.price}€
                        </span>
                      </>
                    ) : (
                      <span className="text-lg font-bold">{product.price}€</span>
                    )}
                  </div>
                </div>

                {/* Add to Cart - Full width */}
                <button
                  className="product-card-footer"
                  onClick={() => handleAddToCart(product)}
                  disabled={product.stock === 0}
                >
                  {product.stock === 0 ? 'Sold Out' : 'Add to Cart'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          // List View
          <div className="space-y-4">
            {filteredProducts.map((product, index) => (
              <div 
                key={product.id}
                className="bevel-corners-sm bg-card p-6 flex gap-8 border border-border hover:border-foreground transition-all animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div 
                  className="w-40 h-48 flex-shrink-0 bevel-corners-sm overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/boutique/${product.id}`)}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{product.category}</p>
                    <h3 
                      className="font-bold text-xl uppercase tracking-tight cursor-pointer hover:text-muted-foreground transition-colors"
                      onClick={() => navigate(`/boutique/${product.id}`)}
                    >
                      {product.name}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                      {product.description}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div>
                      {product.salePrice ? (
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold">
                            {product.salePrice}€
                          </span>
                          <span className="text-base line-through text-muted-foreground">
                            {product.price}€
                          </span>
                        </div>
                      ) : (
                        <span className="text-2xl font-bold">{product.price}€</span>
                      )}
                    </div>
                    
                    <div className="flex gap-3">
                      <Button variant="outline" size="icon" className="h-12 w-12">
                        <Heart className="h-5 w-5" />
                      </Button>
                      <Button
                        className="h-12 px-8 uppercase tracking-wider"
                        onClick={() => handleAddToCart(product)}
                        disabled={product.stock === 0}
                      >
                        Add to Cart
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
