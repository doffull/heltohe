import { useState } from 'react';
import { Package, ShoppingCart, Palette, BarChart3, Settings, Pencil, Trash2, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/hooks/useProducts';
import { useOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import { Product, OrderStatus } from '@/types';
import { ProductForm } from '@/components/admin/ProductForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

type AdminTab = 'products' | 'orders' | 'design' | 'stats';

export function DashboardView() {
  const [activeTab, setActiveTab] = useState<AdminTab>('products');
  const { language } = useApp();
  
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
  const { language, products: localProducts } = useApp();
  const { data: dbProducts, isLoading, error } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  
  // Use DB products if available, fallback to local
  const products = dbProducts || localProducts;
  
  const handleCreate = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };
  
  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };
  
  const handleDelete = (product: Product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct.mutateAsync(productToDelete.id);
      toast.success('Produit supprimé');
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
    setDeleteDialogOpen(false);
    setProductToDelete(null);
  };
  
  const handleSubmit = async (data: Omit<Product, 'id'> | Product) => {
    try {
      if ('id' in data && data.id) {
        await updateProduct.mutateAsync(data as Product);
        toast.success('Produit mis à jour');
      } else {
        await createProduct.mutateAsync(data as Omit<Product, 'id'>);
        toast.success('Produit créé');
      }
      setIsFormOpen(false);
      setEditingProduct(null);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'enregistrement');
    }
  };
  
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive hud-text">Erreur de chargement. Vérifiez vos permissions admin.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="hud-text text-sm">
          {language === 'FR' ? 'GESTION DES PRODUITS' : 'PRODUCT MANAGEMENT'}
          {isLoading && <Loader2 className="inline ml-2 h-4 w-4 animate-spin" />}
        </h3>
        <button 
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hud-text text-xs chamfer-hud-sm hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {language === 'FR' ? 'AJOUTER' : 'ADD'}
        </button>
      </div>
      
      <div className="bg-card border border-border/30 chamfer-hud overflow-hidden">
        <div className="overflow-x-auto">
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
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleEdit(product)}
                        className="p-1.5 hover:bg-secondary/50 rounded transition-colors"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4 text-primary" />
                      </button>
                      <button 
                        onClick={() => handleDelete(product)}
                        className="p-1.5 hover:bg-destructive/20 rounded transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground hud-text text-xs">
                    {language === 'FR' ? 'Aucun produit' : 'No products'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Product Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="hud-text text-lg">
              {editingProduct 
                ? (language === 'FR' ? '// MODIFIER PRODUIT' : '// EDIT PRODUCT')
                : (language === 'FR' ? '// NOUVEAU PRODUIT' : '// NEW PRODUCT')
              }
            </DialogTitle>
          </DialogHeader>
          <ProductForm
            product={editingProduct || undefined}
            onSubmit={handleSubmit}
            onCancel={() => setIsFormOpen(false)}
            isLoading={createProduct.isPending || updateProduct.isPending}
          />
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="hud-text">Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer "{productToDelete?.name}" ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteProduct.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function OrdersPanel() {
  const { language, orders: localOrders } = useApp();
  const { data: dbOrders, isLoading } = useOrders();
  const updateOrderStatus = useUpdateOrderStatus();
  
  const orders = dbOrders || localOrders;
  
  const statusColors: Record<string, string> = {
    Pending: 'bg-hud-warning/20 text-hud-warning',
    Processing: 'bg-primary/20 text-primary',
    Shipped: 'bg-hud-success/20 text-hud-success',
    Delivered: 'bg-hud-success/20 text-hud-success',
    Cancelled: 'bg-hud-danger/20 text-hud-danger',
  };
  
  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    try {
      await updateOrderStatus.mutateAsync({ id: orderId, status });
      toast.success('Statut mis à jour');
    } catch (err) {
      toast.error('Erreur lors de la mise à jour');
    }
  };
  
  return (
    <div className="space-y-6">
      <h3 className="hud-text text-sm">
        {language === 'FR' ? 'COMMANDES RÉCENTES' : 'RECENT ORDERS'}
        {isLoading && <Loader2 className="inline ml-2 h-4 w-4 animate-spin" />}
      </h3>
      
      <div className="bg-card border border-border/30 chamfer-hud overflow-hidden">
        <div className="overflow-x-auto">
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
                    <Select 
                      value={order.status} 
                      onValueChange={(value) => handleStatusChange(order.id, value as OrderStatus)}
                    >
                      <SelectTrigger className={cn("w-32 h-8 hud-text text-xs border-0", statusColors[order.status])}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Processing">Processing</SelectItem>
                        <SelectItem value="Shipped">Shipped</SelectItem>
                        <SelectItem value="Delivered">Delivered</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 hud-text text-xs text-muted-foreground">
                    {new Date(order.date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground hud-text text-xs">
                    {language === 'FR' ? 'Aucune commande' : 'No orders'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
  const { products: localProducts, orders: localOrders, language } = useApp();
  const { data: dbProducts } = useProducts();
  const { data: dbOrders } = useOrders();
  
  const products = dbProducts || localProducts;
  const orders = dbOrders || localOrders;
  
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
          { value: `${totalRevenue.toFixed(2)}€`, label: language === 'FR' ? 'REVENUS' : 'REVENUE', color: 'text-hud-success' },
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
      
      {/* Top Products */}
      <div className="bg-card border border-border/30 chamfer-hud p-6">
        <h4 className="hud-text text-xs text-primary mb-4">// {language === 'FR' ? 'PRODUITS POPULAIRES' : 'TOP PRODUCTS'}</h4>
        <div className="space-y-3">
          {products.slice(0, 5).map((product, index) => (
            <div key={product.id} className="flex items-center gap-3">
              <span className="hud-text text-xs text-muted-foreground w-6">{index + 1}.</span>
              <img src={product.image} alt={product.name} className="w-10 h-10 object-cover" />
              <div className="flex-1">
                <div className="hud-text text-sm">{product.name}</div>
                <div className="text-xs text-muted-foreground">{product.category}</div>
              </div>
              <span className="hud-text text-sm text-primary">{product.salePrice || product.price}€</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Low Stock Alert */}
      {lowStockProducts > 0 && (
        <div className="bg-hud-warning/10 border border-hud-warning/30 chamfer-hud p-6">
          <h4 className="hud-text text-xs text-hud-warning mb-4">// {language === 'FR' ? 'ALERTE STOCK CRITIQUE' : 'CRITICAL STOCK ALERT'}</h4>
          <div className="space-y-2">
            {products.filter(p => p.stock <= 5).map(product => (
              <div key={product.id} className="flex items-center justify-between">
                <span className="hud-text text-sm">{product.name}</span>
                <span className="hud-text text-xs text-hud-warning">{product.stock} restants</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
