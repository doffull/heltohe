import { cn } from '@/lib/utils';
import { AppProvider, useApp } from '@/context/AppContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header, TranslationOverlay } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HomeView } from '@/views/HomeView';
import { ShopView } from '@/views/ShopView';
import { AboutView } from '@/views/AboutView';
import { ProductDetailView } from '@/views/ProductDetailView';
import { DashboardView } from '@/views/DashboardView';

function AppContent() {
  const { currentView } = useApp();
  const isDashboard = currentView === 'Dashboard';
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Translation Overlay */}
      <TranslationOverlay />
      
      {/* Sidebar - hidden on dashboard */}
      {!isDashboard && <Sidebar />}
      
      {/* Main Content */}
      <div className={cn(
        "transition-all duration-300",
        isDashboard ? "ml-0" : "ml-16 lg:ml-64"
      )}>
        {/* Header - hidden on dashboard */}
        {!isDashboard && <Header />}
        
        {/* Page Content */}
        <main className={cn(
          "min-h-screen",
          !isDashboard && "pt-14"
        )}>
          {currentView === 'Home' && <HomeView />}
          {currentView === 'Shop' && <ShopView />}
          {currentView === 'About' && <AboutView />}
          {currentView === 'ProductDetail' && <ProductDetailView />}
          {currentView === 'Dashboard' && <DashboardView />}
        </main>
        
        {/* Footer - hidden on dashboard */}
        {!isDashboard && <Footer />}
      </div>
    </div>
  );
}

export function MainLayout() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
