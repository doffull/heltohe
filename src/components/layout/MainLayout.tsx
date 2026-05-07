import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useApp } from '@/context/AppContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCategories } from '@/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { MannequinHotspots } from './MannequinHotspot';
import { SidebarProductHUD } from './SidebarProductHUD';
import { ChatBotWidget } from './ChatBotWidget';
import { SubscribeFab } from './SubscribeFab';
import { SidebarNewsletter } from './SidebarNewsletter';
import { NewsletterPopupHost } from '@/components/home/NewsletterPopupHost';
import { VoiceCommandFab } from '@/components/voice/VoiceCommandFab';
import { InlineEditable } from '@/components/visual-editor/InlineEditable';
import { 
  Search, 
  ShoppingBag, 
  User, 
  Menu,
  X,
  ChevronRight,
  PanelLeft,
  Shield,
  Bell,
  Check,
  Bot,
  Mail as MailIcon
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MainLayoutProps {
  children: ReactNode;
}

const DEFAULT_NAV_ITEMS = [
  { href: '/', label: 'Accueil' },
  { href: '/boutique', label: 'Boutique' },
  { href: '/a-propos', label: 'À Propos' },
  { href: '/contact', label: 'Contact' },
];

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const { itemCount } = useCart();
  const { designSettings, language, setLanguage, updateDesignSettings } = useApp();
  const isMobile = useIsMobile();
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(false);
  const [sidebarClosedByUser, setSidebarClosedByUser] = useState(false);
  const [mobileSidebarClosedByUser, setMobileSidebarClosedByUser] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: dbCategories = [] } = useCategories();

  const isHomePage = location.pathname === '/';

  const headerPreset = (designSettings as any).headerPreset || 'classic';
  const headerBgColor = (designSettings as any).headerBgColor || '';
  const headerTextColor = (designSettings as any).headerTextColor || '';
  const headerFixed = (designSettings as any).headerFixed !== false;
  const topBanner = (designSettings as any).topBanner || { enabled: false, text: '', bgColor: '#000000', textColor: '#ffffff' };
  const footerLogo = (designSettings as any).footerLogo || '';
  const headerNavItems: { label: string; href: string }[] = (designSettings as any).headerNavItems;
  const ds = designSettings as any;

  // ─── Global CSS variable injection ───
  // Convert hex → HSL string for CSS variable compatibility
  useEffect(() => {
    function hexToHsl(hex: string): string | null {
      if (!hex || hex === 'transparent') return null;
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0;
      const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    }

    const root = document.documentElement;
    const apply = (cssVar: string, hex: string | undefined) => {
      if (hex) {
        const hsl = hexToHsl(hex);
        if (hsl) root.style.setProperty(cssVar, hsl);
        else root.style.removeProperty(cssVar);
      } else {
        root.style.removeProperty(cssVar);
      }
    };

    apply('--background', ds.globalBgColor);
    apply('--foreground', ds.globalTextColor);
    apply('--card', ds.globalCardColor);
    apply('--muted-foreground', ds.globalMutedColor);
    apply('--primary', ds.accentColor);
  }, [ds.globalBgColor, ds.globalTextColor, ds.globalCardColor, ds.globalMutedColor, ds.accentColor]);

  // Normalize slug helper — identical to CategoryPageRouter for consistency
  const normalizeSlug = (s: string) =>
    s.toLowerCase().replace(/\s+/g, '-').replace(/[àâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/[ùûü]/g, 'u').replace(/ç/g, 'c');

  // Build dynamic nav items with DB categories
  const categoryNavItems = dbCategories
    .filter(c => !c.parentId)
    .map(c => ({
      href: `/${c.slug || normalizeSlug(c.title)}`,
      label: c.title,
    }));

  const baseNavItems = headerNavItems && headerNavItems.length > 0 ? headerNavItems : DEFAULT_NAV_ITEMS;
  // Insert category items after "Boutique" if they exist
  const navItems = categoryNavItems.length > 0
    ? [
        ...baseNavItems.filter(i => i.href === '/' || i.href === '/boutique'),
        ...categoryNavItems,
        ...baseNavItems.filter(i => i.href !== '/' && i.href !== '/boutique'),
      ]
    : baseNavItems;

  const showSidebar = isHomePage;
  const sidebarActive = showSidebar && desktopSidebarOpen;

  // Auto-open sidebar after configurable delay on home page
  // sidebarReappearDelay: number (ms) or 0 = OFF
  const sidebarReappearDelay = (designSettings as any).sidebarReappearDelay ?? (designSettings as any).sidebarDelay ?? 10000;
  // Desktop auto-open — always respect admin-configured delay, no cap
  useEffect(() => {
    if (!isMobile && isHomePage && sidebarReappearDelay > 0 && !desktopSidebarOpen) {
      const timer = setTimeout(() => {
        setDesktopSidebarOpen(true);
        setSidebarClosedByUser(false);
      }, sidebarReappearDelay);
      return () => clearTimeout(timer);
    }
  }, [isMobile, isHomePage, sidebarReappearDelay, sidebarClosedByUser, desktopSidebarOpen]);

  // Mobile auto-open — always respect admin-configured delay, no cap
  useEffect(() => {
    if (isMobile && isHomePage && sidebarReappearDelay > 0 && !sidebarOpen) {
      const timer = setTimeout(() => {
        setSidebarOpen(true);
        setMobileSidebarClosedByUser(false);
      }, sidebarReappearDelay);
      return () => clearTimeout(timer);
    }
  }, [isMobile, isHomePage, sidebarReappearDelay, mobileSidebarClosedByUser, sidebarOpen]);

  // Admin notifications - unread messages
  const { data: messages = [] } = useQuery({
    queryKey: ['admin-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!isAdmin,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('messages').update({ is_read: true }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-messages'] }),
  });

  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Banner */}
      {topBanner.enabled && topBanner.text && (
        <div
          className={cn(
            "text-center text-xs py-2 px-4 font-medium tracking-wider transition-all duration-500",
            sidebarActive ? "lg:ml-[35%]" : "lg:ml-0"
          )}
          style={{ backgroundColor: topBanner.bgColor || '#000', color: topBanner.textColor || '#fff' }}
        >
          {topBanner.link ? (
            <Link to={topBanner.link} className="hover:underline">{topBanner.text}</Link>
          ) : topBanner.text}
        </div>
      )}


      <header
        className={cn(
          "top-0 left-0 right-0 z-40 border-b border-border header-container transition-all duration-500",
          headerFixed ? "fixed" : "sticky",
          headerPreset === 'transparent' ? "bg-transparent border-transparent" : "bg-background",
          sidebarActive ? "lg:ml-[35%]" : "lg:ml-0"
        )}
        style={{
          backgroundColor: headerPreset === 'transparent' ? 'transparent' : (headerBgColor || undefined),
          color: headerTextColor || undefined,
        }}
      >
        <div className="container mx-auto px-4">
          <div className={cn(
            "flex items-center h-14 lg:h-20",
            headerPreset === 'centered' ? "flex-col justify-center gap-1 h-auto py-3 lg:py-4" : "",
            headerPreset === 'fullwidth' ? "gap-6" : "",
          )}>
            {/* Logo in header - always visible on all pages */}
            <Link to="/" className={cn(
              "flex items-center gap-2 mr-auto",
              headerPreset === 'centered' ? "justify-center" : ""
            )}>
              {designSettings.hudLogo ? (
                <img 
                  src={designSettings.hudLogo} 
                  alt="Logo" 
                  className={cn(
                    "w-auto object-contain",
                    headerPreset === 'centered' ? "h-8 lg:h-12" : "h-8 lg:h-10"
                  )}
                />
              ) : (
                <span className="font-bold text-base tracking-wider uppercase">
                  <InlineEditable
                    fieldKey="header-sitename"
                    value={(designSettings as any).siteName || 'LVTK6'}
                    onChange={(v) => updateDesignSettings({ siteName: v } as any)}
                    as="span"
                    className="font-bold text-base tracking-wider uppercase"
                  />
                </span>
              )}
            </Link>

            {/* Desktop Navigation */}
            <nav className={cn(
              "items-center",
              sidebarActive ? "gap-3 xl:gap-5" : "gap-6 xl:gap-8",
              headerPreset === 'minimal' ? "hidden" : "hidden lg:flex",
              headerPreset === 'fullwidth' ? "flex-1 justify-center" : "",
              headerPreset === 'centered' ? "justify-center" : "",
            )}>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "relative font-medium uppercase tracking-wider transition-colors hover:text-foreground group whitespace-nowrap",
                    sidebarActive ? "text-[11px] xl:text-xs" : "text-xs xl:text-sm",
                    location.pathname === item.href ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {item.label}
                  <span className={`absolute -bottom-1 left-0 w-full h-px bg-foreground transform origin-left transition-transform duration-300 ${
                    location.pathname === item.href ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                  }`} />
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className={cn("flex items-center ml-auto", sidebarActive ? "gap-1 xl:gap-2" : "gap-2 lg:gap-3")}>
              {/* Search - Expandable (hidden when sidebar pushes header) */}
              <div className={cn(
                "items-center transition-all duration-300",
                searchOpen ? 'w-48 xl:w-64' : 'w-10',
                sidebarActive ? "hidden xl:flex" : "hidden md:flex"
              )}>
                {searchOpen ? (
                  <div className="relative w-full">
                    <Input 
                      type="text" 
                      placeholder="Rechercher..." 
                      className="w-full h-10 pr-10 bg-secondary border-0 focus-visible:ring-1"
                      autoFocus
                      onBlur={() => setSearchOpen(false)}
                    />
                    <Button variant="ghost" size="icon" className="absolute right-0 top-0" onClick={() => setSearchOpen(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)}>
                    <Search className="h-5 w-5" />
                  </Button>
                )}
              </div>

              {/* Chatbot trigger */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setChatOpen(true)}
                className="gap-1.5 px-2 lg:px-3"
                title="Assistant"
              >
                <Bot className="h-5 w-5" />
                <span className="hidden xl:inline text-xs font-medium uppercase tracking-wider">Aide</span>
              </Button>

              {/* Cart */}
              <Link to="/panier">
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingBag className="h-5 w-5" />
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-foreground text-background text-xs w-5 h-5 flex items-center justify-center font-medium">
                      {itemCount > 9 ? '9+' : itemCount}
                    </span>
                  )}
                </Button>
              </Link>

              {/* User */}
              <Link to={user ? '/compte' : '/auth'}>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </Link>

              {/* Admin */}
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="ghost" size="icon">
                    <Shield className="h-5 w-5" />
                  </Button>
                </Link>
              )}

              {/* Language selector */}
              <button
                onClick={() => setLanguage(language === 'FR' ? 'EN' : 'FR')}
                className={cn(
                  "text-xs font-bold tracking-wider text-muted-foreground hover:text-foreground transition-colors",
                  sidebarActive ? "hidden xl:block" : "hidden md:block"
                )}
              >
                {language}
              </button>

              {/* Mobile Menu */}
              <Sheet>
                <SheetTrigger asChild className={headerPreset === 'minimal' ? '' : 'lg:hidden'}>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[320px] bg-background">
                  <div className="flex flex-col gap-6 mt-8">
                    {/* Mobile Search */}
                    <div className="relative">
                      <Input 
                        type="text" 
                        placeholder="Rechercher..." 
                        className="w-full h-12 pl-12 bg-secondary border-0"
                      />
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    </div>

                    {/* Nav Links */}
                    <Link to="/" className="flex items-center justify-between py-3 text-lg font-medium uppercase tracking-wider border-b border-border text-muted-foreground">
                      Accueil <ChevronRight className="h-5 w-5" />
                    </Link>
                    <Link to="/boutique" className="flex items-center justify-between py-3 text-lg font-medium uppercase tracking-wider border-b border-border text-muted-foreground">
                      Boutique <ChevronRight className="h-5 w-5" />
                    </Link>

                    {/* Dynamic Categories with subcategories */}
                    {dbCategories.filter(c => !c.parentId).map((cat) => {
                      const subs = dbCategories.filter(c => c.parentId === cat.id);
                      const catHref = `/${cat.slug || encodeURIComponent(cat.title.toLowerCase())}`;
                      return (
                        <div key={cat.id}>
                          <Link
                            to={catHref}
                            className={`flex items-center justify-between py-3 text-lg font-medium uppercase tracking-wider border-b border-border ${
                              location.pathname === catHref ? 'text-foreground' : 'text-muted-foreground'
                            }`}
                          >
                            {cat.title}
                            <ChevronRight className="h-5 w-5" />
                          </Link>
                          {subs.length > 0 && (
                            <div className="pl-4">
                              {subs.map(sub => (
                                <Link
                                  key={sub.id}
                                  to={`/${sub.slug || encodeURIComponent(sub.title.toLowerCase())}`}
                                  className="flex items-center justify-between py-2 text-sm font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
                                >
                                  {sub.title}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <Link to="/a-propos" className="flex items-center justify-between py-3 text-lg font-medium uppercase tracking-wider border-b border-border text-muted-foreground">
                      À Propos <ChevronRight className="h-5 w-5" />
                    </Link>

                    <div className="mt-4 pt-4 border-t border-border">
                      <Link to="/panier" className="flex items-center justify-between py-3">
                        <span className="text-lg font-medium">Panier</span>
                        <span className="text-muted-foreground">({itemCount})</span>
                      </Link>
                      <Link to={user ? '/compte' : '/auth'} className="flex items-center justify-between py-3">
                        <span className="text-lg font-medium">{user ? 'Mon Compte' : 'Connexion'}</span>
                        <ChevronRight className="h-5 w-5" />
                      </Link>
                      {isAdmin && (
                        <Link to="/admin" className="flex items-center justify-between py-3">
                          <span className="text-lg font-medium">Administration</span>
                          <Shield className="h-5 w-5" />
                        </Link>
                      )}
                      <button
                        onClick={() => setLanguage(language === 'FR' ? 'EN' : 'FR')}
                        className="flex items-center justify-between py-3 w-full"
                      >
                        <span className="text-lg font-medium">Langue</span>
                        <span className="text-muted-foreground">{language}</span>
                      </button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Toggle Button - Only on home page */}
      {showSidebar && (
        <button
          onClick={() => {
            setSidebarOpen(!sidebarOpen);
            if (sidebarOpen) setMobileSidebarClosedByUser(true);
          }}
          className="fixed bottom-6 left-6 z-[60] lg:hidden w-12 h-12 bg-foreground text-background flex items-center justify-center transition-all duration-300 hover:scale-105 bevel-corners-sm"
          aria-label="Ouvrir le panneau"
        >
          <PanelLeft className={`h-5 w-5 transition-transform duration-300 ${sidebarOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && showSidebar && (
        <div 
          className="fixed inset-0 bg-black/50 z-[45] lg:hidden"
          onClick={() => { setSidebarOpen(false); setMobileSidebarClosedByUser(true); }}
        />
      )}

      {/* Desktop Sidebar Toggle - Reopen button - Only on home page */}
      {showSidebar && !desktopSidebarOpen && (
        <button
          onClick={() => setDesktopSidebarOpen(true)}
          className="fixed bottom-6 left-6 z-[60] hidden lg:flex w-12 h-12 bg-foreground text-background items-center justify-center transition-all duration-300 hover:scale-105 bevel-corners-sm"
          aria-label="Ouvrir le panneau"
        >
          <PanelLeft className="h-5 w-5" />
        </button>
      )}

      {/* Left Sidebar Panel - Only on home page */}
      {showSidebar && (
        <div className={cn(
          "sidebar-left-panel fixed top-0 left-0 h-screen z-50 transition-transform duration-500 ease-out w-screen lg:w-[35%]",
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          desktopSidebarOpen ? 'lg:translate-x-0' : 'lg:-translate-x-full'
        )}>
          {/* Desktop close button */}
          <button
             onClick={() => { setDesktopSidebarOpen(false); setSidebarClosedByUser(true); }}
            className="absolute top-4 right-4 z-30 hidden lg:flex w-8 h-8 bg-background/80 text-foreground items-center justify-center rounded-full hover:bg-background transition-colors"
            aria-label="Fermer le panneau"
          >
            <X className="h-4 w-4" />
          </button>
          {/* Mobile close button - larger and more visible */}
          <button
            onClick={() => { setSidebarOpen(false); setMobileSidebarClosedByUser(true); }}
            className="absolute top-4 right-4 z-30 flex lg:hidden w-12 h-12 bg-background/90 text-foreground items-center justify-center rounded-full shadow-lg hover:bg-background transition-colors backdrop-blur"
            aria-label="Fermer le panneau"
          >
            <X className="h-6 w-6" />
          </button>
          {/* Mannequin Background Image - Fixed */}
          <div 
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: (isMobile && (designSettings as any).mobileSidebarImage) 
                ? `url(${(designSettings as any).mobileSidebarImage})` 
                : designSettings.sidebarImage 
                  ? `url(${designSettings.sidebarImage})` 
                  : undefined,
              backgroundColor: designSettings.sidebarImage ? undefined : 'hsl(var(--secondary))',
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
              backgroundAttachment: isMobile ? 'scroll' : 'fixed',
              opacity: designSettings.sidebarImageOpacity ?? 1,
            }}
          />
          
          {/* Interactive Hotspots */}
          <div className="absolute inset-0 z-15">
            <MannequinHotspots />
          </div>
          
          {/* Sidebar Content - Product Card HUD */}
          <SidebarProductHUD />
        </div>
      )}

      {/* Admin Notification Bell */}
      {isAdmin && (
        <Sheet open={notifOpen} onOpenChange={setNotifOpen}>
          <SheetTrigger asChild>
            <button className="fixed bottom-20 right-6 z-[60] w-12 h-12 bg-foreground text-background flex items-center justify-center rounded-full shadow-lg hover:scale-105 transition-transform">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[360px] bg-background p-0">
            <div className="p-4 border-b border-border">
              <h3 className="font-bold text-lg">Messages clients</h3>
              <p className="text-xs text-muted-foreground">{unreadCount} non lu{unreadCount > 1 ? 's' : ''}</p>
            </div>
            <div className="overflow-y-auto max-h-[calc(100vh-80px)]">
              {messages.length === 0 ? (
                <p className="text-muted-foreground text-center py-12">Aucun message</p>
              ) : messages.map((msg) => (
                <div key={msg.id} className={`p-4 border-b border-border ${!msg.is_read ? 'bg-primary/5' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{msg.name}</p>
                      <p className="text-xs text-muted-foreground">{msg.email}</p>
                      <p className="text-sm mt-1 line-clamp-2">{msg.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(msg.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                      </p>
                    </div>
                    {!msg.is_read && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => markRead.mutate(msg.id)}>
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Main Content */}
      <main className={cn(
        "transition-all duration-500",
        isHomePage ? "" : (headerFixed ? "pt-14 lg:pt-20" : ""),
        !isHomePage && topBanner.enabled ? "pt-[calc(theme(spacing.14)+2rem)] lg:pt-[calc(theme(spacing.20)+2rem)]" : "",
        sidebarActive ? "lg:ml-[35%]" : "lg:ml-0"
      )}>
        {children}
      </main>

      {/* Footer */}
      <footer
        className={cn(
          "border-t border-border py-8 mt-4 lg:py-16 lg:mt-10 transition-all duration-500",
          sidebarActive ? "lg:ml-[35%]" : "lg:ml-0"
        )}
        style={{
          backgroundColor: ds.footerBgColor || undefined,
          color: ds.footerTextColor || undefined,
        }}
      >
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              {footerLogo || designSettings.hudLogo ? (
                <img 
                  src={footerLogo || designSettings.hudLogo} 
                  alt="Logo" 
                  className="h-10 w-auto object-contain mb-4 lg:mb-6" 
                />
              ) : (
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-background border-2 border-foreground flex items-center justify-center transform rotate-45 mb-4 lg:mb-6">
                  <span className="transform -rotate-45 text-xs lg:text-sm font-bold">HMP</span>
                </div>
              )}
              <p className="text-sm text-muted-foreground leading-relaxed">
                Helvetica-MP. Design minimaliste et excellence fonctionnelle. Qualité premium pour l'individu moderne.
              </p>
            </div>
            
            {/* Quick Links */}
            <div>
              <h4 className="font-bold uppercase tracking-wider mb-4 lg:mb-6 text-sm">Liens Rapides</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link to="/" className="hover:text-foreground transition-colors">Accueil</Link></li>
                <li><Link to="/boutique" className="hover:text-foreground transition-colors">Boutique</Link></li>
                <li><Link to="/compte" className="hover:text-foreground transition-colors">Mon Compte</Link></li>
                <li><Link to="/a-propos" className="hover:text-foreground transition-colors">À Propos</Link></li>
              </ul>
            </div>
            
            {/* Social */}
            <div>
              <h4 className="font-bold uppercase tracking-wider mb-4 lg:mb-6 text-sm">Suivez-nous</h4>
              <div className="flex gap-3">
                <a href="#" className="social-icon">
                  <span className="text-xs font-bold">FB</span>
                </a>
                <a href="#" className="social-icon">
                  <span className="text-xs font-bold">IG</span>
                </a>
                <a href="#" className="social-icon">
                  <span className="text-xs font-bold">TK</span>
                </a>
                <a href="#" className="social-icon">
                  <span className="text-xs font-bold">YT</span>
                </a>
              </div>
            </div>
            
            {/* Newsletter */}
            <div className="col-span-2 md:col-span-1">
              <h4 className="font-bold uppercase tracking-wider mb-4 lg:mb-6 text-sm">Newsletter</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Inscrivez-vous pour recevoir nos offres exclusives.
              </p>
              <form className="flex" onSubmit={async (e) => {
                e.preventDefault();
                const emailInput = e.currentTarget.querySelector('input') as HTMLInputElement;
                const email = emailInput?.value;
                if (!email) return;
                try {
                  await supabase.from('newsletters').insert({ email });
                  emailInput.value = '';
                } catch {}
              }}>
                <Input 
                  type="email" 
                  placeholder="votre@email.com"
                  required
                  className="flex-1 h-12 bg-background border-0 rounded-none"
                />
                <Button type="submit" className="h-12 px-6 rounded-none">
                  S'inscrire
                </Button>
              </form>
            </div>
          </div>
          
          {/* Legal Links */}
          <div className="border-t border-border mt-8 lg:mt-10 pt-6">
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <Link to="/mentions-legales" className="hover:text-foreground transition-colors">Mentions légales</Link>
              <span className="text-border">·</span>
              <Link to="/cgv" className="hover:text-foreground transition-colors">CGV</Link>
              <span className="text-border">·</span>
              <Link to="/confidentialite" className="hover:text-foreground transition-colors">Politique de confidentialité</Link>
              <span className="text-border">·</span>
              <Link to="/cookies" className="hover:text-foreground transition-colors">Cookies</Link>
              <span className="text-border">·</span>
              <Link to="/retours" className="hover:text-foreground transition-colors">Retours & Échanges</Link>
            </div>
          </div>

          <div className="border-t border-border mt-4 pt-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} HELVETICA-MP. Tous droits réservés.</p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLanguage(language === 'FR' ? 'EN' : 'FR')}
                className="text-xs font-bold tracking-wider hover:text-foreground transition-colors"
              >
                {language === 'FR' ? '🇫🇷 FR' : '🇬🇧 EN'}
              </button>
              <span className="font-mono text-xs tracking-widest">EUR €</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Chatbot Widget - triggered from header */}
      <ChatBotWidget open={chatOpen} onOpenChange={setChatOpen} hideTrigger />

      {/* Subscribe FAB - hidden for admins */}
      {!isAdmin && <SubscribeFab />}
    </div>
  );
}
