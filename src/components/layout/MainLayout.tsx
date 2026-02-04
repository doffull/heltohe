import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  ShoppingCart, 
  User, 
  Menu,
  Search,
  Heart
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
  { href: '/', label: 'Accueil' },
  { href: '/boutique', label: 'Boutique' },
];

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { itemCount } = useCart();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold hud-text">LVTK6</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    location.pathname === item.href ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {item.label.toUpperCase()}
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="hidden md:flex">
                <Search className="h-5 w-5" />
              </Button>
              
              <Button variant="ghost" size="icon" className="hidden md:flex">
                <Heart className="h-5 w-5" />
              </Button>

              <Link to="/panier">
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
                      {itemCount > 9 ? '9+' : itemCount}
                    </span>
                  )}
                </Button>
              </Link>

              <Link to={user ? '/compte' : '/auth'}>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </Link>

              {/* Mobile Menu */}
              <Sheet>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px]">
                  <div className="flex flex-col gap-4 mt-8">
                    {NAV_ITEMS.map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={`text-lg font-medium py-2 transition-colors ${
                          location.pathname === item.href ? 'text-primary' : 'text-foreground'
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                    <hr className="border-border" />
                    <Link to="/panier" className="flex items-center gap-2 py-2">
                      <ShoppingCart className="h-5 w-5" />
                      Panier ({itemCount})
                    </Link>
                    <Link to={user ? '/compte' : '/auth'} className="flex items-center gap-2 py-2">
                      <User className="h-5 w-5" />
                      {user ? 'Mon Compte' : 'Connexion'}
                    </Link>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12 mt-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-6 w-6 text-primary" />
                <span className="text-lg font-bold hud-text">LVTK6</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Équipement tactique de haute performance pour les opérateurs exigeants.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold mb-4 hud-text">NAVIGATION</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/" className="hover:text-foreground">Accueil</Link></li>
                <li><Link to="/boutique" className="hover:text-foreground">Boutique</Link></li>
                <li><Link to="/compte" className="hover:text-foreground">Mon Compte</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4 hud-text">SUPPORT</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Contact</a></li>
                <li><a href="#" className="hover:text-foreground">FAQ</a></li>
                <li><a href="#" className="hover:text-foreground">Livraison</a></li>
                <li><a href="#" className="hover:text-foreground">Retours</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4 hud-text">NEWSLETTER</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Recevez nos offres exclusives et nouveautés
              </p>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="votre@email.com"
                  className="flex-1 px-3 py-2 bg-background border border-border text-sm"
                />
                <Button size="sm" className="chamfer-hud-sm">OK</Button>
              </div>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>© 2026 LVTK6 TACTICAL SYSTEMS. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
