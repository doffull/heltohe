import { useMemo, useState } from 'react';
import { useProducts, useUpdateProduct } from '@/hooks/useProducts';
import { useOrders } from '@/hooks/useOrders';
import { format, subMonths, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Package, ShoppingCart, DollarSign, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Star, Sparkles, Search
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { Product } from '@/types';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

// ─── Homepage product management panel ───
function HomepageManagement({ products }: { products: Product[] }) {
  const updateProduct = useUpdateProduct();
  const [activeSection, setActiveSection] = useState<'featured' | 'new'>('featured');
  const [search, setSearch] = useState('');

  const isFeatured = (p: Product) => p.tags?.includes('featured') ?? false;
  const isNew = (p: Product) => p.tags?.includes('new') ?? false;

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const toggleTag = (product: Product, tag: 'featured' | 'new') => {
    const currentTags = product.tags || [];
    const hasTag = currentTags.includes(tag);
    const newTags = hasTag
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    
    updateProduct.mutate(
      { ...product, tags: newTags },
      {
        onSuccess: () => toast.success(hasTag ? `Retiré des "${tag === 'featured' ? 'En vedette' : 'Nouvelles arrivées'}"` : `Ajouté aux "${tag === 'featured' ? 'En vedette' : 'Nouvelles arrivées'}"`),
        onError: () => toast.error('Erreur lors de la mise à jour'),
      }
    );
  };

  const sections = [
    { key: 'featured' as const, label: 'Produits en vedette', icon: Star, tagName: 'featured', desc: 'Apparaissent dans la section "En vedette" sur la page d\'accueil' },
    { key: 'new' as const, label: 'Nouvelles arrivées', icon: Sparkles, tagName: 'new', desc: 'Apparaissent dans la section "Nouveautés" sur la page d\'accueil' },
  ];

  const activeCount = {
    featured: products.filter(isFeatured).length,
    new: products.filter(isNew).length,
  };

  return (
    <div className="chamfer-hud bg-card/50 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Star className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold hud-text">GESTION PAGE D'ACCUEIL</h3>
          <p className="text-xs text-muted-foreground">Gérez les produits mis en avant sur la page d'accueil</p>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 mb-4">
        {sections.map(s => {
          const Icon = s.icon;
          const count = activeCount[s.key];
          return (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-sm border ${
                activeSection === s.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {s.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                activeSection === s.key ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background text-foreground'
              }`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground mb-4">
        {sections.find(s => s.key === activeSection)?.desc}
      </p>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un produit..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Product list */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {filteredProducts.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">Aucun produit trouvé</p>
        ) : filteredProducts.map(product => {
          const isActive = activeSection === 'featured' ? isFeatured(product) : isNew(product);
          return (
            <div
              key={product.id}
              className={`flex items-center gap-3 p-3 rounded border transition-all cursor-pointer hover:border-primary/30 ${
                isActive ? 'border-primary/50 bg-primary/5' : 'border-border bg-background/50'
              }`}
              onClick={() => toggleTag(product, activeSection)}
            >
              <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-muted">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{product.name}</p>
                <p className="text-xs text-muted-foreground">{product.category} — {product.price.toFixed(2)}€</p>
              </div>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                isActive ? 'bg-primary border-primary' : 'border-border'
              }`}>
                {isActive && (
                  <svg className="w-3 h-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold hud-text">DASHBOARD</h1>
        <p className="text-muted-foreground mt-1">Vue d'ensemble de votre activité</p>
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

      {/* Homepage Management + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Homepage management */}
        <HomepageManagement products={products} />

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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
  );
}
