import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';


import { useCategories } from '@/hooks/useCategories';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useBulkDeleteProducts, useBulkUpdateProducts } from '@/hooks/useProducts';
import { BulkEditDialog } from '@/components/admin/BulkEditDialog';
import { QuickPriceStockImportDialog } from '@/components/admin/QuickPriceStockImportDialog';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { generateSwatchForProduct } from '@/lib/generateSwatch';
import { useProductLooks, useCreateProductLook, useUpdateProductLook, useDeleteProductLook, ProductLook } from '@/hooks/useProductLooks';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, Search, Pencil, Trash2, MoreHorizontal, Package, Upload, Download, FileText, X, Check, Filter, Wand2, Copy, Tag, DollarSign, Archive, Layers2, Boxes, RefreshCw, Images, LayoutGrid, ArrowUpDown, Film
} from 'lucide-react';
import { AdminCategoryOrdering } from '@/components/admin/AdminCategoryOrdering';
import { ImportMockupDialog } from '@/components/admin/ImportMockupDialog';
import { WordPressSyncDialog } from '@/components/admin/WordPressSyncDialog';
import { CsvImportDialog } from '@/components/admin/CsvImportDialog';
import { BulkProductImagesDialog } from '@/components/admin/BulkProductImagesDialog';
import { MainImagePicker } from '@/components/admin/MainImagePicker';
import { SplitVariantsDialog } from '@/components/admin/SplitVariantsDialog';
import { BulkGifDialog } from '@/components/admin/BulkGifDialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ProductForm, VariantStockData } from '@/components/admin/ProductForm';
import { InventoryProductDialog } from '@/components/admin/InventoryProductDialog';
import { BulkVariantStockDialog } from '@/components/admin/BulkVariantStockDialog';
import { GlobalSizesEditor } from '@/components/admin/GlobalSizesEditor';
import { ProductDefaultsEditor } from '@/components/admin/ProductDefaultsEditor';
import { AdminTableScroll } from '@/components/admin/AdminTableScroll';
import { ProductMobileCard } from '@/components/admin/ProductMobileCard';
import { useIsMobile } from '@/hooks/use-mobile';

import { Textarea } from '@/components/ui/textarea';
import { importProductsFromPdf, pickMainImage, AUTO_MAIN_STRATEGY_LABEL, type AutoMainStrategy, type MainImageSource } from '@/lib/productPdfImport';
import { useDesignSettings, useSaveDesignSettings } from '@/hooks/useDesignSettings';

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
  pageImages?: string[];
  mainImage?: string | null;
  mainSource?: MainImageSource | null;
  ghostImages?: string[];
  wornImages?: string[];
  /** true si l'utilisateur a choisi manuellement l'image principale. */
  mainManual?: boolean;
  selected: boolean;
  [key: string]: unknown;
}

const MAIN_SOURCE_LABEL: Record<MainImageSource, string> = {
  worn: 'Porté',
  ghost: 'Ghost',
  page: 'Page',
};


export default function AdminProducts() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const { data: products = [], isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const bulkDelete = useBulkDeleteProducts();
  const bulkUpdate = useBulkUpdateProducts();

  // Looks
  const { data: looks = [], isLoading: loadingLooks } = useProductLooks();
  const createLook = useCreateProductLook();
  const updateLook = useUpdateProductLook();
  const deleteLook = useDeleteProductLook();
  const [lookDialogOpen, setLookDialogOpen] = useState(false);
  const [editingLook, setEditingLook] = useState<ProductLook | null>(null);
  const [lookForm, setLookForm] = useState({ name: '', description: '', productIds: [] as string[], isActive: true });

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);
  const [isMockupDialogOpen, setIsMockupDialogOpen] = useState(false);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false);
  const [isBulkImagesOpen, setIsBulkImagesOpen] = useState(false);
  const [isBulkGifOpen, setIsBulkGifOpen] = useState(false);
  const [swatchProgress, setSwatchProgress] = useState<{ done: number; total: number } | null>(null);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isQuickCsvOpen, setIsQuickCsvOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [extractedProducts, setExtractedProducts] = useState<ExtractedProduct[]>([]);
  const [autoMainStrategy, setAutoMainStrategy] = useState<AutoMainStrategy>('worn-first');
  const [isImporting, setIsImporting] = useState(false);
  // Inline stock edit
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editingStockValue, setEditingStockValue] = useState<number>(0);
  // Inline field edit (price / salePrice / sku / category)
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'price' | 'salePrice' | 'sku' | 'category' | 'name' | 'subtitle' } | null>(null);
  const [editingCellValue, setEditingCellValue] = useState<string>('');
  const { data: designSettings } = useDesignSettings();
  const saveDesign = useSaveDesignSettings();
  const currentLayout = (designSettings as any)?.productGridLayout ?? 'classic';

  // Inventory/stock dialog from product row
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockDialogEdit, setStockDialogEdit] = useState<{ inventoryId: string; productId: string } | null>(null);
  const [stockDialogLocations, setStockDialogLocations] = useState<{ id: string; type: string }[]>([]);
  const [variantStockDialog, setVariantStockDialog] = useState<{ productId: string; productName: string } | null>(null);
  const [splitProduct, setSplitProduct] = useState<Product | null>(null);

  // Deep-link: /admin/products?edit=<productId> ouvre directement le formulaire produit
  const [editParams, setEditParams] = useSearchParams();
  const editIdParam = editParams.get('edit');
  useEffect(() => {
    if (!editIdParam || !products.length) return;
    const target = products.find(p => p.id === editIdParam);
    if (!target) return;
    setEditingProduct(target);
    setIsFormOpen(true);
    const next = new URLSearchParams(editParams);
    next.delete('edit');
    setEditParams(next, { replace: true });
  }, [editIdParam, products]);


  // Bulk edit state

  const { data: dbCategories = [] } = useCategories();
  const [bulkCategory, setBulkCategory] = useState('__unchanged__');
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkStock, setBulkStock] = useState('');

  const categories = [...new Set([...dbCategories.map(c => c.title), ...products.map(p => p.category)].filter(Boolean))];

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

  const handleBulkSwatches = async () => {
    const targets = filteredProducts.filter(p => selectedIds.has(p.id) && !(p.colorOptions || []).length);
    if (targets.length === 0) {
      toast({ title: 'Rien à générer', description: 'Les produits sélectionnés ont déjà des pastilles.' });
      return;
    }
    setSwatchProgress({ done: 0, total: targets.length });
    let ok = 0;
    let failed = 0;
    for (let i = 0; i < targets.length; i++) {
      const p = targets[i];
      try {
        const opt = await generateSwatchForProduct(p);
        await updateProduct.mutateAsync({
          id: p.id,
          colorOptions: [opt],
          colors: [opt.color],
        } as Parameters<typeof updateProduct.mutateAsync>[0]);
        ok++;
      } catch {
        failed++;
      }
      setSwatchProgress({ done: i + 1, total: targets.length });
    }
    setSwatchProgress(null);
    toast({
      title: `${ok} pastille(s) générée(s)`,
      description: failed ? `${failed} échec(s)` : undefined,
      variant: failed && !ok ? 'destructive' : undefined,
    });
  };


  const handleBulkApply = async () => {
    const updates: Record<string, unknown> = {};
    if (bulkCategory && bulkCategory !== '__unchanged__') updates.category = bulkCategory;
    if (bulkPrice !== '') updates.price = parseFloat(bulkPrice);
    if (bulkStock !== '') updates.stock = parseInt(bulkStock, 10);
    if (Object.keys(updates).length === 0) {
      toast({ title: 'Aucune modification', description: 'Remplissez au moins un champ', variant: 'destructive' });
      return;
    }
    try {
      await bulkUpdate.mutateAsync({ ids, updates: updates as Parameters<typeof bulkUpdate.mutateAsync>[0]['updates'] });
      toast({ title: `${count} produit(s) mis à jour` });
      setBulkCategory('__unchanged__'); setBulkPrice(''); setBulkStock('');
      clear();
    } catch {
      toast({ title: 'Erreur lors de la mise à jour', variant: 'destructive' });
    }
  };

  const handleDuplicate = async (product: Product) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...rest } = product;
      await createProduct.mutateAsync({
        ...rest,
        name: `${product.name} V2`,
        sku: `${product.sku}-COPY`,
      });
      toast({ title: `"${product.name} V2" créé`, description: 'Toutes les variantes ont été copiées' });
    } catch {
      toast({ title: 'Erreur lors de la duplication', variant: 'destructive' });
    }
  };

  const handleSaveInlineStock = async (productId: string) => {
    try {
      await updateProduct.mutateAsync({ id: productId, stock: editingStockValue });
      toast({ title: 'Stock mis à jour' });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    } finally {
      setEditingStockId(null);
    }
  };

  const startEditCell = (id: string, field: 'price' | 'salePrice' | 'sku' | 'category' | 'name' | 'subtitle', currentValue: string | number | null | undefined) => {
    setEditingCell({ id, field });
    setEditingCellValue(currentValue === null || currentValue === undefined ? '' : String(currentValue));
  };

  const commitEditCell = async () => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    try {
      if (field === 'price') {
        const n = parseFloat(editingCellValue);
        if (!Number.isFinite(n) || n < 0) throw new Error('Prix invalide');
        await updateProduct.mutateAsync({ id, price: n });
      } else if (field === 'salePrice') {
        if (editingCellValue.trim() === '') {
          await updateProduct.mutateAsync({ id, salePrice: undefined });
        } else {
          const n = parseFloat(editingCellValue);
          if (!Number.isFinite(n) || n < 0) throw new Error('Prix promo invalide');
          await updateProduct.mutateAsync({ id, salePrice: n });
        }
      } else if (field === 'sku') {
        if (!editingCellValue.trim()) throw new Error('SKU vide');
        await updateProduct.mutateAsync({ id, sku: editingCellValue.trim() });
      } else if (field === 'category') {
        await updateProduct.mutateAsync({ id, category: editingCellValue.trim() });
      } else if (field === 'name') {
        if (!editingCellValue.trim()) throw new Error('Nom vide');
        await updateProduct.mutateAsync({ id, name: editingCellValue.trim() });
      } else if (field === 'subtitle') {
        await updateProduct.mutateAsync({ id, subtitle: editingCellValue.trim() });
      }

      toast({ title: 'Modifié' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message, variant: 'destructive' });
    } finally {
      setEditingCell(null);
    }
  };

  const toggleActive = async (product: Product) => {
    try {
      await updateProduct.mutateAsync({ id: product.id, isActive: !((product as any).isActive ?? true) } as any);
      toast({ title: 'Statut mis à jour' });
    } catch { toast({ title: 'Erreur', variant: 'destructive' }); }
  };

  const exportSelectedCsv = () => {
    const source = count > 0 ? filteredProducts.filter(p => selectedIds.has(p.id)) : filteredProducts;
    if (source.length === 0) { toast({ title: 'Aucun produit à exporter', variant: 'destructive' }); return; }
    const esc = (s: any) => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const header = 'sku,name,price,sale_price,stock,category,is_active\n';
    const body = source.map(p => [
      esc(p.sku), esc(p.name), p.price, p.salePrice ?? '', p.stock, esc(p.category), ((p as any).isActive ?? true) ? 1 : 0,
    ].join(',')).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `produits-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: `${source.length} produit(s) exporté(s)` });
  };


  const setLayout = async (layout: string) => {
    if (!designSettings) return;
    try {
      await saveDesign.mutateAsync({ ...(designSettings as any), productGridLayout: layout });
      toast({ title: 'Disposition mise à jour' });
    } catch { toast({ title: 'Erreur', variant: 'destructive' }); }
  };

  const handleCreate = async (data: Omit<Product, 'id'>, variantStock?: VariantStockData) => {
    try {
      const created = await createProduct.mutateAsync(data);
      toast({ title: 'Produit créé' });
      setIsFormOpen(false);
      // Auto-sync to inventory/stock central with variant stock
      try {
        const { data: webLoc } = await supabase.from('locations').select('id').eq('type', 'web').maybeSingle();
        if (webLoc && created?.id) {
          const { data: inv } = await supabase.from('inventory').insert({
            product_id: created.id, sku: data.sku, name: data.name, channel: 'b2c', threshold: 10,
          }).select('id').single();
          if (inv) {
            const hasSizes = data.sizes && data.sizes.length > 0;
            const hasColors = data.colorOptions && data.colorOptions.length > 0;
            const stockInserts: any[] = [];

            if (hasSizes && hasColors && variantStock?.variantGrid) {
              for (const [color, sizes] of Object.entries(variantStock.variantGrid)) {
                for (const [size, qty] of Object.entries(sizes)) {
                  if (qty > 0) stockInserts.push({ inventory_id: inv.id, location_id: webLoc.id, quantity: qty, reserved: 0, size, color, stocked_at: new Date().toISOString() });
                }
              }
            } else if (hasSizes && !hasColors && variantStock?.sizeStockMap) {
              for (const [size, qty] of Object.entries(variantStock.sizeStockMap)) {
                if (qty > 0) stockInserts.push({ inventory_id: inv.id, location_id: webLoc.id, quantity: qty, reserved: 0, size, stocked_at: new Date().toISOString() });
              }
            } else if (!hasSizes && hasColors && variantStock?.colorStockMap) {
              for (const [color, qty] of Object.entries(variantStock.colorStockMap)) {
                if (qty > 0) stockInserts.push({ inventory_id: inv.id, location_id: webLoc.id, quantity: qty, reserved: 0, color, stocked_at: new Date().toISOString() });
              }
            } else if (data.stock > 0) {
              stockInserts.push({ inventory_id: inv.id, location_id: webLoc.id, quantity: data.stock, reserved: 0, stocked_at: new Date().toISOString() });
            }

            if (stockInserts.length > 0) {
              await supabase.from('stock_levels').insert(stockInserts);
            }
          }
        }
      } catch { /* silent — stock sync is non-critical */ }
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleUpdate = async (data: Omit<Product, 'id'>, _variantStock?: any, opts?: { silent?: boolean }) => {
    if (!editingProduct) return;
    try {
      await updateProduct.mutateAsync({ id: editingProduct.id, ...data });
      if (!opts?.silent) toast({ title: 'Produit mis à jour' });
      // La fiche reste ouverte : pas de fermeture du dialog ici.
    } catch (e) {
      toast({ title: 'Erreur', variant: 'destructive' });
      throw e;
    }
  };

  const handleOpenStockDialog = async (product: Product) => {
    // Load locations
    const { data: locs } = await supabase.from('locations').select('id, type').eq('is_active', true);
    setStockDialogLocations(locs || []);
    // Find existing inventory for this product
    const { data: inv } = await supabase.from('inventory').select('id').eq('product_id', product.id).maybeSingle();
    if (inv) {
      setStockDialogEdit({ inventoryId: inv.id, productId: product.id });
    } else {
      // Create inventory entry on-the-fly if missing
      const { data: webLoc } = await supabase.from('locations').select('id').eq('type', 'web').maybeSingle();
      if (webLoc) {
        const { data: newInv } = await supabase.from('inventory').insert({
          product_id: product.id, sku: product.sku, name: product.name, channel: 'b2c', threshold: 10,
        }).select('id').single();
        if (newInv) setStockDialogEdit({ inventoryId: newInv.id, productId: product.id });
      } else {
        toast({ title: 'Aucun emplacement Web configuré', description: 'Créez d\'abord un emplacement de type "web" dans Stock', variant: 'destructive' });
        return;
      }
    }
    setStockDialogOpen(true);
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
      const result = await importProductsFromPdf(file, ({ batchIndex, totalBatches, productsSoFar }) => {
        if (batchIndex === 0) {
          toast({ title: `PDF découpé en ${totalBatches} lot(s)`, description: 'Analyse en cours…' });
        } else {
          toast({ title: `Lot ${batchIndex}/${totalBatches} analysé`, description: `${productsSoFar} produits extraits pour l'instant` });
        }
      });
      if (result.products.length > 0) {
        setExtractedProducts(result.products.map((product) => ({
          ...product,
          ...pickMainImage(product, autoMainStrategy),
          mainManual: false,
          selected: true,
        })) as ExtractedProduct[]);
        const warning = result.errors.length > 0 ? ` · ${result.errors.length} lot(s) en erreur` : '';
        toast({
          title: `${result.products.length} produits extraits · ${result.batchesProcessed} lot(s) analysé(s)${warning}`,
          description: `Image principale auto : ${AUTO_MAIN_STRATEGY_LABEL[autoMainStrategy]}`,
        });
      } else {
        toast({ title: 'Aucun produit trouvé', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setIsParsing(false);
    }
  };

  /** Réapplique l'auto-sélection de l'image principale (force = écrase les choix manuels). */
  const applyAutoMain = (strategy: AutoMainStrategy, force = false) => {
    let changed = 0;
    setExtractedProducts(ps => ps.map((p) => {
      if (p.mainManual && !force) return p;
      const picked = pickMainImage(p, strategy);
      if (picked.mainImage && picked.mainImage !== p.mainImage) changed++;
      return { ...p, ...picked, mainManual: false };
    }));
    toast({
      title: 'Auto-sélection appliquée',
      description: `${AUTO_MAIN_STRATEGY_LABEL[strategy]} · ${changed} image(s) principale(s) mise(s) à jour`,
    });
  };


  const handleImportSelected = async () => {
    const selected = extractedProducts.filter(p => p.selected);
    if (selected.length === 0) return;
    setIsImporting(true);
    let success = 0;
    for (const p of selected) {
      try {
        const all = Array.isArray(p.pageImages) ? p.pageImages.filter(Boolean) : [];
        const main = p.mainImage || all[0] || null;
        // Galerie : ghosts d'abord, puis les autres visuels
        const gallery: string[] = [];
        for (const u of [...(p.ghostImages || []), ...all]) {
          if (u && u !== main && !gallery.includes(u)) gallery.push(u);
          if (gallery.length >= 5) break;
        }
        await createProduct.mutateAsync({
          name: p.name, subtitle: p.subtitle, price: p.price, salePrice: p.salePrice || undefined,
          image: main || '/placeholder.svg',
          galleryImages: gallery,
          category: p.category || 'Autre', stock: p.stock || 50,
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 min-w-0">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold hud-text">PRODUITS</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">{products.length} produits au catalogue</p>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <div className="admin-scroll-x flex flex-nowrap lg:flex-wrap gap-2 min-w-0 pb-1 [&>*]:shrink-0">
            <Button variant="outline" size="sm" onClick={() => setIsSyncDialogOpen(true)} className="chamfer-hud-sm border-primary/50 text-primary hover:bg-primary/10 text-xs">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Sync WP
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsMockupDialogOpen(true)} className="chamfer-hud-sm border-primary/50 text-primary hover:bg-primary/10 text-xs">
              <Wand2 className="h-3.5 w-3.5 mr-1.5" />Maquette IA
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsBulkImagesOpen(true)} className="chamfer-hud-sm border-primary/50 text-primary hover:bg-primary/10 text-xs">
              <Images className="h-3.5 w-3.5 mr-1.5" />Images produits
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsPdfDialogOpen(true)} className="chamfer-hud-sm text-xs">
              <Upload className="h-3.5 w-3.5 mr-1.5" />PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsCsvDialogOpen(true)} className="chamfer-hud-sm text-xs">
              <Upload className="h-3.5 w-3.5 mr-1.5" />CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsQuickCsvOpen(true)} className="chamfer-hud-sm text-xs">
              <FileText className="h-3.5 w-3.5 mr-1.5" />Prix/Stock CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportSelectedCsv} className="chamfer-hud-sm text-xs">
              <Download className="h-3.5 w-3.5 mr-1.5" />Exporter
            </Button>
          </div>
          <Button size="sm" onClick={() => { setEditingProduct(null); setIsFormOpen(true); }} className="chamfer-hud-sm text-xs shrink-0">
            <Plus className="h-3.5 w-3.5 mr-1.5" />Ajouter
          </Button>
        </div>

      </div>

      <Tabs defaultValue="products" className="min-w-0">
        <TabsList className="bg-muted/50 admin-tabs-scroll w-full h-auto">

          <TabsTrigger value="products" className="gap-2"><Package className="h-4 w-4" />Produits</TabsTrigger>
          <TabsTrigger value="looks" className="gap-2"><Layers2 className="h-4 w-4" />Looks</TabsTrigger>
          <TabsTrigger value="sizes" className="gap-2"><Tag className="h-4 w-4" />Tailles</TabsTrigger>
          <TabsTrigger value="layout" className="gap-2"><LayoutGrid className="h-4 w-4" />Affichage</TabsTrigger>
          <TabsTrigger value="ordering" className="gap-2"><ArrowUpDown className="h-4 w-4" />Rangement</TabsTrigger>
        </TabsList>

        <TabsContent value="ordering" className="space-y-4 mt-4">
          <AdminCategoryOrdering />
        </TabsContent>

        <TabsContent value="sizes" className="space-y-4 mt-4">
          <GlobalSizesEditor />
          <ProductDefaultsEditor />
        </TabsContent>


        <TabsContent value="layout" className="space-y-4 mt-4">
          <div className="space-y-2">
            <h2 className="font-bold text-lg">Disposition de la boutique</h2>
            <p className="text-xs text-muted-foreground">Choisissez comment vos produits s'affichent aux clients sur la page /boutique et les catégories.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { id: 'classic', label: 'Classique', desc: '3 colonnes équilibrées — polyvalent', preview: 'grid-cols-3 gap-1' },
              { id: 'compact', label: 'Compact', desc: '4 colonnes serrées — dense, moderne', preview: 'grid-cols-4 gap-0.5' },
              { id: 'editorial', label: 'Éditorial', desc: '1 produit vedette + grille', preview: 'grid-cols-3 gap-1' },
              { id: 'gallery', label: 'Galerie', desc: '2 colonnes grandes — premium', preview: 'grid-cols-2 gap-1' },
              { id: 'masonry', label: 'Mosaïque', desc: 'Hauteurs variables — magazine', preview: 'grid-cols-3 gap-1' },
              { id: 'minimal', label: 'Minimal', desc: 'Liste épurée pleine largeur', preview: 'grid-cols-1 gap-1' },
            ].map(opt => {
              const isActive = currentLayout === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLayout(opt.id)}
                  className={`text-left border rounded-lg p-3 space-y-2 transition ${isActive ? 'border-primary ring-2 ring-primary/30 bg-primary/5' : 'hover:border-primary/50'}`}
                >
                  <div className={`grid ${opt.preview} h-16 bg-muted rounded overflow-hidden p-1`}>
                    {Array.from({ length: opt.id === 'editorial' ? 5 : opt.id === 'minimal' ? 3 : 6 }).map((_, i) => (
                      <div
                        key={i}
                        className={`bg-foreground/40 rounded-sm ${
                          opt.id === 'editorial' && i === 0 ? 'col-span-2 row-span-2' : ''
                        } ${opt.id === 'masonry' ? (i % 2 ? 'h-6' : 'h-10') : ''}`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold">{opt.label}</p>
                    {isActive && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </TabsContent>


        <TabsContent value="products" className="space-y-4 mt-4">
      <div className="chamfer-hud bg-card/50 p-3 lg:p-4 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 lg:gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[140px]"><Filter className="h-3 w-3 mr-1" /><SelectValue placeholder="Catégorie" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-full sm:w-[130px]"><SelectValue placeholder="Stock" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tout stock</SelectItem>
              <SelectItem value="in">En stock</SelectItem>
              <SelectItem value="low">Stock faible</SelectItem>
              <SelectItem value="out">Rupture</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Trier" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Plus récents</SelectItem>
              <SelectItem value="name">Nom A-Z</SelectItem>
              <SelectItem value="price-asc">Prix croissant</SelectItem>
              <SelectItem value="price-desc">Prix décroissant</SelectItem>
              <SelectItem value="stock-asc">Stock croissant</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Actions */}
      {someSelected && (
        <div className="admin-bulk-bar chamfer-hud bg-primary/10 border border-primary/30 backdrop-blur-sm p-3 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:justify-between min-w-0">
          <div className="flex items-center gap-3">
            <span className="text-xs sm:text-sm font-bold hud-text">{count} SÉLECTIONNÉ(S)</span>
            <Button variant="ghost" size="sm" onClick={clear} className="h-8 text-xs"><X className="h-3 w-3 mr-1" />Désélectionner</Button>
          </div>
          <div className="admin-scroll-x flex flex-nowrap lg:flex-wrap items-center gap-2 min-w-0 pb-1 [&>*]:shrink-0">

            <Button size="sm" onClick={() => setIsBulkEditOpen(true)} className="h-8 text-xs chamfer-hud-sm">
              <Wand2 className="h-3 w-3 mr-1" />Édition en masse
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkSwatches}
              disabled={!!swatchProgress}
              className="h-8 text-xs chamfer-hud-sm border-primary/50 text-primary hover:bg-primary/10"
            >
              <Wand2 className="h-3 w-3 mr-1" />
              {swatchProgress
                ? `Pastilles ${swatchProgress.done}/${swatchProgress.total}`
                : 'Générer les pastilles manquantes'}
            </Button>

            <Button size="sm" variant="outline" onClick={() => setIsBulkGifOpen(true)} className="h-8 text-xs chamfer-hud-sm">
              <Film className="h-3 w-3 mr-1" />Créer des GIF
            </Button>
            <Button size="sm" variant="outline" onClick={exportSelectedCsv} className="h-8 text-xs chamfer-hud-sm">

              <Download className="h-3 w-3 mr-1" />Exporter sélection
            </Button>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDelete.isPending} className="h-8 text-xs chamfer-hud-sm">
              <Trash2 className="h-3 w-3 mr-1" />Supprimer
            </Button>
          </div>
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
        ) : isMobile ? (

          <div>
            <button
              type="button"
              onClick={() => toggleAll(!allSelected)}
              aria-pressed={allSelected}
              className="w-full flex items-center gap-3 px-3 py-3 border-b border-border bg-muted/40 text-left active:bg-muted"
            >
              <Checkbox checked={allSelected} tabIndex={-1} className="pointer-events-none" />
              <span className="text-[11px] font-bold hud-text text-muted-foreground">
                {allSelected ? 'TOUT DÉSÉLECTIONNER' : 'TOUT SÉLECTIONNER'}
              </span>
            </button>

            {filteredProducts.map((product) => (
              <ProductMobileCard
                key={product.id}
                product={product}
                selected={selectedIds.has(product.id)}
                onToggleSelect={toggle}
                actions={{
                  onEdit: (p) => { setEditingProduct(p); setIsFormOpen(true); },
                  onStock: (p) => handleOpenStockDialog(p),
                  onVariantStock: (p) => setVariantStockDialog({ productId: p.id, productName: p.name }),
                  onDuplicate: (p) => handleDuplicate(p),
                  onSplit: (p) => setSplitProduct(p),
                  onDelete: (id) => handleDelete(id),
                  onToggleActive: (p) => toggleActive(p),
                }}
              />
            ))}
          </div>
        ) : (
          <AdminTableScroll stickyFirstCol>
            <table className="w-full min-w-[820px]">

              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="p-4 w-10"><Checkbox checked={allSelected} onCheckedChange={toggleAll} /></th>
                  <th className="text-left p-4 text-xs font-bold hud-text">PRODUIT</th>
                  <th className="text-left p-4 text-xs font-bold hud-text">SKU</th>
                  <th className="text-left p-4 text-xs font-bold hud-text">CATÉGORIE</th>
                  <th className="text-right p-4 text-xs font-bold hud-text">PRIX</th>
                  <th className="text-right p-4 text-xs font-bold hud-text">PROMO</th>
                  <th className="text-right p-4 text-xs font-bold hud-text">STOCK</th>
                  <th className="text-center p-4 text-xs font-bold hud-text">ACTIF</th>
                  <th className="text-right p-4 text-xs font-bold hud-text">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className={`border-b border-border last:border-0 hover:bg-muted/30 ${selectedIds.has(product.id) ? 'bg-primary/5' : ''}`}>
                    <td className="p-4"><Checkbox checked={selectedIds.has(product.id)} onCheckedChange={() => toggle(product.id)} /></td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <MainImagePicker product={product} />

                        <div className="min-w-0">
                          {editingCell?.id === product.id && editingCell.field === 'name' ? (
                            <input
                              autoFocus
                              value={editingCellValue}
                              onChange={e => setEditingCellValue(e.target.value)}
                              onBlur={commitEditCell}
                              onKeyDown={e => { if (e.key === 'Enter') commitEditCell(); if (e.key === 'Escape') setEditingCell(null); }}
                              className="font-medium text-sm bg-background border border-primary rounded px-2 py-1 w-56"
                            />
                          ) : (
                            <p
                              className="font-medium text-sm cursor-pointer hover:text-primary"
                              title="Cliquer pour modifier le nom"
                              onClick={() => startEditCell(product.id, 'name', product.name)}
                            >{product.name}</p>
                          )}
                          {editingCell?.id === product.id && editingCell.field === 'subtitle' ? (
                            <input
                              autoFocus
                              value={editingCellValue}
                              onChange={e => setEditingCellValue(e.target.value)}
                              onBlur={commitEditCell}
                              onKeyDown={e => { if (e.key === 'Enter') commitEditCell(); if (e.key === 'Escape') setEditingCell(null); }}
                              placeholder="Sous-titre…"
                              className="mt-1 text-xs bg-background border border-primary rounded px-2 py-1 w-56"
                            />
                          ) : (
                            <p
                              className="text-xs text-muted-foreground cursor-pointer hover:text-primary"
                              title="Cliquer pour modifier le sous-titre"
                              onClick={() => startEditCell(product.id, 'subtitle', product.subtitle)}
                            >{product.subtitle || '+ Ajouter un sous-titre'}</p>
                          )}
                        </div>

                      </div>
                    </td>
                    <td className="p-4">
                      {editingCell?.id === product.id && editingCell.field === 'sku' ? (
                        <input
                          autoFocus
                          value={editingCellValue}
                          onChange={e => setEditingCellValue(e.target.value)}
                          onBlur={commitEditCell}
                          onKeyDown={e => { if (e.key === 'Enter') commitEditCell(); if (e.key === 'Escape') setEditingCell(null); }}
                          className="text-xs bg-background border border-primary rounded px-2 py-1 w-32"
                        />
                      ) : (
                        <code
                          className="text-xs bg-muted px-2 py-1 rounded cursor-pointer hover:bg-primary/10"
                          title="Cliquer pour modifier"
                          onClick={() => startEditCell(product.id, 'sku', product.sku)}
                        >{product.sku}</code>
                      )}
                    </td>
                    <td className="p-4 text-sm">
                      {editingCell?.id === product.id && editingCell.field === 'category' ? (
                        <select
                          autoFocus
                          value={editingCellValue}
                          onChange={e => { setEditingCellValue(e.target.value); }}
                          onBlur={commitEditCell}
                          onKeyDown={e => { if (e.key === 'Enter') commitEditCell(); if (e.key === 'Escape') setEditingCell(null); }}
                          className="text-xs bg-background border border-primary rounded px-2 py-1"
                        >
                          <option value={editingCellValue}>{editingCellValue}</option>
                          {categories.filter(c => c !== editingCellValue).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      ) : (
                        <span
                          className="cursor-pointer hover:underline decoration-dotted"
                          title="Cliquer pour modifier"
                          onClick={() => startEditCell(product.id, 'category', product.category)}
                        >{product.category}</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {editingCell?.id === product.id && editingCell.field === 'price' ? (
                        <input
                          autoFocus
                          type="number"
                          step="0.01"
                          min={0}
                          value={editingCellValue}
                          onChange={e => setEditingCellValue(e.target.value)}
                          onBlur={commitEditCell}
                          onKeyDown={e => { if (e.key === 'Enter') commitEditCell(); if (e.key === 'Escape') setEditingCell(null); }}
                          className="w-20 h-7 text-xs text-right border border-primary rounded px-1 bg-background"
                        />
                      ) : (
                        <span
                          className="text-sm font-bold cursor-pointer hover:underline decoration-dotted"
                          title="Cliquer pour modifier"
                          onClick={() => startEditCell(product.id, 'price', product.price)}
                        >{product.price}€</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {editingCell?.id === product.id && editingCell.field === 'salePrice' ? (
                        <input
                          autoFocus
                          type="number"
                          step="0.01"
                          min={0}
                          value={editingCellValue}
                          onChange={e => setEditingCellValue(e.target.value)}
                          onBlur={commitEditCell}
                          onKeyDown={e => { if (e.key === 'Enter') commitEditCell(); if (e.key === 'Escape') setEditingCell(null); }}
                          placeholder="—"
                          className="w-20 h-7 text-xs text-right border border-primary rounded px-1 bg-background"
                        />
                      ) : (
                        <span
                          className={`text-sm cursor-pointer hover:underline decoration-dotted ${product.salePrice ? 'font-bold text-primary' : 'text-muted-foreground'}`}
                          title="Cliquer pour modifier le prix promo (vider = pas de promo)"
                          onClick={() => startEditCell(product.id, 'salePrice', product.salePrice ?? '')}
                        >{product.salePrice ? `${product.salePrice}€` : '—'}</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {editingStockId === product.id ? (
                        <div className="flex items-center gap-1 justify-end">
                          <input
                            type="number"
                            min={0}
                            value={editingStockValue}
                            onChange={e => setEditingStockValue(Number(e.target.value))}
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveInlineStock(product.id); if (e.key === 'Escape') setEditingStockId(null); }}
                            className="w-16 h-7 text-xs text-right border border-primary rounded px-1 bg-background"
                            autoFocus
                          />
                          <button type="button" onClick={() => handleSaveInlineStock(product.id)} className="text-primary hover:text-primary/80 text-xs">✓</button>
                          <button type="button" onClick={() => setEditingStockId(null)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
                        </div>
                      ) : (
                        <span
                          className={`text-sm font-bold cursor-pointer hover:underline decoration-dotted ${product.stock === 0 ? 'text-destructive' : product.stock <= 5 ? 'text-yellow-500' : 'text-green-400'}`}
                          onClick={() => { setEditingStockId(product.id); setEditingStockValue(product.stock); }}
                          title="Cliquer pour modifier le stock"
                        >
                          {product.stock}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => toggleActive(product)}
                        title="Cliquer pour activer/désactiver"
                        className={`text-[10px] px-2 py-1 rounded font-bold ${((product as any).isActive ?? true) ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}
                      >
                        {((product as any).isActive ?? true) ? 'ACTIF' : 'INACTIF'}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                         <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={() => { setEditingProduct(product); setIsFormOpen(true); }}><Pencil className="h-4 w-4 mr-2" />Modifier</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => handleOpenStockDialog(product)}><Boxes className="h-4 w-4 mr-2" />Gérer le stock</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => setVariantStockDialog({ productId: product.id, productName: product.name })}><Layers2 className="h-4 w-4 mr-2" />Stock par taille/couleur</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => handleDuplicate(product)}><Copy className="h-4 w-4 mr-2" />Dupliquer</DropdownMenuItem>
                           <DropdownMenuItem
                             onClick={() => setSplitProduct(product)}
                             disabled={((product.colorOptions?.length || product.colors?.length || 0) < 2)}
                           >
                             <Layers2 className="h-4 w-4 mr-2" />Éclater par couleur
                           </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => handleDelete(product.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Supprimer</DropdownMenuItem>
                         </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTableScroll>

        )}
      </div>
        </TabsContent>

        {/* ── LOOKS TAB ── */}
        <TabsContent value="looks" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setEditingLook(null);
                setLookForm({ name: '', description: '', productIds: [], isActive: true });
                setLookDialogOpen(true);
              }}
              className="chamfer-hud-sm"
            >
              <Plus className="h-4 w-4 mr-2" />Nouveau look
            </Button>
          </div>
          <div className="chamfer-hud bg-card/50 overflow-hidden">
            {loadingLooks ? (
              <div className="p-12 text-center"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" /></div>
            ) : looks.length === 0 ? (
              <div className="p-12 text-center">
                <Layers2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun look créé</p>
                <p className="text-xs text-muted-foreground mt-1">Associez plusieurs produits pour les vendre ensemble</p>
              </div>
            ) : (
              <div className="space-y-3 p-4">
                {looks.map((look) => {
                  const lookProducts = products.filter(p => look.productIds.includes(p.id));
                  return (
                    <div key={look.id} className="border border-border rounded-lg p-4 flex items-start gap-4 hover:bg-muted/20">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-bold text-sm">{look.name}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${look.isActive ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                            {look.isActive ? 'Actif' : 'Inactif'}
                          </span>
                        </div>
                        {look.description && <p className="text-xs text-muted-foreground mb-2">{look.description}</p>}
                        <div className="flex gap-2 flex-wrap">
                          {lookProducts.map(p => (
                            <div key={p.id} className="flex items-center gap-1 bg-muted/50 rounded px-2 py-1">
                              <img src={p.image} alt={p.name} className="w-6 h-6 object-cover rounded-sm" />
                              <span className="text-xs truncate max-w-[80px]">{p.name}</span>
                            </div>
                          ))}
                          {look.productIds.length > lookProducts.length && (
                            <span className="text-xs text-muted-foreground px-2 py-1">+{look.productIds.length - lookProducts.length} autre(s)</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                          setEditingLook(look);
                          setLookForm({ name: look.name, description: look.description || '', productIds: look.productIds, isActive: look.isActive });
                          setLookDialogOpen(true);
                        }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => {
                          if (confirm('Supprimer ce look ?')) {
                            await deleteLook.mutateAsync(look.id);
                            toast({ title: 'Look supprimé' });
                          }
                        }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Product Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="hud-text">{editingProduct ? 'MODIFIER LE PRODUIT' : 'NOUVEAU PRODUIT'}</DialogTitle>
          </DialogHeader>
          <ProductForm product={editingProduct || undefined} onSubmit={editingProduct ? handleUpdate : handleCreate} onCancel={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Look Dialog */}
      <Dialog open={lookDialogOpen} onOpenChange={setLookDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="hud-text">{editingLook ? 'MODIFIER LE LOOK' : 'NOUVEAU LOOK'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs hud-text">Nom du look *</Label>
              <Input value={lookForm.name} onChange={e => setLookForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Tenue Hiver, Set Casual..." />
            </div>
            <div className="space-y-2">
              <Label className="text-xs hud-text">Description</Label>
              <Textarea value={lookForm.description} onChange={e => setLookForm(f => ({ ...f, description: e.target.value }))} placeholder="Description facultative..." rows={2} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={lookForm.isActive} onCheckedChange={v => setLookForm(f => ({ ...f, isActive: v }))} />
              <Label className="text-sm">Actif</Label>
            </div>
            <div className="space-y-2">
              <Label className="text-xs hud-text">Produits associés ({lookForm.productIds.length} sélectionné(s))</Label>
              <div className="max-h-[280px] overflow-y-auto space-y-1 border border-border rounded-lg p-2">
                {products.map(p => {
                  const selected = lookForm.productIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${selected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50'}`}
                      onClick={() => setLookForm(f => ({
                        ...f,
                        productIds: selected
                          ? f.productIds.filter(id => id !== p.id)
                          : [...f.productIds, p.id],
                      }))}
                    >
                      <img src={p.image} alt={p.name} className="w-10 h-10 object-cover rounded" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.salePrice ?? p.price}€</p>
                      </div>
                      {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setLookDialogOpen(false)}>Annuler</Button>
              <Button
                disabled={!lookForm.name || lookForm.productIds.length < 2}
                onClick={async () => {
                  try {
                    if (editingLook) {
                      await updateLook.mutateAsync({ id: editingLook.id, ...lookForm });
                      toast({ title: 'Look mis à jour' });
                    } else {
                      await createLook.mutateAsync(lookForm);
                      toast({ title: 'Look créé' });
                    }
                    setLookDialogOpen(false);
                  } catch {
                    toast({ title: 'Erreur', variant: 'destructive' });
                  }
                }}
              >
                {editingLook ? 'Mettre à jour' : 'Créer le look'}
              </Button>
            </div>
          </div>
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
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-border bg-muted/30">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Image principale auto</span>
                <Select
                  value={autoMainStrategy}
                  onValueChange={(v) => { setAutoMainStrategy(v as AutoMainStrategy); applyAutoMain(v as AutoMainStrategy); }}
                >
                  <SelectTrigger className="h-8 w-[230px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(AUTO_MAIN_STRATEGY_LABEL) as AutoMainStrategy[]).map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">{AUTO_MAIN_STRATEGY_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => applyAutoMain(autoMainStrategy, true)}>
                  Réinitialiser tout en auto
                </Button>
                <span className="text-[11px] text-muted-foreground">
                  {extractedProducts.filter(p => p.mainManual).length} choix manuel(s) préservé(s)
                </span>
              </div>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {extractedProducts.map((p, i) => {
                  const all = (p.pageImages || []).filter(Boolean);
                  const main = p.mainImage || all[0] || null;
                  const ghostCount = (p.ghostImages || []).filter(Boolean).length;
                  const promote = (url: string) => setExtractedProducts(ps => ps.map((pp, j) => j === i
                    ? {
                        ...pp,
                        mainImage: url,
                        mainManual: true,
                        mainSource: (pp.ghostImages || []).includes(url)
                          ? 'ghost'
                          : (pp.wornImages || []).includes(url) ? 'worn' : 'page',
                      }
                    : pp));
                  const resetAuto = () => setExtractedProducts(ps => ps.map((pp, j) => j === i
                    ? { ...pp, ...pickMainImage(pp, autoMainStrategy), mainManual: false }
                    : pp));
                  return (
                  <div key={i} className={`flex items-start gap-4 p-3 border rounded-lg transition-colors ${p.selected ? 'border-primary bg-primary/5' : 'border-border opacity-60'}`}>
                    <button type="button" className="mt-1" onClick={() => setExtractedProducts(ps => ps.map((pp, j) => j === i ? { ...pp, selected: !pp.selected } : pp))}>
                      {p.selected ? <Check className="h-5 w-5 text-primary" /> : <X className="h-5 w-5 text-muted-foreground" />}
                    </button>
                    <div className="shrink-0 space-y-1">
                      {main ? (
                        <img
                          src={main}
                          alt=""
                          className={`h-14 w-14 object-cover rounded border-2 ${p.mainSource === 'worn' ? 'border-primary' : p.mainSource === 'ghost' ? 'border-amber-500' : 'border-border'}`}
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded border border-dashed border-border flex items-center justify-center text-[9px] text-muted-foreground">Pas d'img</div>
                      )}
                      {p.mainSource && (
                        <p className="text-[9px] uppercase tracking-wider text-center text-muted-foreground">
                          {MAIN_SOURCE_LABEL[p.mainSource]}{p.mainManual ? ' · manuel' : ' · auto'}
                        </p>
                      )}
                      {p.mainManual && (
                        <button
                          type="button"
                          onClick={resetAuto}
                          className="block mx-auto text-[9px] uppercase tracking-wider text-primary hover:underline"
                        >
                          Auto
                        </button>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.category} · SKU: {p.sku}
                        {all.length > 0 && ` · ${all.length} visuel${all.length > 1 ? 's' : ''}`}
                        {ghostCount > 0 && ` · ${ghostCount} ghost`}
                      </p>
                      {all.length > 1 && (
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {all.slice(0, 8).map((url) => (
                            <button
                              key={url}
                              type="button"
                              title={url === main ? 'Image principale' : 'Définir comme image principale'}
                              onClick={() => promote(url)}
                              className={`h-9 w-9 rounded overflow-hidden border transition-all ${url === main ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-foreground'}`}
                            >
                              <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{p.price}€</p>
                      {p.salePrice && <p className="text-xs text-muted-foreground line-through">{p.salePrice}€</p>}
                    </div>
                  </div>
                  );
                })}

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

      {/* Stock / Inventory Dialog */}
      <InventoryProductDialog
        open={stockDialogOpen}
        onOpenChange={(open) => { setStockDialogOpen(open); if (!open) setStockDialogEdit(null); }}
        onSaved={() => { setStockDialogOpen(false); setStockDialogEdit(null); toast({ title: 'Stock mis à jour' }); }}
        locations={stockDialogLocations}
        editData={stockDialogEdit}
      />

      <WordPressSyncDialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen} />
      <CsvImportDialog open={isCsvDialogOpen} onOpenChange={setIsCsvDialogOpen} />
      <BulkProductImagesDialog open={isBulkImagesOpen} onOpenChange={setIsBulkImagesOpen} products={products} />
      <BulkGifDialog
        open={isBulkGifOpen}
        onOpenChange={setIsBulkGifOpen}
        products={filteredProducts.filter(p => selectedIds.has(p.id))}
      />
      <SplitVariantsDialog
        open={!!splitProduct}
        onOpenChange={(v) => { if (!v) setSplitProduct(null); }}
        product={splitProduct}
        existingSkus={products.map(p => p.sku)}
      />
      <BulkEditDialog
        open={isBulkEditOpen}
        onOpenChange={setIsBulkEditOpen}
        products={filteredProducts.filter(p => selectedIds.has(p.id))}
        categories={categories}
        onDone={clear}
      />
      <QuickPriceStockImportDialog
        open={isQuickCsvOpen}
        onOpenChange={setIsQuickCsvOpen}
        products={products}
      />
      {variantStockDialog && (
        <BulkVariantStockDialog
          open={!!variantStockDialog}
          onOpenChange={(o) => { if (!o) setVariantStockDialog(null); }}
          productId={variantStockDialog.productId}
          productName={variantStockDialog.productName}
        />
      )}
    </div>
  );
}
