import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
  Bell,
  Gift,
  MousePointer,
  Activity,
  UserCog,
  ShieldAlert,
  Sparkles,
  BarChart3,
  Store,
  LayoutTemplate,
  AlertTriangle,
  Star,
  Plug

  FlaskConical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

// Admin Pages
import AdminDashboard from './AdminDashboard';
import AdminAudit from './AdminAudit';
import AdminMediaAudit from './AdminMediaAudit';
import AdminErrorLogs from './AdminErrorLogs';
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
import AdminRoulette from './AdminRoulette';
import AdminHomeIcons from './AdminHomeIcons';
import AdminLive from './AdminLive';
import AdminRoles from './AdminRoles';
import AdminSecurity from './AdminSecurity';
import AdminTransitions from './AdminTransitions';
import AdminBannersAnalytics from './AdminBannersAnalytics';
import AdminBoutiques from './AdminBoutiques';
import AdminPageTemplates from './AdminPageTemplates';
import AdminReviews from './AdminReviews';
import AdminAgentIntegrations from './AdminAgentIntegrations';
import AdminProductBadges from './AdminProductBadges';
import AdminPayPal from './AdminPayPal';
import AdminPaymentTest from './AdminPaymentTest';

import { AdminSaveBar } from '@/components/admin/AdminSaveBar';



export const DEFAULT_SECTION_COLORS: Record<string, string> = {
  '/admin': '#6B7280',
  '/admin/produits': '#3B82F6',
  '/admin/commandes': '#F59E0B',
  '/admin/checkout': '#10B981',
  '/admin/paypal': '#0070BA',
  '/admin/test-paiement': '#F43F5E',

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
  '/admin/roulette': '#F59E0B',
  '/admin/parametres': '#64748B',
  '/admin/boutiques': '#0D9488',
  '/admin/roles': '#DC2626',
  '/admin/security': '#0EA5E9',
  '/admin/page-templates': '#A855F7',
};

const SIDEBAR_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: Activity, label: 'Live', href: '/admin/live' },
  { icon: Package, label: 'Produits', href: '/admin/produits' },
  { icon: Shield, label: 'Badges produit', href: '/admin/product-badges' },

  { icon: ShoppingCart, label: 'Commandes', href: '/admin/commandes' },
  { icon: ClipboardCheck, label: 'Préparations', href: '/admin/preparations' },
  { icon: CreditCard, label: 'Checkout', href: '/admin/checkout' },
  { icon: CreditCard, label: 'PayPal', href: '/admin/paypal' },
  { icon: FlaskConical, label: 'Test paiement', href: '/admin/test-paiement' },

  { icon: Users, label: 'Clients', href: '/admin/clients' },
  { icon: FileText, label: 'Pages', href: '/admin/pages' },
  { icon: FolderOpen, label: 'Média', href: '/admin/media' },
  { icon: Megaphone, label: 'Marketing', href: '/admin/marketing' },
  { icon: Gift, label: 'Roulette', href: '/admin/roulette' },
  { icon: Palette, label: 'Design', href: '/admin/design' },
  { icon: MousePointer, label: 'Icônes Accueil', href: '/admin/home-icons' },
    { icon: Sparkles, label: 'Transitions', href: '/admin/transitions' },
    { icon: LayoutTemplate, label: 'Templates de pages', href: '/admin/page-templates' },
  { icon: BarChart3, label: 'Analytique Bannières', href: '/admin/bannieres-analytics' },
  { icon: Warehouse, label: 'Stock', href: '/admin/stock' },
  { icon: Truck, label: 'Colissimo', href: '/admin/colissimo' },
  { icon: Store, label: 'Boutiques', href: '/admin/boutiques' },
  { icon: Bell, label: 'Notifications', href: '/admin/notifications' },
  { icon: Bot, label: 'Chatbot', href: '/admin/chatbot' },
  { icon: Star, label: 'Avis clients', href: '/admin/avis' },
  { icon: Plug, label: 'Agent integrations', href: '/admin/agent-integrations' },
  { icon: ShoppingBag, label: 'WooCommerce', href: '/admin/woocommerce' },
  { icon: ClipboardCheck, label: 'Audit', href: '/admin/audit' },
  { icon: AlertTriangle, label: 'Audit médias', href: '/admin/media-audit' },
  { icon: Activity, label: 'Erreurs Client', href: '/admin/errors' },
  { icon: ShieldAlert, label: 'Sécurité', href: '/admin/security' },
  { icon: UserCog, label: 'Rôles', href: '/admin/roles' },
  { icon: Settings, label: 'Paramètres', href: '/admin/parametres' },
];

// Routes accessibles selon les rôles non-admin
const STOCK_MANAGER_ROUTES = new Set(['/admin', '/admin/commandes', '/admin/preparations', '/admin/stock']);
const PREPARATOR_ROUTES = new Set(['/admin/preparations']);
const AUDITOR_ROUTES = new Set([
  '/admin', '/admin/live', '/admin/produits', '/admin/commandes', '/admin/preparations',
  '/admin/checkout', '/admin/clients', '/admin/media', '/admin/stock', '/admin/colissimo',
  '/admin/notifications', '/admin/chatbot', '/admin/woocommerce', '/admin/audit',
  '/admin/errors', '/admin/security', '/admin/bannieres-analytics', '/admin/roles',
]);
const ORDER_VALIDATOR_ROUTES = new Set([
  '/admin', '/admin/produits', '/admin/commandes', '/admin/preparations',
  '/admin/checkout', '/admin/clients', '/admin/stock', '/admin/colissimo', '/admin/chatbot',
]);

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
  const { user, isAdmin, isStockManager, isPreparator, isAuditor, isOrderValidator, hasAdminPanelAccess, isLoading, signOut } = useAuth();
  const { data: designSettings } = useDesignSettings();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Log admin panel access (audit trail) — fires once per session per route group
  useEffect(() => {
    if (!user || !hasAdminPanelAccess) return;
    const key = `admin_logged_${getActiveHref(location.pathname)}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    supabase.from('admin_access_log' as any).insert({
      user_id: user.id,
      email: user.email,
      route: location.pathname,
      user_agent: navigator.userAgent.slice(0, 500),
    }).then(() => {}, () => {});
  }, [user, hasAdminPanelAccess, location.pathname]);

  const sectionColors: Record<string, string> = {
    ...DEFAULT_SECTION_COLORS,
    ...((designSettings as any)?.admin_section_colors || {}),
  };

  const allowedHrefs: Set<string> = isAdmin
    ? new Set(SIDEBAR_ITEMS.map(i => i.href))
    : isAuditor
      ? AUDITOR_ROUTES
      : isOrderValidator
        ? ORDER_VALIDATOR_ROUTES
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
          <div className="mb-4">
            <AdminSaveBar />
          </div>
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="live/*" element={<AdminLive />} />
            <Route path="produits/*" element={<AdminProducts />} />
            <Route path="commandes/*" element={<AdminOrders />} />
            <Route path="preparations/*" element={<AdminPreparations />} />
            <Route path="checkout/*" element={<AdminCheckout />} />
            <Route path="paypal/*" element={<AdminPayPal />} />
            <Route path="test-paiement/*" element={<AdminPaymentTest />} />

            <Route path="clients/*" element={<AdminCustomers />} />
            <Route path="pages/*" element={<AdminPages />} />
            <Route path="media/*" element={<AdminMedia />} />
            <Route path="marketing/*" element={<AdminMarketing />} />
            <Route path="roulette/*" element={<AdminRoulette />} />
            <Route path="bannieres/*" element={<Navigate to="/admin/marketing" replace />} />
            <Route path="design/*" element={<AdminDesign />} />
            <Route path="home-icons/*" element={<AdminHomeIcons />} />
            <Route path="stock/*" element={<AdminStock />} />
            <Route path="colissimo/*" element={<AdminColissimo />} />
            <Route path="boutiques/*" element={<AdminBoutiques />} />
            <Route path="notifications/*" element={<AdminNotifications />} />
            <Route path="chatbot/*" element={<AdminChatbot />} />
            <Route path="woocommerce/*" element={<AdminWooCommerce />} />
            <Route path="audit/*" element={<AdminAudit />} />
            <Route path="media-audit/*" element={<AdminMediaAudit />} />
            <Route path="errors/*" element={<AdminErrorLogs />} />
            <Route path="roles/*" element={<AdminRoles />} />
            <Route path="security/*" element={<AdminSecurity />} />
            <Route path="parametres/*" element={<AdminSettings />} />
            <Route path="transitions/*" element={<AdminTransitions />} />
            <Route path="page-templates/*" element={<AdminPageTemplates />} />
            <Route path="bannieres-analytics/*" element={<AdminBannersAnalytics />} />
            <Route path="avis/*" element={<AdminReviews />} />
            <Route path="agent-integrations/*" element={<AdminAgentIntegrations />} />
            <Route path="product-badges/*" element={<AdminProductBadges />} />

          </Routes>
        </div>
      </main>
    </div>
  );
}
