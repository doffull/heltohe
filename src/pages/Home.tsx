import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useProducts } from '@/hooks/useProducts';
import { useCart } from '@/context/CartContext';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Heart, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import PromoBanner from '@/components/home/PromoBanner';
import PopupBanner from '@/components/home/PopupBanner';
import { RouletteFab } from '@/components/home/RouletteFab';

const PLACEHOLDER = '/placeholder.svg';

export default function Home() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: products = [] } = useProducts();
  const { addItem } = useCart();
  const { designSettings } = useApp();

  const slides = designSettings.heroSlides?.filter((s: any) => s.media || s.backgroundMedia) || [];
  const heroSlide = slides[0];
  const heroImage = heroSlide?.backgroundMedia || heroSlide?.media || PLACEHOLDER;
  const heroTitle = heroSlide?.title || 'JEU DU JOUR';
  const heroCta = heroSlide?.ctaText || 'Découvrir le jeu';

  // Side hero images (use other slides or first products)
  const sideImages = (slides.slice(1, 5).map((s: any) => s.backgroundMedia || s.media) as string[])
    .concat(products.slice(0, 4).map((p) => p.image))
    .slice(0, 4);

  const newProducts = products.slice(0, 6);
  const journalProducts = products.slice(6, 9);
  const dufagilityProducts = products.slice(9, 12);

  const handleAddToCart = async (product: typeof products[number]) => {
    await addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      salePrice: product.salePrice,
      image: product.image,
      quantity: 1,
    });
    toast({ title: 'Ajouté au panier', description: `${product.name} a été ajouté à votre panier` });
  };

  const siteName = (designSettings as any).siteName || 'HALVETICA';
  const siteTagline = (designSettings as any).siteTagline || 'Boutique de mode techwear';

  return (
    <div className="min-h-screen bg-[hsl(60_5%_97%)] text-foreground">
      <h1 className="sr-only">{siteName} — {siteTagline}</h1>
      <PromoBanner />
      <RouletteFab />

      {/* HERO — JEU DU JOUR */}
      <section className="relative px-4 pt-6 lg:pt-10" aria-label="Jeu du jour">
        <div className="container mx-auto">
          <div className="relative grid grid-cols-12 gap-2 lg:gap-3 items-stretch">
            {/* Left side images */}
            <div className="hidden md:grid col-span-3 grid-rows-2 gap-2 lg:gap-3">
              {[sideImages[0], sideImages[1]].map((src, i) => (
                <div key={`l-${i}`} className="relative overflow-hidden bg-muted aspect-[3/4]">
                  <img
                    src={src || PLACEHOLDER}
                    alt={`Modèle ${i + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
              ))}
            </div>

            {/* Center — main hero */}
            <div className="col-span-12 md:col-span-6 relative overflow-hidden bg-muted aspect-[4/5] md:aspect-[3/4]">
              <img
                src={heroImage}
                alt={heroTitle}
                fetchPriority="high"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold uppercase tracking-tight text-white drop-shadow-md mb-6">
                  {heroTitle}
                </h2>
                <button
                  onClick={() => heroSlide?.ctaUrl ? navigate(heroSlide.ctaUrl) : navigate('/boutique')}
                  className="bg-white text-black px-6 py-3 text-sm font-semibold uppercase tracking-wider border-2 border-white hover:bg-black hover:text-white transition-colors duration-300 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
                  aria-label={heroCta}
                >
                  {heroCta}
                </button>
              </div>
              {/* Carousel arrows (decorative, no logic change) */}
              <button
                aria-label="Précédent"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-black flex items-center justify-center shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                aria-label="Suivant"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-black flex items-center justify-center shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className={cn('w-2 h-2 rounded-full', i === 0 ? 'bg-white' : 'bg-white/50')} />
                ))}
              </div>
            </div>

            {/* Right side images */}
            <div className="hidden md:grid col-span-3 grid-rows-2 gap-2 lg:gap-3">
              {[sideImages[2], sideImages[3]].map((src, i) => (
                <div key={`r-${i}`} className="relative overflow-hidden bg-muted aspect-[3/4]">
                  <img
                    src={src || PLACEHOLDER}
                    alt={`Modèle ${i + 3}`}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* NOUVEAU — Product grid */}
      <section className="px-4 py-12 lg:py-16" aria-labelledby="nouveau-title">
        <div className="container mx-auto">
          <div className="flex items-end justify-between gap-4 mb-6 lg:mb-8">
            <div className="flex items-end gap-4 flex-1 min-w-0">
              <h2 id="nouveau-title" className="text-2xl sm:text-3xl lg:text-4xl font-bold uppercase tracking-tight">
                Nouveau
              </h2>
              <div className="flex-1 h-px bg-foreground/20 mb-3" aria-hidden />
            </div>
            <button
              onClick={() => navigate('/nouveautes')}
              className="bg-black text-white px-4 py-2 text-xs font-semibold uppercase tracking-wider border-2 border-black hover:bg-white hover:text-black transition-colors duration-300 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
              aria-label="Voir toutes les nouveautés"
            >
              Nouveau
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
            {newProducts.map((product) => (
              <article
                key={product.id}
                className="group bg-white border border-border/60 hover:border-foreground transition-colors duration-300 flex flex-col"
              >
                <button
                  onClick={() => navigate(`/boutique/${product.id}`)}
                  className="relative aspect-square overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                  aria-label={`Voir ${product.name}`}
                >
                  <img
                    src={product.image || PLACEHOLDER}
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </button>
                <div className="p-3 flex flex-col gap-1.5 flex-1">
                  <h3 className="text-xs font-bold uppercase tracking-wide truncate">{product.name}</h3>
                  {product.sizes?.length ? (
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Tailles: {product.sizes.slice(0, 5).join(', ')}
                    </p>
                  ) : null}
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Prix: <span className="text-foreground font-semibold">€{product.salePrice || product.price},00</span>
                  </p>
                  {product.colors?.length ? (
                    <div className="flex gap-1 mt-1" aria-label="Couleurs disponibles">
                      {product.colors.slice(0, 6).map((c: any, i: number) => (
                        <span
                          key={i}
                          className="w-3 h-3 border border-border/60"
                          style={{ background: typeof c === 'string' ? c : c.hex || c.color || '#000' }}
                          aria-hidden
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-stretch border-t border-border/60">
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="flex-1 bg-black text-white text-[10px] font-bold uppercase tracking-wider py-2.5 hover:bg-white hover:text-black border-r border-black transition-colors duration-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-inset"
                    aria-label={`Acheter ${product.name}`}
                  >
                    Acheter
                  </button>
                  <button
                    aria-label="Ajouter aux favoris"
                    className="px-3 hover:bg-foreground/5 transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-inset"
                  >
                    <Heart className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="flex justify-center gap-1.5 mt-6" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className={cn('w-1.5 h-1.5 rounded-full', i === 0 ? 'bg-foreground' : 'bg-foreground/30')} />
            ))}
          </div>
        </div>
      </section>

      {/* DUFAGILITY + FASHION JOURNAL */}
      <section className="px-4 py-12 lg:py-16" aria-label="Editorial">
        <div className="container mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          {/* DUFAGILITY */}
          <div>
            <div className="flex items-end gap-4 mb-6">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold uppercase tracking-tight">Dufagility</h2>
              <div className="flex-1 h-px bg-foreground/20 mb-3" aria-hidden />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3">Collection Dufagility</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                </p>
                <Link
                  to="/boutique"
                  className="inline-block mt-4 text-xs font-bold uppercase tracking-widest underline underline-offset-4 hover:text-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                >
                  Voir un vidéo
                </Link>
              </div>
              <div className="relative aspect-video bg-muted overflow-hidden group">
                <video
                  preload="none"
                  poster={dufagilityProducts[0]?.image || PLACEHOLDER}
                  className="absolute inset-0 w-full h-full object-cover"
                  aria-label="Vidéo Dufagility"
                >
                  <source src="" type="video/mp4" />
                </video>
                <button
                  aria-label="Lire la vidéo"
                  className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span className="w-14 h-14 rounded-full bg-white/95 flex items-center justify-center active:scale-95 transition-transform">
                    <Play className="w-6 h-6 text-black ml-0.5" />
                  </span>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-6">
              {dufagilityProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/boutique/${p.id}`)}
                  className="relative aspect-square overflow-hidden bg-muted group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                  aria-label={`Voir ${p.name}`}
                >
                  <img
                    src={p.image || PLACEHOLDER}
                    alt={p.name}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* FASHION JOURNAL */}
          <div>
            <div className="flex items-end gap-4 mb-6">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold uppercase tracking-tight">Fashion Journal</h2>
              <div className="flex-1 h-px bg-foreground/20 mb-3" aria-hidden />
            </div>
            <ul className="space-y-6">
              {journalProducts.map((p) => (
                <li key={p.id} className="grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] gap-4">
                  <button
                    onClick={() => navigate(`/boutique/${p.id}`)}
                    className="relative aspect-square overflow-hidden bg-muted group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                    aria-label={`Lire l'article ${p.name}`}
                  >
                    <img
                      src={p.image || PLACEHOLDER}
                      alt={p.name}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </button>
                  <article>
                    <h3 className="text-sm font-bold uppercase tracking-wide mb-2">
                      Les tendances noir de la saison
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      Les tendances noir sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                    </p>
                    <Link
                      to={`/boutique/${p.id}`}
                      className="inline-block mt-2 text-[11px] font-bold uppercase tracking-widest underline underline-offset-4 hover:text-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                    >
                      Nos articles
                    </Link>
                  </article>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <PopupBanner />
    </div>
  );
}
