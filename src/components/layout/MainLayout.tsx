import { ReactNode, SyntheticEvent, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useVisitorTracking } from '@/hooks/useVisitorTracking';
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
import { UnifiedFab } from './UnifiedFab';
import { BrandLogo } from './BrandLogo';
import { Footer } from './Footer';
import { MegaMenuTrigger } from './MegaMenuTrigger';
import SocialLinksRow from './SocialLinksRow';
import { SearchDialog } from './SearchDialog';
import { TopBanner } from './TopBanner';
import { resolveTopBanner } from '@/lib/bannerIcons';
// SidebarNewsletter retiré du panneau latéral
import { MiniNavbar } from '@/components/ui/mini-navbar';
import { PopupHost } from '@/components/popups/PopupHost';
import AddToCartDialog from '@/components/cart/AddToCartDialog';

import { CookieConsentBanner } from '@/components/legal/CookieConsentBanner';
import { useCookieConsent } from '@/context/CookieConsentContext';
import { InstallAppBanner } from '@/components/pwa/InstallAppBanner';

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
  Mail as MailIcon
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import LocaleSwitcher from '@/components/layout/LocaleSwitcher';

const IMAGE_FALLBACK = '/placeholder.svg';

const withImageFallback = (event: SyntheticEvent<HTMLImageElement>) => {
  const img = event.currentTarget;
  if (!img.src.endsWith(IMAGE_FALLBACK)) img.src = IMAGE_FALLBACK;
};

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

  // Ctrl/Cmd + K opens the global search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(false);
  const [sidebarClosedByUser, setSidebarClosedByUser] = useState(false);
  const [mobileSidebarClosedByUser, setMobileSidebarClosedByUser] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  
  const queryClient = useQueryClient();
  const { consent: cookieConsent, decided: cookieDecided } = useCookieConsent();
  // Le suivi d'audience ne démarre qu'avec le consentement « statistiques ».
  useVisitorTracking({ enabled: !isAdmin && cookieConsent.statistics, userId: user?.id ?? null });
  const { data: dbCategories = [] } = useCategories();

  const isHomePage = location.pathname === '/';

  const headerPreset = (designSettings as any).headerPreset || 'classic';
  const headerBgColor = (designSettings as any).headerBgColor || '';
  const headerTextColor = (designSettings as any).headerTextColor || '';
  const headerFixed = (designSettings as any).headerFixed !== false;
  const topBannerRaw = (designSettings as any).topBanner;
  const topBanner = resolveTopBanner(topBannerRaw);
  const topBannerActive = topBanner.enabled && topBanner.items.some((i) => i.text?.trim());
  const footerLogo = (designSettings as any).footerLogo || '';
  const headerNavItems: { label: string; href: string }[] = (designSettings as any).headerNavItems;
  const ds = designSettings as any;

  // ─── Global CSS variable injection ───
  // Convert any color string → HSL components, robust to short hex / rgb / hsl / named.
  useEffect(() => {
    function toHslComponents(input: string | undefined | null): string | null {
      if (!input) return null;
      const raw = String(input).trim();
      if (!raw || raw.toLowerCase() === 'transparent' || raw.toLowerCase() === 'none') return null;

      // Pass-through hsl()/hsla() — strip wrapper, keep "H S% L%"
      const hslMatch = raw.match(/^hsla?\(\s*([-\d.]+)\s*,?\s*([\d.]+)%\s*,?\s*([\d.]+)%/i);
      if (hslMatch) return `${Math.round(+hslMatch[1])} ${Math.round(+hslMatch[2])}% ${Math.round(+hslMatch[3])}%`;

      let r = 0, g = 0, b = 0;
      const rgbMatch = raw.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
      if (rgbMatch) {
        r = +rgbMatch[1] / 255; g = +rgbMatch[2] / 255; b = +rgbMatch[3] / 255;
      } else {
        // Hex: #fff | #ffff | #ffffff | #ffffffff
        let hex = raw.startsWith('#') ? raw.slice(1) : raw;
        if (!/^[0-9a-fA-F]{3,8}$/.test(hex)) {
          // Fallback: let the browser resolve named colors via a temp element
          if (typeof document !== 'undefined') {
            const probe = document.createElement('div');
            probe.style.color = raw;
            document.body.appendChild(probe);
            const computed = getComputedStyle(probe).color;
            document.body.removeChild(probe);
            const m = computed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
            if (!m) return null;
            r = +m[1] / 255; g = +m[2] / 255; b = +m[3] / 255;
          } else return null;
        } else {
          if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
          if (hex.length === 4) hex = hex.slice(0, 3).split('').map(c => c + c).join(''); // drop alpha
          if (hex.length === 8) hex = hex.slice(0, 6);
          if (hex.length !== 6) return null;
          r = parseInt(hex.slice(0, 2), 16) / 255;
          g = parseInt(hex.slice(2, 4), 16) / 255;
          b = parseInt(hex.slice(4, 6), 16) / 255;
        }
      }
      if ([r, g, b].some(n => Number.isNaN(n))) return null;

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
    const apply = (cssVar: string, value: string | undefined) => {
      // Always start from default — never leave a stale dark value applied.
      root.style.removeProperty(cssVar);
      if (!value) return;
      const hsl = toHslComponents(value);
      if (hsl) root.style.setProperty(cssVar, hsl);
      else if (typeof console !== 'undefined') console.warn(`[theme] invalid color for ${cssVar}:`, value);
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
  // Keep public layout stable: the image sidebar overlays the page, but never pushes logo/header/content.
  const sidebarActive = false;

  // Auto-open sidebar after configurable delay on home page
  // sidebarReappearDelay: number (ms) or 0 = OFF
  const sidebarReappearDelay = (designSettings as any).sidebarReappearDelay ?? (designSettings as any).sidebarDelay ?? 10000;
  // Desktop auto-open — always respect admin-configured delay, no cap
  useEffect(() => {
    if (!isMobile && isHomePage && sidebarReappearDelay > 0 && !desktopSidebarOpen && !sidebarClosedByUser) {
      const timer = setTimeout(() => {
        setDesktopSidebarOpen(true);
        setSidebarClosedByUser(false);
      }, sidebarReappearDelay);
      return () => clearTimeout(timer);
    }
  }, [isMobile, isHomePage, sidebarReappearDelay, sidebarClosedByUser, desktopSidebarOpen]);

  // Mobile auto-open — always respect admin-configured delay, no cap
  useEffect(() => {
    if (isMobile && isHomePage && sidebarReappearDelay > 0 && !sidebarOpen && !mobileSidebarClosedByUser) {
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

  // Admin customer chat logs
  const { data: chatLogs = [] } = useQuery({
    queryKey: ['admin-chat-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: !!isAdmin,
  });
  const chatCount = chatLogs.length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Banner */}
      <TopBanner
        raw={topBannerRaw}
        className={cn('transition-all duration-500', sidebarActive ? 'lg:ml-[35%]' : 'lg:ml-0')}
      />


      <div
        className={cn(
          'top-0 left-0 right-0 z-40 pointer-events-none lg:transition-all lg:duration-500',
          headerFixed ? 'fixed' : 'sticky',
          sidebarActive ? 'lg:ml-[35%]' : 'lg:ml-0',
          topBannerActive ? 'pt-9' : 'pt-2 lg:pt-3',
        )}
      >
        <MiniNavbar
          expanded={false}
          transparent={isHomePage || headerPreset === 'transparent'}
          className={cn("pointer-events-auto mx-auto w-[calc(100%-1.5rem)]", isAdmin ? "max-w-[1720px]" : "max-w-7xl")}
          style={{
            backgroundColor: (isHomePage || headerPreset === 'transparent') ? undefined : (headerBgColor || undefined),
            color: headerTextColor || undefined,
          }}
        >
        <div className="px-3 lg:px-5">
          <div className={cn(
            "flex items-center gap-2 h-12 lg:h-14 min-w-0",
            headerPreset === 'centered' ? "flex-col justify-center gap-1 h-auto py-3 lg:py-4" : "",
            headerPreset === 'fullwidth' ? "gap-6" : "",
          )}>
            {/* Logo in header - always visible, fixed dimensions to prevent update-time layout shifts */}
            <Link to="/" className={cn(
              "flex items-center gap-2 mr-auto min-w-0 shrink-0 overflow-hidden",
              headerPreset === 'centered' ? "justify-center" : ""
            )}>
              <BrandLogo
                imgClassName={cn(
                  'max-w-[9rem] sm:max-w-[12rem] lg:max-w-[14rem]',
                  headerPreset === 'centered' ? 'h-8 lg:h-12' : 'h-8 lg:h-10'
                )}
                textClassName="text-sm sm:text-base"
                maxHeight={headerPreset === 'centered' ? 48 : 40}
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className={cn(
              "items-center min-w-0",
              sidebarActive ? "gap-3 2xl:gap-5" : isAdmin ? "gap-3 xl:gap-5" : "gap-6 xl:gap-8",
              headerPreset === 'minimal' ? "hidden" : (sidebarActive ? "hidden 2xl:flex" : isAdmin ? "hidden xl:flex" : "hidden lg:flex"),
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
            <div className={cn("flex items-center ml-auto shrink-0", sidebarActive ? "gap-1 xl:gap-2" : isAdmin ? "gap-0.5 lg:gap-1 xl:gap-2" : "gap-0 lg:gap-3")}>
              {/* Search - opens global search dialog */}
              <div className={cn(
                "items-center",
                sidebarActive ? "hidden xl:flex" : "hidden md:flex"
              )}>
                <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} aria-label="Rechercher" title="Rechercher (Ctrl+K)">
                  <Search className="h-5 w-5" aria-hidden="true" />
                </Button>
              </div>



              {/* Cart */}
              <Link
                to="/panier"
                aria-label={`Panier (${itemCount} article${itemCount > 1 ? 's' : ''})`}
                title="Panier"
              >
                <Button variant="ghost" size="icon" className="relative h-8 w-8 lg:h-10 lg:w-10" tabIndex={-1}>
                  <ShoppingBag className="h-4 w-4 lg:h-5 lg:w-5" aria-hidden="true" />
                  {itemCount > 0 && (
                    <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 bg-foreground text-background text-[10px] min-w-[16px] h-4 px-0.5 flex items-center justify-center font-medium">
                      {itemCount > 9 ? '9+' : itemCount}
                    </span>
                  )}
                </Button>
              </Link>

              {/* User */}
              <Link
                to={user ? '/compte' : '/auth'}
                aria-label={user ? 'Mon compte' : 'Se connecter'}
                title={user ? 'Mon compte' : 'Se connecter'}
              >
                <Button variant="ghost" size="icon" className="h-8 w-8 lg:h-10 lg:w-10" tabIndex={-1}>
                  <User className="h-4 w-4 lg:h-5 lg:w-5" aria-hidden="true" />
                </Button>
              </Link>

              {/* Admin */}
              {isAdmin && (
                <Link to="/admin" aria-label="Administration" title="Administration">
                  <Button variant="ghost" size="icon" className="h-8 w-8 lg:h-10 lg:w-10" tabIndex={-1}>
                    <Shield className="h-4 w-4 lg:h-5 lg:w-5" aria-hidden="true" />
                  </Button>
                </Link>
              )}

              {/* Admin Notifications */}
              {isAdmin && (
                <Sheet open={notifOpen} onOpenChange={setNotifOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-8 w-8 lg:h-10 lg:w-10" title="Notifications" aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lu${unreadCount > 1 ? 's' : ''})` : ''}`}>
                      <Bell className="h-4 w-4 lg:h-5 lg:w-5" aria-hidden="true" />
                      {unreadCount > 0 && (
                        <span aria-hidden="true" className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[360px] bg-background p-0">
                    <div className="p-4 border-b border-border">
                      <h3 className="font-bold text-lg">Notifications</h3>
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

              {/* Admin Customer Chat Messages - desktop only */}
              {isAdmin && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-8 w-8 lg:h-10 lg:w-10" title="Messages clients" aria-label={`Messages clients${chatCount > 0 ? ` (${chatCount})` : ''}`}>
                      <MailIcon className="h-4 w-4 lg:h-5 lg:w-5" aria-hidden="true" />
                      {chatCount > 0 && (
                        <span aria-hidden="true" className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                          {chatCount > 9 ? '9+' : chatCount}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[400px] bg-background p-0">
                    <div className="p-4 border-b border-border">
                      <h3 className="font-bold text-lg">Messages clients</h3>
                      <p className="text-xs text-muted-foreground">{chatCount} conversation{chatCount > 1 ? 's' : ''} récente{chatCount > 1 ? 's' : ''}</p>
                    </div>
                    <div className="overflow-y-auto max-h-[calc(100vh-80px)]">
                      {chatLogs.length === 0 ? (
                        <p className="text-muted-foreground text-center py-12">Aucun message</p>
                      ) : chatLogs.map((c: any) => (
                        <div key={c.id} className="p-4 border-b border-border">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                            {format(new Date(c.created_at), 'dd MMM HH:mm', { locale: fr })} · #{(c.session_id || '').slice(0, 8)}
                          </p>
                          <p className="text-sm font-medium">👤 {c.user_message}</p>
                          {c.bot_response && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">🤖 {c.bot_response}</p>}
                        </div>
                      ))}
                    </div>
                  </SheetContent>
                </Sheet>
              )}

              {/* Langue + devise */}
              <LocaleSwitcher
                className={cn(sidebarActive ? "hidden xl:flex" : "hidden md:flex")}
              />

              {/* Mobile search trigger */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(true)}
                aria-label="Rechercher"
                title="Rechercher"
                className={cn("h-8 w-8", sidebarActive ? "xl:hidden" : "md:hidden")}
              >
                <Search className="h-4 w-4" aria-hidden="true" />
              </Button>

              {/* Réseaux sociaux (desktop, activable dans Admin → Réseaux sociaux) */}
              <SocialLinksRow placement="header" mode="icons" size={16} className="hidden lg:flex gap-1" />

              {/* MegaMenu trigger — visible toutes tailles */}
              <MegaMenuTrigger className="border border-foreground/20 hover:border-foreground" />

              {/* Mobile detailed Sheet (kept as secondary, hidden on lg+) — only burger icon */}
              <Sheet>
                <SheetTrigger asChild className="hidden">
                  <Button variant="ghost" size="icon" className="h-8 w-8 lg:h-9 lg:w-9 rounded-none" aria-label="Ouvrir le menu" title="Menu">
                    <Menu className="h-4 w-4 lg:h-[18px] lg:w-[18px]" aria-hidden="true" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[320px] bg-background">
                  <div className="flex flex-col gap-6 mt-8">
                    {/* Mobile Search */}
                    <button
                      type="button"
                      onClick={() => setSearchOpen(true)}
                      className="relative flex h-12 w-full items-center gap-3 bg-secondary px-4 text-left text-sm text-muted-foreground"
                    >
                      <Search className="h-5 w-5" aria-hidden="true" />
                      Rechercher...
                    </button>


                    {/* Réseaux sociaux */}
                    <SocialLinksRow placement="mobileMenu" mode="icons" />

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
                        <>
                          <Link to="/admin" className="flex items-center justify-between py-3">
                            <span className="text-lg font-medium">Administration</span>
                            <Shield className="h-5 w-5" />
                          </Link>
                          <Link to="/admin/notifications" className="flex items-center justify-between py-3">
                            <span className="text-lg font-medium">Notifications</span>
                            <span className="flex items-center gap-2">
                              {unreadCount > 0 && (
                                <span className="bg-destructive text-destructive-foreground text-[10px] min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full font-bold">
                                  {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                              )}
                              <Bell className="h-5 w-5" />
                            </span>
                          </Link>
                          <Link to="/admin/messages" className="flex items-center justify-between py-3">
                            <span className="text-lg font-medium">Messages clients</span>
                            <span className="flex items-center gap-2">
                              {chatCount > 0 && (
                                <span className="bg-primary text-primary-foreground text-[10px] min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full font-bold">
                                  {chatCount > 9 ? '9+' : chatCount}
                                </span>
                              )}
                              <MailIcon className="h-5 w-5" />
                            </span>
                          </Link>
                        </>
                      )}
                      <div className="flex items-center justify-between py-3 w-full">
                        <span className="text-lg font-medium">Langue &amp; devise</span>
                        <LocaleSwitcher compact className="text-sm" />
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
        </MiniNavbar>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && showSidebar && (
        <div 
          className="fixed inset-0 bg-black/50 z-[45] lg:hidden"
          onClick={() => { setSidebarOpen(false); setMobileSidebarClosedByUser(true); }}
        />
      )}

      {/* Discreet edge handle to reopen the sidebar — left edge, centered, semi-transparent */}
      {showSidebar && !sidebarOpen && !desktopSidebarOpen && (
        <button
          onClick={() => {
            if (isMobile) {
              setSidebarOpen(true);
              setMobileSidebarClosedByUser(false);
            } else {
              setDesktopSidebarOpen(true);
              setSidebarClosedByUser(false);
            }
          }}
          aria-label="Ouvrir le panneau"
          className="group fixed left-0 top-1/2 -translate-y-1/2 z-[55] flex items-center justify-center w-2 h-16 lg:h-14 bg-foreground/25 hover:bg-foreground/90 hover:w-4 backdrop-blur-sm transition-all duration-300 rounded-r-md"
        >
          <ChevronRight className="h-3 w-3 text-background opacity-0 group-hover:opacity-100 transition-opacity" />
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

          {/* Newsletter retirée du sidebar */}
        </div>
      )}

      {/* Admin notifications and messages now live in the header (top-right). */}

      {/* Main Content */}
      <main className={cn(
        "transition-all duration-500",
        isHomePage ? "" : (headerFixed ? "pt-14 lg:pt-20" : ""),
        !isHomePage && topBannerActive ? "pt-[calc(theme(spacing.14)+2rem)] lg:pt-[calc(theme(spacing.20)+2rem)]" : "",
        sidebarActive ? "lg:ml-[35%]" : "lg:ml-0"
      )}>
        {children}
      </main>

      {/* Footer piloté par Admin → Footer */}
      <Footer offsetClassName={sidebarActive ? 'lg:ml-[35%]' : 'lg:ml-0'} />

      {/* Unified floating action stack (Industrial Luxury) — visible for everyone, including admins for testing */}
      <UnifiedFab />

      {/* Global search */}
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Confirmation animée d'ajout au panier + redirection */}
      <AddToCartDialog />

      {/* Newsletter Popup Host */}
      {!isAdmin && cookieDecided && <PopupHost />}


      {/* Consentement cookies (RGPD/CNIL) */}
      <CookieConsentBanner />

      {/* Invitation à installer l'app sur l'écran d'accueil */}
      <InstallAppBanner />

    </div>
  );
}
