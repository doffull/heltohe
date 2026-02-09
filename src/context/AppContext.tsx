import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '@/hooks/useCategories';
import { 
  DesignSettings, 
  Product, 
  Order, 
  Language, 
  ViewType,
  translations,
  TranslationStrings
} from '@/types';
import { INITIAL_DESIGN_SETTINGS, INITIAL_PRODUCTS, INITIAL_ORDERS } from '@/data/initialData';

interface AppContextType {
  // View management
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  currentCategory: string;
  setCurrentCategory: (category: string) => void;
  
  // Language
  language: Language;
  setLanguage: (lang: Language) => void;
  isTranslating: boolean;
  t: (key: keyof TranslationStrings) => string;
  
  // Data
  products: Product[];
  setProducts: (products: Product[]) => void;
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  
  // Design
  designSettings: DesignSettings;
  setDesignSettings: (settings: DesignSettings) => void;
  updateDesignSettings: (updates: Partial<DesignSettings>) => void;
  
  // Navigation helpers
  navigateToCategory: (category: string) => void;
  navigateToProduct: (product: Product) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<ViewType>('Home');
  const [currentCategory, setCurrentCategory] = useState('Tout');
  const [language, setLanguageState] = useState<Language>('FR');
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('app_products');
    if (saved) {
      try { return JSON.parse(saved); } 
      catch { return INITIAL_PRODUCTS; }
    }
    return INITIAL_PRODUCTS;
  });
  
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('app_orders');
    if (saved) {
      try { return JSON.parse(saved); }
      catch { return INITIAL_ORDERS; }
    }
    return INITIAL_ORDERS;
  });
  
  const [designSettings, setDesignSettings] = useState<DesignSettings>(() => {
    const saved = localStorage.getItem('app_design_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...INITIAL_DESIGN_SETTINGS, ...parsed };
      } catch { return INITIAL_DESIGN_SETTINGS; }
    }
    return INITIAL_DESIGN_SETTINGS;
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('app_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('app_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('app_design_settings', JSON.stringify(designSettings));
  }, [designSettings]);

  const setLanguage = (lang: Language) => {
    if (lang === language) return;
    setIsTranslating(true);
    setTimeout(() => {
      setLanguageState(lang);
      setIsTranslating(false);
    }, 1200);
  };

  const t = (key: keyof TranslationStrings): string => {
    return translations[language][key] || key;
  };

  const updateDesignSettings = (updates: Partial<DesignSettings>) => {
    setDesignSettings(prev => ({ ...prev, ...updates }));
  };

  const navigate = useNavigate();
  const { data: allCategories = [] } = useCategories();

  const navigateToCategory = useCallback((category: string) => {
    setCurrentCategory(category);
    setCurrentView('Shop');
    if (category === 'Tout') {
      navigate('/boutique');
    } else {
      // Find slug for this category
      const cat = allCategories.find(c => c.title === category);
      const slug = cat?.slug || encodeURIComponent(category.toLowerCase());
      navigate(`/boutique/${slug}`);
    }
  }, [navigate, allCategories]);

  const navigateToProduct = useCallback((product: Product) => {
    setSelectedProduct(product);
    setCurrentView('ProductDetail');
    navigate(`/boutique/${product.id}`);
  }, [navigate]);

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        currentCategory,
        setCurrentCategory,
        language,
        setLanguage,
        isTranslating,
        t,
        products,
        setProducts,
        orders,
        setOrders,
        selectedProduct,
        setSelectedProduct,
        designSettings,
        setDesignSettings,
        updateDesignSettings,
        navigateToCategory,
        navigateToProduct,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
