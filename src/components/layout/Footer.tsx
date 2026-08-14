import { SyntheticEvent, CSSProperties } from 'react';
import { ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import TrustpilotWidget from '@/components/TrustpilotWidget';
import { resolveBrand } from '@/components/icons/BrandIcons';
import InstallAppButton from '@/components/pwa/InstallAppButton';
import FooterPaymentBadges from '@/components/layout/FooterPaymentBadges';
import FooterReviews from '@/components/layout/FooterReviews';
import type { FooterConfig, FooterColumn, FooterDesign } from '@/types';
import { toast } from 'sonner';

const IMAGE_FALLBACK = '/placeholder.svg';
const withImageFallback = (event: SyntheticEvent<HTMLImageElement>) => {
  const img = event.currentTarget;
  if (!img.src.endsWith(IMAGE_FALLBACK)) img.src = IMAGE_FALLBACK;
};

/** Réseaux affichés par défaut (l'URL réelle se règle dans l'admin). */
const DEFAULT_SOCIALS = [
  { label: 'FACEBOOK', url: '#' },
  { label: 'INSTAGRAM', url: '#' },
  { label: 'TIKTOK', url: '#' },
  { label: 'YOUTUBE', url: '#' },
];

/** Colonnes par défaut (identiques au rendu historique du site). */
const DEFAULT_COLUMNS: FooterColumn[] = [
  {
    title: 'Liens Rapides',
    links: [
      { label: 'Accueil', url: '/' },
      { label: 'Boutique', url: '/boutique' },
      { label: 'Mon Compte', url: '/compte' },
      { label: 'À Propos', url: '/a-propos' },
    ],
  },
];

const ALL_LEGAL_LINKS = [
  { key: 'mentions', label: 'Mentions légales', url: '/mentions-legales' },
  { key: 'cgv', label: 'CGV', url: '/cgv' },
  { key: 'confidentialite', label: 'Politique de confidentialité', url: '/confidentialite' },
  { key: 'cookies', label: 'Cookies', url: '/cookies' },
  { key: 'retours', label: 'Retours & Échanges', url: '/retours' },
];

const DEFAULT_BRAND_TEXT =
  "Helvetica-MP. Design minimaliste et excellence fonctionnelle. Qualité premium pour l'individu moderne.";

const PADDING_CLASS: Record<string, string> = {
  compact: 'py-5 lg:py-8',
  normal: 'py-8 mt-4 lg:py-16 lg:mt-10',
  spacious: 'py-12 mt-4 lg:py-24 lg:mt-10',
};

const SCALE_CLASS: Record<string, string> = {
  sm: 'text-[13px]',
  md: 'text-sm',
  lg: 'text-base',
};

interface FooterProps {
  /** Classe de décalage appliquée quand la sidebar est active. */
  offsetClassName?: string;
}

export function Footer({ offsetClassName }: FooterProps) {
  const { designSettings, language, setLanguage } = useApp();
  const s = designSettings as any;
  const { socialLinks, socialDisplayMode } = designSettings;
  const cfg: FooterConfig = (s?.footerConfig ?? {}) as FooterConfig;
  const d: FooterDesign = cfg.design ?? {};
  const layout = cfg.layout || 'industrial';
  const on = (v: boolean | undefined) => v !== false; // activé par défaut

  const siteName = designSettings.siteName || 'Mon Site';
  const siteTagline = designSettings.siteTagline;
  const footerLogo = s.footerLogo || s.hudLogo;
  const brandText = cfg.brandText ?? DEFAULT_BRAND_TEXT;
  const contactEmail = on(cfg.showEmail) ? designSettings.contactEmail : '';
  const contactPhone = on(cfg.showPhone) ? designSettings.contactPhone : '';
  const showContact = on(cfg.showContact);

  const rawColumns = cfg.columns && cfg.columns.length ? cfg.columns : DEFAULT_COLUMNS;
  const columnCount = cfg.columnCount ?? 4;
  const columns = rawColumns
    .filter((c) => (c.title || '').trim() || (c.links || []).length)
    .slice(0, columnCount);
  const columnsGridClass =
    columnCount === 2 ? 'grid-cols-1 sm:grid-cols-2' : columnCount === 3 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-4';

  const rights = language === 'FR'
    ? (cfg.rightsTextFr || 'Tous droits réservés.')
    : (cfg.rightsTextEn || 'All rights reserved.');
  const copyright = cfg.copyrightText?.trim()
    ? cfg.copyrightText
        .replace('{year}', String(new Date().getFullYear()))
        .replace('{site}', siteName.toUpperCase())
    : `© ${new Date().getFullYear()} ${siteName.toUpperCase()}. ${rights}`;

  const legalKeys = cfg.legalLinks;
  const legalLinks = ALL_LEGAL_LINKS.filter(
    (l) => !legalKeys || legalKeys.length === 0 || legalKeys.includes(l.key)
  );

  const socials = (() => {
    const configured = socialLinks || [];
    const merged = [...configured];
    if (on(cfg.autoFillSocials)) {
      DEFAULT_SOCIALS.forEach((dft) => {
        const exists = configured.some((l) =>
          `${l.label} ${l.url}`.toLowerCase().includes(dft.label.toLowerCase())
        );
        if (!exists) merged.push(dft);
      });
    }
    return merged;
  })();

  const displayMode = socialDisplayMode || 'icons';

  const subscribe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const emailInput = e.currentTarget.querySelector('input') as HTMLInputElement | null;
    const email = emailInput?.value;
    if (!email) return;
    try {
      await supabase.from('newsletters').insert({ email });
      if (emailInput) emailInput.value = '';
      toast.success('Inscription enregistrée');
    } catch {
      /* silencieux */
    }
  };

  /* ------------------------- Habillage (design) ------------------------- */
  const bgColor = d.bgColor || s.footerBgColor || undefined;
  const textColor = d.textColor || s.footerTextColor || undefined;
  const uppercase = d.uppercaseTitles !== false;
  const centered = d.align === 'center';
  const scale = SCALE_CLASS[d.textScale || 'md'];
  const padding = PADDING_CLASS[d.padding || 'normal'];
  const containerClass = d.contentWidth === 'full'
    ? 'w-full px-4 sm:px-8'
    : 'container mx-auto px-4';

  const borderTopClass =
    d.borderTop === 'none' ? 'border-t-0'
      : d.borderTop === 'thick' ? 'border-t-4'
      : d.borderTop === 'chamfer' ? 'border-t chamfer-hud-sm'
      : 'border-t';

  const backgroundImage = (() => {
    const layers: string[] = [];
    if (d.overlay && d.overlay !== 'none') {
      const a = (d.overlayOpacity ?? 55) / 100;
      const c = d.overlay === 'dark' ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`;
      layers.push(`linear-gradient(${c}, ${c})`);
    }
    if (d.gradientEnabled) {
      layers.push(
        `linear-gradient(${d.gradientAngle ?? 135}deg, ${d.gradientFrom || '#000000'}, ${d.gradientTo || '#333333'})`
      );
    }
    if (d.bgImage) layers.push(`url("${d.bgImage}")`);
    return layers.length ? layers.join(', ') : undefined;
  })();

  const style: CSSProperties & Record<string, any> = {
    backgroundColor: bgColor,
    color: textColor,
    backgroundImage,
    backgroundSize: d.bgImage ? (d.bgSize === 'repeat' ? 'auto' : d.bgSize || 'cover') : undefined,
    backgroundRepeat: d.bgImage ? (d.bgSize === 'repeat' ? 'repeat' : 'no-repeat') : undefined,
    backgroundPosition: d.bgImage ? d.bgPosition || 'center' : undefined,
    backgroundAttachment: d.bgImage && d.bgParallax ? 'fixed' : undefined,
    borderColor: d.borderColor || undefined,
    boxShadow: d.shadowTop ? '0 -12px 40px -20px rgba(0,0,0,0.6)' : undefined,
    opacity: typeof d.bgOpacity === 'number' && d.bgOpacity < 100 ? d.bgOpacity / 100 : undefined,
    '--footer-heading': d.headingColor || undefined,
    '--footer-link': d.linkColor || undefined,
    '--footer-link-hover': d.linkHoverColor || undefined,
    '--footer-border': d.borderColor || undefined,
    '--footer-accent': d.accentColor || undefined,
  };

  const sepStyle: CSSProperties = { borderColor: d.borderColor || undefined };
  const headingClass = cn(
    'footer-heading font-bold mb-4 lg:mb-6 text-sm',
    uppercase && 'uppercase tracking-wider'
  );

  /* ---------------------------- Blocs réutilisables ---------------------------- */
  const logoHeight = cfg.logoHeight && cfg.logoHeight > 0 ? cfg.logoHeight : 40;
  const socialIconSize = cfg.socialIconSize && cfg.socialIconSize > 0 ? cfg.socialIconSize : undefined;

  const Brand = () => (
    <div className={cn(centered && 'flex flex-col items-center text-center')}>
      {footerLogo ? (
        <img
          src={footerLogo}
          alt={siteName}
          className="w-auto object-contain mb-4 lg:mb-6"
          style={{ height: logoHeight }}
          loading="lazy"
          decoding="async"
          onError={withImageFallback}
        />
      ) : (
        <div className="w-10 h-10 lg:w-12 lg:h-12 bg-background border-2 border-foreground flex items-center justify-center transform rotate-45 mb-4 lg:mb-6">
          <span className="transform -rotate-45 text-xs lg:text-sm font-bold">
            {siteName.slice(0, 3).toUpperCase()}
          </span>
        </div>
      )}

      {brandText && <p className={cn(scale, 'opacity-70 leading-relaxed')}>{brandText}</p>}
      {siteTagline && on(cfg.showTagline) && (
        <p className="text-xs opacity-50 mt-2">{siteTagline}</p>
      )}
      {showContact && (contactEmail || contactPhone) && (
        <div className={cn('mt-3 flex flex-wrap items-center gap-2 text-xs opacity-70', centered && 'justify-center')}>
          {contactEmail && <a href={`mailto:${contactEmail}`} className="footer-link transition-colors">{contactEmail}</a>}
          {contactEmail && contactPhone && <span>·</span>}
          {contactPhone && <a href={`tel:${contactPhone}`} className="footer-link transition-colors">{contactPhone}</a>}
        </div>
      )}
    </div>
  );

  const ColumnLinks = ({ col }: { col: FooterColumn }) => (
    <ul className={cn('space-y-3 opacity-80', scale)}>
      {(col.links || []).map((l, li) => {
        const url = l.url || '#';
        const internal = url.startsWith('/');
        return (
          <li key={`${l.label}-${li}`}>
            {internal ? (
              <Link to={url} className="footer-link transition-colors">{l.label}</Link>
            ) : (
              <a href={url} target="_blank" rel="noopener noreferrer" className="footer-link transition-colors">
                {l.label}
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );

  const Columns = ({ collapsible = false }: { collapsible?: boolean }) => (
    <>
      {columns.map((col, ci) =>
        collapsible ? (
          <details key={`${col.title}-${ci}`} className="border-b py-2" style={sepStyle}>
            <summary className={cn(headingClass, 'mb-0 cursor-pointer list-none min-h-[44px] flex items-center')}>
              {col.title}
            </summary>
            <div className="pt-3 pb-1">
              <ColumnLinks col={col} />
            </div>
          </details>
        ) : (
          <div key={`${col.title}-${ci}`} className={cn('min-w-0', centered && 'text-center')}>
            {col.title && <h4 className={headingClass}>{col.title}</h4>}
            <ColumnLinks col={col} />
          </div>
        )
      )}
    </>
  );

  const Socials = ({ large = false }: { large?: boolean }) => (
    <div className={cn(centered && 'text-center')}>
      <h4 className={headingClass}>{cfg.socialsTitle || 'Suivez-nous'}</h4>
      <div className={cn('flex flex-wrap items-center gap-2 sm:gap-3', centered && 'justify-center')}>
        {socials.map((link, i) => {
          const brand = resolveBrand(link.label, link.url);
          const Icon = brand?.Icon || ExternalLink;
          const customIcon = (link as any).iconUrl as string | undefined;
          const iconPx = socialIconSize ?? (large ? 24 : 16);
          return (
            <motion.a
              key={`${link.label}-${i}`}
              href={link.url || '#'}
              target={link.url && link.url !== '#' ? '_blank' : undefined}
              rel="noopener noreferrer"
              aria-label={brand?.label || link.label}
              title={brand?.label || link.label}
              whileHover={{ y: -3, scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              style={sepStyle}
              className={cn(
                'group flex items-center gap-2 border transition-colors duration-200 chamfer-hud-sm',
                large ? 'px-4 py-3' : 'px-2.5 py-2',
                d.glass && 'backdrop-blur-md bg-white/5'
              )}
            >
              {(displayMode === 'icons' || displayMode === 'both') && (
                customIcon ? (
                  <img
                    src={customIcon}
                    alt=""
                    aria-hidden="true"
                    style={{ height: iconPx, width: iconPx }}
                    className="object-contain transition-transform group-hover:scale-110"
                    loading="lazy"
                    decoding="async"
                    onError={withImageFallback}
                  />
                ) : (
                  <Icon
                    style={{ height: iconPx, width: iconPx }}
                    className={cn(
                      'transition-transform group-hover:scale-110',
                      brand ? brand.color : 'opacity-70'
                    )}
                  />
                )
              )}

              {(displayMode === 'text' || displayMode === 'both') && (
                <span className="text-xs font-bold opacity-80 transition-colors">{link.label}</span>
              )}
            </motion.a>
          );
        })}
      </div>

      {(on(cfg.showInstallApp) || on(cfg.showNodeStatus)) && (
        <div className={cn('mt-4 flex items-center gap-4', centered && 'justify-center')}>
          {on(cfg.showInstallApp) && <InstallAppButton />}
          {on(cfg.showNodeStatus) && (
            <div className="hidden lg:flex items-center gap-2 opacity-50">
              <span className="text-[10px] font-mono tracking-widest">NODE_ACTIVE</span>
              <div className="w-2 h-2 bg-hud-success rounded-full animate-pulse" />
            </div>
          )}
        </div>
      )}
    </div>
  );

  const Newsletter = ({ banner = false }: { banner?: boolean }) => (
    <div className={cn(banner && 'w-full', centered && !banner && 'text-center')}>
      <div className={cn(banner && 'flex flex-col md:flex-row md:items-end md:justify-between gap-4')}>
        <div className={banner ? 'md:max-w-lg' : undefined}>
          <h4 className={headingClass}>{cfg.newsletterTitle || 'Newsletter'}</h4>
          <p className={cn(scale, 'opacity-70 mb-4')}>
            {cfg.newsletterText || 'Inscrivez-vous pour recevoir nos offres exclusives.'}
          </p>
        </div>
        <form className={cn('flex', banner && 'md:w-[420px]')} onSubmit={subscribe}>
          <Input
            type="email"
            placeholder="votre@email.com"
            required
            aria-label="Adresse email"
            className="flex-1 h-12 bg-background border-0 rounded-none text-foreground"
          />
          <Button
            type="submit"
            className="h-12 px-6 rounded-none"
            style={d.accentColor ? { backgroundColor: d.accentColor } : undefined}
          >
            {cfg.newsletterButton || "S'inscrire"}
          </Button>
        </form>
      </div>
    </div>
  );

  const LegalBar = () => (
    <div className="border-t mt-8 lg:mt-10 pt-6" style={sepStyle}>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs opacity-70">
        {legalLinks.map((l, i) => (
          <span key={l.key} className="flex items-center gap-x-5">
            {i > 0 && <span className="opacity-40">·</span>}
            <Link to={l.url} className="footer-link transition-colors">{l.label}</Link>
          </span>
        ))}
      </div>
    </div>
  );

  const BottomBar = () => (
    <div
      className="border-t mt-4 pt-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs opacity-70"
      style={sepStyle}
    >
      <p>{copyright}</p>
      {(on(cfg.showLanguageSwitch) || on(cfg.showCurrency)) && (
        <div className="flex items-center gap-4">
          {on(cfg.showLanguageSwitch) && (
            <button
              onClick={() => setLanguage(language === 'FR' ? 'EN' : 'FR')}
              className="footer-link text-xs font-bold tracking-wider transition-colors"
            >
              {language === 'FR' ? '🇫🇷 FR' : '🇬🇧 EN'}
            </button>
          )}
          {on(cfg.showCurrency) && <span className="font-mono text-xs tracking-widest">EUR €</span>}
        </div>
      )}
    </div>
  );

  /* ------------------------------- Dispositions ------------------------------- */
  const renderCustom = () => {
    const order = (cfg.sectionOrder && cfg.sectionOrder.length
      ? cfg.sectionOrder
      : (['brand', 'columns', 'socials', 'newsletter', 'legal'] as const)) as Array<
      'brand' | 'columns' | 'socials' | 'newsletter' | 'legal'
    >;
    return (
      <>
        {order.map((key) => {
          switch (key) {
            case 'brand':
              return on(cfg.showBrand) ? <div key="brand" className="mb-8"><Brand /></div> : null;
            case 'columns':
              return columns.length > 0 ? (
                <div key="columns" className={cn('grid gap-6 lg:gap-12 mb-8', columnsGridClass)}>
                  <Columns />
                </div>
              ) : null;
            case 'socials':
              return on(cfg.showSocials) ? <div key="socials" className="mb-8"><Socials /></div> : null;
            case 'newsletter':
              return on(cfg.showNewsletter) ? <div key="newsletter" className="mb-8"><Newsletter /></div> : null;
            case 'legal':
              return on(cfg.showLegalLinks) && legalLinks.length > 0 ? <LegalBar key="legal" /> : null;
            default:
              return null;
          }
        })}
        <BottomBar />
      </>
    );
  };

  const renderLayout = () => {
    switch (layout) {
      case 'custom':
        return renderCustom();
      case 'minimal':
        return (
          <div className="flex flex-col items-center gap-5 text-center">
            {on(cfg.showBrand) && footerLogo && (
              <img
                src={footerLogo}
                alt={siteName}
                className="w-auto object-contain"
                style={{ height: Math.round(logoHeight * 0.8) }}

                loading="lazy"
                onError={withImageFallback}
              />
            )}
            {on(cfg.showSocials) && <Socials />}
            {on(cfg.showLegalLinks) && legalLinks.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs opacity-70">
                {legalLinks.map((l) => (
                  <Link key={l.key} to={l.url} className="footer-link transition-colors">{l.label}</Link>
                ))}
              </div>
            )}
            <BottomBar />
          </div>
        );

      case 'editorial':
        return (
          <>
            <div className="grid gap-8 lg:gap-16 lg:grid-cols-2">
              {on(cfg.showBrand) && <Brand />}
              <div className="grid grid-cols-2 gap-6 lg:gap-10">
                <Columns />
                {on(cfg.showSocials) && <Socials />}
              </div>
            </div>
            {on(cfg.showNewsletter) && (
              <div className="border-t mt-10 pt-8" style={sepStyle}>
                <Newsletter banner />
              </div>
            )}
            {on(cfg.showLegalLinks) && legalLinks.length > 0 && <LegalBar />}
            <BottomBar />
          </>
        );

      case 'newsletter-first':
        return (
          <>
            {on(cfg.showNewsletter) && (
              <div className="border-b pb-8 mb-8" style={sepStyle}>
                <Newsletter banner />
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-10">
              {on(cfg.showBrand) && (
                <div className="col-span-2 md:col-span-1"><Brand /></div>
              )}
              <Columns />
              {on(cfg.showSocials) && <Socials />}
            </div>
            {on(cfg.showLegalLinks) && legalLinks.length > 0 && <LegalBar />}
            <BottomBar />
          </>
        );

      case 'showcase':
        return (
          <div className="flex flex-col items-center text-center gap-8 max-w-4xl mx-auto">
            {on(cfg.showBrand) && <Brand />}
            {columns.length > 0 && (
              <div className="flex flex-wrap justify-center gap-8 lg:gap-16">
                <Columns />
              </div>
            )}
            {on(cfg.showSocials) && <Socials large />}
            {on(cfg.showNewsletter) && <Newsletter />}
            {on(cfg.showLegalLinks) && legalLinks.length > 0 && <LegalBar />}
            <div className="w-full"><BottomBar /></div>
          </div>
        );

      case 'compact':
        return (
          <>
            {on(cfg.showBrand) && <Brand />}
            <div className="mt-4">
              <Columns collapsible />
            </div>
            {on(cfg.showSocials) && <div className="mt-4"><Socials /></div>}
            {on(cfg.showNewsletter) && <div className="mt-4"><Newsletter /></div>}
            {on(cfg.showLegalLinks) && legalLinks.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs opacity-70">
                {legalLinks.map((l) => (
                  <Link key={l.key} to={l.url} className="footer-link transition-colors">{l.label}</Link>
                ))}
              </div>
            )}
            <BottomBar />
          </>
        );

      default:
        return (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-12">
              {on(cfg.showBrand) && (
                <div className="col-span-2 md:col-span-1"><Brand /></div>
              )}
              <Columns />
              {on(cfg.showSocials) && <Socials />}
              {on(cfg.showNewsletter) && (
                <div className="col-span-2 md:col-span-1"><Newsletter /></div>
              )}
            </div>
            {on(cfg.showLegalLinks) && legalLinks.length > 0 && <LegalBar />}
            <BottomBar />
          </>
        );
    }
  };

  return (
    <footer
      className={cn(
        'footer-dyn border-border transition-all duration-500',
        borderTopClass,
        padding,
        d.glass && 'backdrop-blur-xl',
        offsetClassName
      )}
      style={style}
    >
      <div className={containerClass}>
        {renderLayout()}

        {/* Paiement sécurisé & Avis clients */}
        {(on(cfg.showPayments) || on(cfg.showReviews)) && (
          <div
            className="mt-8 grid grid-cols-1 gap-8 border-t pt-6 lg:grid-cols-2 lg:gap-12"
            style={sepStyle}
          >
            {on(cfg.showPayments) && (
              <FooterPaymentBadges
                badges={cfg.paymentBadges}
                customBadges={cfg.customPaymentBadges}
                height={cfg.paymentBadgeHeight}

                title={cfg.paymentsTitle}
                note={cfg.paymentsNote}
                centered={centered}
                headingClassName={headingClass}
                borderStyle={sepStyle}
              />
            )}
            {on(cfg.showReviews) && (
              <FooterReviews
                title={cfg.reviewsTitle}
                text={cfg.reviewsText}
                ctaLabel={cfg.reviewsCtaLabel}
                ctaUrl={cfg.reviewsCtaUrl}
                showTrustpilot={cfg.reviewsShowTrustpilot === true}
                centered={centered}
                headingClassName={headingClass}
                scaleClassName={scale}
                borderStyle={sepStyle}
              />
            )}
          </div>
        )}

        {/* Trustpilot */}
        {on(cfg.showTrustpilot) && s?.trustpilot?.enabled && s?.trustpilot?.showInFooter !== false && (
          <div className="pt-6">
            <TrustpilotWidget variant="micro" />
          </div>
        )}
      </div>
    </footer>
  );
}
