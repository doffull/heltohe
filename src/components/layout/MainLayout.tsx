import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  ShoppingBag, 
  User, 
  Menu,
  X,
  ChevronRight
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

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { itemCount } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      {/* Logo Wrapper - Beveled octagonal shape */}
      <div className="logo-wrapper">
        <Link to="/" className="logo-link">
          <span className="logo-text">Helvetica-MP</span>
        </Link>
      </div>

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
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Left Sidebar Panel - Glossy Glassmorphism */}
      <div className="sidebar-left-panel hidden lg:block">
        {/* Size Selectors */}
        <div className="size-selector">
          <button className="size-button">XS</button>
          <button className="size-button">XL</button>
        </div>
        
        {/* Model Info */}
        <div className="model-info">
          <span className="font-mono text-xs tracking-[0.2em] uppercase">Model 0.1.2</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="pt-20 lg:ml-[35%]">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-secondary border-t border-border py-16 mt-20">
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
