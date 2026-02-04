import { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { Product } from '@/types';

interface Stats {
  durability: number;
  price: number;
  fashion: number;
}

interface SidebarContextType {
  hoveredProduct: Product | null;
  setHoveredProduct: (product: Product | null) => void;
  currentStats: Stats;
}

const DEFAULT_STATS: Stats = {
  durability: 85,
  price: 45,
  fashion: 92,
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

function calculateStats(product: Product | null): Stats {
  if (!product) return DEFAULT_STATS;

  // Calculate durability based on material or attributes
  let durability = 70;
  const material = product.material?.toLowerCase() || '';
  if (material.includes('gore-tex') || material.includes('nylon')) durability = 95;
  else if (material.includes('cotton')) durability = 60;
  else if (material.includes('polyester')) durability = 80;
  else if (material.includes('leather')) durability = 85;

  // Calculate price score (inverse - lower price = higher score)
  const maxPrice = 500;
  const actualPrice = product.salePrice || product.price;
  const priceScore = Math.max(10, Math.min(95, 100 - (actualPrice / maxPrice) * 100));

  // Calculate fashion score based on category
  let fashion = 75;
  const category = product.category?.toLowerCase() || '';
  if (category.includes('jacket') || category.includes('veste')) fashion = 92;
  else if (category.includes('accessories') || category.includes('accessoires')) fashion = 88;
  else if (category.includes('pants') || category.includes('pantalon')) fashion = 78;
  else if (category.includes('vest') || category.includes('gilet')) fashion = 85;

  return {
    durability: Math.round(durability),
    price: Math.round(priceScore),
    fashion: Math.round(fashion),
  };
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [hoveredProduct, setHoveredProduct] = useState<Product | null>(null);

  const currentStats = useMemo(() => calculateStats(hoveredProduct), [hoveredProduct]);

  return (
    <SidebarContext.Provider value={{ hoveredProduct, setHoveredProduct, currentStats }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

// Optional hook that doesn't throw - useful for components outside the provider
export function useSidebarOptional() {
  return useContext(SidebarContext);
}
