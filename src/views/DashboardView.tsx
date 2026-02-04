import { useState } from 'react';
import { Package, ShoppingCart, Palette, BarChart3, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';

type AdminTab = 'products' | 'orders' | 'design' | 'stats';

export function DashboardView() {
  const [activeTab, setActiveTab] = useState<AdminTab>('products');
  const { language, products, orders } = useApp();
  
  const tabs = [
    { id: 'products' as AdminTab, label: 'Produits', labelEN: 'Products', icon: Package },
    { id: 'orders' as AdminTab, label: 'Commandes', labelEN: 'Orders', icon: ShoppingCart },
    { id: 'design' as AdminTab, label: 'Design', labelEN: 'Design', icon: Palette },
    { id: 'stats' as AdminTab, label: 'Stats', labelEN: 'Stats', icon: BarChart3 },
  ];
  
  return (
    <div className="min-h-screen py-8">
      {/* Header */}
      <div className="px-6 lg:px-12 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 flex items-center justify-center chamfer-hud-sm">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="hud-text text-xs text-primary tracking-[0.3em]">
              // ADMIN_PANEL
            </h1>
            <h2 className="text-2xl font-bold">
              {language === 'FR' ? 'Tableau de Bord' : 'Dashboard'}
            </h2>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-primary/50 to-transparent w-full" />
      </div>
      
      {/* Tab Navigation */}
      <div className="px-6 lg:px-12 mb-8">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 hud-text text-xs tracking-wider transition-all duration-200",
                  "border chamfer-hud-sm",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/30 text-muted-foreground border-border/30 hover:border-primary/50 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {language === 'FR' ? tab.label : tab.labelEN}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Content */}
      <div className="px-6 lg:px-12">
        {activeTab === 'products' && <ProductsPanel />}
        {activeTab === 'orders' && <OrdersPanel />}
        {activeTab === 'design' && <DesignPanel />}
        {activeTab === 'stats' && <StatsPanel />}
      </div>
    </div>
  );
}

function ProductsPanel() {
  const { products, language } = useApp();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="hud-text text-sm">
          {language === 'FR' ? 'GESTION DES PRODUITS' : 'PRODUCT MANAGEMENT'}
        </h3>
        <button className="px-4 py-2 bg-primary text-primary-foreground hud-text text-xs chamfer-hud-sm hover:bg-primary/90 transition-colors">
          + {language === 'FR' ? 'AJOUTER' : 'ADD'}
        </button>
      </div>
      
      <div className="bg-card border border-border/30 chamfer-hud overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/30 bg-secondary/20">
              <th className="px-4 py-3 text-left hud-text text-xs text-muted-foreground">IMAGE</th>
              <th className="px-4 py-3 text-left hud-text text-xs text-muted-foreground">NOM</th>
              <th className="px-4 py-3 text-left hud-text text-xs text-muted-foreground">SKU</th>
              <th className="px-4 py-3 text-left hud-text text-xs text-muted-foreground">PRIX</th>
              <th className="px-4 py-3 text-left hud-text text-xs text-muted-foreground">STOCK</th>
              <th className="px-4 py-3 text-left hud-text text-xs text-muted-foreground">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-border/20 hover:bg-secondary/10 transition-colors">
                <td className="px-4 py-3">
                  <img src={product.image} alt={product.name} className="w-12 h-12 object-cover" />
                </td>
                <td className="px-4 py-3">
                  <div className="hud-text text-sm">{product.name}</div>
                  <div className="text-xs text-muted-foreground">{product.category}</div>
                </td>
                <td className="px-4 py-3 hud-text text-xs text-muted-foreground">{product.sku}</td>
                <td className="px-4 py-3">
                  {product.salePrice ? (
                    <div>
                      <span className="hud-text text-sm text-primary">{product.salePrice}€</span>
                      <span className="hud-text text-xs text-muted-foreground line-through ml-2">{product.price}€</span>
                    </div>
                  ) : (
                    <span className="hud-text text-sm">{product.price}€</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "hud-text text-xs px-2 py-1",
                    product.stock <= 5 ? "bg-hud-warning/20 text-hud-warning" : "bg-hud-success/20 text-hud-success"
                  )}>
                    {product.stock}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button className="hud-text text-xs text-primary hover:underline">
                    {language === 'FR' ? 'Modifier' : 'Edit'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrdersPanel() {
  const { orders, language } = useApp();
  
  const statusColors: Record<string, string> = {
    Pending: 'bg-hud-warning/20 text-hud-warning',
    Processing: 'bg-primary/20 text-primary',
    Shipped: 'bg-hud-success/20 text-hud-success',
    Delivered: 'bg-hud-success/20 text-hud-success',
    Cancelled: 'bg-hud-danger/20 text-hud-danger',
  };
  
  return (
    <div className="space-y-6">
      <h3 className="hud-text text-sm">
        {language === 'FR' ? 'COMMANDES RÉCENTES' : 'RECENT ORDERS'}
      </h3>
      
      <div className="bg-card border border-border/30 chamfer-hud overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/30 bg-secondary/20">
              <th className="px-4 py-3 text-left hud-text text-xs text-muted-foreground">N° COMMANDE</th>
              <th className="px-4 py-3 text-left hud-text text-xs text-muted-foreground">CLIENT</th>
              <th className="px-4 py-3 text-left hud-text text-xs text-muted-foreground">TOTAL</th>
              <th className="px-4 py-3 text-left hud-text text-xs text-muted-foreground">STATUT</th>
              <th className="px-4 py-3 text-left hud-text text-xs text-muted-foreground">DATE</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-border/20 hover:bg-secondary/10 transition-colors">
                <td className="px-4 py-3 hud-text text-sm text-primary">{order.orderNumber}</td>
                <td className="px-4 py-3">
                  <div className="hud-text text-sm">{order.customer.name}</div>
                  <div className="text-xs text-muted-foreground">{order.customer.email}</div>
                </td>
                <td className="px-4 py-3 hud-text text-sm">{order.total}€</td>
                <td className="px-4 py-3">
                  <span className={cn("hud-text text-xs px-2 py-1", statusColors[order.status])}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3 hud-text text-xs text-muted-foreground">
                  {new Date(order.date).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DesignPanel() {
  const { designSettings, updateDesignSettings, language } = useApp();
  
  return (
    <div className="space-y-6">
      <h3 className="hud-text text-sm">
        {language === 'FR' ? 'PERSONNALISATION DU DESIGN' : 'DESIGN CUSTOMIZATION'}
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sidebar Settings */}
        <div className="bg-card border border-border/30 chamfer-hud p-6 space-y-4">
          <h4 className="hud-text text-xs text-primary">// SIDEBAR</h4>
          
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="hud-text text-xs text-muted-foreground">Couleur de fond</span>
              <input 
                type="color" 
                value={designSettings.sidebarBg}
                onChange={(e) => updateDesignSettings({ sidebarBg: e.target.value })}
                className="w-10 h-6 cursor-pointer"
              />
            </label>
            
            <label className="flex items-center justify-between">
              <span className="hud-text text-xs text-muted-foreground">Couleur d'accent</span>
              <input 
                type="color" 
                value={designSettings.accentColor}
                onChange={(e) => updateDesignSettings({ accentColor: e.target.value })}
                className="w-10 h-6 cursor-pointer"
              />
            </label>
            
            <label className="flex items-center justify-between">
              <span className="hud-text text-xs text-muted-foreground">Gradient</span>
              <input 
                type="checkbox"
                checked={designSettings.sidebarGradient}
                onChange={(e) => updateDesignSettings({ sidebarGradient: e.target.checked })}
                className="w-4 h-4"
              />
            </label>
          </div>
        </div>
        
        {/* HUD Visibility */}
        <div className="bg-card border border-border/30 chamfer-hud p-6 space-y-4">
          <h4 className="hud-text text-xs text-primary">// HUD ELEMENTS</h4>
          
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="hud-text text-xs text-muted-foreground">Afficher le logo</span>
              <input 
                type="checkbox"
                checked={designSettings.showLogo}
                onChange={(e) => updateDesignSettings({ showLogo: e.target.checked })}
                className="w-4 h-4"
              />
            </label>
            
            <label className="flex items-center justify-between">
              <span className="hud-text text-xs text-muted-foreground">Afficher les stats</span>
              <input 
                type="checkbox"
                checked={designSettings.showStats}
                onChange={(e) => updateDesignSettings({ showStats: e.target.checked })}
                className="w-4 h-4"
              />
            </label>
            
            <label className="flex items-center justify-between">
              <span className="hud-text text-xs text-muted-foreground">Afficher l'ID système</span>
              <input 
                type="checkbox"
                checked={designSettings.showUnitID}
                onChange={(e) => updateDesignSettings({ showUnitID: e.target.checked })}
                className="w-4 h-4"
              />
            </label>
          </div>
        </div>
        
        {/* Unit ID */}
        <div className="bg-card border border-border/30 chamfer-hud p-6 space-y-4">
          <h4 className="hud-text text-xs text-primary">// IDENTIFIANT</h4>
          
          <div className="space-y-3">
            <label className="block">
              <span className="hud-text text-xs text-muted-foreground block mb-2">Label</span>
              <input 
                type="text"
                value={designSettings.unitIdLabel}
                onChange={(e) => updateDesignSettings({ unitIdLabel: e.target.value })}
                className="w-full px-3 py-2 bg-secondary/50 border border-border/30 hud-text text-sm"
              />
            </label>
            
            <label className="block">
              <span className="hud-text text-xs text-muted-foreground block mb-2">ID personnalisé</span>
              <input 
                type="text"
                value={designSettings.customUnitID}
                onChange={(e) => updateDesignSettings({ customUnitID: e.target.value })}
                className="w-full px-3 py-2 bg-secondary/50 border border-border/30 hud-text text-sm"
              />
            </label>
          </div>
        </div>
        
        {/* Watermark */}
        <div className="bg-card border border-border/30 chamfer-hud p-6 space-y-4">
          <h4 className="hud-text text-xs text-primary">// WATERMARK</h4>
          
          <label className="block">
            <span className="hud-text text-xs text-muted-foreground block mb-2">Texte du watermark</span>
            <input 
              type="text"
              value={designSettings.backgroundWatermark}
              onChange={(e) => updateDesignSettings({ backgroundWatermark: e.target.value })}
              className="w-full px-3 py-2 bg-secondary/50 border border-border/30 hud-text text-sm"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

function StatsPanel() {
  const { products, orders, language } = useApp();
  
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => p.stock <= 5).length;
  const totalOrders = orders.length;
  
  return (
    <div className="space-y-6">
      <h3 className="hud-text text-sm">
        {language === 'FR' ? 'STATISTIQUES' : 'STATISTICS'}
      </h3>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { value: `${totalRevenue}€`, label: language === 'FR' ? 'REVENUS' : 'REVENUE', color: 'text-hud-success' },
          { value: totalProducts, label: language === 'FR' ? 'PRODUITS' : 'PRODUCTS', color: 'text-primary' },
          { value: totalOrders, label: language === 'FR' ? 'COMMANDES' : 'ORDERS', color: 'text-primary' },
          { value: lowStockProducts, label: language === 'FR' ? 'STOCK FAIBLE' : 'LOW STOCK', color: 'text-hud-warning' },
        ].map((stat, index) => (
          <div 
            key={index}
            className="bg-card border border-border/30 chamfer-hud p-6 text-center"
          >
            <div className={cn("text-3xl font-bold mb-2", stat.color)}>
              {stat.value}
            </div>
            <div className="hud-text text-xs text-muted-foreground">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
