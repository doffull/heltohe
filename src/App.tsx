import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";

// Pages
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Auth from "./pages/Auth";
import Account from "./pages/Account";
import Admin from "./pages/admin/Admin";
import NotFound from "./pages/NotFound";

// Layout
import { MainLayout } from "./components/layout/MainLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Routes>
              {/* Public routes with main layout */}
              <Route path="/" element={<MainLayout><Home /></MainLayout>} />
              <Route path="/boutique" element={<MainLayout><Shop /></MainLayout>} />
              <Route path="/boutique/:id" element={<MainLayout><ProductDetail /></MainLayout>} />
              <Route path="/panier" element={<MainLayout><Cart /></MainLayout>} />
              
              {/* Auth routes (no layout) */}
              <Route path="/auth" element={<Auth />} />
              
              {/* Account routes (with layout) */}
              <Route path="/compte/*" element={<MainLayout><Account /></MainLayout>} />
              
              {/* Admin routes (custom layout) */}
              <Route path="/admin/*" element={<Admin />} />
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
