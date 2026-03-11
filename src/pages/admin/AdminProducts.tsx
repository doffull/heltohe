import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useBulkDeleteProducts } from '@/hooks/useProducts';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, Search, Pencil, Trash2, MoreHorizontal, Package, Upload, FileText, X, Check, Filter, Wand2, Copy, Tag, DollarSign, Archive
} from 'lucide-react';
import { ImportMockupDialog } from '@/components/admin/ImportMockupDialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: products = [], isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const bulkDelete = useBulkDeleteProducts();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);
  const [isMockupDialogOpen, setIsMockupDialogOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [extractedProducts, setExtractedProducts] = useState<ExtractedProduct[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const categories = [...new Set(products.map(p => p.category))];

  let filteredProducts = products.filter(p => {
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()) && !p.sku.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
    if (stockFilter === 'out' && p.stock > 0) return false;
    if (stockFilter === 'low' && p.stock > 5) return false;
    if (stockFilter === 'in' && p.stock <= 0) return false;
    return true;
  });

  filteredProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    if (sortBy === 'stock-asc') return a.stock - b.stock;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return 0; // newest = default order
  });

  const { selectedIds, toggle, toggleAll, clear, allSelected, someSelected, count, ids } = useBulkSelection(filteredProducts);

  const handleBulkDelete = async () => {
    if (!confirm(`Supprimer ${count} produit(s) ?`)) return;
    try {
      await bulkDelete.mutateAsync(ids);
      toast({ title: `${count} produit(s) supprimé(s)` });
      clear();
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleCreate = async (data: Omit<Product, 'id'>) => {
    try {
      await createProduct.mutateAsync(data);
      toast({ title: 'Produit créé' });
      setIsFormOpen(false);
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
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
    if (!confirm('Supprimer ce produit ?')) return;
    try {
      await deleteProduct.mutateAsync(id);
      toast({ title: 'Produit supprimé' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handlePdfUpload = async (file: File) => {
    if (!file || !file.name.endsWith('.pdf')) {
      toast({ title: 'Fichier invalide', variant: 'destructive' });
      return;
    }
    setIsParsing(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke('parse-products-pdf', { body: { pdfBase64: base64 } });
      if (error) throw error;
      if (data?.products && Array.isArray(data.products)) {
        setExtractedProducts(data.products.map((p: any) => ({ ...p, selected: true })));
        toast({ title: `${data.products.length} produits extraits` });
      } else {
        toast({ title: 'Aucun produit trouvé', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
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
          name: p.name, subtitle: p.subtitle, price: p.price, salePrice: p.salePrice || undefined,
          image: '/placeholder.svg', category: p.category || 'Autre', stock: p.stock || 50,
          sku: p.sku, description: p.description, material: p.material,
          sizes: p.sizes || [], colors: p.colors || [], colorOptions: [], attributes: {},
        });
        success++;
      } catch {}
    }
    toast({ title: `${success}/${selected.length} produits importés` });
    setExtractedProducts([]);
    setIsPdfDialogOpen(false);
    setIsImporting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold hud-text">PRODUITS</h1>
          <p className="text-muted-foreground mt-1">{products.length} produits au catalogue</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsMockupDialogOpen(true)} className="chamfer-hud-sm border-primary/50 text-primary hover:bg-primary/10">
            <Wand2 className="h-4 w-4 mr-2" />Importer Maquette IA
          </Button>
          <Button variant="outline" onClick={() => setIsPdfDialogOpen(true)} className="chamfer-hud-sm">
            <Upload className="h-4 w-4 mr-2" />Importer PDF
          </Button>
          <Button onClick={() => { setEditingProduct(null); setIsFormOpen(true); }} className="chamfer-hud-sm">
            <Plus className="h-4 w-4 mr-2" />Ajouter
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="chamfer-hud bg-card/50 p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par nom ou SKU..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[150px]"><Filter className="h-3 w-3 mr-2" /><SelectValue placeholder="Catégorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Stock" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tout stock</SelectItem>
            <SelectItem value="in">En stock</SelectItem>
            <SelectItem value="low">Stock faible</SelectItem>
            <SelectItem value="out">Rupture</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Trier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Plus récents</SelectItem>
            <SelectItem value="name">Nom A-Z</SelectItem>
            <SelectItem value="price-asc">Prix croissant</SelectItem>
            <SelectItem value="price-desc">Prix décroissant</SelectItem>
            <SelectItem value="stock-asc">Stock croissant</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {someSelected && (
        <div className="chamfer-hud bg-primary/10 border border-primary/30 p-3 flex items-center gap-4">
          <span className="text-sm font-bold">{count} sélectionné(s)</span>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDelete.isPending}>
            <Trash2 className="h-3 w-3 mr-2" />Supprimer
          </Button>
          <Button variant="ghost" size="sm" onClick={clear}>Désélectionner</Button>
        </div>
      )}

      {/* Table */}
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
                  <th className="p-4 w-10"><Checkbox checked={allSelected} onCheckedChange={toggleAll} /></th>
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
                  <tr key={product.id} className={`border-b border-border last:border-0 hover:bg-muted/30 ${selectedIds.has(product.id) ? 'bg-primary/5' : ''}`}>
                    <td className="p-4"><Checkbox checked={selectedIds.has(product.id)} onCheckedChange={() => toggle(product.id)} /></td>
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
          <DialogHeader><DialogTitle className="hud-text">IMPORTER DES PRODUITS VIA PDF</DialogTitle></DialogHeader>
          {extractedProducts.length === 0 ? (
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${isParsing ? 'border-primary bg-primary/5' : 'border-border hover:border-primary'}`}
                onClick={() => {
                  if (isParsing) return;
                  const input = document.createElement('input');
                  input.type = 'file'; input.accept = '.pdf';
                  input.onchange = () => input.files?.[0] && handlePdfUpload(input.files[0]);
                  input.click();
                }}
              >
                {isParsing ? (
                  <><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" /><p className="text-sm text-primary">Extraction en cours...</p></>
                ) : (
                  <><FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">Cliquez pour sélectionner un PDF</p></>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{extractedProducts.filter(p => p.selected).length}/{extractedProducts.length} sélectionnés</p>
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
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => { setExtractedProducts([]); setIsPdfDialogOpen(false); }}>Annuler</Button>
                <Button onClick={handleImportSelected} disabled={isImporting || extractedProducts.filter(p => p.selected).length === 0}>
                  {isImporting ? 'Import...' : `Importer ${extractedProducts.filter(p => p.selected).length} produits`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mockup IA Import Dialog */}
      <ImportMockupDialog
        open={isMockupDialogOpen}
        onOpenChange={setIsMockupDialogOpen}
        onSuccess={(productId) => {
          setIsMockupDialogOpen(false);
          navigate(`/boutique/${productId}?new=1`);
        }}
      />
    </div>
  );
}
