import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useProducts } from '@/hooks/useProducts';
import { useProductStock, stockBadgeColor } from '@/hooks/useProductStock';
import { DEFAULT_TECHWEAR_HERO } from '@/config/homeConfig';
import type { TechwearHeroConfig, TechwearColorOption, TechwearBackground } from '@/types';
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

function pickMedia(c: TechwearColorOption, v: Viewport): { url: string; type: 'image' | 'video' } {
  let url = c.image;
  let type: 'image' | 'video' = c.mediaType || 'image';
  if (v === 'mobile' && c.imageMobile) {
    url = c.imageMobile;
    type = c.mediaTypeMobile || c.mediaType || 'image';
  } else if (v === 'tablet' && c.imageTablet) {
    url = c.imageTablet;
    type = c.mediaTypeTablet || c.mediaType || 'image';
  }
  // Auto-detect video by extension if not set
  if (type !== 'video' && /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url)) type = 'video';
  return { url, type };
}

const Hex = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.5" className={className} aria-hidden="true">
    <polygon points="50,2 95,27 95,73 50,98 5,73 5,27" />
  </svg>
);

/** Sanitize a possibly-corrupted cfg by re-applying defaults to any null/invalid sub-field. */
function sanitizeCfg(raw: any): TechwearHeroConfig {
  const cfg = { ...DEFAULT_TECHWEAR_HERO, ...(raw || {}) } as TechwearHeroConfig;
  const flag = (field: string, expected: string) => {
    // eslint-disable-next-line no-console
    console.warn(`[TechwearHero] champ "${field}" invalide (attendu ${expected}), valeur reçue:`, (raw || {})[field]);
  };
  if (!Array.isArray(cfg.colorOptions) || cfg.colorOptions.length === 0) {
    if (raw && raw.colorOptions !== undefined) flag('colorOptions', 'array non-vide');
    cfg.colorOptions = DEFAULT_TECHWEAR_HERO.colorOptions;
  }
  if (!Array.isArray(cfg.visibleSizes)) { flag('visibleSizes', 'array'); cfg.visibleSizes = DEFAULT_TECHWEAR_HERO.visibleSizes; }
  if (!Array.isArray(cfg.stats)) { flag('stats', 'array'); cfg.stats = DEFAULT_TECHWEAR_HERO.stats; }
  if (!cfg.modelBadge) { cfg.modelBadge = DEFAULT_TECHWEAR_HERO.modelBadge; }
  if (!cfg.ctaPrimary) { cfg.ctaPrimary = DEFAULT_TECHWEAR_HERO.ctaPrimary; }
  if (!cfg.ctaSecondary) { cfg.ctaSecondary = DEFAULT_TECHWEAR_HERO.ctaSecondary; }
  if (!cfg.background) { cfg.background = DEFAULT_TECHWEAR_HERO.background; }
  if (!cfg.cardSize) { cfg.cardSize = 'md'; }
  return cfg;
}

function useResolvedConfig(overrideConfig?: TechwearHeroConfig): { config: TechwearHeroConfig; productMissing: boolean } {
  const { designSettings } = useApp();
  const cfgRaw = overrideConfig ?? ((designSettings as any).techwearHero as TechwearHeroConfig | undefined);
  const { data: products, isLoading } = useProducts();

  return useMemo(() => {
    let base: TechwearHeroConfig;
    try {
      base = sanitizeCfg(cfgRaw);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[TechwearHero] sanitizeCfg threw, falling back to defaults', e, 'cfg=', cfgRaw);
      base = { ...DEFAULT_TECHWEAR_HERO };
    }
    if (!base.productId) return { config: base, productMissing: false };
    const product = products?.find((p) => p.id === base.productId);
    if (!product) return { config: base, productMissing: !isLoading };

    let colorOptions: TechwearColorOption[] = base.colorOptions;
    if (product.colorOptions && product.colorOptions.length > 0) {
      colorOptions = product.colorOptions.map((c, i) => ({
        name: c.label || `Color ${i + 1}`, hex: c.color, image: c.image || product.image,
      }));
    } else if (product.colors && product.colors.length > 0) {
      colorOptions = product.colors.map((c) => ({ name: c, hex: c, image: product.image }));
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
  }, [cfgRaw, products, isLoading]);
}

interface TechwearHeroProps {
  overrideConfig?: TechwearHeroConfig;
}

function BackgroundLayer({ bg }: { bg: TechwearBackground }) {
  if (bg.type === 'gradient') {
    return (
      <div
        className="hw-bg-layer"
        style={{
          background: `linear-gradient(135deg, ${bg.gradientFrom || '#E0E0E0'}, ${bg.gradientTo || '#E5E5E5'})`,
        }}
      />
    );
  }
  if (bg.type === 'color') {
    return <div className="hw-bg-layer" style={{ background: bg.color || '#EBEBEB' }} />;
  }
  if (bg.type === 'image' && bg.mediaUrl) {
    return <img src={bg.mediaUrl} alt="" className="hw-bg-layer hw-bg-media" aria-hidden="true" />;
  }
  if (bg.type === 'video' && bg.mediaUrl) {
    return (
      <video
        className="hw-bg-layer hw-bg-media"
        src={bg.mediaUrl}
        autoPlay loop muted playsInline
        aria-hidden="true"
      />
    );
  }
  return null;
}

type SlideConfig = TechwearHeroConfig;
type Corner = 'tl' | 'tr' | 'bl' | 'br';
type FreePos = { corner: Corner; x: number; y: number };

function freeStyle(p?: FreePos, fallback?: React.CSSProperties): React.CSSProperties {
  if (!p) return fallback || {};
  const s: React.CSSProperties = { position: 'absolute', zIndex: 5 };
  if (p.corner.endsWith('r')) s.right = p.x; else s.left = p.x;
  if (p.corner.startsWith('b')) s.bottom = p.y; else s.top = p.y;
  return s;
}

function pxToCornerPos(left: number, top: number, w: number, h: number, elW: number, elH: number): FreePos {
  const cx = left + elW / 2;
  const cy = top + elH / 2;
  const right = cx > w / 2;
  const bottom = cy > h / 2;
  const corner: Corner = `${bottom ? 'b' : 't'}${right ? 'r' : 'l'}` as Corner;
  return {
    corner,
    x: Math.max(0, Math.round(right ? w - left - elW : left)),
    y: Math.max(0, Math.round(bottom ? h - top - elH : top)),
  };
}

function TechwearHeroSlideView({ config, productMissing }: { config: SlideConfig; productMissing: boolean }) {
  const viewport = useViewport();
  const safeColorIndex = Math.min(Math.max(config.defaultColor, 0), Math.max(config.colorOptions.length - 1, 0));
  const [activeColor, setActiveColor] = useState(safeColorIndex);
  const [activeSize, setActiveSize] = useState<string>(config.defaultSize);
  const { data: stock } = useProductStock(config.productId);
  const { data: products } = useProducts();
  const linkedProduct = useMemo(
    () => (config.productId ? products?.find((p) => p.id === config.productId) : undefined),
    [products, config.productId]
  );

  useEffect(() => { setActiveColor(safeColorIndex); }, [safeColorIndex, config.colorOptions.length]);
  useEffect(() => { setActiveSize(config.defaultSize); }, [config.defaultSize]);

  // Live announcement (debounced) for color/size/stock/price updates
  const [liveMsg, setLiveMsg] = useState('');
  const colorNameForLive = config.colorOptions[activeColor]?.name ?? '';
  const qtyForLive = stock?.bySize?.[activeSize];
  useEffect(() => {
    const parts: string[] = [];
    if (colorNameForLive) parts.push(`Couleur ${colorNameForLive}`);
    if (activeSize) parts.push(`taille ${activeSize}`);
    if (typeof qtyForLive === 'number') {
      parts.push(
        qtyForLive === 0
          ? 'épuisé'
          : qtyForLive < 10
            ? `stock faible, ${qtyForLive} restants`
            : `${qtyForLive} en stock`
      );
    } else if (stock && stock.total > 0) {
      parts.push(`${stock.total} en stock`);
    }
    if (linkedProduct) {
      const price = linkedProduct.salePrice && linkedProduct.salePrice < linkedProduct.price
        ? linkedProduct.salePrice
        : linkedProduct.price;
      if (typeof price === 'number') parts.push(`prix ${price} euros`);
    }
    const msg = parts.join(', ') + '.';
    const t = window.setTimeout(() => setLiveMsg(msg), 150);
    return () => window.clearTimeout(t);
  }, [colorNameForLive, activeSize, qtyForLive, stock, linkedProduct]);

  if (config.colorOptions.length === 0) return null;

  const color = config.colorOptions[activeColor] || config.colorOptions[0];
  const media = pickMedia(color, viewport);
  const bg = config.background || DEFAULT_TECHWEAR_HERO.background!;
  const overlayOpacity = bg.overlayOpacity ?? 0;
  const showStockBadges = !!stock && stock.total > 0;

  return (
    <div
      className="hw-slide-inner"
      data-size={config.cardSize || 'md'}
      data-overflow={config.imageOverflow ? 'true' : 'false'}
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      <BackgroundLayer bg={bg} />
      {overlayOpacity > 0 && (
        <div className="hw-bg-overlay" style={{ background: `rgba(0,0,0,${overlayOpacity})` }} aria-hidden="true" />
      )}

      {productMissing && (
        <div role="alert" className="hw-product-missing">
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

      <div className="sr-only" aria-live="polite" aria-atomic="true" role="status">
        {liveMsg}
      </div>

      <div className="hw-stage">
        <div className="hw-stage-inner">
          <div aria-hidden="true" />

          <div className="hw-card-col">
            <div className="hw-card protected-image-wrap">
              {media.type === 'video' ? (
                <video
                  key={color.name + media.url}
                  src={media.url}
                  className="hw-card-image"
                  autoPlay muted
                  loop={color.videoLoop !== false}
                  playsInline
                  style={{ objectFit: config.imageFit, objectPosition: config.imagePosition }}
                  aria-label={`Vidéo modèle ${color.name}`}
                />
              ) : (
                <img
                  key={color.name + media.url}
                  src={media.url}
                  alt={`Modèle ${color.name} (${viewport})`}
                  className="hw-card-image"
                  width={1024} height={1024}
                  loading="eager" decoding="async"
                  style={{ objectFit: config.imageFit, objectPosition: config.imagePosition }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = color.image; }}
                />
              )}

              {config.showModelBadge && (
                <div className="hw-model-badge" aria-label="Référence modèle">
                  <div className="hw-mb-1">{config.modelBadge.line1}</div>
                  <div className="hw-mb-2">{config.modelBadge.line2}</div>
                </div>
              )}

              {config.ctaStyle?.enabled && (() => {
                const s = config.ctaStyle!;
                const isMobile = viewport === 'mobile';
                const pos = isMobile ? s.position.mobile : s.position.desktop;
                const sizeCls = `hw-cta-sz-${s.size}`;
                const radCls = `hw-cta-rd-${s.radius}`;
                const varCls = `hw-cta-v-${s.variant}`;
                return (
                  <div
                    className={`hw-cta-positioned ${pos.layout === 'row' ? 'is-row' : 'is-col'}`}
                    style={{
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      gap: `${s.gap}px`,
                    }}
                  >
                    <Link
                      to={config.ctaPrimary.href}
                      className={`hw-cta-btn ${varCls} ${sizeCls} ${radCls}`}
                      style={{
                        background: s.primaryBg || undefined,
                        color: s.primaryFg || undefined,
                      }}
                    >
                      {config.ctaPrimary.label}
                    </Link>
                    <Link
                      to={config.ctaSecondary.href}
                      className={`hw-cta-btn ${varCls} ${sizeCls} ${radCls} is-secondary`}
                      style={{
                        background: s.secondaryBg || undefined,
                        color: s.secondaryFg || undefined,
                      }}
                    >
                      {config.ctaSecondary.label}
                    </Link>
                  </div>
                );
              })()}
            </div>

            {!config.ctaStyle?.enabled && (
              <div className="hw-ctas">
                <Link to={config.ctaPrimary.href} className="hw-cta-primary">{config.ctaPrimary.label}</Link>
                <Link to={config.ctaSecondary.href} className="hw-cta-secondary">{config.ctaSecondary.label}</Link>
              </div>
            )}
          </div>

          <div className="hw-right">
            {config.showColors && (
              <div className="hw-panel hw-panel--colors" role="radiogroup" aria-label="Choisir une couleur">
                <div className="hw-colors-compact">
                  {config.colorOptions.map((c, i) => {
                    const isActive = i === activeColor;
                    return (
                      <button
                        key={c.name + i}
                        type="button"
                        onClick={() => setActiveColor(i)}
                        onKeyDown={(e) => {
                          const len = config.colorOptions.length;
                          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                            e.preventDefault();
                            const next = (i + 1) % len;
                            setActiveColor(next);
                            (e.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus();
                          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                            e.preventDefault();
                            const prev = (i - 1 + len) % len;
                            setActiveColor(prev);
                            (e.currentTarget.parentElement?.children[prev] as HTMLButtonElement)?.focus();
                          } else if (e.key === 'Home') {
                            e.preventDefault(); setActiveColor(0);
                            (e.currentTarget.parentElement?.children[0] as HTMLButtonElement)?.focus();
                          } else if (e.key === 'End') {
                            e.preventDefault(); setActiveColor(len - 1);
                            (e.currentTarget.parentElement?.children[len - 1] as HTMLButtonElement)?.focus();
                          }
                        }}
                        aria-label={`Couleur ${c.name}${isActive ? ' (sélectionnée)' : ''}`}
                        role="radio"
                        aria-checked={isActive}
                        tabIndex={isActive ? 0 : -1}
                        className={`hw-color-chip ${isActive ? 'is-active' : ''}`}
                        title={c.name}
                      >
                        <span className="hw-color-dot" style={{ background: c.hex }} aria-hidden="true" />
                        <span className="hw-color-chip-name">{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {config.showSizes && (
              <div className="hw-panel hw-panel--sizes" role="radiogroup" aria-label="Choisir une taille">
                <div className="hw-sizes-grid">
                  {config.visibleSizes.map((sz, i) => {
                    const qty = stock?.bySize?.[sz];
                    const out = showStockBadges && qty === 0;
                    const isActive = activeSize === sz;
                    const stockLabel =
                      typeof qty === 'number'
                        ? out
                          ? 'épuisé'
                          : qty < 10
                            ? `stock faible, ${qty} restants`
                            : `${qty} en stock`
                        : '';
                    return (
                      <button
                        type="button"
                        key={sz}
                        className={`hw-size-chip ${isActive ? 'is-active' : ''} ${out ? 'is-out' : ''}`}
                        onClick={() => !out && setActiveSize(sz)}
                        onKeyDown={(e) => {
                          const sizes = config.visibleSizes;
                          const move = (dir: 1 | -1) => {
                            const len = sizes.length;
                            for (let k = 1; k <= len; k++) {
                              const idx = (i + dir * k + len) % len;
                              const candidate = sizes[idx];
                              const cQty = stock?.bySize?.[candidate];
                              if (!(showStockBadges && cQty === 0)) {
                                setActiveSize(candidate);
                                (e.currentTarget.parentElement?.children[idx] as HTMLButtonElement)?.focus();
                                return;
                              }
                            }
                          };
                          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(1); }
                          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
                        }}
                        role="radio"
                        aria-checked={isActive}
                        aria-label={`Taille ${sz}${stockLabel ? `, ${stockLabel}` : ''}`}
                        aria-disabled={out || undefined}
                        tabIndex={isActive ? 0 : -1}
                        disabled={out}
                      >
                        <span className="hw-size-chip-label" aria-hidden="true">{sz}</span>
                        {showStockBadges && typeof qty === 'number' && (
                          <span
                            className="hw-stock-badge"
                            style={{ background: stockBadgeColor(qty) }}
                            aria-hidden="true"
                          >
                            {qty}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
          </div>
        </div>
      </div>
    </div>
  );
}

interface TechwearHeroPropsExt extends TechwearHeroProps {
  /** Render only this slide id (used by admin preview). */
  onlySlideId?: string;
}

export function TechwearHero({ overrideConfig, onlySlideId }: TechwearHeroPropsExt = {}) {
  const { config, productMissing } = useResolvedConfig(overrideConfig);
  const heroRef = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const { data: products } = useProducts();

  const slideConfigs = useMemo<SlideConfig[]>(() => {
    const slides = Array.isArray(config.slides) && config.slides.length > 0 ? config.slides : null;
    if (!slides) return [config];
    return slides
      .filter((s: any) => !onlySlideId || s.id === onlySlideId)
      .map((slide: any) => {
        const merged = sanitizeCfg({ ...config, ...slide, slides: undefined });
        if (!merged.productId) return merged;
        const product = products?.find((p) => p.id === merged.productId);
        if (!product) return merged;
        let colorOptions: TechwearColorOption[] = merged.colorOptions;
        if (product.colorOptions && product.colorOptions.length > 0) {
          colorOptions = product.colorOptions.map((c, i) => ({
            name: c.label || `Color ${i + 1}`, hex: c.color, image: c.image || product.image,
          }));
        } else if (product.colors && product.colors.length > 0) {
          colorOptions = product.colors.map((c) => ({ name: c, hex: c, image: product.image }));
        }
        const visibleSizes = (merged.visibleSizes?.length ? merged.visibleSizes : product.sizes) || [];
        const productHref = `/boutique/${product.id}`;
        return {
          ...merged,
          colorOptions,
          visibleSizes,
          defaultSize: visibleSizes.includes(merged.defaultSize) ? merged.defaultSize : (visibleSizes[0] || merged.defaultSize),
          ctaPrimary: { ...merged.ctaPrimary, href: productHref },
          ctaSecondary: { ...merged.ctaSecondary, href: merged.ctaSecondary.href || productHref },
        };
      });
  }, [config, products, onlySlideId]);

  const autoplay = config.autoplay !== false;
  const intervalMs = Math.max(2000, config.intervalMs ?? 6000);
  useEffect(() => {
    if (!autoplay || slideConfigs.length <= 1) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % slideConfigs.length), intervalMs);
    return () => window.clearInterval(id);
  }, [autoplay, intervalMs, slideConfigs.length]);

  useEffect(() => { if (index >= slideConfigs.length) setIndex(0); }, [slideConfigs.length, index]);

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
  if (slideConfigs.length === 0) return null;

  const currentIdx = Math.min(index, slideConfigs.length - 1);
  const current = slideConfigs[currentIdx];
  const showArrows = (config.showArrows !== false) && slideConfigs.length > 1;
  const showDots = (config.showDots !== false) && slideConfigs.length > 1;

  return (
    <section
      id="hw-hero"
      ref={heroRef}
      role="region"
      aria-label="Hero produit"
      data-testid="techwear-hero"
      data-slides={slideConfigs.length}
      lang="fr"
      style={{ position: 'relative' }}
    >
      <TechwearHeroSlideView
        key={`slide-${currentIdx}`}
        config={current}
        productMissing={productMissing}
      />

      {showArrows && (
        <>
          <button type="button" aria-label="Précédent"
            onClick={() => setIndex((i) => (i - 1 + slideConfigs.length) % slideConfigs.length)}
            style={{ position: 'absolute', top: '50%', left: 16, transform: 'translateY(-50%)', zIndex: 30, width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', fontSize: 26, cursor: 'pointer' }}
          >‹</button>
          <button type="button" aria-label="Suivant"
            onClick={() => setIndex((i) => (i + 1) % slideConfigs.length)}
            style={{ position: 'absolute', top: '50%', right: 16, transform: 'translateY(-50%)', zIndex: 30, width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', fontSize: 26, cursor: 'pointer' }}
          >›</button>
        </>
      )}

      {showDots && (
        <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, zIndex: 30 }}>
          {slideConfigs.map((_, i) => (
            <button key={i} type="button" aria-label={`Slide ${i + 1}`} aria-current={i === currentIdx}
              onClick={() => setIndex(i)}
              style={{ width: i === currentIdx ? 24 : 8, height: 8, borderRadius: 4, border: 'none', background: i === currentIdx ? '#111' : 'rgba(0,0,0,0.35)', cursor: 'pointer', transition: 'all 0.3s' }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default TechwearHero;
