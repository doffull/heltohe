import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '@/hooks/useProducts';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  ChevronRight, 
  ShoppingCart,
  Shield,
  Zap,
  Target,
  ArrowRight
} from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: products = [] } = useProducts();
  const { addItem } = useCart();
  
  const heroRef = useRef<HTMLDivElement>(null);
  const featuredRef = useRef<HTMLDivElement>(null);

  // Parallax effect
  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const scrollY = window.scrollY;
        heroRef.current.style.transform = `translateY(${scrollY * 0.5}px)`;
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

  const featuredProducts = products.slice(0, 4);
  const newArrivals = products.slice(0, 8);

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
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero Section with Parallax */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background layers for parallax */}
        <div 
          ref={heroRef}
          className="absolute inset-0 z-0"
          style={{ willChange: 'transform' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-primary/10" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
        </div>

        {/* Floating elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-10 w-2 h-2 bg-primary rounded-full animate-pulse" />
          <div className="absolute top-1/3 right-20 w-3 h-3 bg-accent/50 rounded-full animate-pulse animation-delay-500" />
          <div className="absolute bottom-1/4 left-1/4 w-1 h-1 bg-primary/70 rounded-full animate-pulse animation-delay-300" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <div className="mb-6">
            <span className="inline-block px-4 py-2 bg-primary/10 border border-primary/30 text-primary text-sm tracking-widest uppercase mb-4">
              COLLECTION 2026
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold hud-text mb-6 leading-tight">
            ÉQUIPEMENT
            <br />
            <span className="text-primary hud-text-glow">TACTIQUE</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Performance extrême. Design militaire. Technologie avancée pour les opérateurs qui exigent l'excellence.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="chamfer-hud text-lg px-8 h-14 group"
              onClick={() => navigate('/boutique')}
            >
              EXPLORER LA COLLECTION
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="chamfer-hud text-lg px-8 h-14"
              onClick={() => navigate('/boutique?category=Nouveautés')}
            >
              NOUVEAUTÉS
            </Button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-muted-foreground rounded-full flex justify-center pt-2">
            <div className="w-1 h-2 bg-muted-foreground rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 border-y border-border bg-card/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="scroll-reveal opacity-0 translate-y-8 transition-all duration-700 text-center p-8">
              <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-bold hud-text mb-2">PROTECTION MAXIMALE</h3>
              <p className="text-muted-foreground">
                Matériaux de grade militaire testés dans les conditions les plus extrêmes
              </p>
            </div>
            <div className="scroll-reveal opacity-0 translate-y-8 transition-all duration-700 delay-100 text-center p-8">
              <Zap className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-bold hud-text mb-2">PERFORMANCE TACTIQUE</h3>
              <p className="text-muted-foreground">
                Conçu pour la mobilité et la réactivité sur tous les terrains
              </p>
            </div>
            <div className="scroll-reveal opacity-0 translate-y-8 transition-all duration-700 delay-200 text-center p-8">
              <Target className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-bold hud-text mb-2">PRÉCISION ENGINEERING</h3>
              <p className="text-muted-foreground">
                Chaque détail est optimisé pour des performances sans compromis
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section ref={featuredRef} className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold hud-text">SÉLECTION TACTIQUE</h2>
              <p className="text-muted-foreground mt-2">Équipement recommandé par nos experts</p>
            </div>
            <Button 
              variant="outline" 
              className="hidden md:flex chamfer-hud-sm"
              onClick={() => navigate('/boutique')}
            >
              VOIR TOUT
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product, index) => (
              <div 
                key={product.id}
                className="scroll-reveal opacity-0 translate-y-8 transition-all duration-700 group chamfer-hud bg-card/50 overflow-hidden hover:bg-card/70"
                style={{ transitionDelay: `${index * 100}ms` }}
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
                  {product.salePrice && (
                    <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground px-2 py-1 text-xs font-bold">
                      -{Math.round((1 - product.salePrice / product.price) * 100)}%
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">{product.category}</p>
                  <h3 className="font-bold text-sm hud-text line-clamp-1">{product.name}</h3>
                  <div className="flex items-center justify-between mt-3">
                    {product.salePrice ? (
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-primary">{product.salePrice}€</span>
                        <span className="text-sm line-through text-muted-foreground">{product.price}€</span>
                      </div>
                    ) : (
                      <span className="text-lg font-bold">{product.price}€</span>
                    )}
                    <Button
                      size="icon"
                      className="h-8 w-8 chamfer-hud-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(product);
                      }}
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8 md:hidden">
            <Button 
              variant="outline" 
              className="chamfer-hud-sm"
              onClick={() => navigate('/boutique')}
            >
              VOIR TOUTE LA COLLECTION
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary/10 via-background to-accent/10 border-y border-border">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold hud-text mb-6">
            REJOIGNEZ L'ÉLITE
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Inscrivez-vous à notre programme de fidélité et bénéficiez d'avantages exclusifs, 
            d'accès prioritaire aux nouveautés et de réductions membres.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="chamfer-hud h-14 px-8"
              onClick={() => navigate('/auth')}
            >
              CRÉER UN COMPTE
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="chamfer-hud h-14 px-8"
              onClick={() => navigate('/compte/fidelite')}
            >
              EN SAVOIR PLUS
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
