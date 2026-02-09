import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useApp } from '@/context/AppContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { MannequinHotspots } from './MannequinHotspot';
import { SidebarProductHUD } from './SidebarProductHUD';
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

interface MainLayoutProps {
  children: ReactNode;
}

const DEFAULT_NAV_ITEMS = [
  { href: '/', label: 'Accueil' },
  { href: '/boutique', label: 'Boutique' },
  { href: '/boutique?category=Homme', label: 'Homme' },
  { href: '/boutique?category=Femme', label: 'Femme' },
  { href: '/boutique?category=Enfant', label: 'Enfant' },
  { href: '/a-propos', label: 'À Propos' },
];

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const { itemCount } = useCart();
  const { designSettings, language, setLanguage } = useApp();
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const queryClient = useQueryClient();

  const isHomePage = location.pathname === '/';

  const headerPreset = (designSettings as any).headerPreset || 'classic';
  const headerBgColor = (designSettings as any).headerBgColor || '';
  const headerTextColor = (designSettings as any).headerTextColor || '';
  const headerFixed = (designSettings as any).headerFixed !== false;
  const topBanner = (designSettings as any).topBanner || { enabled: false, text: '', bgColor: '#000000', textColor: '#ffffff' };
  const footerLogo = (designSettings as any).footerLogo || '';
  const headerNavItems: { label: string; href: string }[] = (designSettings as any).headerNavItems;
  const navItems = headerNavItems && headerNavItems.length > 0 ? headerNavItems : DEFAULT_NAV_ITEMS;

  const showSidebar = isHomePage;
  const sidebarActive = showSidebar && desktopSidebarOpen;

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
          className="text-center text-xs py-2 px-4 font-medium tracking-wider"
          style={{ backgroundColor: topBanner.bgColor || '#000', color: topBanner.textColor || '#fff' }}
        >
          {topBanner.link ? (
            <Link to={topBanner.link} className="hover:underline">{topBanner.text}</Link>
          ) : topBanner.text}
        </div>
      )}

      {/* Logo Wrapper - Only on home page with sidebar */}
      {designSettings.showLogo !== false && showSidebar && (
        <div className="logo-wrapper hidden lg:flex">
          <Link to="/" className="logo-link">
            {designSettings.hudLogo ? (
              <img src={designSettings.hudLogo} alt="Logo" className="h-10 w-auto object-contain" />
            ) : (
              <span className="logo-text">Helvetica-MP</span>
            )}
          </Link>
        </div>
      )}

      <header
        className={cn(
          "top-0 left-0 right-0 z-40 border-b border-border header-container transition-all",
          headerFixed ? "fixed" : "sticky",
          headerPreset === 'transparent' ? "bg-transparent border-transparent" : "bg-background"
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
            headerPreset === 'classic' && sidebarActive ? "pl-0 lg:pl-[180px]" : "",
            headerPreset === 'fullwidth' ? "gap-6" : "",
          )}>
            {/* Logo in header - always visible when no sidebar, or on mobile */}
            <Link to="/" className={cn(
              "flex items-center gap-2",
              headerPreset === 'centered' ? "" : (showSidebar ? "lg:hidden mr-auto" : "mr-auto")
            )}>
              {designSettings.showLogo !== false && designSettings.hudLogo ? (
                <img src={designSettings.hudLogo} alt="Logo" className={cn(
                  "w-auto object-contain",
                  headerPreset === 'centered' ? "h-8 lg:h-10" : "h-7"
                )} />
              ) : (
                designSettings.showLogo !== false && <span className="font-bold text-base tracking-wider uppercase">HMP</span>
              )}
            </Link>

            {/* Desktop Navigation */}
            <nav className={cn(
              "items-center gap-8",
              headerPreset === 'minimal' ? "hidden" : "hidden lg:flex",
              headerPreset === 'fullwidth' ? "flex-1 justify-center" : "",
              headerPreset === 'centered' ? "justify-center" : "",
            )}>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`relative text-sm font-medium uppercase tracking-wider transition-colors hover:text-foreground group ${
                    location.pathname === item.href 
                      ? 'text-foreground' 
                      : 'text-muted-foreground'
                  }`}
                >
                  {item.label}
                  <span className={`absolute -bottom-1 left-0 w-full h-px bg-foreground transform origin-left transition-transform duration-300 ${
                    location.pathname === item.href ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                  }`} />
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-4 ml-auto">
              {/* Search - Expandable */}
              <div className={`hidden md:flex items-center transition-all duration-300 ${searchOpen ? 'w-64' : 'w-10'}`}>
                {searchOpen ? (
                  <div className="relative w-full">
                    <Input 
                      type="text" 
                      placeholder="Rechercher..." 
                      className="w-full h-10 pr-10 bg-secondary border-0 focus-visible:ring-1"
                      autoFocus
                      onBlur={() => setSearchOpen(false)}
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute right-0 top-0"
                      onClick={() => setSearchOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setSearchOpen(true)}
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                )}
              </div>

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
                className="text-xs font-bold tracking-wider text-muted-foreground hover:text-foreground transition-colors hidden md:block"
              >
                {language}
              </button>

              {/* Mobile Menu */}
              <Sheet>
                <SheetTrigger asChild className="lg:hidden">
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

                    {/* Mobile Nav */}
                    {navItems.map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={`flex items-center justify-between py-3 text-lg font-medium uppercase tracking-wider border-b border-border ${
                          location.pathname === item.href ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {item.label}
                        <ChevronRight className="h-5 w-5" />
                      </Link>
                    ))}

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
          onClick={() => setSidebarOpen(!sidebarOpen)}
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
          onClick={() => setSidebarOpen(false)}
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
          "sidebar-left-panel fixed top-0 left-0 h-screen z-50 transition-transform duration-500 ease-out w-[85%] sm:w-[320px] lg:w-[35%]",
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          desktopSidebarOpen ? 'lg:translate-x-0' : 'lg:-translate-x-full'
        )}>
          {/* Desktop close button */}
          <button
            onClick={() => setDesktopSidebarOpen(false)}
            className="absolute top-4 right-4 z-30 hidden lg:flex w-8 h-8 bg-background/80 text-foreground items-center justify-center rounded-full hover:bg-background transition-colors"
            aria-label="Fermer le panneau"
          >
            <X className="h-4 w-4" />
          </button>
          {/* Mannequin Background Image - Fixed */}
          <div 
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: `url(${designSettings.sidebarImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=60'})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
              backgroundAttachment: 'fixed',
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
            <button className="fixed bottom-6 right-6 z-[60] w-12 h-12 bg-foreground text-background flex items-center justify-center rounded-full shadow-lg hover:scale-105 transition-transform">
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
        headerFixed ? "pt-14 lg:pt-20" : "",
        topBanner.enabled ? "pt-[calc(theme(spacing.14)+2rem)] lg:pt-[calc(theme(spacing.20)+2rem)]" : "",
        sidebarActive ? "lg:ml-[35%]" : "lg:ml-0"
      )}>
        {children}
      </main>

      {/* Footer */}
      <footer className={cn(
        "bg-secondary border-t border-border py-8 mt-4 lg:py-16 lg:mt-10 transition-all duration-500",
        sidebarActive ? "lg:ml-[35%]" : "lg:ml-0"
      )}>
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
              <div className="flex">
                <Input 
                  type="email" 
                  placeholder="votre@email.com"
                  className="flex-1 h-12 bg-background border-0 rounded-none"
                />
                <Button className="h-12 px-6 rounded-none">
                  S'inscrire
                </Button>
              </div>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 lg:mt-12 pt-6 lg:pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs lg:text-sm text-muted-foreground">
            <p>© 2026 HELVETICA-MP. Tous droits réservés.</p>
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
    </div>
  );
}
