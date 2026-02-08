import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { AppProvider } from "@/context/AppContext";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <SidebarProvider>
            <AppProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <ScrollToTop />
                <AnimatedRoutes />
              </TooltipProvider>
            </AppProvider>
          </SidebarProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
