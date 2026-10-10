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

  const card = 'rounded-2xl border border-white/10 bg-[#111c32] p-4 shadow-lg';
  return (
    <div className="min-w-0 space-y-3 rounded-2xl bg-[#080f20] p-3 text-white lg:p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-black tracking-tight">Dashboard</h1><p className="text-xs text-slate-400">HELVETICA · Activité commerciale actualisée</p></div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-emerald-500/10 px-2 py-2 text-xs text-emerald-400">● Données synchronisées</span>
          <select aria-label="Période des ventes" value={period} onChange={e => setPeriod(e.target.value as 'today' | '7d' | '30d')} className="rounded-lg border border-white/15 bg-[#17243d] px-3 py-2 text-xs text-white"><option value="today">Aujourd'hui</option><option value="7d">7 derniers jours</option><option value="30d">30 derniers jours</option></select>
          <button type="button" onClick={() => queryClient.invalidateQueries({ queryKey: ['orders'] })} className="rounded-lg border border-white/15 bg-[#17243d] px-3 py-2 text-xs hover:bg-[#243657]">↻ Actualiser</button>
        </div>
      </header>
      <p className="text-[11px] text-slate-400">{ordersError ? 'Commandes indisponibles' : ordersLoading ? 'Chargement des commandes…' : 'Commandes rafraîchies toutes les 15 s'} · Dernière mise à jour : {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('fr-FR') : '—'}</p>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {label:'Chiffre d’affaires encaissé',value:ordersError?'—':euro(periodRevenue),tone:'from-violet-600/40 to-violet-950/30',symbol:'€'},
          {label:'Commandes payées',value:ordersError?'—':String(paidOrders.length),tone:'from-blue-600/40 to-blue-950/30',symbol:'▣'},
          {label:'Visiteurs en ligne',value:'Non suivi',tone:'from-pink-600/40 to-pink-950/30',symbol:'◉'},
          {label:'Taux de conversion',value:'Non suivi',tone:'from-orange-600/40 to-orange-950/30',symbol:'↗'},
        ].map(k=><div key={k.label} className={`rounded-2xl border border-white/10 bg-gradient-to-br ${k.tone} p-4`}><span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-xl">{k.symbol}</span><p className="text-xs text-slate-300">{k.label}</p><p className="mt-1 text-xl font-extrabold lg:text-2xl">{k.value}</p></div>)}
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <section className={`${card} xl:col-span-7`}>
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">📈 Évolution des ventes</h2><span className="text-xs text-violet-300">CA encaissé · commandes payées</span></div>
          <div className="h-[220px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={salesData}><defs><linearGradient id="salesGradientPremium" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a855f7" stopOpacity={0.4}/><stop offset="95%" stopColor="#a855f7" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#28364f" strokeDasharray="3 3"/><XAxis dataKey="name" stroke="#94a3b8" fontSize={10}/><YAxis stroke="#94a3b8" fontSize={10} width={44}/><Tooltip contentStyle={{backgroundColor:'#17243d',border:'1px solid #34445f',borderRadius:12,color:'#fff'}}/><Area type="monotone" dataKey="sales" stroke="#b86cff" strokeWidth={3} fill="url(#salesGradientPremium)" name="Ventes (€)"/></AreaChart></ResponsiveContainer></div>
          {ordersError && <p className="text-xs text-rose-400">Impossible de récupérer les commandes.</p>}
        </section>
        <section className={`${card} xl:col-span-3`}><h2 className="mb-3 font-bold">🟢 Ventes récentes</h2><div className="max-h-[230px] divide-y divide-white/10 overflow-y-auto">{recentOrders.length===0?<p className="text-xs text-slate-400">Aucune commande récente.</p>:recentOrders.map(o=><div key={o.id} className="flex items-center justify-between gap-2 py-2"><div className="min-w-0"><p className="truncate text-xs font-semibold">#{o.orderNumber}</p><p className="text-[10px] text-slate-400">{new Date(o.date).toLocaleString('fr-FR')} · {o.paymentStatus}</p></div><span className="shrink-0 text-xs font-bold">{euro(o.total)}</span></div>)}</div></section>
        <section className={`${card} xl:col-span-2`}><h2 className="mb-3 font-bold">Répartition</h2><p className="text-2xl font-extrabold text-violet-300">{euro(periodRevenue)}</p><p className="mt-1 text-xs text-slate-400">Ventes encaissées</p><div className="mt-5 space-y-3 text-xs"><div className="flex justify-between"><span>Articles vendus</span><b>{itemsSold}</b></div><div className="flex justify-between"><span>Commandes payées</span><b>{paidOrders.length}</b></div><div className="flex justify-between"><span>Canaux de vente</span><span className="text-amber-300">Non attribués</span></div></div></section>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <section className={card}><h2 className="mb-3 font-bold">🏆 Top produits</h2><div className="space-y-2">{topProducts.length===0?<p className="text-xs text-slate-400">Aucune vente sur la période.</p>:topProducts.slice(0,4).map((p,i)=><div key={i} className="flex items-center gap-2 text-xs"><span className="text-violet-300">{i+1}.</span><span className="min-w-0 flex-1 truncate">{p.name}</span><b>{p.quantity} ventes</b></div>)}</div></section>
        <section className={card}><h2 className="mb-3 font-bold">📊 Canaux de vente</h2><p className="text-sm text-amber-300">Attribution non disponible</p><p className="mt-2 text-xs text-slate-400">Nécessite un suivi UTM et une association aux commandes.</p><a href="/admin/analytics" className="mt-3 inline-block text-xs text-blue-300 hover:underline">Voir l'analytique →</a></section>
        <section className={card}><h2 className="mb-3 font-bold">👥 Clients & fidélité</h2><p className="text-sm text-slate-300">Statistiques clients détaillées</p><p className="mt-2 text-xs text-slate-400">À consulter dans le CRM, sans estimation fictive.</p><a href="/admin/clients" className="mt-3 inline-block text-xs text-pink-300 hover:underline">Voir les clients →</a></section>
        <section className={card}><div className="mb-3 flex items-center justify-between"><h2 className="font-bold">🚨 Alertes stock</h2><a href="/admin/stock" className="text-xs text-orange-300 hover:underline">Voir tout</a></div><p className="mb-2 text-xs text-slate-400">{lowStockProducts.length} produit(s) à 5 unités ou moins</p><div className="max-h-32 space-y-2 overflow-y-auto">{lowStockProducts.length===0?<p className="text-xs text-emerald-400">Tous les stocks sont OK.</p>:lowStockProducts.slice(0,6).map(p=><div key={p.id} className="flex justify-between gap-2 text-xs"><span className="truncate">{p.name}</span><b className={p.stock===0?'text-rose-400':'text-orange-300'}>{p.stock}</b></div>)}</div></section>
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
        <section className={`${card} xl:col-span-3`}><h2 className="mb-3 font-bold">✨ Performance marketing</h2><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[{name:'Codes promo',href:'/admin/marketing',color:'text-pink-300'},{name:'Jeux & roulette',href:'/admin/roulette',color:'text-violet-300'},{name:'Pop-ups',href:'/admin/popups',color:'text-blue-300'},{name:'Newsletter',href:'/admin/newsletters',color:'text-orange-300'}].map(m=><a key={m.name} href={m.href} className="rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10"><p className={`text-xs font-bold ${m.color}`}>{m.name}</p><p className="mt-2 text-[11px] text-slate-400">Consulter les données →</p></a>)}</div></section>
        <section className={card}><h2 className="mb-3 font-bold">🛒 Paniers abandonnés</h2><p className="text-lg font-bold text-amber-300">Suivi à vérifier</p><p className="mt-2 text-xs text-slate-400">Ne pas confondre paiements en attente et paniers abandonnés.</p><a href="/admin/commandes" className="mt-3 inline-block text-xs text-blue-300 hover:underline">Voir les commandes →</a></section>
      </div>
      <details className="rounded-2xl border border-white/10 bg-[#111c32] p-4"><summary className="cursor-pointer text-sm font-bold">⚙️ Gestion de la page d'accueil · sections, produits et mises en avant</summary><div className="mt-4 text-slate-900 dark:text-white"><HomepageManagement products={products}/></div></details>
    </div>
  );
}
