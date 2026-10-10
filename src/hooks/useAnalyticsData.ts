import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AnalyticsItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
  image?: string;
  category?: string;
}

export interface AnalyticsOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  subtotal: number;
  shipping: number;
  total: number;
  discount: number;
  promoCode?: string;
  status: string;
  paymentStatus: string;
  items: AnalyticsItem[];
  mock?: boolean;
}

export type RangeKey = 'today' | '7d' | 'month' | 'year' | 'custom';

export interface DateRange {
  from: Date;
  to: Date;
}

export function rangeFor(key: RangeKey, custom?: DateRange): DateRange {
  const now = new Date();
  const to = new Date(now);
  const from = new Date(now);
  switch (key) {
    case 'today':
      from.setHours(0, 0, 0, 0);
      break;
    case '7d':
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      break;
    case 'month':
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      break;
    case 'year':
      from.setMonth(0, 1);
      from.setHours(0, 0, 0, 0);
      break;
    case 'custom':
      return custom ?? { from, to };
  }
  return { from, to };
}

/** Même durée, décalée d'un an (comparatif N-1). */
export function previousYearRange(r: DateRange): DateRange {
  const from = new Date(r.from);
  const to = new Date(r.to);
  from.setFullYear(from.getFullYear() - 1);
  to.setFullYear(to.getFullYear() - 1);
  return { from, to };
}

const PROMO_RE = /(?:promo|code)\s*[:=]?\s*([A-Z0-9_-]{3,20})/i;

function parseOrder(db: Record<string, unknown>): AnalyticsOrder {
  const subtotal = Number(db.subtotal) || 0;
  const shipping = Number(db.shipping_cost) || 0;
  const total = Number(db.total) || 0;
  const discount = Math.max(0, Math.round((subtotal + shipping - total) * 100) / 100);
  const notes = (db.notes as string) || '';
  const m = notes.match(PROMO_RE);
  return {
    id: db.id as string,
    orderNumber: (db.order_number as string) || '—',
    createdAt: db.created_at as string,
    customerName: (db.customer_name as string) || 'Client',
    subtotal,
    shipping,
    total,
    discount,
    promoCode: m ? m[1].toUpperCase() : undefined,
    status: (db.status as string) || 'Pending',
    paymentStatus: (db.payment_status as string) || 'Pending',
    items: Array.isArray(db.items) ? (db.items as AnalyticsItem[]) : [],
  };
}

/* ------------------------------------------------------------------ */
/* Mocks réalistes (utilisés quand la boutique n'a pas encore d'historique) */
/* ------------------------------------------------------------------ */

const MOCK_PRODUCTS = [
  { id: 'm1', name: 'Veste Technique ALPIN', price: 289, category: 'Homme', stock: 24 },
  { id: 'm2', name: 'Pantalon Cargo PIONEER', price: 149, category: 'Homme', stock: 61 },
  { id: 'm3', name: 'Doudoune GLACIER', price: 349, category: 'Femme', stock: 12 },
  { id: 'm4', name: 'Hoodie SUMMIT', price: 119, category: 'Sportswear', stock: 88 },
  { id: 'm5', name: 'Tee-shirt CORE', price: 59, category: 'Sportswear', stock: 140 },
  { id: 'm6', name: 'Parka NORDIC KID', price: 129, category: 'Enfant', stock: 33 },
  { id: 'm7', name: 'Sneakers LVTK x PEGASHOES', price: 219, category: 'Collab', stock: 7 },
];
const MOCK_SIZES = ['XS', 'S', 'M', 'L', 'XL'];
const MOCK_COLORS = ['Noir', 'Blanc', 'Gris', 'Kaki'];
const MOCK_PROMOS = [
  { code: 'WELCOME10', rate: 0.1 },
  { code: 'HMP20', rate: 0.2 },
  { code: 'FREESHIP', rate: 0 },
];

function rnd<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

let mockSeq = 1;

export function makeMockOrder(date = new Date()): AnalyticsOrder {
  const nItems = 1 + Math.floor(Math.random() * 3);
  const items: AnalyticsItem[] = Array.from({ length: nItems }).map(() => {
    const p = rnd(MOCK_PRODUCTS);
    return {
      productId: p.id,
      name: p.name,
      price: p.price,
      quantity: 1 + Math.floor(Math.random() * 2),
      size: rnd(MOCK_SIZES),
      color: rnd(MOCK_COLORS),
      category: p.category,
    };
  });
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const usePromo = Math.random() < 0.35;
  const promo = usePromo ? rnd(MOCK_PROMOS) : undefined;
  const discount = promo ? Math.round(subtotal * (promo.rate || 0.05) * 100) / 100 : 0;
  const shipping = subtotal - discount >= 99 ? 0 : 6.9;
  return {
    id: `mock-${date.getTime()}-${mockSeq++}`,
    orderNumber: `SIM-${String(1000 + mockSeq).slice(-4)}`,
    createdAt: date.toISOString(),
    customerName: rnd(['A. Martin', 'L. Dubois', 'S. Bernard', 'K. Petit', 'M. Roux', 'J. Moreau']),
    subtotal,
    shipping,
    total: Math.round((subtotal - discount + shipping) * 100) / 100,
    discount,
    promoCode: promo?.code,
    status: rnd(['Pending', 'Processing', 'Shipped', 'Delivered']),
    paymentStatus: 'Paid',
    items,
    mock: true,
  };
}

/** Historique simulé sur 400 jours avec saisonnalité + croissance. */
export function buildMockHistory(): AnalyticsOrder[] {
  const out: AnalyticsOrder[] = [];
  const today = new Date();
  for (let d = 400; d >= 0; d--) {
    const day = new Date(today);
    day.setDate(day.getDate() - d);
    const seasonal = 1 + 0.45 * Math.sin((day.getMonth() / 12) * Math.PI * 2);
    const weekend = [0, 6].includes(day.getDay()) ? 1.3 : 1;
    const growth = 1 + (400 - d) / 900;
    const count = Math.max(0, Math.round((1.6 * seasonal * weekend * growth) + (Math.random() * 2 - 1)));
    for (let i = 0; i < count; i++) {
      const dt = new Date(day);
      dt.setHours(8 + Math.floor(Math.random() * 13), Math.floor(Math.random() * 60));
      out.push(makeMockOrder(dt));
    }
  }
  return out;
}

export interface ProductRef {
  id: string;
  name: string;
  stock: number;
  category?: string;
}

/**
 * Données analytiques : commandes payées réelles + produits, avec bascule
 * automatique sur un jeu de démonstration si l'historique est trop mince.
 */
export function useAnalyticsData() {
  const qc = useQueryClient();

  const ordersQ = useQuery({
    queryKey: ['analytics', 'orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id,order_number,created_at,customer_name,subtotal,shipping_cost,total,status,payment_status,notes,items')
        .order('created_at', { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data || []).map((d) => parseOrder(d as Record<string, unknown>));
    },
    refetchInterval: 15000,
  });

  const productsQ = useQuery({
    queryKey: ['analytics', 'products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('id,name,stock,category').limit(2000);
      if (error) throw error;
      return (data || []).map((p) => ({
        id: p.id as string,
        name: (p.name as string) || '—',
        stock: Number(p.stock) || 0,
        category: (p.category as string) || undefined,
      })) as ProductRef[];
    },
  });

  const promosQ = useQuery({
    queryKey: ['analytics', 'promos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('promo_codes').select('code,type,value,usage_count,is_active');
      if (error) throw error;
      return data || [];
    },
  });

  const realOrders = ordersQ.data || [];
  const paidReal = useMemo(() => realOrders.filter((o) => o.paymentStatus === 'Paid'), [realOrders]);
  const demoMode = false; // Les données de démonstration ne doivent jamais remplacer les ventes réelles.

  const [mockHistory] = useState(() => buildMockHistory());
  const [liveMocks, setLiveMocks] = useState<AnalyticsOrder[]>([]);
  const [simulate, setSimulate] = useState(false);

  // Ventes en direct simulées (mode démo)
  useEffect(() => {
    if (!demoMode || !simulate) return;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      setLiveMocks((prev) => [makeMockOrder(new Date()), ...prev].slice(0, 60));
      timer = window.setTimeout(tick, 4000 + Math.random() * 6000);
    };
    let timer = window.setTimeout(tick, 3000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [demoMode, simulate]);

  // Temps réel Supabase sur les commandes
  useEffect(() => {
    const channel = supabase
      .channel('analytics-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        qc.invalidateQueries({ queryKey: ['analytics', 'orders'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const orders = useMemo(
    () => (demoMode ? [...liveMocks, ...mockHistory] : paidReal),
    [demoMode, liveMocks, mockHistory, paidReal],
  );

  const products = useMemo<ProductRef[]>(
    () =>
      demoMode
        ? MOCK_PRODUCTS.map((p) => ({ id: p.id, name: p.name, stock: p.stock, category: p.category }))
        : productsQ.data || [],
    [demoMode, productsQ.data],
  );

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['analytics'] });
  }, [qc]);

  return {
    orders,
    products,
    promos: promosQ.data || [],
    demoMode,
    simulate,
    setSimulate,
    loading: ordersQ.isLoading,
    refresh,
  };
}
