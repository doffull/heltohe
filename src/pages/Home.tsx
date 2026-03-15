import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useCart } from '@/context/CartContext';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ChevronRight, ArrowRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { useRef } from 'react';
import PromoBanner from '@/components/home/PromoBanner';
import PopupBanner from '@/components/home/PopupBanner';
import { useIsMobile } from '@/hooks/use-mobile';

import heroImage1 from '@/assets/hero/hero-1.jpg';
import heroImage2 from '@/assets/hero/hero-2.jpg';
import catHomme from '@/assets/categories/cat-homme.jpg';
import catFemme from '@/assets/categories/cat-femme.jpg';
import catEnfant from '@/assets/categories/cat-enfant.jpg';
import catAccessoires from '@/assets/categories/cat-accessoires.jpg';

const DEFAULT_HERO_SLIDES = [
{
  image: heroImage1,
  title: 'COLLECTION\nHIVER 2026',
  subtitle: 'ÉQUIPEMENT TECHNIQUE PREMIUM',
  cta: 'Découvrir'
},
{
  image: heroImage2,
  title: 'NOUVELLE\nCOLLECTION',
  subtitle: 'ÉLÉGANCE & PERFORMANCE',
  cta: 'Explorer'
}];


const FALLBACK_CATEGORIES = [
{ title: 'Homme', image: catHomme, href: '/homme' },
{ title: 'Femme', image: catFemme, href: '/femme' },
{ title: 'Enfant', image: catEnfant, href: '/enfant' },
{ title: 'Accessoires', image: catAccessoires, href: '/accessoires' }];


// Reusable scroll-reveal wrapper
function RevealSection({ children, className, delay = 0 }: {children: React.ReactNode;className?: string;delay?: number;}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}>
      
      {children}
    </motion.div>);

}

// Staggered children container
function StaggerContainer({ children, className }: {children: React.ReactNode;className?: string;}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.12 } }
      }}
      className={className}>
      
      {children}
    </motion.div>);

}

const cardVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.95 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }
  }
};

export default function Home() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: products = [] } = useProducts();
  const { addItem } = useCart();
  const { designSettings } = useApp();
  const { data: dbCategories = [] } = useCategories();
  const isMobile = useIsMobile();

  // Dynamic spacing
  const siteSpacing = (designSettings as any).siteSpacing || 'compact';
  const sectionPy = siteSpacing === 'spacious' ? 'py-8 lg:py-20' : siteSpacing === 'normal' ? 'py-4 lg:py-10' : 'py-1 lg:py-4';
  const titleMb = siteSpacing === 'spacious' ? 'mb-6 lg:mb-10' : siteSpacing === 'normal' ? 'mb-4 lg:mb-8' : 'mb-2 lg:mb-4';
  const sliderHeight = (designSettings as any).sliderHeight || '100vh';

  // Determine slides: use admin-configured slides if they have valid media, otherwise use defaults
  const adminSlides = designSettings.heroSlides?.filter((s) => s.media || s.backgroundMedia);
  const hasAdminSlides = adminSlides && adminSlides.length > 0;

  // Build unified slide array
  const heroSlides = hasAdminSlides ?
  adminSlides.map((s) => {
    const desktopImage = s.backgroundMedia || s.media;
    return {
      image: isMobile && s.mobileImage ? s.mobileImage : desktopImage,
      midgroundMedia: s.midgroundMedia,
      foregroundMedia: s.foregroundMedia,
      title: s.title || '',
      subtitle: s.subtitle || '',
      cta: s.ctaText || 'Découvrir',
      accentColor: s.accentColor,
      mediaType: s.mediaType || 'image' as const
    };
  }) :
  DEFAULT_HERO_SLIDES;

  const [currentSlide, setCurrentSlide] = useState(0);

  // Parallax via framer-motion
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const heroMgY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroFgY = useTransform(scrollYProgress, [0, 1], [0, 50]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1.1, 1.3]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const sliderSpeed = hasAdminSlides ? designSettings.sliderSpeed || 6000 : 6000;
  const autoPlay = hasAdminSlides ? designSettings.sliderAutoPlay !== false : true;

  // Auto-play slider
  useEffect(() => {
    if (!autoPlay || heroSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, sliderSpeed);
    return () => clearInterval(timer);
  }, [autoPlay, sliderSpeed, heroSlides.length]);

  const featuredProducts = products.slice(0, 4);
  const newArrivals = products.slice(4, 10);

  const handleAddToCart = async (product: typeof products[0]) => {
    await addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      salePrice: product.salePrice,
      image: product.image,
      quantity: 1
    });
    toast({
      title: 'Ajouté au panier',
      description: `${product.name} a été ajouté à votre panier`
    });
  };

  const slide = heroSlides[currentSlide];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* ═══════════════ PROMO BANNER ═══════════════ */}
      <PromoBanner />
      {/* ═══════════════ HERO PARALLAX ═══════════════ */}
      <section ref={heroRef} className={cn("relative overflow-hidden", hasAdminSlides && designSettings.sliderGrayscale && "grayscale")} style={{ height: sliderHeight }}>
        {heroSlides.map((s, i) =>
        <div
          key={i}
          className={cn(
            "absolute inset-0 transition-opacity duration-1000",
            i === currentSlide ? "opacity-100" : "opacity-0"
          )}>
          
            {/* Background Layer (slowest parallax) */}
            {'mediaType' in s && s.mediaType === 'video' ?
          <motion.div className="absolute inset-0 will-change-transform" style={{ y: heroY, scale: heroScale }}>
                <video src={s.image} autoPlay muted loop playsInline className="w-full h-full object-cover" />
              </motion.div> :

          <motion.div
            className="absolute inset-0 bg-cover bg-center will-change-transform"
            style={{
              backgroundImage: `url(${s.image})`,
              y: heroY,
              scale: heroScale
            }} />

          }
            
            {/* Midground Layer */}
            {'midgroundMedia' in s && (s as any).midgroundMedia &&
          <motion.div className="absolute inset-0 z-[1] will-change-transform" style={{ y: heroMgY }}>
                <img src={(s as any).midgroundMedia} alt="" className="w-full h-full object-cover" />
              </motion.div>
          }
            
            {/* Foreground Layer */}
            {'foregroundMedia' in s && (s as any).foregroundMedia &&
          <motion.div className="absolute inset-0 z-[2] will-change-transform" style={{ y: heroFgY }}>
                <img src={(s as any).foregroundMedia} alt="" className="w-full h-full object-contain" />
              </motion.div>
          }
          </div>
        )}

        {/* Overlays removed per design choice */}

        <motion.div
          style={{ opacity: heroOpacity }}
          className="relative z-20 h-full flex flex-col justify-end pb-16 lg:pb-24 px-4 lg:px-16">
          
          <div className="max-w-3xl space-y-6">
            <motion.p
              key={`sub-${currentSlide}`}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="font-mono text-xs tracking-[0.4em] uppercase text-slate-50">
              
              {slide.subtitle}
            </motion.p>
            <h1 className="text-2xl sm:text-5xl md:text-7xl xl:text-8xl font-bold uppercase leading-[0.9] tracking-tighter">
              {slide.title.split('\n').map((line, i) =>
              <motion.span
                key={`${currentSlide}-${i}`}
                className="block text-white"
                initial={{ opacity: 0, y: 40, clipPath: "inset(0 0 100% 0)" }}
                animate={{ opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)" }}
                transition={{ duration: 0.8, delay: 0.3 + i * 0.15, ease: [0.22, 1, 0.36, 1] }}>
                
                  {i === 1 ?
                <span className="text-muted-foreground">{line}</span> :
                line}
                </motion.span>
              )}
            </h1>
            <motion.div
              key={`cta-${currentSlide}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}>
              
              <Button
                size="lg"
                className="h-14 px-10 uppercase tracking-[0.2em] text-sm trapezoid-btn glow-hover"
                onClick={() => navigate('/boutique')}>
                
                {slide.cta}
                <ArrowRight className="ml-3 h-5 w-5" />
              </Button>
            </motion.div>
          </div>

          <div className="absolute bottom-8 right-8 flex items-center gap-3 z-30">
            <button onClick={() => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)} className="w-10 h-10 border border-foreground/30 flex items-center justify-center hover:bg-foreground/10 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-mono text-sm tabular-nums">
              <span className="text-foreground">{String(currentSlide + 1).padStart(2, '0')}</span>
              <span className="text-muted-foreground mx-1">/</span>
              <span className="text-muted-foreground">{String(heroSlides.length).padStart(2, '0')}</span>
            </span>
            <button onClick={() => setCurrentSlide((prev) => (prev + 1) % heroSlides.length)} className="w-10 h-10 border border-foreground/30 flex items-center justify-center hover:bg-foreground/10 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>

        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}>
          
          <div className="w-px h-16 bg-foreground/20 relative overflow-hidden">
            <motion.div
              className="absolute top-0 left-0 w-full bg-foreground"
              animate={{ height: ["0%", "100%", "0%"], top: ["0%", "0%", "100%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
            
          </div>
        </motion.div>
      </section>

      {/* ═══════════════ CATEGORIES GRID ═══════════════ */}
      <section className={sectionPy}>
        <div className="container mx-auto px-4">
          <RevealSection>
            <div className={cn("flex items-end justify-between", titleMb)}>
              <div>
                <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-2">// COLLECTIONS</p>
                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-tight">Catégories</h2>
              </div>
            </div>
          </RevealSection>

          <StaggerContainer className={cn(
            "grid",
            // Gap
            (designSettings as any).categoryLayout?.gap === 'sm' ? "gap-2" :
            (designSettings as any).categoryLayout?.gap === 'lg' ? "gap-6 lg:gap-8" :
            "gap-3 lg:gap-6",
            // Columns
            ((designSettings as any).categoryLayout?.columns || (designSettings as any).categoryColumns) === 2 ? "grid-cols-2" :
            ((designSettings as any).categoryLayout?.columns || (designSettings as any).categoryColumns) === 3 ? "grid-cols-2 lg:grid-cols-3" :
            "grid-cols-2 lg:grid-cols-4"
          )}>
            {(() => {
              const rootCats = dbCategories.filter((c) => !c.parentId);
              const cats = rootCats.length > 0 ?
              rootCats.map((c) => ({ title: c.title, image: c.image || '/placeholder.svg', href: `/${c.slug || encodeURIComponent(c.title.toLowerCase())}` })) :
              designSettings.categories?.length > 0 ?
              designSettings.categories.map((c) => ({ title: c.title, image: c.image, href: `/${encodeURIComponent(c.title.toLowerCase())}` })) :
              FALLBACK_CATEGORIES;
              return cats;
            })().map((cat) => {
              const ar = (designSettings as any).categoryLayout?.aspectRatio || '3/4';
              return (
                <motion.div key={cat.title} variants={cardVariants}>
                <Link
                    to={cat.href}
                    className={cn("group relative overflow-hidden bevel-corners block", `aspect-[${ar}]`)}
                    style={{ aspectRatio: ar }}>
                    
                  <img
                      src={cat.image}
                      alt={cat.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                  <div className="absolute inset-0 border-2 border-transparent group-hover:border-foreground/40 transition-colors duration-300 bevel-corners" />
                  <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-6">
                    <h3 className="text-lg lg:text-xl font-bold uppercase tracking-wider text-background group-hover:text-background/80 transition-colors">
                      {cat.title}
                    </h3>
                    <div className="mt-2 h-0.5 w-0 bg-background group-hover:w-12 transition-all duration-500" />
                  </div>
                </Link>
              </motion.div>);

            })}
          </StaggerContainer>
        </div>
      </section>

      {/* ═══════════════ FEATURED PRODUCTS ═══════════════ */}
      <section className={cn(sectionPy, "bg-secondary/30")}>
        <div className="container mx-auto px-4">
          <RevealSection>
            <div className={cn("flex items-end justify-between", titleMb)}>
              <div>
                <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-2">// SÉLECTION</p>
                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-tight">En vedette</h2>
              </div>
              <Button
                variant="outline"
                className="hidden md:flex uppercase tracking-wider"
                onClick={() => navigate('/boutique')}>
                
                Tout voir
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </RevealSection>

          <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {featuredProducts.map((product) =>
            <motion.div
              key={product.id}
              variants={cardVariants}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
              className="group bg-background bevel-corners overflow-hidden border border-border hover:border-foreground hover:shadow-hmp-lg transition-colors">
              
                <div
                className="relative aspect-[3/4] overflow-hidden cursor-pointer"
                onClick={() => navigate(`/boutique/${product.id}`)}>
                
                  <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                
                  {product.salePrice &&
                <div className="absolute top-3 left-3 bg-foreground text-background px-2 py-1 text-[10px] font-bold uppercase">
                      Promo
                    </div>
                }
                  {product.stock <= 5 && product.stock > 0 &&
                <div className="absolute top-3 right-3 bg-destructive text-destructive-foreground px-2 py-1 text-[10px] uppercase">
                      Stock limité
                    </div>
                }
                </div>
                <div className="p-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{product.category}</p>
                  <h3 className="text-sm font-bold uppercase tracking-tight truncate">{product.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    {product.salePrice ?
                  <>
                        <span className="text-base font-bold">{product.salePrice}€</span>
                        <span className="text-xs text-muted-foreground line-through">{product.price}€</span>
                      </> :

                  <span className="text-base font-bold">{product.price}€</span>
                  }
                  </div>
                </div>
                <button
                className="product-card-footer text-xs"
                onClick={() => handleAddToCart(product)}>
                
                  Ajouter au panier
                </button>
              </motion.div>
            )}
          </StaggerContainer>

          <div className="text-center mt-6 md:hidden">
            <Button variant="outline" className="uppercase tracking-wider" onClick={() => navigate('/boutique')}>
              Voir tous les produits
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ═══════════════ NEW ARRIVALS ═══════════════ */}
      <section className={sectionPy}>
        <div className="container mx-auto px-4">
          <RevealSection>
            <div className={cn("text-center", titleMb)}>
              <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-2">// NOUVEAUTÉS</p>
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-tight">Dernières arrivées</h2>
            </div>
          </RevealSection>

          <StaggerContainer className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
            {newArrivals.map((product) =>
            <motion.div
              key={product.id}
              variants={cardVariants}
              whileHover={{ y: -6, transition: { duration: 0.3 } }}
              className="group bg-card bevel-corners-sm overflow-hidden border border-border hover:border-foreground transition-colors">
              
                <div
                className="relative aspect-square overflow-hidden cursor-pointer"
                onClick={() => navigate(`/boutique/${product.id}`)}>
                
                  <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                
                </div>
                <div className="p-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{product.category}</p>
                  <h3 className="font-bold uppercase text-sm tracking-tight truncate">{product.name}</h3>
                  <p className="text-muted-foreground font-bold mt-1">{product.salePrice || product.price}€</p>
                </div>
                <button className="product-card-footer text-xs" onClick={() => handleAddToCart(product)}>
                  Ajouter au panier
                </button>
              </motion.div>
            )}
          </StaggerContainer>

          <RevealSection delay={0.3} className="text-center mt-4 lg:mt-6">
            <Button
              size="lg"
              variant="outline"
              className="uppercase tracking-wider"
              onClick={() => navigate('/boutique')}>
              
              Voir toute la collection
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </RevealSection>
        </div>
      </section>

      {/* ═══════════════ NEWSLETTER CTA ═══════════════ */}
      <RevealSection>
        <section className={cn(sectionPy, "bg-foreground text-background")}>
          <div className="container mx-auto px-4 text-center">
            <p className="font-mono text-xs tracking-[0.3em] text-background/50 mb-4">// NEWSLETTER</p>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-tight mb-4">
              Restez informé
            </h2>
            <p className="text-background/60 mb-8 max-w-md mx-auto">
              Inscrivez-vous pour recevoir les nouveautés et offres exclusives en avant-première.
            </p>
            <form
              className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const emailInput = form.querySelector('input[type="email"]') as HTMLInputElement;
                const email = emailInput?.value;
                if (!email) return;
                try {
                  const { supabase } = await import('@/integrations/supabase/client');
                  await supabase.from('newsletters').insert({ email });
                  toast({ title: 'Inscription réussie', description: 'Merci pour votre inscription à la newsletter !' });
                  emailInput.value = '';
                } catch {
                  toast({ title: 'Erreur', description: 'Une erreur est survenue.', variant: 'destructive' });
                }
              }}>
              
              <input
                type="email"
                placeholder="votre@email.com"
                required
                className="flex-1 h-12 px-4 bg-background text-foreground border-0" />
              
              <Button
                type="submit"
                size="lg"
                className="h-12 bg-background text-foreground hover:bg-background/90">
                
                S'inscrire
              </Button>
            </form>
          </div>
        </section>
      </RevealSection>

      {/* ═══════════════ POPUP BANNER ═══════════════ */}
      <PopupBanner />
    </div>);

}