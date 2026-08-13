import { SyntheticEvent } from 'react';
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
import type { FooterConfig, FooterColumn } from '@/types';
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

interface FooterProps {
  /** Classe de décalage appliquée quand la sidebar est active. */
  offsetClassName?: string;
}

export function Footer({ offsetClassName }: FooterProps) {
  const { designSettings, language, setLanguage } = useApp();
  const s = designSettings as any;
  const { socialLinks, socialDisplayMode } = designSettings;
  const cfg: FooterConfig = (s?.footerConfig ?? {}) as FooterConfig;
  const on = (v: boolean | undefined) => v !== false; // activé par défaut

  const siteName = designSettings.siteName || 'Mon Site';
  const siteTagline = designSettings.siteTagline;
  const footerLogo = s.footerLogo || s.hudLogo;
  const brandText = cfg.brandText ?? DEFAULT_BRAND_TEXT;
  const contactEmail = on(cfg.showEmail) ? designSettings.contactEmail : '';
  const contactPhone = on(cfg.showPhone) ? designSettings.contactPhone : '';
  const showContact = on(cfg.showContact);

  const rawColumns = cfg.columns && cfg.columns.length ? cfg.columns : DEFAULT_COLUMNS;
  const columns = rawColumns.filter(
    (c) => (c.title || '').trim() || (c.links || []).length
  );

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
      DEFAULT_SOCIALS.forEach((d) => {
        const exists = configured.some((l) =>
          `${l.label} ${l.url}`.toLowerCase().includes(d.label.toLowerCase())
        );
        if (!exists) merged.push(d);
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

  return (
    <footer
      className={cn(
        'border-t border-border py-8 mt-4 lg:py-16 lg:mt-10 transition-all duration-500',
        offsetClassName
      )}
      style={{
        backgroundColor: s.footerBgColor || undefined,
        color: s.footerTextColor || undefined,
      }}
    >
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-12">
          {/* Marque */}
          {on(cfg.showBrand) && (
            <div className="col-span-2 md:col-span-1">
              {footerLogo ? (
                <img
                  src={footerLogo}
                  alt={siteName}
                  className="h-10 w-auto object-contain mb-4 lg:mb-6"
                  width={160}
                  height={40}
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
              {brandText && (
                <p className="text-sm text-muted-foreground leading-relaxed">{brandText}</p>
              )}
              {siteTagline && on(cfg.showTagline) && (
                <p className="text-xs text-muted-foreground/60 mt-2">{siteTagline}</p>
              )}
              {showContact && (contactEmail || contactPhone) && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {contactEmail && <a href={`mailto:${contactEmail}`} className="hover:text-foreground transition-colors">{contactEmail}</a>}
                  {contactEmail && contactPhone && <span>·</span>}
                  {contactPhone && <a href={`tel:${contactPhone}`} className="hover:text-foreground transition-colors">{contactPhone}</a>}
                </div>
              )}
            </div>
          )}

          {/* Colonnes de liens */}
          {columns.map((col, ci) => (
            <div key={`${col.title}-${ci}`} className="min-w-0">
              {col.title && (
                <h4 className="font-bold uppercase tracking-wider mb-4 lg:mb-6 text-sm">{col.title}</h4>
              )}
              <ul className="space-y-3 text-sm text-muted-foreground">
                {(col.links || []).map((l, li) => {
                  const url = l.url || '#';
                  const internal = url.startsWith('/');
                  return (
                    <li key={`${l.label}-${li}`}>
                      {internal ? (
                        <Link to={url} className="hover:text-foreground transition-colors">{l.label}</Link>
                      ) : (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                          {l.label}
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* Réseaux sociaux */}
          {on(cfg.showSocials) && (
            <div>
              <h4 className="font-bold uppercase tracking-wider mb-4 lg:mb-6 text-sm">
                {cfg.socialsTitle || 'Suivez-nous'}
              </h4>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {socials.map((link, i) => {
                  const brand = resolveBrand(link.label, link.url);
                  const Icon = brand?.Icon || ExternalLink;
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
                      className={cn(
                        'group flex items-center gap-2 px-2.5 py-2 border border-border/50 transition-colors duration-200',
                        'hover:border-primary/40 hover:bg-primary/5 chamfer-hud-sm'
                      )}
                    >
                      {(displayMode === 'icons' || displayMode === 'both') && (
                        <Icon
                          className={cn(
                            'h-4 w-4 transition-transform group-hover:scale-110',
                            brand ? brand.color : 'text-muted-foreground'
                          )}
                        />
                      )}
                      {(displayMode === 'text' || displayMode === 'both') && (
                        <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                          {link.label}
                        </span>
                      )}
                    </motion.a>
                  );
                })}
              </div>

              {(on(cfg.showInstallApp) || on(cfg.showNodeStatus)) && (
                <div className="mt-4 flex items-center gap-4">
                  {on(cfg.showInstallApp) && <InstallAppButton />}
                  {on(cfg.showNodeStatus) && (
                    <div className="hidden lg:flex items-center gap-2 text-muted-foreground/50">
                      <span className="text-[10px] font-mono tracking-widest">NODE_ACTIVE</span>
                      <div className="w-2 h-2 bg-hud-success rounded-full animate-pulse" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Newsletter */}
          {on(cfg.showNewsletter) && (
            <div className="col-span-2 md:col-span-1">
              <h4 className="font-bold uppercase tracking-wider mb-4 lg:mb-6 text-sm">
                {cfg.newsletterTitle || 'Newsletter'}
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                {cfg.newsletterText || 'Inscrivez-vous pour recevoir nos offres exclusives.'}
              </p>
              <form className="flex" onSubmit={subscribe}>
                <Input
                  type="email"
                  placeholder="votre@email.com"
                  required
                  className="flex-1 h-12 bg-background border-0 rounded-none"
                />
                <Button type="submit" className="h-12 px-6 rounded-none">
                  {cfg.newsletterButton || "S'inscrire"}
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* Liens légaux */}
        {on(cfg.showLegalLinks) && legalLinks.length > 0 && (
          <div className="border-t border-border mt-8 lg:mt-10 pt-6">
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              {legalLinks.map((l, i) => (
                <span key={l.key} className="flex items-center gap-x-5">
                  {i > 0 && <span className="text-border">·</span>}
                  <Link to={l.url} className="hover:text-foreground transition-colors">{l.label}</Link>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Bas de footer */}
        <div className="border-t border-border mt-4 pt-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>{copyright}</p>
          {(on(cfg.showLanguageSwitch) || on(cfg.showCurrency)) && (
            <div className="flex items-center gap-4">
              {on(cfg.showLanguageSwitch) && (
                <button
                  onClick={() => setLanguage(language === 'FR' ? 'EN' : 'FR')}
                  className="text-xs font-bold tracking-wider hover:text-foreground transition-colors"
                >
                  {language === 'FR' ? '🇫🇷 FR' : '🇬🇧 EN'}
                </button>
              )}
              {on(cfg.showCurrency) && (
                <span className="font-mono text-xs tracking-widest">EUR €</span>
              )}
            </div>
          )}
        </div>

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
