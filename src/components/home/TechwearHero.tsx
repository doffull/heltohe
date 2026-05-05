import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { HOME_CONFIG } from '@/config/homeConfig';
import '@/styles/home-techwear.css';

/* Hexagonal SVG (outline only) */
const Hex = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.5" className={className}>
    <polygon points="50,2 95,27 95,73 50,98 5,73 5,27" />
  </svg>
);

export function TechwearHero() {
  const { designSettings } = useApp();
  const [activeColor, setActiveColor] = useState(HOME_CONFIG.defaultColor);
  const [activeSize, setActiveSize] = useState<string>(HOME_CONFIG.defaultSize);
  const heroRef = useRef<HTMLElement>(null);

  // Light parallax on hexagons
  useEffect(() => {
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
  }, []);

  const color = HOME_CONFIG.colorOptions[activeColor];
  const logoUrl = (designSettings as any)?.logoUrl as string | undefined;
  const brandName = ((designSettings as any)?.siteName as string) || 'HELVETICA';

  return (
    <section id="hw-hero" ref={heroRef} aria-label="Hero">
      {/* Hexagonal background */}
      <div className="hw-hex-bg" aria-hidden="true">
        <Hex className="hw-hex-1 hw-spin" />
        <Hex className="hw-hex-2" />
        <Hex className="hw-hex-3 hw-spin" />
        <div className="hw-hex-line" />
        <Hex className="hw-hex-r1" />
      </div>

      <div className="hw-stage">
        <div className="hw-stage-inner">
          {/* Left spacer (grid col 1) */}
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
                key={color.name}
                src={color.image}
                alt={`Modèle ${color.name}`}
                className="hw-card-image"
                width={1024}
                height={1024}
              />

              <div className="hw-model-badge" aria-label="Référence modèle">
                <div className="hw-mb-1">{HOME_CONFIG.modelBadge.line1}</div>
                <div className="hw-mb-2">{HOME_CONFIG.modelBadge.line2}</div>
              </div>
            </div>

            {/* CTAs */}
            <div className="hw-ctas">
              <Link to={HOME_CONFIG.ctaPrimary.href} className="hw-cta-primary">
                {HOME_CONFIG.ctaPrimary.label}
              </Link>
              <Link to={HOME_CONFIG.ctaSecondary.href} className="hw-cta-secondary">
                {HOME_CONFIG.ctaSecondary.label}
              </Link>
            </div>
          </div>

          {/* Right column */}
          <div className="hw-right">
            {/* Stats */}
            <div className="hw-panel hw-panel--stats" role="group" aria-label="Statistiques produit">
              {HOME_CONFIG.stats.map((s) => (
                <div className="hw-stat" key={s.label}>
                  <div className="hw-stat-label">{s.label}</div>
                  <div className="hw-stat-bar">
                    <div
                      className="hw-stat-bar-fill"
                      style={{ ['--hw-fill' as any]: `${s.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Colors */}
            <div className="hw-panel hw-panel--colors" role="group" aria-label="Couleurs">
              <div className="hw-colors">
                {HOME_CONFIG.colorOptions.map((c, i) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setActiveColor(i)}
                    aria-label={`Couleur ${c.name}`}
                    aria-pressed={i === activeColor}
                    className={`hw-color-row ${i === activeColor ? 'is-active' : ''}`}
                    style={{ background: 'transparent', border: 0, padding: 0, textAlign: 'left' }}
                  >
                    <span className="hw-color-swatch" style={{ background: c.hex }} />
                    <span className="hw-color-name">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sizes */}
            <div className="hw-panel hw-panel--sizes" role="group" aria-label="Tailles">
              <div className="hw-sizes">
                {HOME_CONFIG.visibleSizes.map((sz) => (
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
          </div>
        </div>
      </div>
    </section>
  );
}

export default TechwearHero;
