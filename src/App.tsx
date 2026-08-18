import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { AppProvider, useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useDesignSettings } from "@/hooks/useDesignSettings";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, Suspense } from "react";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import { VisualEditorProvider } from "@/components/visual-editor/VisualEditorProvider";
import { VisualEditorToggle } from "@/components/visual-editor/VisualEditorToggle";
import { VisualEditorPanel } from "@/components/visual-editor/VisualEditorPanel";
import { ImageProtection } from "@/components/security/ImageProtection";
import { ScreenshotWatermark } from "@/components/security/ScreenshotWatermark";

import { AdminViewportProvider } from "@/context/AdminViewportContext";

import { MegaMenuProvider } from "@/context/MegaMenuContext";
import { CookieConsentProvider } from "@/context/CookieConsentContext";
import { MegaMenu } from "@/components/layout/MegaMenu";
import { getTransition } from "@/components/transitions/transitionRegistry";
import { MaintenanceGate } from "@/components/maintenance/MaintenanceGate";
import { SeoHead, OrganizationJsonLd } from "@/components/seo/SeoHead";
import { supabase } from "@/integrations/supabase/client";


// Pages — Home eager (LCP), the rest lazy for faster initial paint
import Home from "./pages/Home";
const Shop = lazy(() => import("./pages/Shop"));
const BoutiqueRouter = lazy(() => import("./pages/BoutiqueRouter"));
const CategoryPageRouter = lazy(() => import("./pages/CategoryPageRouter"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Auth = lazy(() => import("./pages/Auth"));
const Account = lazy(() => import("./pages/Account"));
const Admin = lazy(() => import("./pages/admin/Admin"));
const PrintShippingLabel = lazy(() => import("./pages/admin/PrintShippingLabel"));
const NotFound = lazy(() => import("./pages/NotFound"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const CGV = lazy(() => import("./pages/legal/CGV"));
const Confidentialite = lazy(() => import("./pages/legal/Confidentialite"));
const Cookies = lazy(() => import("./pages/legal/Cookies"));
const Retours = lazy(() => import("./pages/legal/Retours"));
const MentionsLegales = lazy(() => import("./pages/legal/MentionsLegales"));
const SizeGuide = lazy(() => import("./pages/SizeGuide"));
const Fidelite = lazy(() => import("./pages/Fidelite"));
const Boutiques = lazy(() => import("./pages/Boutiques"));
const StoreLocator = lazy(() => import("./pages/StoreLocator"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));

const RouteFallback = () => (
  <div className="min-h-[40vh] w-full flex items-center justify-center">
    <div className="h-6 w-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
  </div>
);

// Layout
import { MainLayout } from "./components/layout/MainLayout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const pageTransition = {
  type: "tween" as const,
  ease: [0.22, 1, 0.36, 1] as const,
  duration: 0.25,
};

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

/** Uses useDesignSettings directly — no AppContext dependency */
function FaviconManager() {
  const { data: settings } = useDesignSettings();
  const faviconUrl = (settings as any)?.faviconUrl;
  useEffect(() => {
    if (!faviconUrl) return;
    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
  }, [faviconUrl]);
  return null;
}

function SplashScreen({ onDone }: { onDone: () => void }) {
  const { data: settings } = useDesignSettings();
  const logo = (settings as any)?.hudLogo;
  useEffect(() => {
    const timer = setTimeout(onDone, 450);
    return () => clearTimeout(timer);
  }, [onDone]);
  return (
    <motion.div
      className="fixed inset-0 z-[9999] bg-background flex items-center justify-center"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        {logo ? (
          <img
            src={logo}
            alt="Logo"
            className="h-16 w-auto object-contain"
          />
        ) : (
          <span className="text-3xl font-bold tracking-widest uppercase">HMP</span>
        )}
      </motion.div>
    </motion.div>
  );
}

function FlashOverlay({ k }: { k: string }) {
  return (
    <motion.div
      key={`flash-${k}`}
      className="fixed inset-0 z-[80] pointer-events-none bg-foreground"
      initial={{ clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
      animate={{ clipPath: [
        'polygon(0 0, 0 0, 0 100%, 0 100%)',
        'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
        'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)',
      ] }}
      transition={{ duration: 0.55, times: [0, 0.5, 1], ease: [0.7, 0, 0.3, 1] }}
    />
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  const { data: settings } = useDesignSettings();
  const transitionId = ((settings as any)?.pageTransition as string) || 'shatter';
  const TransitionComp = getTransition(transitionId).Component;
  return (
    <AnimatePresence mode="wait">
      {TransitionComp && <TransitionComp key={`t-${location.pathname}`} k={location.pathname} />}
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
      >
          <Suspense fallback={<RouteFallback />}>
          <SeoHead />
          <MaintenanceGate>
          <Routes location={location}>
          <Route path="/" element={<MainLayout><OrganizationJsonLd /><Home /></MainLayout>} />


          <Route path="/boutique" element={<MainLayout><Shop /></MainLayout>} />
          <Route path="/boutique/:slugOrId" element={<MainLayout><BoutiqueRouter /></MainLayout>} />
          <Route path="/panier" element={<MainLayout><Cart /></MainLayout>} />
          <Route path="/checkout" element={<MainLayout><Checkout /></MainLayout>} />
          <Route path="/a-propos" element={<MainLayout><About /></MainLayout>} />
          <Route path="/contact" element={<MainLayout><Contact /></MainLayout>} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
          <Route path="/compte/*" element={<MainLayout><Account /></MainLayout>} />
          <Route path="/admin/bordereau/:id" element={<PrintShippingLabel />} />
          <Route path="/admin/*" element={<Admin />} />
          {/* Legal pages */}
          <Route path="/cgv" element={<MainLayout><CGV /></MainLayout>} />
          <Route path="/confidentialite" element={<MainLayout><Confidentialite /></MainLayout>} />
          <Route path="/cookies" element={<MainLayout><Cookies /></MainLayout>} />
          <Route path="/retours" element={<MainLayout><Retours /></MainLayout>} />
          <Route path="/mentions-legales" element={<MainLayout><MentionsLegales /></MainLayout>} />
          <Route path="/guide-des-tailles" element={<MainLayout><SizeGuide /></MainLayout>} />
          <Route path="/fidelite" element={<MainLayout><Fidelite /></MainLayout>} />
          <Route path="/boutiques" element={<MainLayout><Boutiques /></MainLayout>} />
          <Route path="/trouver-une-boutique" element={<MainLayout><StoreLocator /></MainLayout>} />
          <Route path="/:categorySlug" element={<MainLayout><CategoryPageRouter /></MainLayout>} />
          <Route path="*" element={<MainLayout><NotFound /></MainLayout>} />
        </Routes>
        </MaintenanceGate>
        </Suspense>

      </motion.div>
    </AnimatePresence>
  );
}

/**
 * AppShell — rendered inside BrowserRouter so useNavigate (used by AppProvider) works,
 * and all children are inside AppProvider so useApp() works.
 */
function AdminVisualEditor() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return null;
  return (
    <>
      <VisualEditorToggle />
      <VisualEditorPanel />
    </>
  );
}

function DemoModeBadge() {
  const [on, setOn] = useState(() => { try { return localStorage.getItem('lvtk:demoMode') === '1'; } catch { return false; } });
  useEffect(() => {
    const upd = () => { try { setOn(localStorage.getItem('lvtk:demoMode') === '1'); } catch { /* noop */ } };
    window.addEventListener('storage', upd);
    window.addEventListener('lvtk:demo-mode-changed', upd);
    return () => { window.removeEventListener('storage', upd); window.removeEventListener('lvtk:demo-mode-changed', upd); };
  }, []);
  if (!on) return null;
  return (
    <div className="fixed bottom-3 right-3 z-[9000] px-2.5 py-1 rounded-full bg-amber-500/95 text-amber-950 text-[10px] font-bold uppercase tracking-widest shadow-lg pointer-events-none">
      DEMO
    </div>
  );
}

function LiveContentSync() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel('public-content-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        queryClient.invalidateQueries({ queryKey: ['products'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return null;
}

function AppShell() {
  const [showSplash, setShowSplash] = useState(() => {
    try { return sessionStorage.getItem('lvtk:splashShown') !== '1'; } catch { return true; }
  });
  useEffect(() => {
    if (!showSplash) return;
    try { sessionStorage.setItem('lvtk:splashShown', '1'); } catch { /* noop */ }
  }, [showSplash]);
  return (
    <AppProvider>
      <CookieConsentProvider months={Number((useApp as any) && 0) || undefined}>
      <AdminViewportProvider>
      <VisualEditorProvider>
        <MegaMenuProvider>
        <TooltipProvider>
          <FaviconManager />
          <LiveContentSync />
          <ImageProtection />
          <ScreenshotWatermark />

          <Toaster />
          <Sonner />
          <ScrollToTop />
          <AnimatePresence>
            {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
          </AnimatePresence>
          <AnimatedRoutes />
          <MegaMenu />
          <AdminVisualEditor />
          <DemoModeBadge />
        </TooltipProvider>
        </MegaMenuProvider>
      </VisualEditorProvider>
      </AdminViewportProvider>
      </CookieConsentProvider>
    </AppProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <SidebarProvider>
            <AppShell />
          </SidebarProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
