import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useProducts } from "@/hooks/useProducts";
import { excludeMarketplaceProducts } from "@/lib/shopVisibility";
import { useCategories } from "@/hooks/useCategories";
import { useCart } from "@/context/CartContext";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, ArrowRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useRef } from "react";
import PromoBanner from "@/components/home/PromoBanner";
import PopupBanner from "@/components/home/PopupBanner";
import { PromoCountdown } from "@/components/home/PromoCountdown";
import { LoyaltyBanner } from "@/components/home/LoyaltyBanner";
import { useIsMobile } from "@/hooks/use-mobile";
import { TechwearHero } from "@/components/home/TechwearHero";
import { HeroSlider } from "@/components/home/HeroSlider";
import { HeroErrorBoundary } from "@/components/home/HeroErrorBoundary";
import PageRenderer from "@/components/page/PageRenderer";
import { VoiceAssistantBanner } from "@/components/home/VoiceAssistantBanner";
import { StoreFinderSection } from "@/components/home/StoreFinderSection";
import { ProductFeedSection } from "@/components/home/ProductFeedSection";
import { resolveFeedSections, feedBlockId } from "@/config/homeFeedSections";
import { SectionControls } from "@/components/visual-editor/SectionControls";
import { EditableText } from "@/components/visual-editor/EditableText";
import type { PageSection } from "@/hooks/usePages";
// RouletteFab removed from Home — handled globally by UnifiedFab in MainLayout to avoid duplicate buttons

const PLACEHOLDER = "/placeholder.svg";

function keepFallbackImage(event: React.SyntheticEvent<HTMLImageElement>) {
  if (!event.currentTarget.src.endsWith(PLACEHOLDER)) {
    event.currentTarget.src = PLACEHOLDER;
  }
}

const DEFAULT_HERO_SLIDES = [
  {
    image: PLACEHOLDER,
    title: "COLLECTION\nHIVER 2026",
    subtitle: "ÉQUIPEMENT TECHNIQUE PREMIUM",
    cta: "Découvrir",
  },
  {
    image: PLACEHOLDER,
    title: "NOUVELLE\nCOLLECTION",
    subtitle: "ÉLÉGANCE & PERFORMANCE",
    cta: "Explorer",
  },
];

const FALLBACK_CATEGORIES = [
  { title: "Homme", image: PLACEHOLDER, href: "/homme" },
  { title: "Femme", image: PLACEHOLDER, href: "/femme" },
  { title: "Enfant", image: PLACEHOLDER, href: "/enfant" },
  { title: "Accessoires", image: PLACEHOLDER, href: "/accessoires" },
];

// Reusable scroll-reveal wrapper
function RevealSection({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Staggered children container
function StaggerContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.12 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export default function Home() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: allProducts = [] } = useProducts();
  const products = excludeMarketplaceProducts(allProducts);
  const { addItem } = useCart();
  const { designSettings } = useApp();
  const { data: dbCategories = [] } = useCategories();
  const isMobile = useIsMobile();

  // Dynamic spacing
  const siteSpacing = (designSettings as any).siteSpacing || "compact";
  const sectionPy =
    siteSpacing === "spacious" ? "py-8 lg:py-20" : siteSpacing === "normal" ? "py-4 lg:py-10" : "py-1 lg:py-4";
  const titleMb =
    siteSpacing === "spacious" ? "mb-6 lg:mb-10" : siteSpacing === "normal" ? "mb-4 lg:mb-8" : "mb-2 lg:mb-4";
  const sliderHeight = (designSettings as any).sliderHeight || "100vh";

  // Determine slides: use admin-configured slides if they have valid media, otherwise use defaults
  const adminSlides = designSettings.heroSlides?.filter((s) => s.media || s.backgroundMedia);
  const hasAdminSlides = adminSlides && adminSlides.length > 0;

  // Build unified slide array
  const heroSlides = hasAdminSlides
    ? adminSlides.map((s) => {
        // Use the same image on all devices so mobile, tablet and desktop
        // render an identical hero — fixes the "le contenu n'est pas le même"
        // complaint between devices.
        const image = s.backgroundMedia || s.media;
        return {
          image,
          midgroundMedia: s.midgroundMedia,
          foregroundMedia: s.foregroundMedia,
          title: s.title || "",
          subtitle: s.subtitle || "",
          cta: s.ctaText || "Découvrir",
          accentColor: s.accentColor,
          mediaType: (s.mediaType || "image") as "image" | "video",
          objectFit: (s.objectFit || "cover") as "cover" | "contain" | "fill" | "none",
          objectPosition: s.objectPosition || "center",
        };
      })
    : DEFAULT_HERO_SLIDES;

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

  // Curation admin (Dashboard → Gestion page d'accueil → Produits) : priorité
  // à la sélection ordonnée, puis aux tags, puis au repli automatique.
  const curatedSections = (designSettings as any).homeSectionProducts as Record<string, string[]> | undefined;
  const resolveSection = (keys: string[], fallback: typeof products) => {
    for (const key of keys) {
      const ids = curatedSections?.[key];
      if (Array.isArray(ids) && ids.length > 0) {
        const ordered = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean) as typeof products;
        if (ordered.length > 0) return ordered.slice(0, 8);
      }
    }
    for (const key of keys) {
      const tagged = products.filter((p) => p.tags?.includes(key));
      if (tagged.length > 0) return tagged.slice(0, 8);
    }
    return fallback;
  };

  const featuredProducts = resolveSection(["top", "featured"], products.slice(0, 4));
  const newArrivals = resolveSection(["new"], products.slice(4, 10));


  const handleAddToCart = async (product: (typeof products)[0]) => {
    await addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      salePrice: product.salePrice,
      image: product.image,
      quantity: 1,
    });
    toast({
      title: "Ajouté au panier",
      description: `${product.name} a été ajouté à votre panier`,
    });
  };

  const slide = heroSlides[currentSlide];

  const feedSections = resolveFeedSections((designSettings as any).homeFeedSections);

  const DEFAULT_BLOCKS = [
    { id: "hero", visible: true },
    { id: "categories", visible: true },
    { id: "storeFinder", visible: true },
    { id: "featured", visible: true },
    { id: "flash", visible: true },
    { id: "newArrivals", visible: true },
    ...feedSections.map((f) => ({ id: feedBlockId(f.id), visible: true })),
    { id: "voiceBanner", visible: true },
    { id: "loyalty", visible: true },
    { id: "newsletter", visible: true },
  ] as Array<{ id: string; visible: boolean }>;
  const savedBlocks = (designSettings as any).homePageBlocks as Array<{ id: string; visible: boolean }> | undefined;
  const customSections = ((designSettings as any).homeCustomSections || []) as PageSection[];
  const customMap = new Map(customSections.map((s) => [`custom:${s.id}`, s]));

  // Merge: keep order, add missing customs at end, ensure new builtins are present
  const baseBlocks = savedBlocks?.length ? savedBlocks : DEFAULT_BLOCKS;
  const blocks = (() => {
    const out = [...baseBlocks.filter((b) => !b.id.startsWith("custom:") || customMap.has(b.id))];
    // Inject newly-introduced builtin "storeFinder" right after "categories" when missing
    if (!out.find((b) => b.id === "storeFinder")) {
      const catIdx = out.findIndex((b) => b.id === "categories");
      const entry = { id: "storeFinder", visible: true };
      if (catIdx >= 0) out.splice(catIdx + 1, 0, entry);
      else out.push(entry);
    }
    // Inject newly-shipped feed sections (Tendance, Cagoule, Veste…) when missing
    feedSections.forEach((f) => {
      const id = feedBlockId(f.id);
      if (!out.find((b) => b.id === id)) {
        const anchor = out.findIndex((b) => b.id === "newArrivals");
        const entry = { id, visible: true };
        if (anchor >= 0) out.splice(anchor + 1, 0, entry);
        else out.push(entry);
      }
    });
    customSections.forEach((s) => {
      const id = `custom:${s.id}`;
      if (!out.find((b) => b.id === id)) out.push({ id, visible: true });
    });
    return out;
  })();

  const blockRenderers: Record<string, () => JSX.Element | null> = {
    ...Object.fromEntries(
      feedSections.map((f) => [feedBlockId(f.id), () => <ProductFeedSection section={f} />]),
    ),
    hero: () =>
      (designSettings as any).techwearHero?.enabled ? (
        <HeroErrorBoundary label="TechwearHero">
          <TechwearHero />
        </HeroErrorBoundary>
      ) : (
        <HeroErrorBoundary label="HeroSlider">
          <HeroSlider />
        </HeroErrorBoundary>
      ),
    categories: () => (
      <section className={sectionPy}>
        <div className="container mx-auto px-4">
          <RevealSection>
            <div className={cn("flex items-end justify-between", titleMb)}>
              <div>
                <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-2">// COLLECTIONS</p>
                <EditableText
                  textKey="categoriesTitle"
                  defaultValue="Catégories"
                  as="h2"
                  className="text-2xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-tight"
                />
              </div>
            </div>
          </RevealSection>
          <StaggerContainer
            className={cn(
              "grid",
              (designSettings as any).categoryLayout?.gap === "sm"
                ? "gap-2"
                : (designSettings as any).categoryLayout?.gap === "lg"
                  ? "gap-6 lg:gap-8"
                  : "gap-3 lg:gap-6",
              ((designSettings as any).categoryLayout?.columns || (designSettings as any).categoryColumns) === 2
                ? "grid-cols-2"
                : ((designSettings as any).categoryLayout?.columns || (designSettings as any).categoryColumns) === 3
                  ? "grid-cols-2 lg:grid-cols-3"
                  : "grid-cols-2 lg:grid-cols-4",
            )}
          >
            {(() => {
              const rootCats = dbCategories.filter((c) => !c.parentId);
              const cats =
                rootCats.length > 0
                  ? rootCats.map((c) => ({
                      title: c.title,
                      image: c.image || "/placeholder.svg",
                      href: `/${c.slug || encodeURIComponent(c.title.toLowerCase())}`,
                    }))
                  : designSettings.categories?.length > 0
                    ? designSettings.categories.map((c) => ({
                        title: c.title,
                        image: c.image,
                        href: `/${encodeURIComponent(c.title.toLowerCase())}`,
                      }))
                    : FALLBACK_CATEGORIES;
              return cats;
            })().map((cat) => {
              const ar = (designSettings as any).categoryLayout?.aspectRatio || "3/4";
              return (
                <motion.div key={cat.title} variants={cardVariants}>
                  <Link
                    to={cat.href}
                    className={cn("group relative overflow-hidden bevel-corners block", `aspect-[${ar}]`)}
                    style={{ aspectRatio: ar }}
                  >
                    <img
                      src={cat.image || PLACEHOLDER}
                      alt={cat.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                      decoding="async"
                      onError={keepFallbackImage}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                    <div className="absolute inset-0 border-2 border-transparent group-hover:border-foreground/40 transition-colors duration-300 bevel-corners" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-5 lg:p-6">
                      <h3 className="text-sm sm:text-lg lg:text-xl font-bold uppercase tracking-wider text-background group-hover:text-background/80 transition-colors break-words leading-tight">
                        {cat.title}
                      </h3>
                      <div className="mt-2 h-0.5 w-0 bg-background group-hover:w-12 transition-all duration-500" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </StaggerContainer>
        </div>
      </section>
    ),
    storeFinder: () => <StoreFinderSection />,
    featured: () => (
      <section className={cn(sectionPy, "bg-secondary/30")}>
        <div className="container mx-auto px-4">
          <RevealSection>
            <div className={cn("flex items-end justify-between", titleMb)}>
              <div>
                <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-2">// SÉLECTION</p>
                <EditableText
                  textKey="featuredTitle"
                  defaultValue="Top ventes"
                  as="h2"
                  className="text-2xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-tight"
                />
              </div>
              <Button
                variant="outline"
                className="hidden md:flex uppercase tracking-wider"
                onClick={() => navigate("/boutique")}
              >
                Tout voir
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </RevealSection>
          <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {featuredProducts.map((product) => (
              <motion.div
                key={product.id}
                variants={cardVariants}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="group bg-background bevel-corners overflow-hidden border border-border hover:border-foreground hover:shadow-hmp-lg transition-colors"
              >
                <div
                  className="relative aspect-[3/4] overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/boutique/${product.id}`)}
                >
                  <img
                    src={product.image || PLACEHOLDER}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                    decoding="async"
                    onError={keepFallbackImage}
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
                <button className="product-card-footer text-xs" onClick={() => handleAddToCart(product)}>
                  Ajouter au panier
                </button>
              </motion.div>
            ))}
          </StaggerContainer>
          <div className="text-center mt-6 md:hidden">
            <Button variant="outline" className="uppercase tracking-wider" onClick={() => navigate("/boutique")}>
              Voir tous les produits
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
    ),
    flash: () => <PromoCountdown />,
    newArrivals: () => (
      <section className={sectionPy}>
        <div className="container mx-auto px-4">
          <RevealSection>
            <div className={cn("text-center", titleMb)}>
              <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground mb-2">// hiver 2026</p>
              <EditableText
                textKey="newArrivalsTitle"
                defaultValue="NOUVEAUTÉS"
                as="h2"
                className="text-2xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-tight"
              />
            </div>
          </RevealSection>
          <StaggerContainer className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
            {newArrivals.map((product) => (
              <motion.div
                key={product.id}
                variants={cardVariants}
                whileHover={{ y: -6, transition: { duration: 0.3 } }}
                className="group bg-card bevel-corners-sm overflow-hidden border border-border hover:border-foreground transition-colors"
              >
                <div
                  className="relative aspect-square overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/boutique/${product.id}`)}
                >
                  <img
                    src={product.image || PLACEHOLDER}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    decoding="async"
                    onError={keepFallbackImage}
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
              </motion.div>
            ))}
          </StaggerContainer>
          <RevealSection delay={0.3} className="text-center mt-4 lg:mt-6">
            <Button
              size="lg"
              variant="outline"
              className="uppercase tracking-wider"
              onClick={() => navigate("/boutique")}
            >
              Voir toute la collection
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </RevealSection>
        </div>
      </section>
    ),
    voiceBanner: () => <VoiceAssistantBanner />,
    loyalty: () => <LoyaltyBanner />,
    newsletter: () => (
      <RevealSection>
        <section className={cn(sectionPy, "bg-foreground text-background")}>
          <div className="container mx-auto px-4 text-center">
            <p className="font-mono text-xs tracking-[0.3em] text-background/50 mb-4">// NEWSLETTER</p>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-tight mb-4">Restez informé</h2>
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
                  const { supabase } = await import("@/integrations/supabase/client");
                  await supabase.from("newsletters").insert({ email });
                  toast({
                    title: "Inscription réussie",
                    description: "Merci pour votre inscription à la newsletter !",
                  });
                  emailInput.value = "";
                } catch {
                  toast({ title: "Erreur", description: "Une erreur est survenue.", variant: "destructive" });
                }
              }}
            >
              <input
                type="email"
                placeholder="votre@email.com"
                required
                className="flex-1 h-12 px-4 bg-background text-foreground border-0"
              />
              <Button type="submit" size="lg" className="h-12 bg-background text-foreground hover:bg-background/90">
                S'inscrire
              </Button>
            </form>
          </div>
        </section>
      </RevealSection>
    ),
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <h1 className="sr-only">
        {(designSettings as any).siteName || "HELVETICA-MP"} —{" "}
        {(designSettings as any).siteTagline || "Boutique de mode techwear"}
      </h1>
      <PromoBanner />
      {(() => {
        const visible = blocks.filter((b) => b.visible);
        return visible.map((b, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === visible.length - 1;
          if (b.id.startsWith("custom:")) {
            const section = customMap.get(b.id);
            if (!section) return null;
            return (
              <section key={b.id} className={cn(sectionPy, "relative group/home-block")} data-home-block={b.id}>
                <SectionControls blockId={b.id} isFirst={isFirst} isLast={isLast} />
                <PageRenderer sections={[section]} />
              </section>
            );
          }
          const r = blockRenderers[b.id];
          return r ? (
            <div key={b.id} className="relative group/home-block" data-home-block={b.id}>
              <SectionControls blockId={b.id} isFirst={isFirst} isLast={isLast} />
              {r()}
            </div>
          ) : null;
        });
      })()}
      <PopupBanner />
    </div>
  );
}
