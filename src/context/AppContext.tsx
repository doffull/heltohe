import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '@/hooks/useCategories';
import { useProducts } from '@/hooks/useProducts';
import { useDesignSettings, useSaveDesignSettings } from '@/hooks/useDesignSettings';
import { 
  DesignSettings, 
  Product, 
  Order, 
  Language, 
  ViewType,
  translations,
  TranslationStrings
} from '@/types';
import { INITIAL_DESIGN_SETTINGS, INITIAL_ORDERS } from '@/data/initialData';

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
  
  // Products: source from Supabase via useProducts hook
  const { data: supabaseProducts = [] } = useProducts();
  const [products, setProducts] = useState<Product[]>([]);
  
  // Sync products from Supabase
  useEffect(() => {
    if (supabaseProducts.length > 0) {
      setProducts(supabaseProducts);
    }
  }, [supabaseProducts]);

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('app_orders');
    if (saved) {
      try { return JSON.parse(saved); }
      catch { return INITIAL_ORDERS; }
    }
    return INITIAL_ORDERS;
  });
  
  // Design settings: source from Supabase cloud
  const [designSettings, setDesignSettingsLocal] = useState<DesignSettings>(INITIAL_DESIGN_SETTINGS);
  const { data: dbSettings } = useDesignSettings();
  const saveDesignSettings = useSaveDesignSettings();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync cloud → local on load
  useEffect(() => {
    if (dbSettings) {
      setDesignSettingsLocal(prev => ({ ...INITIAL_DESIGN_SETTINGS, ...dbSettings, ...prev === INITIAL_DESIGN_SETTINGS ? dbSettings : {} }));
      setDesignSettingsLocal(dbSettings);
    }
  }, [dbSettings]);

  // Update document title when siteName changes
  useEffect(() => {
    const name = (designSettings as any).siteName;
    if (name) document.title = name;
  }, [(designSettings as any).siteName]);

  // Persist orders to localStorage (orders don't have a full Supabase hook in AppContext yet)
  useEffect(() => {
    localStorage.setItem('app_orders', JSON.stringify(orders));
  }, [orders]);

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

  // Debounced save to cloud (800ms)
  const debouncedSave = useCallback((settings: DesignSettings) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveDesignSettings.mutate(settings);
    }, 800);
  }, [saveDesignSettings]);

  const setDesignSettings = useCallback((settings: DesignSettings) => {
    setDesignSettingsLocal(settings);
    debouncedSave(settings);
  }, [debouncedSave]);

  const updateDesignSettings = useCallback((updates: Partial<DesignSettings>) => {
    setDesignSettingsLocal(prev => {
      const next = { ...prev, ...updates };
      debouncedSave(next);
      return next;
    });
  }, [debouncedSave]);

  const navigate = useNavigate();
  const { data: allCategories = [] } = useCategories();

  const navigateToCategory = useCallback((category: string) => {
    setCurrentCategory(category);
    setCurrentView('Shop');
    if (category === 'Tout') {
      navigate('/boutique');
    } else {
      const cat = allCategories.find(c => c.title === category);
      const slug = cat?.slug || encodeURIComponent(category.toLowerCase());
      // Clean URL: /homme, /femme etc. (no /boutique prefix)
      navigate(`/${slug}`);
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
