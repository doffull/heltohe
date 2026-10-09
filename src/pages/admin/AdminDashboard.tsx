import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProducts, useUpdateProduct } from '@/hooks/useProducts';
import { useOrders } from '@/hooks/useOrders';
import { useApp } from '@/context/AppContext';
import { format, subMonths, parseISO } from 'date-fns';
import { 
  Package, ShoppingCart, DollarSign, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Star, Sparkles, Search,
  Flame, GripVertical, Eye, EyeOff, Gem, CalendarIcon
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { Product, HomeSection } from '@/types';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

const ALL_SECTIONS: { id: string; title: string; desc: string }[] = [
  { id: 'hero', title: 'Hero Slider', desc: 'Bannière principale avec carrousel' },
  { id: 'categories', title: 'Catégories', desc: 'Grille des catégories' },
  { id: 'flash', title: 'Offres Flash', desc: 'Promos avec countdown' },
  { id: 'featured', title: 'En vedette', desc: 'Produits mis en avant' },
  { id: 'new', title: 'Nouveautés', desc: 'Derniers produits ajoutés' },
  { id: 'top', title: 'Top ventes', desc: 'Meilleures ventes mises en avant' },
  { id: 'promo', title: 'Promotions', desc: 'Sélection de produits en promo' },
  { id: 'trending', title: 'Tendances', desc: 'Produits populaires' },

  { id: 'loyalty', title: 'Fidélité', desc: 'Bandeau programme fidélité' },
  { id: 'newsletter', title: 'Newsletter', desc: 'Inscription newsletter' },
];

// ─── Tab: Sections ordering ───
function SectionsTab({ sections, onUpdate }: { sections: HomeSection[]; onUpdate: (s: HomeSection[]) => void }) {
  const merged = ALL_SECTIONS.map((def) => {
    const existing = sections.find((s) => s.id === def.id);
    return existing || { id: def.id, title: def.title, isVisible: true };
  });

  const toggle = (id: string) => {
    const next = merged.map((s) => (s.id === id ? { ...s, isVisible: !s.isVisible } : s));
    onUpdate(next);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-3">Activez ou désactivez les sections affichées sur la page d'accueil.</p>
      {merged.map((section) => {
        const def = ALL_SECTIONS.find((d) => d.id === section.id);
        return (
          <div key={section.id} className="flex items-center gap-3 p-3 border border-border rounded-sm bg-background/50">
            <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{section.title}</p>
              <p className="text-xs text-muted-foreground">{def?.desc}</p>
            </div>
            <div className="flex items-center gap-2">
              {section.isVisible ? <Eye className="h-3.5 w-3.5 text-primary" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
              <Switch checked={section.isVisible} onCheckedChange={() => toggle(section.id)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab: Product tagging ───
function ProductsTab({ products }: { products: Product[] }) {
  const updateProduct = useUpdateProduct();
  const { designSettings, updateDesignSettings } = useApp();
  const [activeTag, setActiveTag] = useState<string>('top');
  const [search, setSearch] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const tags = [
    { key: 'top', label: 'Top ventes', icon: Flame },
    { key: 'new', label: 'Nouveautés', icon: Sparkles },
    { key: 'featured', label: 'En vedette', icon: Star },
    { key: 'promo', label: 'Promo', icon: Flame },
    { key: 'trending', label: 'Tendances', icon: ArrowUpRight },
  ];

  const curatedMap = designSettings.homeSectionProducts || {};

  // Curated order for the active section; falls back to the tagged products.
  const curatedIds: string[] = useMemo(() => {
    const stored = curatedMap[activeTag];
    if (Array.isArray(stored) && stored.length > 0) {
      return stored.filter((id) => products.some((p) => p.id === id));
    }
    return products.filter((p) => p.tags?.includes(activeTag)).map((p) => p.id);
  }, [curatedMap, activeTag, products]);

  const saveCurated = (ids: string[]) => {
    updateDesignSettings({ homeSectionProducts: { ...curatedMap, [activeTag]: ids } });
  };

  const filtered = products.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())
  );

  const toggleProduct = (product: Product) => {
    const isIn = curatedIds.includes(product.id);
    const nextIds = isIn ? curatedIds.filter((id) => id !== product.id) : [...curatedIds, product.id];
    saveCurated(nextIds);

    // Keep the product tag in sync for backward compatibility
    const currentTags = product.tags || [];
    const nextTags = isIn ? currentTags.filter((t) => t !== activeTag) : Array.from(new Set([...currentTags, activeTag]));
    updateProduct.mutate(
      { ...product, tags: nextTags },
      {
        onSuccess: () => toast.success(isIn ? 'Produit retiré de la section' : 'Produit ajouté à la section'),
        onError: () => toast.error('Erreur'),
      }
    );
  };

  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...curatedIds];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setDragIndex(null);
    saveCurated(next);
    toast.success('Ordre mis à jour');
  };

  const count = (tag: string) => {
    const stored = curatedMap[tag];
    if (Array.isArray(stored) && stored.length > 0) return stored.length;
    return products.filter((p) => p.tags?.includes(tag)).length;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {tags.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTag(t.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-sm transition-all',
                activeTag === t.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
              )}
            >
              <Icon className="h-3 w-3" />
              {t.label}
              <span className="bg-background/20 px-1 rounded text-[10px]">{count(t.key)}</span>
            </button>
          );
        })}
      </div>

      {/* Curated, ordered selection for the active section */}
      <div className="border border-border rounded-sm p-3 bg-background/40">
        <p className="text-xs font-medium mb-1">Produits mis en avant (ordre d'affichage)</p>
        <p className="text-[11px] text-muted-foreground mb-3">
          Glissez-déposez pour changer l'ordre. Les 8 premiers sont affichés sur la page d'accueil.
        </p>
        {curatedIds.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">
            Aucun produit sélectionné — ajoutez-en depuis la liste ci-dessous.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {curatedIds.map((id, index) => {
              const product = products.find((p) => p.id === id);
              if (!product) return null;
              return (
                <div
                  key={id}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={() => setDragIndex(null)}
                  className={cn(
                    'flex items-center gap-3 p-2 border rounded bg-background/60 cursor-grab active:cursor-grabbing transition-all',
                    dragIndex === index ? 'border-primary opacity-60' : 'border-border',
                    index >= 8 && 'opacity-50'
                  )}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-[10px] font-bold w-5 text-center text-muted-foreground">{index + 1}</span>
                  <div className="w-9 h-9 rounded overflow-hidden flex-shrink-0 bg-muted">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.price.toFixed(2)}€</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleProduct(product)}>
                    Retirer
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher un produit à ajouter…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">Aucun produit</p>
        ) : (
          filtered.map((product) => {
            const isActive = curatedIds.includes(product.id);
            return (
              <div
                key={product.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded border transition-all cursor-pointer hover:border-primary/30',
                  isActive ? 'border-primary/50 bg-primary/5' : 'border-border bg-background/50'
                )}
                onClick={() => toggleProduct(product)}
              >
                <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-muted">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.category} — {product.price.toFixed(2)}€</p>
                </div>
                <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all', isActive ? 'bg-primary border-primary' : 'border-border')}>
                  {isActive && (
                    <svg className="w-3 h-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}


// ─── Tab: Flash promos ───
function FlashPromosTab({ products }: { products: Product[] }) {
  const updateProduct = useUpdateProduct();

  const promoProducts = products.filter((p) => p.salePrice);

  const setPromoEnd = (product: Product, date: Date | undefined) => {
    updateProduct.mutate(
      { ...product, promoEndsAt: date ? date.toISOString() : undefined },
      {
        onSuccess: () => toast.success('Date de fin mise à jour'),
        onError: () => toast.error('Erreur'),
      }
    );
  };

  if (promoProducts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Flame className="h-8 w-8 mx-auto mb-3 opacity-40" />
        <p className="text-sm">Aucun produit en promo.</p>
        <p className="text-xs mt-1">Définissez un prix soldé sur un produit pour créer une promo flash.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
      <p className="text-xs text-muted-foreground">
        Définissez une date de fin pour activer le countdown sur la page d'accueil.
      </p>
      {promoProducts.map((product) => {
        const endsAt = product.promoEndsAt ? new Date(product.promoEndsAt) : undefined;
        const isExpired = endsAt && endsAt.getTime() < Date.now();
        const discount = Math.round(((product.price - (product.salePrice || product.price)) / product.price) * 100);

        return (
          <div key={product.id} className="flex items-center gap-3 p-3 border border-border rounded-sm bg-background/50">
            <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-muted">
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{product.name}</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold">{product.salePrice}€</span>
                <span className="line-through text-muted-foreground">{product.price}€</span>
                <span className="text-destructive font-bold">-{discount}%</span>
              </div>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn('text-xs h-8 gap-1', isExpired && 'border-destructive/50 text-destructive')}>
                  <CalendarIcon className="h-3 w-3" />
                  {endsAt ? (isExpired ? 'Expiré' : format(endsAt, 'dd/MM/yyyy')) : 'Définir'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={endsAt}
                  onSelect={(d) => setPromoEnd(product, d)}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab: Loyalty toggle ───
function LoyaltyTab({ sections, onUpdate }: { sections: HomeSection[]; onUpdate: (s: HomeSection[]) => void }) {
  const loyaltySection = sections.find((s) => s.id === 'loyalty');
  const isEnabled = loyaltySection?.isVisible ?? true;

  const toggle = () => {
    const exists = sections.find((s) => s.id === 'loyalty');
    if (exists) {
      onUpdate(sections.map((s) => (s.id === 'loyalty' ? { ...s, isVisible: !s.isVisible } : s)));
    } else {
      onUpdate([...sections, { id: 'loyalty', title: 'Fidélité', isVisible: true }]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 p-4 border border-border rounded-sm bg-background/50">
        <Gem className="h-6 w-6 text-primary flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium text-sm">Section Fidélité sur la Homepage</p>
          <p className="text-xs text-muted-foreground">Affiche les paliers Bronze → Platinum et les points de l'utilisateur</p>
        </div>
        <Switch checked={isEnabled} onCheckedChange={toggle} />
      </div>
      <div className="p-4 border border-border rounded-sm bg-muted/30">
        <p className="text-xs text-muted-foreground">
          Le programme fidélité attribue automatiquement des points lors de chaque commande. Les paliers sont :
        </p>
        <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
          <li><strong>Bronze</strong> : 0 pts — 1x les points</li>
          <li><strong>Silver</strong> : 500 pts — 1.5x les points</li>
          <li><strong>Gold</strong> : 1 500 pts — 2x + livraison offerte</li>
          <li><strong>Platinum</strong> : 5 000 pts — 3x + accès VIP</li>
        </ul>
      </div>
    </div>
  );
}

// ─── Homepage Management ───
function HomepageManagement({ products }: { products: Product[] }) {
  const { designSettings, updateDesignSettings } = useApp();
  const sections = designSettings.homeSections || [];

  const handleUpdateSections = (newSections: HomeSection[]) => {
    updateDesignSettings({ homeSections: newSections });
    toast.success('Sections mises à jour');
  };

  return (
    <div className="chamfer-hud bg-card/50 p-6 lg:col-span-2">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Star className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold hud-text">GESTION PAGE D'ACCUEIL</h3>
          <p className="text-xs text-muted-foreground">Contrôlez les sections, produits et promos de la homepage</p>
        </div>
      </div>

      <Tabs defaultValue="sections" className="w-full">
        <TabsList className="w-full grid grid-cols-4 admin-tabs-scroll w-full h-auto">
          <TabsTrigger value="sections" className="text-xs">Sections</TabsTrigger>
          <TabsTrigger value="products" className="text-xs">Produits</TabsTrigger>
          <TabsTrigger value="flash" className="text-xs">Flash</TabsTrigger>
          <TabsTrigger value="loyalty" className="text-xs">Fidélité</TabsTrigger>
        </TabsList>

        <TabsContent value="sections">
          <SectionsTab sections={sections} onUpdate={handleUpdateSections} />
        </TabsContent>
        <TabsContent value="products">
          <ProductsTab products={products} />
        </TabsContent>
        <TabsContent value="flash">
          <FlashPromosTab products={products} />
        </TabsContent>
        <TabsContent value="loyalty">
          <LoyaltyTab sections={sections} onUpdate={handleUpdateSections} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: products = [] } = useProducts();
  const { data: orders = [], isLoading: ordersLoading, isError: ordersError, dataUpdatedAt } = useOrders();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<'today' | '7d' | '30d'>('today');
  useEffect(() => {
    const channel = supabase.channel('admin-dashboard-live-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
      }).subscribe();
    const poll = window.setInterval(() => queryClient.invalidateQueries({ queryKey: ['orders'] }), 15000);
    return () => { window.clearInterval(poll); void supabase.removeChannel(channel); };
  }, [queryClient]);
  const filteredOrders = useMemo(() => {
    const days = period === 'today' ? 0 : period === '7d' ? 6 : 29;
    const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - days);
    return orders.filter(o => o.date && new Date(o.date) >= start);
  }, [orders, period]);
  const lowStockProducts = products.filter(p => p.stock <= 5).sort((a, b) => a.stock - b.stock);
  const paidOrders = filteredOrders.filter(o => ['paid', 'completed', 'succeeded'].includes(String(o.paymentStatus).toLowerCase()));
  const periodRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const itemsSold = paidOrders.reduce((sum, o) => sum + o.items.reduce((qty, item) => qty + (Number(item.quantity) || 0), 0), 0);
  const recentOrders = useMemo(() => [...orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5), [orders]);
  const topProducts = useMemo(() => {
    const totals = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const order of paidOrders) for (const item of order.items) {
      const key = String(item.productId || item.name);
      const row = totals.get(key) || { name: item.name, quantity: 0, revenue: 0 };
      row.quantity += Number(item.quantity) || 0;
      row.revenue += (Number(item.price) || 0) * (Number(item.quantity) || 0);
      totals.set(key, row);
    }
    return [...totals.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  }, [paidOrders]);
  const euro = (amount: number) => amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

  // Ventes payées, même période que les indicateurs.
  const salesData = useMemo(() => {
    const days = period === 'today' ? 1 : period === '7d' ? 7 : 30;
    const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - days + 1);
    const buckets = Array.from({ length: days }, (_, i) => {
      const date = new Date(start); date.setDate(start.getDate() + i);
      return { key: format(date, 'yyyy-MM-dd'), name: format(date, 'dd/MM'), sales: 0, orders: 0 };
    });
    const byDate = new Map(buckets.map(bucket => [bucket.key, bucket]));
    for (const order of paidOrders) {
      if (!order.date) continue;
      const bucket = byDate.get(format(new Date(order.date), 'yyyy-MM-dd'));
      if (bucket) { bucket.sales += order.total; bucket.orders += 1; }
    }
    return buckets.map(bucket => ({ ...bucket, sales: Math.round(bucket.sales * 100) / 100 }));
  }, [paidOrders, period]);

  // Products per category
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of products) {
      map[p.category] = (map[p.category] || 0) + 1;
    }
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [products]);

  return (
    <div className="space-y-6 lg:space-y-8">
      <div>
        <h1 className="text-xl lg:text-3xl font-bold hud-text">DASHBOARD</h1>
        <p className="text-muted-foreground text-xs lg:text-sm mt-1">Vue d'ensemble de votre activité</p>
      </div>

      <div className="rounded-2xl bg-zinc-950 text-white px-6 py-7 lg:px-9 lg:py-9 flex flex-wrap items-center justify-between gap-5 shadow-lg">
        <div><p className="text-xs tracking-[0.2em] uppercase text-zinc-300 mb-2">HELVETICA-MP / Administration</p>
          <h2 className="text-2xl lg:text-4xl font-extrabold tracking-tight">Bonjour ! 👋</h2>
          <p className="text-sm text-zinc-300 mt-2">Votre activité commerciale avec les vraies commandes.</p></div>
        <a href="/" target="_blank" rel="noopener noreferrer" className="rounded-xl bg-white text-black px-5 py-3 text-sm font-semibold hover:bg-zinc-100">Voir la boutique ↗</a>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-bold">Ventes en temps réel</h2>
          <p className="text-xs text-muted-foreground mt-1">{ordersError ? 'Connexion indisponible' : ordersLoading ? 'Chargement…' : 'Synchronisation toutes les 15 secondes'} · Actualisé : {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('fr-FR') : '—'}</p></div>
        <div className="flex items-center gap-2"><span className="text-xs text-emerald-600 font-semibold">● Live</span>
          <select aria-label="Période des ventes" value={period} onChange={e => setPeriod(e.target.value as 'today' | '7d' | '30d')} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="today">Aujourd'hui</option><option value="7d">7 jours</option><option value="30d">30 jours</option>
          </select>
          <button type="button" onClick={() => queryClient.invalidateQueries({ queryKey: ['orders'] })} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">Actualiser</button></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "CA encaissé", value: euro(periodRevenue) },
          { label: 'Commandes', value: String(filteredOrders.length) },
          { label: 'Articles vendus', value: String(itemsSold) },
          { label: 'Stock faible', value: String(products.filter(p => p.stock <= 5).length) },
        ].map(k => <div key={k.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-2xl lg:text-3xl font-bold">{ordersError && k.label !== 'Stock faible' ? '—' : k.value}</p>
          <p className="text-sm text-muted-foreground mt-2">{k.label}</p>
        </div>)}
      </div>
      {/* Charts: ventes payées uniquement, même période que les KPI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card p-4 lg:p-6 shadow-sm">
          <h3 className="text-lg font-bold hud-text mb-4 lg:mb-6">ÉVOLUTION DES VENTES <span className="text-xs font-normal text-muted-foreground">· période sélectionnée</span></h3>
          <div className="h-[220px] lg:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0' }} />
                <Area type="monotone" dataKey="sales" stroke="hsl(var(--primary))" fill="url(#salesGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 lg:p-6 shadow-sm">
          <h3 className="text-lg font-bold hud-text mb-4 lg:mb-6">PRODUITS PAR CATÉGORIE</h3>
          <div className="h-[220px] lg:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0' }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <section className="rounded-2xl border border-border bg-card p-5 lg:p-6 shadow-sm">
          <div className="flex justify-between items-center mb-5"><h3 className="font-bold text-lg">Commandes récentes</h3><span className="text-xs text-muted-foreground">Données réelles</span></div>
          {ordersError ? <p className="text-sm text-destructive">Impossible de charger les commandes.</p> : recentOrders.length === 0 ? <p className="text-sm text-muted-foreground">Aucune commande pour le moment.</p> :
            <div className="divide-y divide-border">{recentOrders.map(order => <div key={order.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0"><p className="font-semibold text-sm truncate">#{order.orderNumber}</p><p className="text-xs text-muted-foreground">{new Date(order.date).toLocaleString('fr-FR')}</p></div>
              <span className="rounded-full bg-muted px-2 py-1 text-xs">{String(order.paymentStatus)}</span>
              <span className="text-sm font-semibold whitespace-nowrap">{euro(order.total)}</span>
            </div>)}</div>}
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 lg:p-6 shadow-sm">
          <h3 className="font-bold text-lg mb-5">Produits les plus vendus <span className="text-xs font-normal text-muted-foreground">· période sélectionnée</span></h3>
          {topProducts.length === 0 ? <p className="text-sm text-muted-foreground">Aucune vente payée sur cette période.</p> :
            <div className="space-y-4">{topProducts.map((p, i) => <div key={p.name} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-5">{i + 1}</span><span className="text-sm font-medium flex-1 truncate">{p.name}</span>
              <span className="text-xs text-muted-foreground">{p.quantity} ventes</span><span className="text-sm font-bold">{euro(p.revenue)}</span>
            </div>)}</div>}
        </section>
      </div>
      {/* Homepage Management (full width) + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HomepageManagement products={products} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low stock */}
        <div className="chamfer-hud bg-card/50 p-6">
          <h3 className="text-lg font-bold hud-text mb-6">ALERTES STOCK</h3>
          <p className="text-xs text-muted-foreground mb-4">5 unités ou moins · stock le plus faible en premier</p>
          {lowStockProducts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-green-500 mb-2">✓</div>
              <p className="text-muted-foreground">Tous les stocks sont OK</p>
            </div>
          ) : (
            <div className="space-y-4">
              {lowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center gap-4 py-3 border-b border-border last:border-0">
                  <div className="w-12 h-12 bg-muted rounded overflow-hidden flex-shrink-0">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.sku}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-bold ${product.stock === 0 ? 'text-destructive' : 'text-yellow-500'}`}>{product.stock}</span>
                    <p className="text-xs text-muted-foreground">en stock</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
