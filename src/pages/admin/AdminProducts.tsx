import { useState } from 'react';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/hooks/useProducts';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  MoreHorizontal,
  Package
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProductForm } from '@/components/admin/ProductForm';

export default function AdminProducts() {
  const { toast } = useToast();
  const { data: products = [], isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async (data: Omit<Product, 'id'>) => {
    try {
      await createProduct.mutateAsync(data);
      toast({ title: 'Produit créé', description: 'Le produit a été ajouté avec succès' });
      setIsFormOpen(false);
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de créer le produit', variant: 'destructive' });
    }
  };

  const handleUpdate = async (data: Omit<Product, 'id'>) => {
    if (!editingProduct) return;
    try {
      await updateProduct.mutateAsync({ id: editingProduct.id, ...data });
      toast({ title: 'Produit mis à jour', description: 'Les modifications ont été enregistrées' });
      setEditingProduct(null);
      setIsFormOpen(false);
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de mettre à jour le produit', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;
    try {
      await deleteProduct.mutateAsync(id);
      toast({ title: 'Produit supprimé', description: 'Le produit a été supprimé' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de supprimer le produit', variant: 'destructive' });
    }
  };

  const openEditForm = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const openCreateForm = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold hud-text">PRODUITS</h1>
          <p className="text-muted-foreground mt-1">{products.length} produits au catalogue</p>
        </div>
        <Button onClick={openCreateForm} className="chamfer-hud-sm">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un produit
        </Button>
      </div>

      {/* Search */}
      <div className="chamfer-hud bg-card/50 p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="chamfer-hud bg-card/50 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun produit trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-4 text-xs font-bold hud-text">PRODUIT</th>
                  <th className="text-left p-4 text-xs font-bold hud-text">SKU</th>
                  <th className="text-left p-4 text-xs font-bold hud-text">CATÉGORIE</th>
                  <th className="text-right p-4 text-xs font-bold hud-text">PRIX</th>
                  <th className="text-right p-4 text-xs font-bold hud-text">STOCK</th>
                  <th className="text-right p-4 text-xs font-bold hud-text">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-muted rounded overflow-hidden flex-shrink-0">
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{product.name}</p>
                          {product.subtitle && (
                            <p className="text-xs text-muted-foreground">{product.subtitle}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <code className="text-xs bg-muted px-2 py-1 rounded">{product.sku}</code>
                    </td>
                    <td className="p-4 text-sm">{product.category}</td>
                    <td className="p-4 text-right">
                      {product.salePrice ? (
                        <div>
                          <span className="text-sm font-bold text-primary">{product.salePrice}€</span>
                          <span className="text-xs line-through text-muted-foreground ml-2">{product.price}€</span>
                        </div>
                      ) : (
                        <span className="text-sm font-bold">{product.price}€</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <span className={`text-sm font-bold ${
                        product.stock === 0 ? 'text-destructive' :
                        product.stock <= 5 ? 'text-yellow-500' :
                        'text-green-500'
                      }`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditForm(product)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(product.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="hud-text">
              {editingProduct ? 'MODIFIER LE PRODUIT' : 'NOUVEAU PRODUIT'}
            </DialogTitle>
          </DialogHeader>
          <ProductForm
            product={editingProduct || undefined}
            onSubmit={editingProduct ? handleUpdate : handleCreate}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
