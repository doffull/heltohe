import { useState } from 'react';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/hooks/useProducts';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, Search, Pencil, Trash2, MoreHorizontal, Package, Upload, FileText, X, Check
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProductForm } from '@/components/admin/ProductForm';

interface ExtractedProduct {
  name: string;
  subtitle?: string;
  price: number;
  salePrice?: number | null;
  category: string;
  sizes: string[];
  colors: string[];
  description?: string;
  material?: string;
  sku: string;
  stock: number;
  selected: boolean;
}

export default function AdminProducts() {
  const { toast } = useToast();
  const { data: products = [], isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // PDF Import state
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [extractedProducts, setExtractedProducts] = useState<ExtractedProduct[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async (data: Omit<Product, 'id'>) => {
    try {
      await createProduct.mutateAsync(data);
      toast({ title: 'Produit créé', description: 'Le produit a été ajouté avec succès' });
      setIsFormOpen(false);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de créer le produit', variant: 'destructive' });
    }
  };

  const handleUpdate = async (data: Omit<Product, 'id'>) => {
    if (!editingProduct) return;
    try {
      await updateProduct.mutateAsync({ id: editingProduct.id, ...data });
      toast({ title: 'Produit mis à jour' });
      setEditingProduct(null);
      setIsFormOpen(false);
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;
    try {
      await deleteProduct.mutateAsync(id);
      toast({ title: 'Produit supprimé' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  // PDF Import
  const handlePdfUpload = async (file: File) => {
    if (!file || !file.name.endsWith('.pdf')) {
      toast({ title: 'Fichier invalide', description: 'Veuillez sélectionner un fichier PDF', variant: 'destructive' });
      return;
    }
    setIsParsing(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('parse-products-pdf', {
        body: { pdfBase64: base64 },
      });

      if (error) throw error;
      if (data?.products && Array.isArray(data.products)) {
        setExtractedProducts(data.products.map((p: any) => ({ ...p, selected: true })));
        toast({ title: `${data.products.length} produits extraits du PDF` });
      } else {
        toast({ title: 'Aucun produit trouvé', variant: 'destructive' });
      }
    } catch (err: any) {
      console.error('PDF parse error:', err);
      toast({ title: 'Erreur', description: err.message || 'Impossible de lire le PDF', variant: 'destructive' });
    } finally {
      setIsParsing(false);
    }
  };

  const handleImportSelected = async () => {
    const selected = extractedProducts.filter(p => p.selected);
    if (selected.length === 0) return;
    setIsImporting(true);
    let success = 0;
    for (const p of selected) {
      try {
        await createProduct.mutateAsync({
          name: p.name,
          subtitle: p.subtitle,
          price: p.price,
          salePrice: p.salePrice || undefined,
          image: '/placeholder.svg',
          category: p.category || 'Autre',
          stock: p.stock || 50,
          sku: p.sku,
          description: p.description,
          material: p.material,
          sizes: p.sizes || [],
          colors: p.colors || [],
          colorOptions: [],
          attributes: {},
        });
        success++;
      } catch (err) {
        console.error('Import error for', p.name, err);
      }
    }
    toast({ title: `${success}/${selected.length} produits importés` });
    setExtractedProducts([]);
    setIsPdfDialogOpen(false);
    setIsImporting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold hud-text">PRODUITS</h1>
          <p className="text-muted-foreground mt-1">{products.length} produits au catalogue</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsPdfDialogOpen(true)} className="chamfer-hud-sm">
            <Upload className="h-4 w-4 mr-2" />
            Importer PDF
          </Button>
          <Button onClick={() => { setEditingProduct(null); setIsFormOpen(true); }} className="chamfer-hud-sm">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un produit
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="chamfer-hud bg-card/50 p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par nom ou SKU..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
      </div>

      {/* Products Table */}
      <div className="chamfer-hud bg-card/50 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" /></div>
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
                          {product.subtitle && <p className="text-xs text-muted-foreground">{product.subtitle}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4"><code className="text-xs bg-muted px-2 py-1 rounded">{product.sku}</code></td>
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
                      <span className={`text-sm font-bold ${product.stock === 0 ? 'text-destructive' : product.stock <= 5 ? 'text-yellow-500' : 'text-green-500'}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingProduct(product); setIsFormOpen(true); }}><Pencil className="h-4 w-4 mr-2" />Modifier</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(product.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Supprimer</DropdownMenuItem>
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
            <DialogTitle className="hud-text">{editingProduct ? 'MODIFIER LE PRODUIT' : 'NOUVEAU PRODUIT'}</DialogTitle>
          </DialogHeader>
          <ProductForm product={editingProduct || undefined} onSubmit={editingProduct ? handleUpdate : handleCreate} onCancel={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* PDF Import Dialog */}
      <Dialog open={isPdfDialogOpen} onOpenChange={setIsPdfDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="hud-text">IMPORTER DES PRODUITS VIA PDF</DialogTitle>
          </DialogHeader>
          
          {extractedProducts.length === 0 ? (
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${isParsing ? 'border-primary bg-primary/5' : 'border-border hover:border-primary'}`}
                onClick={() => {
                  if (isParsing) return;
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.pdf';
                  input.onchange = () => input.files?.[0] && handlePdfUpload(input.files[0]);
                  input.click();
                }}
              >
                {isParsing ? (
                  <>
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
                    <p className="text-sm text-primary">Extraction des produits en cours...</p>
                    <p className="text-xs text-muted-foreground mt-1">L'IA analyse votre PDF</p>
                  </>
                ) : (
                  <>
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">Cliquez pour sélectionner un fichier PDF</p>
                    <p className="text-xs text-muted-foreground mt-1">Le fichier sera analysé par l'IA pour extraire les produits</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{extractedProducts.filter(p => p.selected).length}/{extractedProducts.length} produits sélectionnés</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setExtractedProducts(ps => ps.map(p => ({ ...p, selected: true })))}>Tout sélectionner</Button>
                  <Button variant="outline" size="sm" onClick={() => setExtractedProducts([])}>Effacer</Button>
                </div>
              </div>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {extractedProducts.map((p, i) => (
                  <div key={i} className={`flex items-center gap-4 p-3 border rounded-lg transition-colors ${p.selected ? 'border-primary bg-primary/5' : 'border-border opacity-60'}`}>
                    <button onClick={() => setExtractedProducts(ps => ps.map((pp, j) => j === i ? { ...pp, selected: !pp.selected } : pp))}>
                      {p.selected ? <Check className="h-5 w-5 text-primary" /> : <X className="h-5 w-5 text-muted-foreground" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.category} · SKU: {p.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{p.price}€</p>
                      {p.salePrice && <p className="text-xs text-muted-foreground line-through">{p.salePrice}€</p>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.sizes?.length > 0 && <p>{p.sizes.join(', ')}</p>}
                      {p.colors?.length > 0 && <p>{p.colors.join(', ')}</p>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => { setExtractedProducts([]); setIsPdfDialogOpen(false); }}>Annuler</Button>
                <Button onClick={handleImportSelected} disabled={isImporting || extractedProducts.filter(p => p.selected).length === 0}>
                  {isImporting ? 'Import en cours...' : `Importer ${extractedProducts.filter(p => p.selected).length} produits`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
