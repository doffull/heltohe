import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AdminSalesAlerts } from '@/components/admin/AdminSalesAlerts';
import { useAuth } from '@/context/AuthContext';
import { useDesignSettings } from '@/hooks/useDesignSettings';
import { useRolePermissions, DEFAULT_ROLE_ROUTES } from '@/hooks/useRolePermissions';

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
  Plug,
  FlaskConical,
  Mail,
  FileUp,
  Globe,
  PanelBottom,
  Share2,

  PackageSearch,
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
import AdminOrderTracking from './AdminOrderTracking';
import AdminCustomers from './AdminCustomers';
import AdminMarketing from './AdminMarketing';
import AdminSettings from './AdminSettings';
import AdminDesign from './AdminDesign';
import AdminMedia from './AdminMedia';
import AdminPdfExtract from './AdminPdfExtract';
import AdminPages from './AdminPages';
import AdminStock from './AdminStock';
import AdminWooCommerce from './AdminWooCommerce';
import AdminChatbot from './AdminChatbot';
import AdminColissimo from './AdminColissimo';
import AdminCheckout from './AdminCheckout';
import AdminNotifications from './AdminNotifications';
import AdminAuthEmails from './AdminAuthEmails';
import AdminEmails from './AdminEmails';

import AdminPreparations from './AdminPreparations';
import AdminRoulette from './AdminRoulette';
import AdminHomeIcons from './AdminHomeIcons';
import AdminLive from './AdminLive';
import AdminRoles from './AdminRoles';
import AdminSecurity from './AdminSecurity';
import AdminTransitions from './AdminTransitions';
import AdminSeo from './AdminSeo';
import AdminSeoRedirects from './AdminSeoRedirects';
import AdminFooter from './AdminFooter';
import AdminSocials from './AdminSocials';
import AdminLocales from './AdminLocales';
import AdminNewsletters from './AdminNewsletters';
import AdminTopBanner from './AdminTopBanner';
import AdminFeedSections from './AdminFeedSections';
import AdminCollab from './AdminCollab';

import AdminBannersAnalytics from './AdminBannersAnalytics';
import AdminAnalytics from './AdminAnalytics';
import AdminBoutiques from './AdminBoutiques';
import AdminMannequins from './AdminMannequins';
import AdminPageTemplates from './AdminPageTemplates';
import AdminReviews from './AdminReviews';
import AdminAgentIntegrations from './AdminAgentIntegrations';
import AdminProductBadges from './AdminProductBadges';
import AdminPopups from './AdminPopups';
import AdminPayPal from './AdminPayPal';
import AdminPaymentTest from './AdminPaymentTest';
import AdminMessagerie from './AdminMessagerie';

import { AdminSaveBar } from '@/components/admin/AdminSaveBar';



export const DEFAULT_SECTION_COLORS: Record<string, string> = {
  '/admin': '#6B7280',
  '/admin/produits': '#3B82F6',
  '/admin/commandes': '#F59E0B',
  '/admin/checkout': '#10B981',
  '/admin/paypal': '#0070BA',
  '/admin/test-paiement': '#F43F5E',

  '/admin/clients': '#8B5CF6',
  '/admin/messagerie': '#2563EB',
  '/admin/pages': '#6366F1',
  '/admin/media': '#EC4899',
  '/admin/marketing': '#EF4444',
  '/admin/popups': '#F97316',
  '/admin/design': '#06B6D4',
  '/admin/seo': '#0EA5E9',
  '/admin/redirections': '#0284C7',
  '/admin/collab': '#A855F7',
  '/admin/stock': '#D97706',
  '/admin/colissimo': '#EAB308',
  '/admin/notifications': '#F97316',
  '/admin/emails-auth': '#0EA5E9',
  '/admin/emails-factures': '#0EA5E9',
  '/admin/preparations': '#22C55E',
  '/admin/chatbot': '#14B8A6',
  '/admin/woocommerce': '#7C3AED',
  '/admin/audit': '#6B7280',
  '/admin/roulette': '#F59E0B',
  '/admin/parametres': '#64748B',
  '/admin/boutiques': '#0D9488',
  '/admin/mannequins': '#EC4899',
  '/admin/roles': '#DC2626',
  '/admin/security': '#0EA5E9',
  '/admin/page-templates': '#A855F7',
  '/admin/top-banner': '#0EA5E9',
  '/admin/feed-sections': '#8B5CF6',
};

const SIDEBAR_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: Activity, label: 'Live', href: '/admin/live' },
  { icon: BarChart3, label: 'Analytics & Stats', href: '/admin/analytics' },
  { icon: Package, label: 'Produits', href: '/admin/produits' },
  { icon: Shield, label: 'Badges produit', href: '/admin/product-badges' },

  { icon: ShoppingCart, label: 'Commandes', href: '/admin/commandes' },
  { icon: PackageSearch, label: 'Suivi des commandes', href: '/admin/suivi-commandes' },
  { icon: ClipboardCheck, label: 'Préparations', href: '/admin/preparations' },
  { icon: CreditCard, label: 'Checkout', href: '/admin/checkout' },
  { icon: CreditCard, label: 'PayPal', href: '/admin/paypal' },
  { icon: FlaskConical, label: 'Test paiement', href: '/admin/test-paiement' },

  { icon: Users, label: 'Clients', href: '/admin/clients' },
  { icon: Mail, label: 'Messagerie & CRM', href: '/admin/messagerie' },
  { icon: FileText, label: 'Pages & Catégories', href: '/admin/pages' },
  { icon: FolderOpen, label: 'Média', href: '/admin/media' },
  { icon: FileUp, label: 'Import PDF / Médias', href: '/admin/import-pdf' },
  { icon: Megaphone, label: 'Marketing', href: '/admin/marketing' },
  { icon: Megaphone, label: 'Studio Pop-ups', href: '/admin/popups' },
  { icon: Gift, label: 'Roulette', href: '/admin/roulette' },
  { icon: Palette, label: 'Design', href: '/admin/design' },
  { icon: PanelBottom, label: 'Footer', href: '/admin/footer' },
  { icon: Share2, label: 'Réseaux sociaux', href: '/admin/reseaux-sociaux' },
  { icon: Globe, label: 'Devises & Langues', href: '/admin/devises-langues' },
  { icon: Mail, label: 'Newsletters', href: '/admin/newsletters' },
  { icon: Globe, label: 'SEO & Visibilité', href: '/admin/seo' },
  { icon: Globe, label: 'Redirections SEO', href: '/admin/redirections' },
  { icon: Sparkles, label: 'Espace Collab', href: '/admin/collab' },

  { icon: Megaphone, label: 'Bannière haute', href: '/admin/top-banner' },
  { icon: LayoutTemplate, label: 'Sections du feed', href: '/admin/feed-sections' },
  { icon: MousePointer, label: 'Icônes Accueil', href: '/admin/home-icons' },
    { icon: Sparkles, label: 'Transitions', href: '/admin/transitions' },
    { icon: LayoutTemplate, label: 'Templates de pages', href: '/admin/page-templates' },
  { icon: BarChart3, label: 'Analytique Bannières', href: '/admin/bannieres-analytics' },
  { icon: Warehouse, label: 'Stock', href: '/admin/stock' },
  { icon: Truck, label: 'Colissimo', href: '/admin/colissimo' },
  { icon: Store, label: 'Boutiques', href: '/admin/boutiques' },
  { icon: Users, label: "Mannequins d'essai", href: '/admin/mannequins' },
  { icon: Bell, label: 'Notifications', href: '/admin/notifications' },
  { icon: Mail, label: "E-mails d'authentification", href: '/admin/emails-auth' },
  { icon: Mail, label: 'E-mails & Factures', href: '/admin/emails-factures' },
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

// (les périmètres sont désormais réglables depuis Admin → Rôles, voir useRolePermissions)



function getActiveHref(pathname: string): string {
  if (pathname === '/admin') return '/admin';
  const match = SIDEBAR_ITEMS.find(item => item.href !== '/admin' && pathname.startsWith(item.href));
  return match?.href || '/admin';
}

const ADMIN_GROUPS = [
  { label: 'Vue générale', color: '#06B6D4', icon: LayoutDashboard, paths: ['/admin', '/admin/live', '/admin/analytics', '/admin/bannieres-analytics'] },
  { label: 'Catalogue & inventaire', color: '#3B82F6', icon: Package, paths: ['/admin/produits', '/admin/stock', '/admin/product-badges', '/admin/import-pdf'] },
  { label: 'Ventes & logistique', color: '#F59E0B', icon: ShoppingCart, paths: ['/admin/commandes', '/admin/suivi-commandes', '/admin/preparations', '/admin/colissimo', '/admin/checkout', '/admin/paypal', '/admin/test-paiement'] },
  { label: 'Clients & CRM', color: '#A855F7', icon: Users, paths: ['/admin/clients', '/admin/messagerie', '/admin/avis', '/admin/notifications'] },
  { label: 'Marketing & campagnes', color: '#EC4899', icon: Megaphone, paths: ['/admin/marketing', '/admin/newsletters', '/admin/popups', '/admin/roulette', '/admin/reseaux-sociaux', '/admin/top-banner'] },
  { label: 'Boutique & création', color: '#10B981', icon: Palette, paths: ['/admin/pages', '/admin/media', '/admin/design', '/admin/footer', '/admin/feed-sections', '/admin/home-icons', '/admin/transitions', '/admin/page-templates', '/admin/boutiques', '/admin/mannequins', '/admin/collab'] },
  { label: 'Configuration & sécurité', color: '#EAB308', icon: Settings, paths: ['/admin/seo', '/admin/redirections', '/admin/devises-langues', '/admin/emails-auth', '/admin/emails-factures', '/admin/chatbot', '/admin/agent-integrations', '/admin/woocommerce', '/admin/audit', '/admin/media-audit', '/admin/errors', '/admin/security', '/admin/roles', '/admin/parametres'] },
] as const;

function SidebarContent({ user, signOut, location, sectionColors, allowedHrefs, onNavigate }: { user: any; signOut: () => void; location: any; sectionColors: Record<string, string>; allowedHrefs: Set<string>; onNavigate?: () => void }) {
  const activeHref = getActiveHref(location.pathname);
  const [expanded, setExpanded] = useState<string[]>(() => ADMIN_GROUPS.filter(g => g.paths.some(p => p === activeHref)).map(g => g.label));
  useEffect(() => { const g = ADMIN_GROUPS.find(g => g.paths.some(p => p === activeHref)); if (g) setExpanded(prev => prev.includes(g.label) ? prev : [...prev, g.label]); }, [activeHref]);

  return (
    <>
      <div className="p-4 lg:p-6 border-b border-border">
        <Link to="/admin" className="flex items-center gap-3">
          <Shield className="h-7 w-7 lg:h-8 lg:w-8 text-primary" />
          <div>
            <span className="text-base lg:text-lg font-bold hud-text">HELVETICA-MP</span>
            <p className="text-[10px] lg:text-xs text-muted-foreground">ADMIN PANEL</p>
          </div>
        </Link>
      </div>

      <nav aria-label="Navigation administration" className="flex-1 min-h-0 p-3 lg:p-4 space-y-2 overflow-y-auto overscroll-contain">
        {ADMIN_GROUPS.map(group => {
          const items = SIDEBAR_ITEMS.filter(item => group.paths.some(p => p === item.href) && allowedHrefs.has(item.href));
          if (!items.length) return null;
          const open = expanded.includes(group.label);
          const active = items.some(item => item.href === activeHref);
          return <div key={group.label} className="rounded-xl border border-border/60 overflow-hidden">
            <button type="button" aria-expanded={open} onClick={() => setExpanded(prev => open ? prev.filter(x => x !== group.label) : [...prev, group.label])}
              className="w-full flex items-center gap-2.5 px-3 py-3 text-left font-semibold text-sm transition-colors hover:bg-muted/60"
              style={{ backgroundColor: active ? group.color + '24' : undefined, borderLeft: '4px solid ' + group.color }}>
              <group.icon className="h-4 w-4 shrink-0" style={{ color: group.color }} />
              <span className="flex-1">{group.label}</span>
              <span className="text-[10px] text-muted-foreground">{items.length}</span>
              <ChevronRight className={cn('h-4 w-4 transition-transform', open && 'rotate-90')} />
            </button>
            {open && <div className="p-1.5 space-y-0.5" style={{ backgroundColor: group.color + '09' }}>
              {items.map(item => {
                const selected = activeHref === item.href;
                return <Link key={item.href} to={item.href} onClick={onNavigate} aria-current={selected ? 'page' : undefined}
                  className={cn('flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-colors', selected ? 'text-white font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
                  style={selected ? { backgroundColor: group.color } : undefined}>
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                </Link>;
              })}
            </div>}
          </div>;
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
  const { data: rolePerms } = useRolePermissions();

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

  // Périmètre par rôle : réglé en base (Admin → Rôles), avec repli sur les
  // valeurs par défaut si la table n'est pas encore chargée.
  const roleRoutes = (role: keyof typeof DEFAULT_ROLE_ROUTES): Set<string> =>
    new Set<string>(rolePerms?.[role]?.length ? rolePerms[role] : DEFAULT_ROLE_ROUTES[role]);

  const allowedHrefs: Set<string> = isAdmin
    ? new Set<string>(SIDEBAR_ITEMS.map(i => i.href))
    : isAuditor
      ? roleRoutes('auditor')
      : isOrderValidator
        ? roleRoutes('order_validator')
        : isStockManager
          ? roleRoutes('stock_manager')
          : isPreparator
            ? roleRoutes('preparator')
            : new Set<string>();



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
    <div className="admin-light min-h-screen bg-white text-slate-950 flex items-start">
      {/* Desktop Sidebar */}
      <style>{`
        .admin-light { --background: 0 0% 100%; --foreground: 222 47% 11%; --card: 0 0% 100%; --card-foreground: 222 47% 11%; --popover: 0 0% 100%; --popover-foreground: 222 47% 11%; --muted: 210 20% 96%; --muted-foreground: 215 20% 35%; --primary: 0 72% 45%; --primary-foreground: 0 0% 100%; --border: 214 22% 86%; --input: 214 22% 86%; --ring: 0 72% 45%; color-scheme: light; }
        .admin-light main :is(input,textarea,select) { background-color: white; color: #111827; border-color: #cbd5e1; }
        .admin-light main :is(input,textarea)::placeholder { color: #64748b; }
        .admin-light main button:not([disabled]):hover { border-color: #dc2626; }
        .admin-light main button:not([disabled]):focus-visible, .admin-light a:focus-visible { outline: 2px solid #dc2626; outline-offset: 2px; }
        .admin-light main :is(.bg-white,.bg-card,.bg-background) { color: #111827; }
        .admin-light main :is(.bg-white,.bg-card,.bg-background) :is(.text-white) { color: #111827; }
        .admin-light main :is(.bg-primary,.bg-destructive,.bg-blue-600,.bg-red-600) :is(.text-white) { color: white; }
      `}</style>
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-60 bg-white text-slate-950 border-r border-slate-200 flex-col z-50">
        <SidebarContent user={user} signOut={signOut} location={location} sectionColors={sectionColors} allowedHrefs={allowedHrefs} />
      </aside>

      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-white text-slate-950 border-b border-slate-200 z-50 lg:hidden flex items-center px-3 gap-2">
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
        <span className="font-bold hud-text text-sm">HELVETICA-MP ADMIN</span>
      </div>

      {/* Main Content */}
      <main className="flex-1 min-w-0 max-w-full overflow-x-hidden bg-white text-slate-950 lg:ml-60 pt-14 lg:pt-0 min-h-screen">
        {/* Colored top border */}
        <div className="h-1 w-full" style={{ backgroundColor: activeColor }} />
        <div className="p-3 sm:p-4 lg:p-8 min-w-0 max-w-full">

          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <AdminSaveBar />
            {isAdmin && <AdminSalesAlerts />}
          </div>
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="live/*" element={<AdminLive />} />
            <Route path="analytics/*" element={<AdminAnalytics />} />
            <Route path="produits/*" element={<AdminProducts />} />
            <Route path="products/*" element={<AdminProducts />} />
            <Route path="commandes/*" element={<AdminOrders />} />
            <Route path="suivi-commandes/*" element={<AdminOrderTracking />} />
            <Route path="preparations/*" element={<AdminPreparations />} />
            <Route path="checkout/*" element={<AdminCheckout />} />
            <Route path="paypal/*" element={<AdminPayPal />} />
            <Route path="test-paiement/*" element={<AdminPaymentTest />} />

            <Route path="clients/*" element={<AdminCustomers />} />
            <Route path="messagerie/*" element={<AdminMessagerie />} />
            <Route path="pages/*" element={<AdminPages />} />
            <Route path="media/*" element={<AdminMedia />} />
            <Route path="import-pdf/*" element={<AdminPdfExtract />} />
            <Route path="marketing/*" element={<AdminMarketing />} />
            <Route path="popups/*" element={<AdminPopups />} />
            <Route path="roulette/*" element={<AdminRoulette />} />
            <Route path="bannieres/*" element={<Navigate to="/admin/marketing" replace />} />
            <Route path="design/*" element={<AdminDesign />} />
            <Route path="home-icons/*" element={<AdminHomeIcons />} />
            <Route path="stock/*" element={<AdminStock />} />
            <Route path="colissimo/*" element={<AdminColissimo />} />
            <Route path="boutiques/*" element={<AdminBoutiques />} />
            <Route path="mannequins" element={<AdminMannequins />} />
            <Route path="notifications/*" element={<AdminNotifications />} />
            <Route path="emails-auth" element={<AdminAuthEmails />} />
            <Route path="emails-factures" element={<AdminEmails />} />
            <Route path="chatbot/*" element={<AdminChatbot />} />
            <Route path="woocommerce/*" element={<AdminWooCommerce />} />
            <Route path="audit/*" element={<AdminAudit />} />
            <Route path="media-audit/*" element={<AdminMediaAudit />} />
            <Route path="errors/*" element={<AdminErrorLogs />} />
            <Route path="roles/*" element={<AdminRoles />} />
            <Route path="security/*" element={<AdminSecurity />} />
            <Route path="parametres/*" element={<AdminSettings />} />
            <Route path="transitions/*" element={<AdminTransitions />} />
            <Route path="seo/*" element={<AdminSeo />} />
            <Route path="redirections/*" element={<AdminSeoRedirects />} />
            <Route path="footer/*" element={<AdminFooter />} />
            <Route path="reseaux-sociaux" element={<AdminSocials />} />
            <Route path="devises-langues" element={<AdminLocales />} />
            <Route path="newsletters" element={<AdminNewsletters />} />
            <Route path="top-banner" element={<AdminTopBanner />} />
            <Route path="feed-sections" element={<AdminFeedSections />} />
            <Route path="collab/*" element={<AdminCollab />} />

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
