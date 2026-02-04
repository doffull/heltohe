import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '@/hooks/useProducts';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ChevronRight, ArrowRight } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: products = [] } = useProducts();
  const { addItem } = useCart();
  
  const heroRef = useRef<HTMLDivElement>(null);
  const parallaxLayer1 = useRef<HTMLDivElement>(null);
  const parallaxLayer2 = useRef<HTMLDivElement>(null);
  const parallaxLayer3 = useRef<HTMLDivElement>(null);

  // Multi-layer parallax effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      
      if (parallaxLayer1.current) {
        parallaxLayer1.current.style.transform = `translateY(${scrollY * 0.1}px)`;
      }
      if (parallaxLayer2.current) {
        parallaxLayer2.current.style.transform = `translateY(${scrollY * 0.3}px)`;
      }
      if (parallaxLayer3.current) {
        parallaxLayer3.current.style.transform = `translateY(${scrollY * 0.5}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll reveal animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in');
            entry.target.classList.remove('opacity-0', 'translate-y-8');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('.scroll-reveal');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const featuredProducts = products.slice(0, 3);
  const newArrivals = products.slice(0, 6);

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
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero Section with Multi-Layer Parallax */}
      <section ref={heroRef} className="relative h-screen flex items-center overflow-hidden">
        {/* Background Layer 1 - Grid pattern (slowest) */}
        <div 
          ref={parallaxLayer1}
          className="absolute inset-0 z-0 grid-lines opacity-50"
          style={{ willChange: 'transform' }}
        />

        {/* Background Layer 2 - Geometric shapes (medium) */}
        <div 
          ref={parallaxLayer2}
          className="absolute inset-0 z-10 pointer-events-none"
          style={{ willChange: 'transform' }}
        >
          {/* Floating geometric shapes */}
          <div className="absolute top-20 right-20 w-64 h-64 bg-secondary/50 transform rotate-45" />
          <div className="absolute bottom-32 left-16 w-48 h-48 bg-muted/60 transform rotate-12" />
          <div className="absolute top-1/3 left-1/4 w-32 h-32 border-2 border-border transform -rotate-12" />
        </div>

        {/* Content Layer (fastest) */}
        <div 
          ref={parallaxLayer3}
          className="relative z-20 container mx-auto px-4"
          style={{ willChange: 'transform' }}
        >
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Text content */}
            <div className="space-y-8">
              <div>
                <p className="font-mono text-xs tracking-widest text-muted-foreground mb-4">
                  MODEL 0.1.2
                </p>
                <h1 className="text-6xl md:text-8xl font-bold uppercase leading-none tracking-tight">
                  HELVETICA
                  <br />
                  <span className="text-muted-foreground">-MP</span>
                </h1>
              </div>
              
              <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
                Minimalist design meets functional excellence. Premium quality for the modern individual.
              </p>

              {/* Shop Now Button - Trapezoid style with glow */}
              <Button 
                size="lg" 
                className="trapezoid-btn h-14 px-12 text-base uppercase tracking-wider glow-hover"
                onClick={() => navigate('/boutique')}
              >
                Shop Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            {/* Right side - Model Interface Panel */}
            <div className="hidden lg:block relative">
              <div className="glass p-8 bevel-corners">
                {/* Model indicator */}
                <div className="absolute -top-4 left-8 bg-background px-4 py-2 border border-border">
                  <span className="font-mono text-xs tracking-widest">SYSTEM STATUS</span>
                </div>

                {/* Stats bars */}
                <div className="space-y-6 mt-8">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm uppercase tracking-wider">Durability</span>
                      <span className="font-mono text-xs">92%</span>
                    </div>
                    <div className="stat-bar-segmented">
                      {[...Array(10)].map((_, i) => (
                        <div key={i} className={`stat-segment ${i < 9 ? 'filled' : ''}`} />
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm uppercase tracking-wider">Quality</span>
                      <span className="font-mono text-xs">88%</span>
                    </div>
                    <div className="stat-bar-segmented">
                      {[...Array(10)].map((_, i) => (
                        <div key={i} className={`stat-segment ${i < 9 ? 'filled' : ''}`} />
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm uppercase tracking-wider">Design</span>
                      <span className="font-mono text-xs">95%</span>
                    </div>
                    <div className="stat-bar-segmented">
                      {[...Array(10)].map((_, i) => (
                        <div key={i} className={`stat-segment ${i < 10 ? 'filled' : ''}`} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Size selectors */}
                <div className="flex gap-3 mt-8">
                  <button className="w-12 h-12 bg-primary text-primary-foreground text-sm font-bold">
                    XS
                  </button>
                  <button className="w-12 h-12 bg-secondary text-secondary-foreground text-sm font-bold hover:bg-primary hover:text-primary-foreground transition-colors">
                    S
                  </button>
                  <button className="w-12 h-12 bg-secondary text-secondary-foreground text-sm font-bold hover:bg-primary hover:text-primary-foreground transition-colors">
                    M
                  </button>
                  <button className="w-12 h-12 bg-secondary text-secondary-foreground text-sm font-bold hover:bg-primary hover:text-primary-foreground transition-colors">
                    L
                  </button>
                  <button className="w-12 h-12 bg-primary text-primary-foreground text-sm font-bold">
                    XL
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
          <div className="w-px h-16 bg-border relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1/2 bg-foreground animate-pulse-soft" />
          </div>
        </div>
      </section>

      {/* Featured Products - 3 column grid with beveled cards */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-4xl font-bold uppercase tracking-tight">Featured</h2>
              <p className="text-muted-foreground mt-2">Curated selection</p>
            </div>
            <Button 
              variant="outline" 
              className="hidden md:flex uppercase tracking-wider"
              onClick={() => navigate('/boutique')}
            >
              View All
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {featuredProducts.map((product, index) => (
              <div 
                key={product.id}
                className="scroll-reveal opacity-0 translate-y-8 transition-all duration-700 group bg-background bevel-corners overflow-hidden shadow-hmp hover:shadow-hmp-lg"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                {/* Product Image */}
                <div 
                  className="relative aspect-[3/4] overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/boutique/${product.id}`)}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  
                  {/* Sale badge */}
                  {product.salePrice && (
                    <div className="absolute top-4 left-4 bg-foreground text-background px-3 py-1 text-xs font-bold uppercase">
                      Sale
                    </div>
                  )}

                  {/* Overlay with sizes on hover */}
                  <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-sm uppercase tracking-wider mb-4">Available Sizes</p>
                      <div className="flex gap-2 justify-center">
                        {['XS', 'S', 'M', 'L', 'XL'].map((size) => (
                          <span key={size} className="w-10 h-10 border border-foreground flex items-center justify-center text-xs font-medium">
                            {size}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-6">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    {product.category}
                  </p>
                  <h3 className="text-lg font-bold uppercase tracking-tight line-clamp-1">
                    {product.name}
                  </h3>
                  
                  {/* Price badge aligned left */}
                  <div className="flex items-center gap-3 mt-3">
                    {product.salePrice ? (
                      <>
                        <span className="text-xl font-bold">{product.salePrice}€</span>
                        <span className="text-sm text-muted-foreground line-through">{product.price}€</span>
                      </>
                    ) : (
                      <span className="text-xl font-bold">{product.price}€</span>
                    )}
                  </div>
                </div>

                {/* Add to Cart - Full width footer button */}
                <button
                  className="product-card-footer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart(product);
                  }}
                >
                  Add to Cart
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* New Arrivals - Larger grid */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold uppercase tracking-tight">New Arrivals</h2>
            <p className="text-muted-foreground mt-2">Fresh from the collection</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {newArrivals.map((product, index) => (
              <div 
                key={product.id}
                className="scroll-reveal opacity-0 translate-y-8 transition-all duration-700 group bg-card bevel-corners-sm overflow-hidden border border-border hover:border-foreground"
                style={{ transitionDelay: `${index * 50}ms` }}
              >
                <div 
                  className="relative aspect-square overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/boutique/${product.id}`)}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                
                <div className="p-4">
                  <h3 className="font-bold uppercase text-sm tracking-tight line-clamp-1">{product.name}</h3>
                  <p className="text-muted-foreground font-bold mt-1">{product.salePrice || product.price}€</p>
                </div>

                <button
                  className="product-card-footer text-xs"
                  onClick={() => handleAddToCart(product)}
                >
                  Add to Cart
                </button>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button 
              size="lg"
              variant="outline"
              className="uppercase tracking-wider"
              onClick={() => navigate('/boutique')}
            >
              View All Products
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-24 bg-foreground text-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold uppercase tracking-tight mb-4">
            Stay Updated
          </h2>
          <p className="text-background/70 mb-8 max-w-md mx-auto">
            Subscribe to our newsletter for exclusive offers and early access to new collections.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input 
              type="email" 
              placeholder="your@email.com"
              className="flex-1 h-12 px-4 bg-background text-foreground border-0"
            />
            <Button 
              size="lg" 
              className="h-12 bg-background text-foreground hover:bg-background/90"
            >
              Subscribe
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
