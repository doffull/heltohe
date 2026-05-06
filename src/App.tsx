import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { AppProvider, useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useDesignSettings } from "@/hooks/useDesignSettings";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { VisualEditorProvider } from "@/components/visual-editor/VisualEditorProvider";
import { VisualEditorToggle } from "@/components/visual-editor/VisualEditorToggle";
import { VisualEditorPanel } from "@/components/visual-editor/VisualEditorPanel";
import { ImageProtection } from "@/components/security/ImageProtection";

// Pages
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import BoutiqueRouter from "./pages/BoutiqueRouter";
import CategoryPageRouter from "./pages/CategoryPageRouter";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Auth from "./pages/Auth";
import Account from "./pages/Account";
import Admin from "./pages/admin/Admin";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import Contact from "./pages/Contact";
import CGV from "./pages/legal/CGV";
import Confidentialite from "./pages/legal/Confidentialite";
import Cookies from "./pages/legal/Cookies";
import Retours from "./pages/legal/Retours";
import MentionsLegales from "./pages/legal/MentionsLegales";

// Layout
import { MainLayout } from "./components/layout/MainLayout";

const queryClient = new QueryClient();

const pageVariants = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -40 },
};

const pageTransition = {
  type: "tween" as const,
  ease: [0.22, 1, 0.36, 1] as const,
  duration: 0.45,
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
  const { designSettings } = useApp();
  const logo = designSettings.hudLogo;
  useEffect(() => {
    const timer = setTimeout(onDone, 1200);
    return () => clearTimeout(timer);
  }, [onDone]);
  return (
    <motion.div
      className="fixed inset-0 z-[9999] bg-background flex items-center justify-center"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
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

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
      >
          <Routes location={location}>
          <Route path="/" element={<MainLayout><Home /></MainLayout>} />
          <Route path="/boutique" element={<MainLayout><Shop /></MainLayout>} />
          <Route path="/boutique/:slugOrId" element={<MainLayout><BoutiqueRouter /></MainLayout>} />
          <Route path="/panier" element={<MainLayout><Cart /></MainLayout>} />
          <Route path="/checkout" element={<MainLayout><Checkout /></MainLayout>} />
          <Route path="/a-propos" element={<MainLayout><About /></MainLayout>} />
          <Route path="/contact" element={<MainLayout><Contact /></MainLayout>} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/compte/*" element={<MainLayout><Account /></MainLayout>} />
          <Route path="/admin/*" element={<Admin />} />
          {/* Legal pages */}
          <Route path="/cgv" element={<MainLayout><CGV /></MainLayout>} />
          <Route path="/confidentialite" element={<MainLayout><Confidentialite /></MainLayout>} />
          <Route path="/cookies" element={<MainLayout><Cookies /></MainLayout>} />
          <Route path="/retours" element={<MainLayout><Retours /></MainLayout>} />
          <Route path="/mentions-legales" element={<MainLayout><MentionsLegales /></MainLayout>} />
          <Route path="/:categorySlug" element={<MainLayout><CategoryPageRouter /></MainLayout>} />
          <Route path="*" element={<MainLayout><NotFound /></MainLayout>} />
        </Routes>
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

function AppShell() {
  const [showSplash, setShowSplash] = useState(true);
  return (
    <AppProvider>
      <VisualEditorProvider>
        <TooltipProvider>
          <FaviconManager />
          <ImageProtection />
          <Toaster />
          <Sonner />
          <ScrollToTop />
          <AnimatePresence>
            {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
          </AnimatePresence>
          <AnimatedRoutes />
          <AdminVisualEditor />
        </TooltipProvider>
      </VisualEditorProvider>
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
