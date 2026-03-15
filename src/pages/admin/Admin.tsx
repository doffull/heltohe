import { useState } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Megaphone,
  Settings,
  Shield,
  ChevronRight,
  LogOut,
  Image,
  Palette,
  FolderOpen,
  Menu,
  X,
  FileText,
  Warehouse,
  ShoppingBag,
  Bot,
  Truck,
  ClipboardCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

// Admin Pages
import AdminDashboard from './AdminDashboard';
import AdminProducts from './AdminProducts';
import AdminOrders from './AdminOrders';
import AdminCustomers from './AdminCustomers';
import AdminMarketing from './AdminMarketing';
import AdminSettings from './AdminSettings';
import AdminDesign from './AdminDesign';
import AdminMedia from './AdminMedia';
import AdminPages from './AdminPages';
import AdminStock from './AdminStock';
import AdminWooCommerce from './AdminWooCommerce';
import AdminChatbot from './AdminChatbot';
import AdminColissimo from './AdminColissimo';

const SIDEBAR_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: Package, label: 'Produits', href: '/admin/produits' },
  { icon: ShoppingCart, label: 'Commandes', href: '/admin/commandes' },
  { icon: Users, label: 'Clients', href: '/admin/clients' },
  { icon: FileText, label: 'Pages', href: '/admin/pages' },
  { icon: FolderOpen, label: 'Média', href: '/admin/media' },
  { icon: Megaphone, label: 'Marketing', href: '/admin/marketing' },
  { icon: Palette, label: 'Design', href: '/admin/design' },
  { icon: Warehouse, label: 'Stock', href: '/admin/stock' },
  { icon: Truck, label: 'Colissimo', href: '/admin/colissimo' },
  { icon: Bot, label: 'Chatbot', href: '/admin/chatbot' },
  { icon: ShoppingBag, label: 'WooCommerce', href: '/admin/woocommerce' },
  { icon: Settings, label: 'Paramètres', href: '/admin/parametres' },
];


function SidebarContent({ user, signOut, location }: { user: any; signOut: () => void; location: any }) {
  return (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link to="/admin" className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <span className="text-lg font-bold hud-text">LVTK6</span>
            <p className="text-xs text-muted-foreground">ADMIN PANEL</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {SIDEBAR_ITEMS.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/admin' && location.pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all group",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-sm font-medium">{item.label}</span>
              <ChevronRight className={cn(
                "h-4 w-4 ml-auto transition-transform",
                isActive ? "rotate-90" : "group-hover:translate-x-1"
              )} />
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="mb-4 px-4">
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => window.location.href = '/'}
          >
            Voir le site
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

export default function Admin() {
  const location = useLocation();
  const { user, isAdmin, isLoading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Vérification des accès...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-card border-r border-border flex-col z-50">
        <SidebarContent user={user} signOut={signOut} location={location} />
      </aside>

      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 lg:hidden flex items-center px-4 gap-3">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 flex flex-col">
            <SidebarContent user={user} signOut={signOut} location={location} />
          </SheetContent>
        </Sheet>
        <Shield className="h-6 w-6 text-primary" />
        <span className="font-bold hud-text">LVTK6 ADMIN</span>
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
        <div className="p-4 lg:p-8">
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="produits/*" element={<AdminProducts />} />
            <Route path="commandes/*" element={<AdminOrders />} />
            <Route path="clients/*" element={<AdminCustomers />} />
            <Route path="pages/*" element={<AdminPages />} />
            <Route path="media/*" element={<AdminMedia />} />
            <Route path="marketing/*" element={<AdminMarketing />} />
            <Route path="bannieres/*" element={<AdminMarketing />} />
            <Route path="design/*" element={<AdminDesign />} />
            <Route path="stock/*" element={<AdminStock />} />
            <Route path="colissimo/*" element={<AdminColissimo />} />
            <Route path="chatbot/*" element={<AdminChatbot />} />
            <Route path="woocommerce/*" element={<AdminWooCommerce />} />
            <Route path="parametres/*" element={<AdminSettings />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
