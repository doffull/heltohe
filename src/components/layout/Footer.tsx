import { Instagram, Twitter, Youtube, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';

const socialIcons: Record<string, React.ElementType> = {
  INSTAGRAM: Instagram,
  TWITTER: Twitter,
  YOUTUBE: Youtube,
};

export function Footer() {
  const { designSettings, language } = useApp();
  const { socialLinks, socialDisplayMode } = designSettings;
  
  return (
    <footer className="relative z-20 border-t border-border/30 bg-background/80 backdrop-blur-sm">
      <div className="px-6 py-8 lg:px-12">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-4">
            <div className="hud-text text-sm text-muted-foreground">
              <span className="text-primary">© 2024</span> LVTK6 CONCEPT
            </div>
            <div className="hidden md:block w-px h-4 bg-border" />
            <div className="hidden md:block hud-text text-xs text-muted-foreground/60">
              {language === 'FR' ? 'TOUS DROITS RÉSERVÉS' : 'ALL RIGHTS RESERVED'}
            </div>
          </div>
          
          {/* Social Links */}
          <div className="flex items-center gap-4">
            {socialLinks.map((link) => {
              const Icon = socialIcons[link.label] || ExternalLink;
              
              return (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "group flex items-center gap-2 px-3 py-2 transition-all duration-200",
                    "hover:bg-primary/10 border border-transparent hover:border-primary/30",
                    "chamfer-hud-sm"
                  )}
                >
                  {(socialDisplayMode === 'icons' || socialDisplayMode === 'both') && (
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                  {(socialDisplayMode === 'text' || socialDisplayMode === 'both') && (
                    <span className="hud-text text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                      {link.label}
                    </span>
                  )}
                </a>
              );
            })}
          </div>
          
          {/* System Info */}
          <div className="hidden lg:flex items-center gap-4 text-muted-foreground/50">
            <span className="hud-text text-[10px]">NODE_ACTIVE</span>
            <div className="w-2 h-2 bg-hud-success rounded-full animate-pulse" />
          </div>
        </div>
      </div>
      
      {/* Decorative line */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </footer>
  );
}
