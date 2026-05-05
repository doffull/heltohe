import { useState } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useDesignSettings } from '@/hooks/useDesignSettings';
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
  ClipboardCheck,
  CreditCard,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

// Admin Pages
import AdminDashboard from './AdminDashboard';
import AdminAudit from './AdminAudit';
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
import AdminCheckout from './AdminCheckout';
import AdminNotifications from './AdminNotifications';
import AdminPreparations from './AdminPreparations';

export const DEFAULT_SECTION_COLORS: Record<string, string> = {
  '/admin': '#6B7280',
  '/admin/produits': '#3B82F6',
  '/admin/commandes': '#F59E0B',
  '/admin/checkout': '#10B981',
  '/admin/clients': '#8B5CF6',
  '/admin/pages': '#6366F1',
  '/admin/media': '#EC4899',
  '/admin/marketing': '#EF4444',
  '/admin/design': '#06B6D4',
  '/admin/stock': '#D97706',
  '/admin/colissimo': '#EAB308',
  '/admin/notifications': '#F97316',
  '/admin/preparations': '#22C55E',
  '/admin/chatbot': '#14B8A6',
  '/admin/woocommerce': '#7C3AED',
  '/admin/audit': '#6B7280',
  '/admin/parametres': '#64748B',
};

const SIDEBAR_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: Package, label: 'Produits', href: '/admin/produits' },
  { icon: ShoppingCart, label: 'Commandes', href: '/admin/commandes' },
  { icon: ClipboardCheck, label: 'Préparations', href: '/admin/preparations' },
  { icon: CreditCard, label: 'Checkout', href: '/admin/checkout' },
  { icon: Users, label: 'Clients', href: '/admin/clients' },
  { icon: FileText, label: 'Pages', href: '/admin/pages' },
  { icon: FolderOpen, label: 'Média', href: '/admin/media' },
  { icon: Megaphone, label: 'Marketing', href: '/admin/marketing' },
  { icon: Palette, label: 'Design', href: '/admin/design' },
  { icon: Warehouse, label: 'Stock', href: '/admin/stock' },
  { icon: Truck, label: 'Colissimo', href: '/admin/colissimo' },
  { icon: Bell, label: 'Notifications', href: '/admin/notifications' },
  { icon: Bot, label: 'Chatbot', href: '/admin/chatbot' },
  { icon: ShoppingBag, label: 'WooCommerce', href: '/admin/woocommerce' },
  { icon: ClipboardCheck, label: 'Audit', href: '/admin/audit' },
  { icon: Settings, label: 'Paramètres', href: '/admin/parametres' },
];

// Routes accessibles selon les rôles non-admin
const STOCK_MANAGER_ROUTES = new Set(['/admin', '/admin/commandes', '/admin/preparations', '/admin/stock']);
const PREPARATOR_ROUTES = new Set(['/admin/preparations']);

function getActiveHref(pathname: string): string {
  if (pathname === '/admin') return '/admin';
  const match = SIDEBAR_ITEMS.find(item => item.href !== '/admin' && pathname.startsWith(item.href));
  return match?.href || '/admin';
}

function SidebarContent({ user, signOut, location, sectionColors, allowedHrefs, onNavigate }: { user: any; signOut: () => void; location: any; sectionColors: Record<string, string>; allowedHrefs: Set<string>; onNavigate?: () => void }) {
  const activeHref = getActiveHref(location.pathname);

  return (
    <>
      <div className="p-4 lg:p-6 border-b border-border">
        <Link to="/admin" className="flex items-center gap-3">
          <Shield className="h-7 w-7 lg:h-8 lg:w-8 text-primary" />
          <div>
            <span className="text-base lg:text-lg font-bold hud-text">LVTK6</span>
            <p className="text-[10px] lg:text-xs text-muted-foreground">ADMIN PANEL</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 lg:p-4 space-y-0.5 overflow-y-auto">
        {SIDEBAR_ITEMS.filter(i => allowedHrefs.has(i.href)).map((item) => {
          const isActive = activeHref === item.href;
          const color = sectionColors[item.href] || DEFAULT_SECTION_COLORS[item.href] || '#6B7280';
          
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all group text-sm",
                isActive 
                  ? "text-white font-semibold" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              style={isActive ? { backgroundColor: color } : undefined}
            >
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: isActive ? '#fff' : color }}
              />
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
              <ChevronRight className={cn(
                "h-3.5 w-3.5 ml-auto shrink-0 transition-transform",
                isActive ? "rotate-90" : "group-hover:translate-x-1"
              )} />
            </Link>
          );
        })}
      </nav>

      <div className="p-3 lg:p-4 border-t border-border">
        <div className="mb-3 px-3">
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => window.location.href = '/'}>
            Voir le site
          </Button>
          <Button variant="ghost" size="icon" onClick={signOut} className="text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

export default function Admin() {
  const location = useLocation();
  const { user, isAdmin, isStockManager, isPreparator, hasAdminPanelAccess, isLoading, signOut } = useAuth();
  const { data: designSettings } = useDesignSettings();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sectionColors: Record<string, string> = {
    ...DEFAULT_SECTION_COLORS,
    ...((designSettings as any)?.admin_section_colors || {}),
  };

  const allowedHrefs: Set<string> = isAdmin
    ? new Set(SIDEBAR_ITEMS.map(i => i.href))
    : isStockManager
      ? STOCK_MANAGER_ROUTES
      : isPreparator
        ? PREPARATOR_ROUTES
        : new Set();

  const activeHref = getActiveHref(location.pathname);
  const activeColor = sectionColors[activeHref] || '#6B7280';

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
  if (!hasAdminPanelAccess) return <Navigate to="/" replace />;
  // Si la route active n'est pas autorisée pour ce rôle, rediriger vers la première autorisée
  if (!allowedHrefs.has(activeHref)) {
    const fallback = Array.from(allowedHrefs)[0] || '/';
    if (fallback !== location.pathname) return <Navigate to={fallback} replace />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-60 bg-card border-r border-border flex-col z-50">
        <SidebarContent user={user} signOut={signOut} location={location} sectionColors={sectionColors} allowedHrefs={allowedHrefs} />
      </aside>

      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-50 lg:hidden flex items-center px-3 gap-2">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 flex flex-col">
            <SidebarContent user={user} signOut={signOut} location={location} sectionColors={sectionColors} allowedHrefs={allowedHrefs} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        <Shield className="h-5 w-5 text-primary" />
        <span className="font-bold hud-text text-sm">LVTK6 ADMIN</span>
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:ml-60 pt-14 lg:pt-0">
        {/* Colored top border */}
        <div className="h-1 w-full" style={{ backgroundColor: activeColor }} />
        <div className="p-3 lg:p-8">
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="produits/*" element={<AdminProducts />} />
            <Route path="commandes/*" element={<AdminOrders />} />
            <Route path="preparations/*" element={<AdminPreparations />} />
            <Route path="checkout/*" element={<AdminCheckout />} />
            <Route path="clients/*" element={<AdminCustomers />} />
            <Route path="pages/*" element={<AdminPages />} />
            <Route path="media/*" element={<AdminMedia />} />
            <Route path="marketing/*" element={<AdminMarketing />} />
            <Route path="bannieres/*" element={<AdminMarketing />} />
            <Route path="design/*" element={<AdminDesign />} />
            <Route path="stock/*" element={<AdminStock />} />
            <Route path="colissimo/*" element={<AdminColissimo />} />
            <Route path="notifications/*" element={<AdminNotifications />} />
            <Route path="chatbot/*" element={<AdminChatbot />} />
            <Route path="woocommerce/*" element={<AdminWooCommerce />} />
            <Route path="audit/*" element={<AdminAudit />} />
            <Route path="parametres/*" element={<AdminSettings />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
