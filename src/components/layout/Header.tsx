import { Globe, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { Language } from '@/types';
import { BrandLogo } from '@/components/layout/BrandLogo';

export function Header() {
  const { language, setLanguage, designSettings } = useApp();
  
  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
  };
  
  return (
    <header className="fixed top-0 left-16 lg:left-64 right-0 z-30 h-14 bg-background/80 backdrop-blur-sm border-b border-border/30">
      <div className="h-full px-4 lg:px-8 flex items-center justify-between">
        {/* Left side - Logo + System info */}
        <div className="flex items-center gap-4">
          {designSettings.showLogo !== false && <BrandLogo variant="header" />}
          <div className="hidden md:flex items-center gap-2 hud-text text-xs text-muted-foreground">
            <span className="text-primary">//</span>
            <span>{designSettings.backgroundWatermark}</span>
          </div>
        </div>
        
        {/* Right side - Language selector */}
        <div className="flex items-center gap-4">
          {/* Language Toggle */}
          <div className="flex items-center gap-1 bg-secondary/50 p-1 chamfer-hud-sm">
            <button
              onClick={() => handleLanguageChange('FR')}
              className={cn(
                "px-3 py-1.5 hud-text text-xs transition-all duration-200",
                language === 'FR' 
                  ? "bg-primary text-primary-foreground chamfer-hud-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              FR
            </button>
            <button
              onClick={() => handleLanguageChange('EN')}
              className={cn(
                "px-3 py-1.5 hud-text text-xs transition-all duration-200",
                language === 'EN' 
                  ? "bg-primary text-primary-foreground chamfer-hud-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              EN
            </button>
          </div>
          
          {/* Globe indicator */}
          <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span className="hud-text text-xs">{language === 'FR' ? 'FRANÇAIS' : 'ENGLISH'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export function TranslationOverlay() {
  const { isTranslating, t } = useApp();
  
  if (!isTranslating) return null;
  
  return (
    <div className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-md flex items-center justify-center">
      <div className="text-center space-y-6 animate-fade-in">
        <RefreshCw className="h-12 w-12 text-primary mx-auto animate-spin" />
        <div className="space-y-2">
          <p className="hud-text text-lg text-primary tracking-widest">
            {t('recalibrating')}
          </p>
          <div className="w-48 h-1 bg-muted mx-auto overflow-hidden">
            <div className="h-full bg-primary animate-terminal-type" />
          </div>
        </div>
      </div>
    </div>
  );
}
