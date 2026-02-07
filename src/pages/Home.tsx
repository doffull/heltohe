import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useProducts } from '@/hooks/useProducts';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ChevronRight, ArrowRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

import heroImage1 from '@/assets/hero/hero-1.jpg';
import heroImage2 from '@/assets/hero/hero-2.jpg';
import catHomme from '@/assets/categories/cat-homme.jpg';
import catFemme from '@/assets/categories/cat-femme.jpg';
import catEnfant from '@/assets/categories/cat-enfant.jpg';
import catAccessoires from '@/assets/categories/cat-accessoires.jpg';

const HERO_SLIDES = [
  {
    image: heroImage1,
    title: 'COLLECTION\nHIVER 2026',
    subtitle: 'ÉQUIPEMENT TECHNIQUE PREMIUM',
    cta: 'Découvrir',
  },
  {
    image: heroImage2,
    title: 'NOUVELLE\nCOLLECTION',
    subtitle: 'ÉLÉGANCE & PERFORMANCE',
    cta: 'Explorer',
  },
];

const CATEGORIES = [
  { title: 'Homme', image: catHomme, href: '/boutique?category=Homme' },
  { title: 'Femme', image: catFemme, href: '/boutique?category=Femme' },
  { title: 'Enfant', image: catEnfant, href: '/boutique?category=Enfant' },
  { title: 'Accessoires', image: catAccessoires, href: '/boutique?category=Accessoires' },
];

export default function Home() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: products = [] } = useProducts();
  const { addItem } = useCart();
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  // Parallax scroll
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-play slider
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Scroll reveal
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
  }, [products]);

  const featuredProducts = products.slice(0, 4);
  const newArrivals = products.slice(4, 10);

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

  const slide = HERO_SLIDES[currentSlide];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* ═══════════════ HERO PARALLAX ═══════════════ */}
      <section className="relative h-[100vh] overflow-hidden">
        {/* Background images with parallax */}
        {HERO_SLIDES.map((s, i) => (
          <div
            key={i}
            className={cn(
              "absolute inset-0 transition-opacity duration-1000",
              i === currentSlide ? "opacity-100" : "opacity-0"
            )}
          >
            <div
              className="absolute inset-0 bg-cover bg-center will-change-transform"
              style={{
                backgroundImage: `url(${s.image})`,
                transform: `scale(1.1) translateY(${scrollY * 0.25}px)`,
              }}
            />
          </div>
        ))}

        {/* Dark overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 to-transparent z-10" />

        {/* Content */}
        <div className="relative z-20 h-full flex flex-col justify-end pb-24 px-6 lg:px-16">
          <div className="max-w-3xl space-y-6">
            <p className="font-mono text-xs tracking-[0.4em] text-muted-foreground uppercase animate-fade-in">
              {slide.subtitle}
            </p>
            <h1 className="text-5xl md:text-7xl xl:text-8xl font-bold uppercase leading-[0.9] tracking-tighter">
              {slide.title.split('\n').map((line, i) => (
                <span key={i} className="block">
                  {i === 1 ? (
                    <span className="text-muted-foreground">{line}</span>
                  ) : line}
                </span>
              ))}
            </h1>
            <Button
              size="lg"
              className="h-14 px-10 uppercase tracking-[0.2em] text-sm trapezoid-btn glow-hover"
              onClick={() => navigate('/boutique')}
            >
              {slide.cta}
              <ArrowRight className="ml-3 h-5 w-5" />
            </Button>
          </div>

          {/* Slide indicators */}
          <div className="absolute bottom-8 right-8 flex items-center gap-3 z-30">
            <button onClick={() => setCurrentSlide(prev => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)} className="w-10 h-10 border border-foreground/30 flex items-center justify-center hover:bg-foreground/10 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-mono text-sm tabular-nums">
              <span className="text-foreground">{String(currentSlide + 1).padStart(2, '0')}</span>
              <span className="text-muted-foreground mx-1">/</span>
              <span className="text-muted-foreground">{String(HERO_SLIDES.length).padStart(2, '0')}</span>
            </span>
            <button onClick={() => setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length)} className="w-10 h-10 border border-foreground/30 flex items-center justify-center hover:bg-foreground/10 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
          <div className="w-px h-16 bg-foreground/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1/2 bg-foreground animate-pulse-soft" />
          </div>
        </div>
      </section>

      {/* ═══════════════ CATEGORIES GRID ═══════════════ */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-2">// COLLECTIONS</p>
              <h2 className="text-4xl lg:text-5xl font-bold uppercase tracking-tight">Catégories</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {CATEGORIES.map((cat, index) => (
              <Link
                key={cat.title}
                to={cat.href}
                className="scroll-reveal opacity-0 translate-y-8 transition-all duration-700 group relative aspect-[3/4] overflow-hidden bevel-corners"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <img
                  src={cat.image}
                  alt={cat.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-foreground/40 transition-colors duration-300 bevel-corners" />
                <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-6">
                  <h3 className="text-lg lg:text-xl font-bold uppercase tracking-wider text-background group-hover:text-background/80 transition-colors">
                    {cat.title}
                  </h3>
                  <div className="mt-2 h-0.5 w-0 bg-background group-hover:w-12 transition-all duration-500" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ FEATURED PRODUCTS ═══════════════ */}
      <section className="py-20 lg:py-28 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-2">// SÉLECTION</p>
              <h2 className="text-4xl lg:text-5xl font-bold uppercase tracking-tight">En vedette</h2>
            </div>
            <Button
              variant="outline"
              className="hidden md:flex uppercase tracking-wider"
              onClick={() => navigate('/boutique')}
            >
              Tout voir
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {featuredProducts.map((product, index) => (
              <div
                key={product.id}
                className="scroll-reveal opacity-0 translate-y-8 transition-all duration-700 group bg-background bevel-corners overflow-hidden border border-border hover:border-foreground hover:shadow-hmp-lg"
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                <div
                  className="relative aspect-[3/4] overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/boutique/${product.id}`)}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  {product.salePrice && (
                    <div className="absolute top-3 left-3 bg-foreground text-background px-2 py-1 text-[10px] font-bold uppercase">
                      Promo
                    </div>
                  )}
                  {product.stock <= 5 && product.stock > 0 && (
                    <div className="absolute top-3 right-3 bg-destructive text-destructive-foreground px-2 py-1 text-[10px] uppercase">
                      Stock limité
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{product.category}</p>
                  <h3 className="text-sm font-bold uppercase tracking-tight truncate">{product.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    {product.salePrice ? (
                      <>
                        <span className="text-base font-bold">{product.salePrice}€</span>
                        <span className="text-xs text-muted-foreground line-through">{product.price}€</span>
                      </>
                    ) : (
                      <span className="text-base font-bold">{product.price}€</span>
                    )}
                  </div>
                </div>
                <button
                  className="product-card-footer text-xs"
                  onClick={() => handleAddToCart(product)}
                >
                  Ajouter au panier
                </button>
              </div>
            ))}
          </div>

          <div className="text-center mt-10 md:hidden">
            <Button variant="outline" className="uppercase tracking-wider" onClick={() => navigate('/boutique')}>
              Voir tous les produits
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ═══════════════ NEW ARRIVALS ═══════════════ */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-2">// NOUVEAUTÉS</p>
            <h2 className="text-4xl lg:text-5xl font-bold uppercase tracking-tight">Dernières arrivées</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
            {newArrivals.map((product, index) => (
              <div
                key={product.id}
                className="scroll-reveal opacity-0 translate-y-8 transition-all duration-700 group bg-card bevel-corners-sm overflow-hidden border border-border hover:border-foreground"
                style={{ transitionDelay: `${index * 60}ms` }}
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
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{product.category}</p>
                  <h3 className="font-bold uppercase text-sm tracking-tight truncate">{product.name}</h3>
                  <p className="text-muted-foreground font-bold mt-1">{product.salePrice || product.price}€</p>
                </div>
                <button className="product-card-footer text-xs" onClick={() => handleAddToCart(product)}>
                  Ajouter au panier
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
              Voir toute la collection
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* ═══════════════ NEWSLETTER CTA ═══════════════ */}
      <section className="py-24 bg-foreground text-background">
        <div className="container mx-auto px-4 text-center">
          <p className="font-mono text-xs tracking-[0.3em] text-background/50 mb-4">// NEWSLETTER</p>
          <h2 className="text-4xl lg:text-5xl font-bold uppercase tracking-tight mb-4">
            Restez informé
          </h2>
          <p className="text-background/60 mb-8 max-w-md mx-auto">
            Inscrivez-vous pour recevoir les nouveautés et offres exclusives en avant-première.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="votre@email.com"
              className="flex-1 h-12 px-4 bg-background text-foreground border-0"
            />
            <Button
              size="lg"
              className="h-12 bg-background text-foreground hover:bg-background/90"
            >
              S'inscrire
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
