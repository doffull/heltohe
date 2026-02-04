import { useProducts } from '@/hooks/useProducts';
import { useOrders } from '@/hooks/useOrders';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  TrendingUp,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

// Mock data for charts
const salesData = [
  { name: 'Jan', sales: 4000, orders: 24 },
  { name: 'Fév', sales: 3000, orders: 18 },
  { name: 'Mar', sales: 5000, orders: 30 },
  { name: 'Avr', sales: 4500, orders: 27 },
  { name: 'Mai', sales: 6000, orders: 36 },
  { name: 'Juin', sales: 5500, orders: 33 },
];

const categoryData = [
  { name: 'Vestes', count: 12 },
  { name: 'Pantalons', count: 8 },
  { name: 'Gilets', count: 6 },
  { name: 'Accessoires', count: 15 },
];

export default function AdminDashboard() {
  const { data: products = [] } = useProducts();
  const { data: orders = [] } = useOrders();

  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const lowStockProducts = products.filter(p => p.stock <= 5);
  const pendingOrders = orders.filter(o => o.status === 'Pending');

  const stats = [
    { 
      label: 'Chiffre d\'affaires', 
      value: `${totalRevenue.toFixed(2)}€`, 
      icon: DollarSign,
      change: '+12.5%',
      changeType: 'positive' as const
    },
    { 
      label: 'Commandes', 
      value: orders.length.toString(), 
      icon: ShoppingCart,
      change: '+8.2%',
      changeType: 'positive' as const
    },
    { 
      label: 'Produits', 
      value: products.length.toString(), 
      icon: Package,
      change: '+3',
      changeType: 'neutral' as const
    },
    { 
      label: 'Stock faible', 
      value: lowStockProducts.length.toString(), 
      icon: AlertTriangle,
      change: lowStockProducts.length > 0 ? 'Attention' : 'OK',
      changeType: lowStockProducts.length > 0 ? 'negative' as const : 'positive' as const
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
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
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="chamfer-hud bg-card/50 p-6">
          <h3 className="text-lg font-bold hud-text mb-6">ÉVOLUTION DES VENTES</h3>
          <div className="h-[300px]">
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
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="hsl(var(--primary))" 
                  fill="url(#salesGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Chart */}
        <div className="chamfer-hud bg-card/50 p-6">
          <h3 className="text-lg font-bold hud-text mb-6">PRODUITS PAR CATÉGORIE</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0'
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
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
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alert */}
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
                    <span className={`text-lg font-bold ${product.stock === 0 ? 'text-destructive' : 'text-yellow-500'}`}>
                      {product.stock}
                    </span>
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
