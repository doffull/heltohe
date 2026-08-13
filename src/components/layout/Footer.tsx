import { ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { BrandLogo } from '@/components/layout/BrandLogo';
import TrustpilotWidget from '@/components/TrustpilotWidget';
import { resolveBrand } from '@/components/icons/BrandIcons';
import InstallAppButton from '@/components/pwa/InstallAppButton';
import type { FooterConfig } from '@/types';


/** Réseaux affichés par défaut (l'URL réelle se règle dans l'admin). */
const DEFAULT_SOCIALS = [
  { label: 'FACEBOOK', url: '#' },
  { label: 'INSTAGRAM', url: '#' },
  { label: 'TIKTOK', url: '#' },
  { label: 'YOUTUBE', url: '#' },
];


export function Footer() {
  const { designSettings, language } = useApp();
  const { socialLinks, socialDisplayMode } = designSettings;
  const cfg: FooterConfig = ((designSettings as any)?.footerConfig ?? {}) as FooterConfig;
  const on = (v: boolean | undefined) => v !== false; // activé par défaut

  const siteName = designSettings.siteName || 'Mon Site';
  const siteTagline = designSettings.siteTagline;
  const contactEmail = on(cfg.showEmail) ? designSettings.contactEmail : '';
  const contactPhone = on(cfg.showPhone) ? designSettings.contactPhone : '';
  const showContact = on(cfg.showContact);
  const columns = (cfg.columns || []).filter(c => (c.title || '').trim() || (c.links || []).length);

  const rights = language === 'FR'
    ? (cfg.rightsTextFr || 'TOUS DROITS RÉSERVÉS')
    : (cfg.rightsTextEn || 'ALL RIGHTS RESERVED');
  const copyright = cfg.copyrightText?.trim()
    ? cfg.copyrightText.replace('{year}', String(new Date().getFullYear())).replace('{site}', siteName.toUpperCase())
    : null;

  return (
    <footer className="relative z-20 border-t border-border/30 bg-background/80 backdrop-blur-sm">
      <div className="px-6 py-8 lg:px-12">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Brand */}
          {on(cfg.showBrand) && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-4">
                <BrandLogo variant="footer" />
                <div className="hud-text text-sm text-muted-foreground">
                  {copyright ? (
                    <span>{copyright}</span>
                  ) : (
                    <>
                      <span className="text-primary">© {new Date().getFullYear()}</span> {siteName.toUpperCase()}
                    </>
                  )}
                </div>
                <div className="hidden md:block w-px h-4 bg-border" />
                <div className="hidden md:block hud-text text-xs text-muted-foreground/60">
                  {rights}
                </div>
              </div>
              {siteTagline && on(cfg.showTagline) && (
                <p className="hud-text text-xs text-muted-foreground/50">{siteTagline}</p>
              )}
              {showContact && (contactEmail || contactPhone) && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground/50 hud-text">
                  {contactEmail && <span>{contactEmail}</span>}
                  {contactEmail && contactPhone && <span>·</span>}
                  {contactPhone && <span>{contactPhone}</span>}
                </div>
              )}
            </div>
          )}

          {/* Social Links */}
          {on(cfg.showSocials) && (
            <div className="flex items-center gap-2 sm:gap-3">
              {(() => {
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
                return merged.map((link, i) => {
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
                      {(socialDisplayMode === 'icons' || socialDisplayMode === 'both') && (
                        <Icon
                          className={cn(
                            'h-4 w-4 transition-transform group-hover:scale-110',
                            brand ? brand.color : 'text-muted-foreground'
                          )}
                        />
                      )}
                      {(socialDisplayMode === 'text' || socialDisplayMode === 'both') && (
                        <span className="hud-text text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                          {link.label}
                        </span>
                      )}
                    </motion.a>

                  );
                });
              })()}
            </div>
          )}


          {/* App + System Info */}
          <div className="flex items-center gap-4">
            {on(cfg.showInstallApp) && <InstallAppButton />}
            {on(cfg.showNodeStatus) && (
              <div className="hidden lg:flex items-center gap-4 text-muted-foreground/50">
                <span className="hud-text text-[10px]">NODE_ACTIVE</span>
                <div className="w-2 h-2 bg-hud-success rounded-full animate-pulse" />
              </div>
            )}
          </div>

        </div>

        {/* Colonnes de liens configurables */}
        {columns.length > 0 && (
          <div className="mt-8 pt-6 border-t border-border/30 grid grid-cols-2 md:grid-cols-4 gap-6">
            {columns.map((col, ci) => (
              <div key={`${col.title}-${ci}`} className="min-w-0">
                {col.title && (
                  <h3 className="hud-text text-xs text-foreground mb-3">{col.title.toUpperCase()}</h3>
                )}
                <ul className="space-y-2">
                  {(col.links || []).map((l, li) => {
                    const url = l.url || '#';
                    const internal = url.startsWith('/');
                    return (
                      <li key={`${l.label}-${li}`}>
                        {internal ? (
                          <Link
                            to={url}
                            className="hud-text text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {l.label}
                          </Link>
                        ) : (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hud-text text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {l.label}
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trustpilot */}
      {on(cfg.showTrustpilot) && (designSettings as any)?.trustpilot?.enabled && (designSettings as any)?.trustpilot?.showInFooter !== false && (
        <div className="px-6 lg:px-12 pb-6">
          <TrustpilotWidget variant="micro" />
        </div>
      )}

      {/* Decorative line */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </footer>
  );
}
