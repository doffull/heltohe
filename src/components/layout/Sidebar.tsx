import { Home, ShoppingBag, Info, Settings, Layers, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { ViewType } from '@/types';

interface NavItem {
  id: ViewType;
  label: string;
  labelEN: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { id: 'Home', label: 'ACCUEIL', labelEN: 'HOME', icon: Home },
  { id: 'Shop', label: 'BOUTIQUE', labelEN: 'SHOP', icon: ShoppingBag },
  { id: 'About', label: 'À PROPOS', labelEN: 'ABOUT', icon: Info },
];

export function Sidebar() {
  const { currentView, setCurrentView, language, designSettings } = useApp();
  
  return (
    <aside 
      className="fixed left-0 top-0 z-40 h-full w-16 lg:w-64 flex flex-col border-r border-border/30 transition-all duration-300"
      style={{ 
        backgroundColor: designSettings.sidebarBg,
        background: designSettings.sidebarGradient 
          ? `linear-gradient(180deg, ${designSettings.sidebarBg} 0%, rgba(0,0,0,0.95) 100%)`
          : designSettings.sidebarBg
      }}
    >
      {/* Logo Section */}
      <div className="p-4 lg:p-6 border-b border-border/20">
        <div className="flex items-center justify-center lg:justify-start gap-3">
          {designSettings.hudLogo ? (
            <img 
              src={designSettings.hudLogo} 
              alt="Logo" 
              className="h-8 lg:h-10 w-auto max-w-[120px] object-contain"
              style={{ filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.5)) drop-shadow(0 0 12px rgba(0,0,0,0.3))' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="h-8 w-8 lg:h-10 lg:w-10 bg-primary/20 flex items-center justify-center chamfer-hud-sm">
              <Layers className="h-5 w-5 text-primary" />
            </div>
          )}
          <span className="hidden lg:block hud-text text-sm font-bold text-foreground tracking-widest">
            LVTK6
          </span>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 py-6 px-2 lg:px-4 space-y-2">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 lg:py-2.5 transition-all duration-200 group",
                "hover:bg-primary/10 border border-transparent",
                "animate-slide-in-left",
                isActive && "bg-primary/20 border-primary/30 text-primary"
              )}
              style={{ 
                animationDelay: `${index * 100}ms`,
                clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)'
              }}
            >
              <Icon className={cn(
                "h-5 w-5 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
              )} />
              <span className={cn(
                "hidden lg:block hud-text text-xs tracking-wider transition-colors",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}>
                {language === 'FR' ? item.label : item.labelEN}
              </span>
              
              {/* Active indicator */}
              {isActive && (
                <div className="hidden lg:block ml-auto w-1.5 h-1.5 bg-primary rounded-full animate-pulse-glow" />
              )}
            </button>
          );
        })}
      </nav>
      
      {/* Footer section with system info */}
      <div className="p-4 lg:p-6 border-t border-border/20 space-y-4">
        {/* Admin button */}
        <button
          onClick={() => setCurrentView('Dashboard')}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 transition-all duration-200",
            "hover:bg-accent/20 border border-border/30 chamfer-hud-sm",
            currentView === 'Dashboard' && "bg-accent/30 border-accent/50"
          )}
        >
          <Settings className={cn(
            "h-5 w-5",
            currentView === 'Dashboard' ? "text-accent" : "text-muted-foreground"
          )} />
          <span className="hidden lg:block hud-text text-xs tracking-wider text-muted-foreground">
            {language === 'FR' ? 'ADMIN' : 'ADMIN'}
          </span>
        </button>
        
        {/* System status */}
        <div className="hidden lg:block space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-hud-success rounded-full animate-pulse" />
            <span className="hud-text text-[10px] text-muted-foreground">
              SYSTÈME OPÉRATIONNEL
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground/60 hud-text">
            V.2.4.1 // BUILD_4521
          </div>
        </div>
      </div>
    </aside>
  );
}
