import { useMemo, useState } from 'react';
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
        <TabsList className="w-full grid grid-cols-4">
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
  const { data: orders = [] } = useOrders();

  // Aggregate sales by month (last 12 months)
  const salesData = useMemo(() => {
    const now = new Date();
    const months: { key: string; name: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(now, i);
      months.push({
        key: format(d, 'yyyy-MM'),
        name: MONTH_LABELS[d.getMonth()],
      });
    }

    const grouped: Record<string, { sales: number; orders: number }> = {};
    for (const m of months) grouped[m.key] = { sales: 0, orders: 0 };

    for (const order of orders) {
      const key = order.date ? format(parseISO(order.date), 'yyyy-MM') : null;
      if (key && grouped[key]) {
        grouped[key].sales += order.total;
        grouped[key].orders += 1;
      }
    }

    return months.map(m => ({ name: m.name, sales: Math.round(grouped[m.key].sales), orders: grouped[m.key].orders }));
  }, [orders]);

  // Products per category
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of products) {
      map[p.category] = (map[p.category] || 0) + 1;
    }
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [products]);

  // Variations (current month vs previous)
  const { revenueChange, ordersChange } = useMemo(() => {
    const now = new Date();
    const curKey = format(now, 'yyyy-MM');
    const prevKey = format(subMonths(now, 1), 'yyyy-MM');

    let curRev = 0, prevRev = 0, curOrd = 0, prevOrd = 0;
    for (const order of orders) {
      const key = order.date ? format(parseISO(order.date), 'yyyy-MM') : null;
      if (key === curKey) { curRev += order.total; curOrd++; }
      if (key === prevKey) { prevRev += order.total; prevOrd++; }
    }

    const calcChange = (cur: number, prev: number) => {
      if (prev === 0) return cur > 0 ? 'Nouveau' : '0%';
      return `${((cur - prev) / prev * 100).toFixed(1)}%`;
    };
    const changeType = (cur: number, prev: number): 'positive' | 'negative' | 'neutral' => {
      if (prev === 0) return cur > 0 ? 'positive' : 'neutral';
      return cur >= prev ? 'positive' : 'negative';
    };

    return {
      revenueChange: { label: calcChange(curRev, prevRev), type: changeType(curRev, prevRev) },
      ordersChange: { label: calcChange(curOrd, prevOrd), type: changeType(curOrd, prevOrd) },
    };
  }, [orders]);

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const lowStockProducts = products.filter(p => p.stock <= 5);

  const stats = [
    { label: "Chiffre d'affaires", value: `${totalRevenue.toFixed(2)}€`, icon: DollarSign, change: revenueChange.label, changeType: revenueChange.type },
    { label: 'Commandes', value: orders.length.toString(), icon: ShoppingCart, change: ordersChange.label, changeType: ordersChange.type },
    { label: 'Produits', value: products.length.toString(), icon: Package, change: `${categoryData.length} cat.`, changeType: 'neutral' as const },
    { label: 'Stock faible', value: lowStockProducts.length.toString(), icon: AlertTriangle, change: lowStockProducts.length > 0 ? 'Attention' : 'OK', changeType: lowStockProducts.length > 0 ? 'negative' as const : 'positive' as const },
  ];

  return (
    <div className="space-y-6 lg:space-y-8">
      <div>
        <h1 className="text-xl lg:text-3xl font-bold hud-text">DASHBOARD</h1>
        <p className="text-muted-foreground text-xs lg:text-sm mt-1">Vue d'ensemble de votre activité</p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="chamfer-hud bg-card/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <span className={`text-xs font-medium flex items-center gap-1 ${
                stat.changeType === 'positive' ? 'text-green-500' :
                stat.changeType === 'negative' ? 'text-destructive' :
                'text-muted-foreground'
              }`}>
                {stat.changeType === 'positive' && <ArrowUpRight className="h-3 w-3" />}
                {stat.changeType === 'negative' && <ArrowDownRight className="h-3 w-3" />}
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="chamfer-hud bg-card/50 p-4 lg:p-6">
          <h3 className="text-lg font-bold hud-text mb-4 lg:mb-6">ÉVOLUTION DES VENTES</h3>
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

        <div className="chamfer-hud bg-card/50 p-4 lg:p-6">
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

      {/* Homepage Management (full width) + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HomepageManagement products={products} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="chamfer-hud bg-card/50 p-6">
          <h3 className="text-lg font-bold hud-text mb-6">COMMANDES RÉCENTES</h3>
          {orders.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucune commande</p>
          ) : (
            <div className="space-y-4">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium text-sm">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">{order.customer.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{order.total.toFixed(2)}€</p>
                    <span className={`text-xs px-2 py-1 rounded ${
                      order.status === 'Delivered' ? 'bg-green-500/20 text-green-500' :
                      order.status === 'Shipped' ? 'bg-blue-500/20 text-blue-500' :
                      order.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-500' :
                      'bg-muted text-muted-foreground'
                    }`}>{order.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low stock */}
        <div className="chamfer-hud bg-card/50 p-6">
          <h3 className="text-lg font-bold hud-text mb-6">ALERTES STOCK</h3>
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
