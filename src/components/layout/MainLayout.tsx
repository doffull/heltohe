import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useSidebarOptional } from '@/context/SidebarContext';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatBar } from './StatBar';
import { MannequinHotspots } from './MannequinHotspot';
import { 
  Search, 
  ShoppingBag, 
  User, 
  Menu,
  X,
  ChevronRight,
  PanelLeft,
  Shield
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

interface MainLayoutProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/boutique', label: 'Shop' },
  { href: '/boutique?filter=new', label: 'New Arrivals' },
  { href: '/boutique?filter=collections', label: 'Collections' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

const DEFAULT_STATS = [
  { label: 'Durability', value: 85 },
  { label: 'Price', value: 45 },
  { label: 'Fashion', value: 92 },
];

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const { itemCount } = useCart();
  const sidebarContext = useSidebarOptional();
  const { designSettings } = useApp();
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  // Parallax scroll effect
  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Get stats from designSettings (admin), fallback to sidebarContext, then defaults
  const stats = designSettings.stats && designSettings.stats.length > 0
    ? designSettings.stats.map(s => ({ label: s.label, value: s.value }))
    : sidebarContext 
      ? [
          { label: 'Durability', value: sidebarContext.currentStats.durability },
          { label: 'Price', value: sidebarContext.currentStats.price },
          { label: 'Fashion', value: sidebarContext.currentStats.fashion },
        ]
      : DEFAULT_STATS;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      {/* Logo Wrapper - Beveled octagonal shape */}
      {designSettings.showLogo !== false && (
        <div className="logo-wrapper">
          <Link to="/" className="logo-link">
            {designSettings.hudLogo ? (
              <img src={designSettings.hudLogo} alt="Logo" className="h-10 w-auto object-contain" />
            ) : (
              <span className="logo-text">Helvetica-MP</span>
            )}
          </Link>
        </div>
      )}

      <header className="fixed top-0 left-0 right-0 z-40 bg-background border-b border-border header-container">
        <div className="container mx-auto px-4 pl-[200px]">
          <div className="flex items-center justify-between h-20">

            {/* Desktop Navigation - Centered */}
            <nav className="hidden lg:flex items-center gap-8">
              {NAV_ITEMS.map((item) => (
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
                  {/* Underline effect on hover */}
                  <span className={`absolute -bottom-1 left-0 w-full h-px bg-foreground transform origin-left transition-transform duration-300 ${
                    location.pathname === item.href ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                  }`} />
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-4">
              {/* Search - Expandable */}
              <div className={`hidden md:flex items-center transition-all duration-300 ${searchOpen ? 'w-64' : 'w-10'}`}>
                {searchOpen ? (
                  <div className="relative w-full">
                    <Input 
                      type="text" 
                      placeholder="Search..." 
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
                        placeholder="Search products..." 
                        className="w-full h-12 pl-12 bg-secondary border-0"
                      />
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    </div>

                    {/* Mobile Nav */}
                    {NAV_ITEMS.map((item) => (
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
                        <span className="text-lg font-medium">Cart</span>
                        <span className="text-muted-foreground">({itemCount})</span>
                      </Link>
                      <Link to={user ? '/compte' : '/auth'} className="flex items-center justify-between py-3">
                        <span className="text-lg font-medium">{user ? 'Account' : 'Sign In'}</span>
                        <ChevronRight className="h-5 w-5" />
                      </Link>
                      {isAdmin && (
                        <Link to="/admin" className="flex items-center justify-between py-3">
                          <span className="text-lg font-medium">Administration</span>
                          <Shield className="h-5 w-5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed bottom-6 left-6 z-[60] lg:hidden w-12 h-12 bg-foreground text-background flex items-center justify-center transition-all duration-300 hover:scale-105 bevel-corners-sm"
        aria-label="Toggle Model Interface"
      >
        <PanelLeft className={`h-5 w-5 transition-transform duration-300 ${sidebarOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[45] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar Panel - Glossy Glassmorphism */}
      <div className={`
        sidebar-left-panel
        fixed top-0 left-0 h-screen z-50
        transition-transform duration-500 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        w-[85%] sm:w-[320px] lg:w-[35%]
      `}>
        {/* Mannequin Background Image - Fixed */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${designSettings.sidebarImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=60'})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            backgroundAttachment: 'fixed',
            opacity: 0.4,
          }}
        />
        
        {/* Interactive Hotspots */}
        <div className="absolute inset-0 z-15">
          <MannequinHotspots />
        </div>
        
        {/* Overlay removed per design choice */}
        
        {/* Sidebar Content */}
        <div className="relative z-20 h-full flex flex-col justify-between p-6 pt-28">
          {/* Size Selectors */}
          <div className="size-selector relative top-0 left-0 transform-none flex gap-2">
            <button className="size-button">XS</button>
            <button className="size-button">S</button>
            <button className="size-button">M</button>
            <button className="size-button">L</button>
            <button className="size-button">XL</button>
          </div>
          
          {/* Stats Section */}
          <div className="flex-1 flex flex-col justify-center px-2">
            <div className="mb-6">
              <h3 className="font-mono text-[11px] tracking-[0.2em] uppercase text-foreground/70 mb-1">
                Model Interface
              </h3>
              <div className="w-8 h-px bg-foreground/30" />
            </div>
            
            {stats.map((stat, index) => (
              <StatBar
                key={stat.label}
                label={stat.label}
                value={stat.value}
                delay={index * 200}
              />
            ))}
          </div>
          
          {/* Model Info */}
          <div className="model-info relative bottom-0 left-0">
            <span className="font-mono text-xs tracking-[0.2em] uppercase text-foreground/60">
              Model 0.1.2
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="pt-20 lg:ml-[35%]">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-secondary border-t border-border py-16 mt-20 lg:ml-[35%]">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12">
            {/* Brand */}
            <div>
              <div className="w-12 h-12 bg-background border-2 border-foreground flex items-center justify-center transform rotate-45 mb-6">
                <span className="transform -rotate-45 text-sm font-bold">HMP</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Helvetica-MP. Minimalist design meets functional excellence. Premium quality for the modern individual.
              </p>
            </div>
            
            {/* Quick Links */}
            <div>
              <h4 className="font-bold uppercase tracking-wider mb-6">Quick Links</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link to="/" className="hover:text-foreground transition-colors">Home</Link></li>
                <li><Link to="/boutique" className="hover:text-foreground transition-colors">Shop</Link></li>
                <li><Link to="/compte" className="hover:text-foreground transition-colors">Account</Link></li>
                <li><Link to="/about" className="hover:text-foreground transition-colors">About</Link></li>
              </ul>
            </div>
            
            {/* Social */}
            <div>
              <h4 className="font-bold uppercase tracking-wider mb-6">Follow Us</h4>
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
            <div>
              <h4 className="font-bold uppercase tracking-wider mb-6">Newsletter</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Subscribe for updates and exclusive offers.
              </p>
              <div className="flex">
                <Input 
                  type="email" 
                  placeholder="your@email.com"
                  className="flex-1 h-12 bg-background border-0 rounded-none"
                />
                <Button className="h-12 px-6 rounded-none">
                  Sign up
                </Button>
              </div>
            </div>
          </div>
          
          <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© 2026 HELVETICA-MP. All rights reserved.</p>
            <p className="font-mono text-xs tracking-widest">MODEL 0.1.2</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
