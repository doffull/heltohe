import { ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { BrandLogo } from '@/components/layout/BrandLogo';
import TrustpilotWidget from '@/components/TrustpilotWidget';
import { resolveBrand } from '@/components/icons/BrandIcons';

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
  const siteName = designSettings.siteName || 'Mon Site';
  const siteTagline = designSettings.siteTagline;
  const contactEmail = designSettings.contactEmail;
  const contactPhone = designSettings.contactPhone;

  return (
    <footer className="relative z-20 border-t border-border/30 bg-background/80 backdrop-blur-sm">
      <div className="px-6 py-8 lg:px-12">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-4">
              <BrandLogo variant="footer" />
              <div className="hud-text text-sm text-muted-foreground">
                <span className="text-primary">© {new Date().getFullYear()}</span> {siteName.toUpperCase()}
              </div>
              <div className="hidden md:block w-px h-4 bg-border" />
              <div className="hidden md:block hud-text text-xs text-muted-foreground/60">
                {language === 'FR' ? 'TOUS DROITS RÉSERVÉS' : 'ALL RIGHTS RESERVED'}
              </div>
            </div>
            {siteTagline && (
              <p className="hud-text text-xs text-muted-foreground/50">{siteTagline}</p>
            )}
            {(contactEmail || contactPhone) && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground/50 hud-text">
                {contactEmail && <span>{contactEmail}</span>}
                {contactEmail && contactPhone && <span>·</span>}
                {contactPhone && <span>{contactPhone}</span>}
              </div>
            )}
          </div>
          
          {/* Social Links */}
          <div className="flex items-center gap-2 sm:gap-3">
            {(() => {
              const configured = socialLinks || [];
              const merged = [...configured];
              DEFAULT_SOCIALS.forEach((d) => {
                const exists = configured.some((l) =>
                  `${l.label} ${l.url}`.toLowerCase().includes(d.label.toLowerCase())
                );
                if (!exists) merged.push(d);
              });
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

          
          {/* System Info */}
          <div className="hidden lg:flex items-center gap-4 text-muted-foreground/50">
            <span className="hud-text text-[10px]">NODE_ACTIVE</span>
            <div className="w-2 h-2 bg-hud-success rounded-full animate-pulse" />
          </div>
        </div>
      </div>
      
      {/* Trustpilot */}
      {(designSettings as any)?.trustpilot?.enabled && (designSettings as any)?.trustpilot?.showInFooter !== false && (
        <div className="px-6 lg:px-12 pb-6">
          <TrustpilotWidget variant="micro" />
        </div>
      )}

      {/* Decorative line */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </footer>
  );
}
