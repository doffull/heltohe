import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { AppProvider, useApp } from "@/context/AppContext";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

// Pages
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Auth from "./pages/Auth";
import Account from "./pages/Account";
import Admin from "./pages/admin/Admin";
import NotFound from "./pages/NotFound";
import About from "./pages/About";

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

function FaviconManager() {
  const { designSettings } = useApp();
  const faviconUrl = (designSettings as any).faviconUrl;
  useEffect(() => {
    if (faviconUrl) {
      const link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
      if (link) { link.href = faviconUrl; }
      else {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = faviconUrl;
        document.head.appendChild(newLink);
      }
    }
  }, [faviconUrl]);
  return null;
}

function SplashScreen({ onDone }: { onDone: () => void }) {
  const { designSettings } = useApp();
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
        {designSettings.hudLogo ? (
          <img src={designSettings.hudLogo} alt="Logo" className="h-16 w-auto object-contain" />
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
          {/* Public routes with main layout */}
          <Route path="/" element={<MainLayout><Home /></MainLayout>} />
          <Route path="/boutique" element={<MainLayout><Shop /></MainLayout>} />
          <Route path="/boutique/:id" element={<MainLayout><ProductDetail /></MainLayout>} />
          <Route path="/panier" element={<MainLayout><Cart /></MainLayout>} />
          <Route path="/a-propos" element={<MainLayout><About /></MainLayout>} />
          
          {/* Auth routes (no layout) */}
          <Route path="/auth" element={<Auth />} />
          
          {/* Account routes (with layout) */}
          <Route path="/compte/*" element={<MainLayout><Account /></MainLayout>} />
          
          {/* Admin routes (custom layout) */}
          <Route path="/admin/*" element={<Admin />} />
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function AppInner() {
  const [showSplash, setShowSplash] = useState(true);
  return (
    <>
      <AnimatePresence>
        {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      </AnimatePresence>
      <FaviconManager />
      <Toaster />
      <Sonner />
      <ScrollToTop />
      <AnimatedRoutes />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <SidebarProvider>
            <AppProvider>
              <TooltipProvider>
                <AppInner />
              </TooltipProvider>
            </AppProvider>
          </SidebarProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
