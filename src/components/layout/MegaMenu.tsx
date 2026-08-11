import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Search, ArrowUpRight, ChevronRight } from 'lucide-react';
import { useMegaMenu } from '@/context/MegaMenuContext';
import { excludeMarketplaceProducts, isMarketplaceCategory } from '@/lib/shopVisibility';
import { productMatchesCategoryLoose } from '@/lib/productCategories';
import { useCategories, isCategoryInMenu } from '@/hooks/useCategories';
import CategoryIcon from '@/components/categories/CategoryIcon';

import { useProducts } from '@/hooks/useProducts';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';

const PLACEHOLDER = '/placeholder.svg';

const DEFAULT_STATIC_LINKS = [
  { id: 'accueil', label: 'Accueil', href: '/', enabled: true },
  { id: 'boutique', label: 'Boutique', href: '/boutique', enabled: true },
  { id: 'nouveautes', label: 'Nouveautés', href: '/boutique?tag=new', enabled: true },
  { id: 'a-propos', label: 'À propos', href: '/a-propos', enabled: true },
  { id: 'contact', label: 'Contact', href: '/contact', enabled: true },
  { id: 'fidelite', label: 'Fidélité', href: '/fidelite', enabled: true },
];

const overlayV = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const panelV = {
  hidden: { opacity: 0, y: -24, filter: 'blur(8px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, y: -20, filter: 'blur(6px)', transition: { duration: 0.25 } },
};

const listV = { show: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } } };
const itemV = {
  hidden: { opacity: 0, x: -16 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
};

export function MegaMenu() {
  const { open, setOpen } = useMegaMenu();
  const { data: dbCategories = [] } = useCategories();
  const { data: allProducts = [] } = useProducts();
  const products = useMemo(() => excludeMarketplaceProducts(allProducts), [allProducts]);
  const { designSettings } = useApp();
  const [hovered, setHovered] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const rootCats = useMemo(
    () => dbCategories.filter((c) => !c.parentId && !isMarketplaceCategory(c.title) && isCategoryInMenu(c)),
    [dbCategories],
  );

  const staticLinks = (designSettings.megaMenuLinks ?? DEFAULT_STATIC_LINKS).filter((l) => l.enabled);

  // ESC close + lock scroll
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, setOpen]);

  // Default to first category for preview
  const activeCat = hovered ?? rootCats[0]?.id ?? null;
  const previewProducts = useMemo(() => {
    if (!activeCat) return products.slice(0, 4);
    const cat = rootCats.find((c) => c.id === activeCat);
    const title = cat?.title?.toLowerCase();
    return products
      .filter((p) => !title || productMatchesCategoryLoose(p, title))
      .slice(0, 4);
  }, [activeCat, products, rootCats]);

  const close = () => setOpen(false);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={overlayV}
          initial="hidden"
          animate="show"
          exit="exit"
          className="fixed inset-0 z-[100] bg-background/85 backdrop-blur-2xl"
          onClick={close}
        >
          <motion.div
            variants={panelV}
            onClick={(e) => e.stopPropagation()}
            className="relative h-full w-full overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 lg:px-12 py-4 lg:py-6 bg-background/60 backdrop-blur-xl border-b border-foreground/10">
              <div className="flex items-center gap-3">
                {designSettings.hudLogo ? (
                  <img
                    src={designSettings.hudLogo}
                    alt=""
                    className="h-8 w-auto max-w-[12rem] shrink-0 object-contain"
                    width={160}
                    height={32}
                    decoding="async"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER; }}
                  />
                ) : (
                  <span className="font-bold tracking-[0.3em] uppercase text-sm">
                    {(designSettings as any).siteName || 'HELVETICA-MP'}
                  </span>
                )}
                <span className="hidden md:inline text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
                  // Menu
                </span>
              </div>
              <button
                onClick={close}
                aria-label="Fermer le menu"
                className="group flex items-center gap-2 text-xs uppercase tracking-[0.2em] hover:text-primary transition-colors"
              >
                <span className="hidden sm:inline">Fermer</span>
                <span className="relative h-9 w-9 flex items-center justify-center border border-foreground/30 group-hover:border-primary transition-colors"
                  style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}>
                  <X className="h-4 w-4" />
                </span>
              </button>
            </div>

            {/* Search */}
            <div className="px-4 lg:px-12 pt-6 lg:pt-10">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!search.trim()) return;
                  close();
                  window.location.assign(`/boutique?q=${encodeURIComponent(search)}`);
                }}
                className="flex items-center gap-3 border-b border-foreground/20 pb-3"
              >
                <Search className="h-5 w-5 text-muted-foreground" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un produit, une catégorie..."
                  className="flex-1 bg-transparent outline-none text-base lg:text-lg placeholder:text-muted-foreground/60"
                />
                {search && (
                  <button type="button" onClick={() => setSearch('')} className="text-xs text-muted-foreground hover:text-foreground">
                    Effacer
                  </button>
                )}
              </form>
            </div>

            {/* Content grid */}
            <motion.div
              variants={listV}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-8 lg:gap-16 px-4 lg:px-12 py-8 lg:py-12"
            >
              {/* LEFT — Categories */}
              <div className="space-y-8">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground mb-4">// CATÉGORIES</p>
                  <ul className="space-y-1">
                    {rootCats.length === 0 && (
                      <li className="text-sm text-muted-foreground">Aucune catégorie.</li>
                    )}
                    {rootCats.map((c) => {
                      const isActive = activeCat === c.id;
                      const href = `/${c.slug || encodeURIComponent(c.title.toLowerCase())}`;
                      return (
                        <motion.li key={c.id} variants={itemV} onMouseEnter={() => setHovered(c.id)}>
                          <Link
                            to={href}
                            onClick={close}
                            className={cn(
                              'group flex items-center justify-between py-3 lg:py-4 border-b border-foreground/10 transition-colors',
                              isActive ? 'text-primary' : 'hover:text-primary'
                            )}
                          >
                            <span className="flex items-center gap-2 lg:gap-3 min-w-0">
                              <CategoryIcon icon={c.icon} iconImage={c.iconImage} size="md" className="lg:h-7 lg:w-7 opacity-80" />
                              <span className="text-2xl lg:text-4xl font-bold uppercase tracking-tight truncate">
                                {c.title}
                              </span>
                            </span>

                            <ChevronRight className={cn(
                              'h-5 w-5 transition-transform',
                              isActive ? 'translate-x-1' : 'group-hover:translate-x-1'
                            )} />
                          </Link>
                        </motion.li>
                      );
                    })}
                  </ul>
                </div>

                {/* Collab exclusif — visible uniquement dans le méga menu */}
                <motion.div variants={itemV}>
                  <p className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground mb-3">// COLLABORATION</p>
                  <Link
                    to="/collab"
                    onClick={close}
                    aria-label="Collection Helvetica Mountain Pioneers x Pegashoes"
                    className="group block border border-foreground/15 bg-secondary/30 hover:border-primary/60 hover:bg-secondary/50 transition-colors p-4 lg:p-5"
                    style={{ clipPath: 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)' }}
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={collabLogo}
                        alt="Helvetica Mountain Pioneers x Pegashoes"
                        className="h-14 lg:h-16 w-auto object-contain transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm lg:text-base font-bold uppercase tracking-tight truncate">Collab</span>
                        <span className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Édition limitée</span>
                      </span>
                      <ArrowUpRight className="ml-auto h-5 w-5 shrink-0 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </div>
                  </Link>
                </motion.div>



                <div>
                  <p className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground mb-3">// LIENS</p>
                  <ul className="flex flex-wrap gap-x-6 gap-y-2">
                    {staticLinks.map((l) => (
                      <motion.li key={l.href} variants={itemV}>
                        <Link
                          to={l.href}
                          onClick={close}
                          className="text-sm uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors story-link"
                        >
                          {l.label}
                        </Link>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* RIGHT — Visual preview */}
              <div>
                <p className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground mb-4">// APERÇU</p>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeCat || 'default'}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="grid grid-cols-2 gap-3 lg:gap-4"
                  >
                    {previewProducts.length === 0 && (
                      <div className="col-span-2 text-sm text-muted-foreground">Aucun produit pour cette catégorie.</div>
                    )}
                    {previewProducts.map((p) => (
                      <Link
                        key={p.id}
                        to={`/boutique/${p.id}`}
                        onClick={close}
                        className="group block relative overflow-hidden border border-foreground/10 hover:border-primary/50 transition-colors"
                        style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
                      >
                        <div className="aspect-[3/4] overflow-hidden bg-secondary/40">
                          <img
                            src={p.image || PLACEHOLDER}
                            alt={p.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
                          />
                        </div>
                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-background/95 to-transparent">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{p.category}</p>
                          <h4 className="text-xs lg:text-sm font-bold uppercase truncate">{p.name}</h4>
                          <p className="text-xs font-bold mt-0.5">{p.salePrice || p.price}€</p>
                        </div>
                      </Link>
                    ))}
                  </motion.div>
                </AnimatePresence>

                <Link
                  to="/boutique"
                  onClick={close}
                  className="group inline-flex items-center gap-2 mt-6 text-xs uppercase tracking-[0.2em] hover:text-primary transition-colors"
                >
                  Voir toute la boutique
                  <ArrowUpRight className="h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
