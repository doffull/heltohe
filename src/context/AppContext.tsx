import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '@/hooks/useCategories';
import { useProducts } from '@/hooks/useProducts';
import { useDesignSettings, useSaveDesignSettings } from '@/hooks/useDesignSettings';
import { supabase } from '@/integrations/supabase/client';
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
  updateDesignSettings: (updates: Partial<DesignSettings>, options?: { immediate?: boolean }) => void;
  flushDesignSettings: (override?: Partial<DesignSettings>) => Promise<void>;
  
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
  const { data: dbSettings, refetch: refetchDesignSettings } = useDesignSettings();
  const saveDesignSettings = useSaveDesignSettings();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref toujours à jour avec la dernière valeur de designSettings.
  const latestDesignRef = useRef(designSettings);
  useEffect(() => { latestDesignRef.current = designSettings; }, [designSettings]);

  // Sync cloud → local on every fresh DB snapshot, UNLESS we have a local
  // save pending/in-flight — otherwise we'd overwrite the user's in-flight
  // edits. This guarantees a change saved on mobile shows up identically on
  // desktop/tablet the next time the design_settings query refetches.
  const pendingSaveRef = useRef(false);
  const dirtySinceRef = useRef<number | null>(null);
  const saveSeqRef = useRef(0);

  const markEditing = useCallback(() => {
    pendingSaveRef.current = true;
    dirtySinceRef.current = Date.now();
    saveSeqRef.current += 1;
    return saveSeqRef.current;
  }, []);

  const settleEditing = useCallback((seq: number) => {
    if (seq !== saveSeqRef.current) return;
    pendingSaveRef.current = false;
    // Keep a short post-save protection window: some backend refetches can
    // return the previous row just after an upsert and would visually reset
    // the admin control the user just clicked.
    dirtySinceRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!dbSettings) return;
    if (pendingSaveRef.current) return;
    if (dirtySinceRef.current && Date.now() - dirtySinceRef.current < 5_000) return;
    setDesignSettingsLocal(dbSettings);
    latestDesignRef.current = dbSettings;
  }, [dbSettings]);

  // Published visitors and admins must see content changes without waiting for
  // a full app redeploy/cache cycle. Listen to backend updates and refetch when
  // the tab becomes visible again.
  useEffect(() => {
    const channel = supabase
      .channel('design-settings-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'design_settings' }, () => {
        if (!pendingSaveRef.current) refetchDesignSettings();
      })
      .subscribe();

    const refresh = () => {
      if (!pendingSaveRef.current) refetchDesignSettings();
    };
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
    };
  }, [refetchDesignSettings]);

  // Update document title when siteName changes
  useEffect(() => {
    const name = (designSettings as any).siteName;
    if (name) document.title = name;
  }, [(designSettings as any).siteName]);

  // Persist orders to localStorage
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
    const seq = markEditing();
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveDesignSettings.mutate(settings, {
        onSettled: () => { settleEditing(seq); },
      });
    }, 800);
  }, [markEditing, saveDesignSettings, settleEditing]);

  const setDesignSettings = useCallback((settings: DesignSettings) => {
    latestDesignRef.current = settings;
    setDesignSettingsLocal(settings);
    debouncedSave(settings);
  }, [debouncedSave]);

  const updateDesignSettings = useCallback((updates: Partial<DesignSettings>, options?: { immediate?: boolean }) => {
    setDesignSettingsLocal(prev => {
      const next = { ...prev, ...updates };
      latestDesignRef.current = next;
      if (options?.immediate) {
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
        const seq = markEditing();
        saveDesignSettings.mutate(next, {
          onSettled: () => { settleEditing(seq); },
        });
      } else {
        debouncedSave(next);
      }
      return next;
    });
  }, [debouncedSave, markEditing, saveDesignSettings, settleEditing]);

  // Flush pending debounced save immediately (used on explicit "Save" button).
  const flushDesignSettings = useCallback(async (override?: Partial<DesignSettings>) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const merged = override ? { ...latestDesignRef.current, ...override } : latestDesignRef.current;
    if (override) {
      latestDesignRef.current = merged;
      setDesignSettingsLocal(merged);
    }
    const seq = markEditing();
    try {
      await saveDesignSettings.mutateAsync(merged);
    } finally {
      settleEditing(seq);
    }
  }, [markEditing, saveDesignSettings, settleEditing]);

  const navigate = useNavigate();
  const { data: allCategories = [] } = useCategories();

  // Shared normalizeSlug — must match CategoryPageRouter exactly
  const normalizeSlug = (s: string) =>
    s.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[àâä]/g, 'a')
      .replace(/[éèêë]/g, 'e')
      .replace(/[îï]/g, 'i')
      .replace(/[ôö]/g, 'o')
      .replace(/[ùûü]/g, 'u')
      .replace(/ç/g, 'c');

  const navigateToCategory = useCallback((category: string) => {
    setCurrentCategory(category);
    if (category === 'Tout') {
      setCurrentView('Shop');
      navigate('/boutique');
    } else {
      setCurrentView('Shop');
      const cat = allCategories.find(c => c.title === category);
      // Use DB slug if available, otherwise normalize title (same algo as CategoryPageRouter)
      const slug = cat?.slug || normalizeSlug(category);
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
        flushDesignSettings,
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
