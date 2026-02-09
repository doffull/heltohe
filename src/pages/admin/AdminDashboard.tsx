import { useMemo } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useOrders } from '@/hooks/useOrders';
import { format, subMonths, startOfMonth, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Package, ShoppingCart, DollarSign, AlertTriangle,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

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

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
