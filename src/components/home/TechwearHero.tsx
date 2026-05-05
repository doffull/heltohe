import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useProducts } from '@/hooks/useProducts';
import { DEFAULT_TECHWEAR_HERO } from '@/config/homeConfig';
import type { TechwearHeroConfig, TechwearColorOption } from '@/types';
import '@/styles/home-techwear.css';

type Viewport = 'mobile' | 'tablet' | 'desktop';
function useViewport(): Viewport {
  const [v, setV] = useState<Viewport>(() => {
    if (typeof window === 'undefined') return 'desktop';
    const w = window.innerWidth;
    return w < 768 ? 'mobile' : w < 1200 ? 'tablet' : 'desktop';
  });
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      setV(w < 768 ? 'mobile' : w < 1200 ? 'tablet' : 'desktop');
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return v;
}

function pickImage(c: TechwearColorOption, v: Viewport): string {
  if (v === 'mobile') return c.imageMobile || c.imageTablet || c.image;
  if (v === 'tablet') return c.imageTablet || c.image;
  return c.image;
}

const Hex = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.5" className={className} aria-hidden="true">
    <polygon points="50,2 95,27 95,73 50,98 5,73 5,27" />
  </svg>
);

/** Merge stored config with linked product (colors / sizes / CTA href). */
function useResolvedConfig(): { config: TechwearHeroConfig; productMissing: boolean } {
  const { designSettings } = useApp();
  const cfg = (designSettings as any).techwearHero as TechwearHeroConfig | undefined;
  const { data: products, isLoading } = useProducts();

  return useMemo(() => {
    const merged: TechwearHeroConfig = { ...DEFAULT_TECHWEAR_HERO, ...(cfg || {}) };
    // Defensive: DB may store null for these — re-apply defaults to avoid `.length`/`.map` crashes.
    const base: TechwearHeroConfig = {
      ...merged,
      colorOptions: Array.isArray(merged.colorOptions) && merged.colorOptions.length ? merged.colorOptions : DEFAULT_TECHWEAR_HERO.colorOptions,
      visibleSizes: Array.isArray(merged.visibleSizes) ? merged.visibleSizes : DEFAULT_TECHWEAR_HERO.visibleSizes,
      stats: Array.isArray(merged.stats) ? merged.stats : DEFAULT_TECHWEAR_HERO.stats,
      modelBadge: merged.modelBadge || DEFAULT_TECHWEAR_HERO.modelBadge,
      ctaPrimary: merged.ctaPrimary || DEFAULT_TECHWEAR_HERO.ctaPrimary,
      ctaSecondary: merged.ctaSecondary || DEFAULT_TECHWEAR_HERO.ctaSecondary,
    };
    if (!base.productId) return { config: base, productMissing: false };
    const product = products?.find((p) => p.id === base.productId);
    if (!product) {
      // Product was deleted or not loaded yet — fall back to manual config
      return { config: base, productMissing: !isLoading };
    }

    // Derive colors from product
    let colorOptions: TechwearColorOption[] = base.colorOptions;
    if (product.colorOptions && product.colorOptions.length > 0) {
      colorOptions = product.colorOptions.map((c, i) => ({
        name: c.label || `Color ${i + 1}`,
        hex: c.color,
        image: c.image || product.image,
      }));
    } else if (product.colors && product.colors.length > 0) {
      colorOptions = product.colors.map((c) => ({
        name: c, hex: c, image: product.image,
      }));
    }

    const visibleSizes = (base.visibleSizes?.length ? base.visibleSizes : product.sizes) || [];
    const productHref = `/boutique/${product.id}`;
    return {
      config: {
        ...base,
        colorOptions,
        visibleSizes,
        defaultSize: visibleSizes.includes(base.defaultSize) ? base.defaultSize : (visibleSizes[0] || base.defaultSize),
        ctaPrimary: { ...base.ctaPrimary, href: productHref },
        ctaSecondary: { ...base.ctaSecondary, href: base.ctaSecondary.href || productHref },
      },
      productMissing: false,
    };
  }, [cfg, products, isLoading]);
}

export function TechwearHero() {
  const { designSettings } = useApp();
  const { config, productMissing } = useResolvedConfig();
  const viewport = useViewport();
  const safeColorIndex = Math.min(Math.max(config.defaultColor, 0), Math.max(config.colorOptions.length - 1, 0));
  const [activeColor, setActiveColor] = useState(safeColorIndex);
  const [activeSize, setActiveSize] = useState<string>(config.defaultSize);
  const heroRef = useRef<HTMLElement>(null);

  // Keep state aligned if config changes (e.g. admin edit)
  useEffect(() => { setActiveColor(safeColorIndex); }, [safeColorIndex, config.colorOptions.length]);
  useEffect(() => { setActiveSize(config.defaultSize); }, [config.defaultSize]);

  // Light parallax
  useEffect(() => {
    if (!config.enabled) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = heroRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY * 0.15;
        el.style.setProperty('--hw-hex-shift', `${y}px`);
        const layers = el.querySelectorAll<HTMLElement>('.hw-hex-bg svg');
        layers.forEach((l, i) => {
          l.style.transform = `translateY(${y * (i % 2 === 0 ? 1 : -1) * 0.4}px)`;
        });
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [config.enabled]);

  if (!config.enabled) return null;
  if (config.colorOptions.length === 0) return null;

  const color = config.colorOptions[activeColor] || config.colorOptions[0];
  const imageSrc = pickImage(color, viewport);
  const logoUrl = (designSettings as any)?.hudLogo as string | undefined;
  const brandName = ((designSettings as any)?.siteName as string) || 'HELVETICA';

  return (
    <section
      id="hw-hero"
      ref={heroRef}
      role="region"
      aria-label="Hero produit"
      data-testid="techwear-hero"
      lang="fr"
    >
      {productMissing && (
        <div
          role="alert"
          style={{
            position: 'absolute', top: 8, right: 8, zIndex: 50,
            background: '#fff3cd', color: '#664d03', border: '1px solid #ffecb5',
            padding: '6px 10px', fontSize: 11, borderRadius: 4,
          }}
        >
          Produit lié introuvable — configuration manuelle utilisée.
        </div>
      )}
      <div className="hw-hex-bg" aria-hidden="true">
        <Hex className="hw-hex-1 hw-spin" />
        <Hex className="hw-hex-2" />
        <Hex className="hw-hex-3 hw-spin" />
        <div className="hw-hex-line" />
        <Hex className="hw-hex-r1" />
      </div>

      {/* Live region for screen readers when color/size change */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Couleur sélectionnée : {color.name}. Taille sélectionnée : {activeSize}.
      </div>

      <div className="hw-stage">
        <div className="hw-stage-inner">
          <div aria-hidden="true" />

          {/* Center card */}
          <div className="hw-card-col">
            <div className="hw-card">
              <div className="hw-card-logo">
                {logoUrl ? (
                  <img src={logoUrl} alt={brandName} />
                ) : (
                  <div className="hw-text-logo">{brandName}</div>
                )}
              </div>

              <img
                key={color.name + imageSrc}
                src={imageSrc}
                alt={`Modèle ${color.name} (${viewport})`}
                className="hw-card-image"
                width={1024}
                height={1024}
                loading="eager"
                decoding="async"
                style={{ objectFit: config.imageFit, objectPosition: config.imagePosition }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = color.image; }}
              />

              {config.showModelBadge && (
                <div className="hw-model-badge" aria-label="Référence modèle">
                  <div className="hw-mb-1">{config.modelBadge.line1}</div>
                  <div className="hw-mb-2">{config.modelBadge.line2}</div>
                </div>
              )}
            </div>

            <div className="hw-ctas">
              <Link to={config.ctaPrimary.href} className="hw-cta-primary">
                {config.ctaPrimary.label}
              </Link>
              <Link to={config.ctaSecondary.href} className="hw-cta-secondary">
                {config.ctaSecondary.label}
              </Link>
            </div>
          </div>

          {/* Right column */}
          <div className="hw-right">
            {config.showStats && (
              <div className="hw-panel hw-panel--stats" role="list" aria-label="Statistiques produit">
                {config.stats.map((s) => (
                  <div className="hw-stat" key={s.label} role="listitem">
                    <div className="hw-stat-label">{s.label}</div>
                    <div className="hw-stat-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={s.value} aria-label={s.label}>
                      <div className="hw-stat-bar-fill" style={{ ['--hw-fill' as any]: `${s.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {config.showColors && (
              <div className="hw-panel hw-panel--colors" role="radiogroup" aria-label="Couleur du produit">
                <div className="hw-colors">
                  {config.colorOptions.map((c, i) => (
                    <button
                      key={c.name + i}
                      type="button"
                      onClick={() => setActiveColor(i)}
                      aria-label={`Couleur ${c.name}`}
                      role="radio"
                      aria-checked={i === activeColor}
                      className={`hw-color-row ${i === activeColor ? 'is-active' : ''}`}
                      style={{ background: 'transparent', border: 0, padding: 0, textAlign: 'left' }}
                    >
                      <span className="hw-color-swatch" style={{ background: c.hex }} />
                      <span className="hw-color-name">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {config.showSizes && (
              <div className="hw-panel hw-panel--sizes" role="group" aria-label="Tailles disponibles">
                <div className="hw-sizes">
                  {config.visibleSizes.map((sz) => (
                    <div className="hw-size-row" key={sz}>
                      <span className="hw-size-label">Size</span>
                      <button
                        type="button"
                        className={`hw-size-btn ${activeSize === sz ? 'is-active' : ''}`}
                        onClick={() => setActiveSize(sz)}
                        aria-pressed={activeSize === sz}
                      >
                        {sz}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default TechwearHero;
