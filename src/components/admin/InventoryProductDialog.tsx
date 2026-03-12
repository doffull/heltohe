import { useState, useEffect, useRef } from 'react';
import { X, Plus, Sparkles, ImageIcon, AlertTriangle, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const CATEGORIES = ['Homme', 'Femme', 'Enfant', 'Accessoires'];
const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const CHANNELS = [
  { value: 'b2c', label: 'B2C' },
  { value: 'b2b', label: 'B2B' },
  { value: 'both', label: 'Les deux' },
];

const COLOR_HEX_MAP: Record<string, string> = {
  'BLACK': '#000000', 'NOIR': '#000000',
  'WHITE': '#FFFFFF', 'BLANC': '#FFFFFF',
  'RED': '#EF4444', 'ROUGE': '#EF4444',
  'BLUE': '#3B82F6', 'BLEU': '#3B82F6',
  'NAVY': '#1E3A5F', 'MARINE': '#1E3A5F',
  'GREEN': '#22C55E', 'VERT': '#22C55E',
  'YELLOW': '#EAB308', 'JAUNE': '#EAB308',
  'ORANGE': '#F97316',
  'PINK': '#EC4899', 'ROSE': '#EC4899',
  'PURPLE': '#A855F7', 'VIOLET': '#A855F7',
  'GREY': '#9CA3AF', 'GRIS': '#9CA3AF',
  'BROWN': '#92400E', 'MARRON': '#92400E',
  'BEIGE': '#D2B48C',
  'BURGUNDY': '#800020', 'BORDEAUX': '#800020',
  'CAMEL': '#C19A6B',
  'KHAKI': '#BDB76B',
};

const PREDEFINED_COLORS = ['BLACK', 'WHITE', 'RED', 'BLUE', 'NAVY', 'GREEN', 'PINK', 'PURPLE', 'GREY', 'BROWN', 'BEIGE', 'BURGUNDY', 'ORANGE', 'YELLOW', 'CAMEL', 'KHAKI'];

function getColorHex(name: string) {
  return COLOR_HEX_MAP[name.toUpperCase().trim()] || '#888888';
}

interface InventoryProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  locations: { id: string; type: string }[];
  editData?: {
    inventoryId: string;
    productId: string;
  } | null;
}

export function InventoryProductDialog({ open, onOpenChange, onSaved, locations, editData }: InventoryProductDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [generatingSku, setGeneratingSku] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: '',
    sku: '',
    price: 0,
    category: 'Homme',
    description: '',
    material: '',
    image: '',
    sizes: [] as string[],
    colors: [] as string[],
    channel: 'b2c',
    threshold: 10,
    initialStock: 0,
  });
  const [originalSizes, setOriginalSizes] = useState<string[]>([]);
  const [originalColors, setOriginalColors] = useState<string[]>([]);
  const [existingStockLevels, setExistingStockLevels] = useState<any[]>([]);
  const [variantGrid, setVariantGrid] = useState<Record<string, Record<string, number>>>({});
  const [sizeStockMap, setSizeStockMap] = useState<Record<string, number>>({});
  const [colorStockMap, setColorStockMap] = useState<Record<string, number>>({});
  const [newColor, setNewColor] = useState('');
  const [newSize, setNewSize] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editData) {
      loadEditData();
    } else {
      setForm({
        name: '', sku: '', price: 0, category: 'Homme', description: '', material: '', image: '',
        sizes: [], colors: [], channel: 'b2c', threshold: 10, initialStock: 0,
      });
      setOriginalSizes([]);
      setOriginalColors([]);
      setExistingStockLevels([]);
      setVariantGrid({});
      setSizeStockMap({});
      setColorStockMap({});
    }
  }, [open, editData]);

  const loadEditData = async () => {
    if (!editData) return;
    const [{ data: prod }, { data: inv }, { data: sls }] = await Promise.all([
      supabase.from('products').select('*').eq('id', editData.productId).single(),
      supabase.from('inventory').select('*').eq('id', editData.inventoryId).single(),
      supabase.from('stock_levels').select('*').eq('inventory_id', editData.inventoryId),
    ]);
    if (prod && inv) {
      const sizes = prod.sizes || [];
      const colors = prod.colors || [];
      setForm({
        name: prod.name,
        sku: prod.sku,
        price: prod.price,
        category: prod.category,
        description: prod.description || '',
        material: prod.material || '',
        image: prod.image || '',
        sizes,
        colors,
        channel: inv.channel,
        threshold: inv.threshold,
        initialStock: 0,
      });
      setOriginalSizes([...sizes]);
      setOriginalColors([...colors]);
      setExistingStockLevels(sls || []);
    }
  };

  const toggleSize = (size: string) => {
    setForm(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size) ? prev.sizes.filter(s => s !== size) : [...prev.sizes, size],
    }));
  };

  const addCustomSize = () => {
    const s = newSize.trim().toUpperCase();
    if (s && !form.sizes.includes(s)) {
      setForm(prev => ({ ...prev, sizes: [...prev.sizes, s] }));
    }
    setNewSize('');
  };

  const addColor = (color?: string) => {
    const c = (color || newColor).trim().toUpperCase();
    if (c && !form.colors.includes(c)) {
      setForm(prev => ({ ...prev, colors: [...prev.colors, c] }));
    }
    if (!color) setNewColor('');
  };

  const removeColor = (color: string) => {
    setForm(prev => ({ ...prev, colors: prev.colors.filter(c => c !== color) }));
  };

  const removeSize = (size: string) => {
    setForm(prev => ({ ...prev, sizes: prev.sizes.filter(s => s !== size) }));
  };

  // Check if removing a size/color would delete stock
  const getStockForSize = (size: string) => {
    return existingStockLevels.filter(sl => sl.size === size).reduce((s: number, sl: any) => s + sl.quantity, 0);
  };
  const getStockForColor = (color: string) => {
    return existingStockLevels.filter(sl => sl.color === color).reduce((s: number, sl: any) => s + sl.quantity, 0);
  };

  const removedSizes = editData ? originalSizes.filter(s => !form.sizes.includes(s)) : [];
  const removedColors = editData ? originalColors.filter(c => !form.colors.includes(c)) : [];
  const removedSizesWithStock = removedSizes.filter(s => getStockForSize(s) > 0);
  const removedColorsWithStock = removedColors.filter(c => getStockForColor(c) > 0);
  const hasStockWarning = removedSizesWithStock.length > 0 || removedColorsWithStock.length > 0;

  // Image file upload
  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast({ title: 'Fichier trop volumineux (max 10 Mo)', variant: 'destructive' }); return; }
    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `products/${Date.now()}-${Math.random().toString(36).substring(2, 6)}.${ext}`;
      const { error } = await supabase.storage.from('media').upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName);
      setForm(p => ({ ...p, image: urlData.publicUrl }));
      toast({ title: 'Image uploadée !' });
    } catch (err: any) {
      toast({ title: 'Erreur upload', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  // AI SKU generation
  const generateSku = () => {
    if (!form.name) { toast({ title: 'Entrez un nom d\'abord', variant: 'destructive' }); return; }
    setGeneratingSku(true);
    const catCode = form.category.slice(0, 3).toUpperCase();
    const nameCode = form.name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'PRD';
    const counter = String(Math.floor(Math.random() * 900) + 100);
    setForm(prev => ({ ...prev, sku: `${catCode}-${nameCode}-${counter}` }));
    setGeneratingSku(false);
  };

  // AI Description generation
  const generateDescription = async () => {
    if (!form.name) { toast({ title: 'Entrez un nom d\'abord', variant: 'destructive' }); return; }
    setGeneratingDesc(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-product-description', {
        body: { name: form.name, category: form.category, material: form.material, sizes: form.sizes, colors: form.colors },
      });
      if (error) throw error;
      if (data?.description) {
        setForm(prev => ({ ...prev, description: data.description }));
        toast({ title: 'Description générée !' });
      }
    } catch (err: any) {
      toast({ title: 'Erreur IA', description: err.message, variant: 'destructive' });
    } finally {
      setGeneratingDesc(false);
    }
  };

  const logStockHistory = async (entries: { inventory_id: string; location_id?: string; action: string; size?: string; color?: string; quantity_before?: number; quantity_after?: number; note?: string }[]) => {
    for (const entry of entries) {
      await supabase.from('stock_history' as any).insert({
        inventory_id: entry.inventory_id,
        location_id: entry.location_id || null,
        action: entry.action,
        size: entry.size || null,
        color: entry.color || null,
        quantity_before: entry.quantity_before ?? 0,
        quantity_after: entry.quantity_after ?? 0,
        note: entry.note || null,
        created_by: user?.id || null,
      });
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.sku) {
      toast({ title: 'Nom et SKU requis', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editData) {
        // Update product
        await supabase.from('products').update({
          name: form.name, sku: form.sku, price: form.price, category: form.category,
          description: form.description, material: form.material, sizes: form.sizes, colors: form.colors,
          image: form.image || '/placeholder.svg',
        }).eq('id', editData.productId);

        await supabase.from('inventory').update({
          name: form.name, sku: form.sku, channel: form.channel, threshold: form.threshold,
        }).eq('id', editData.inventoryId);

        // Delete stock_levels for removed sizes/colors
        const historyEntries: any[] = [];
        for (const size of removedSizes) {
          const toDelete = existingStockLevels.filter(sl => sl.size === size);
          for (const sl of toDelete) {
            await supabase.from('stock_levels').delete().eq('id', sl.id);
            historyEntries.push({
              inventory_id: editData.inventoryId,
              location_id: sl.location_id,
              action: 'delete',
              size: sl.size,
              color: sl.color,
              quantity_before: sl.quantity,
              quantity_after: 0,
              note: `Taille ${size} supprimée`,
            });
          }
        }
        for (const color of removedColors) {
          const toDelete = existingStockLevels.filter(sl => sl.color === color);
          for (const sl of toDelete) {
            await supabase.from('stock_levels').delete().eq('id', sl.id);
            historyEntries.push({
              inventory_id: editData.inventoryId,
              location_id: sl.location_id,
              action: 'delete',
              size: sl.size,
              color: sl.color,
              quantity_before: sl.quantity,
              quantity_after: 0,
              note: `Couleur ${color} supprimée`,
            });
          }
        }
        if (historyEntries.length > 0) {
          await logStockHistory(historyEntries);
        }

        toast({ title: 'Produit mis à jour' });
      } else {
        // Create
        const { data: prod, error: prodErr } = await supabase.from('products').insert({
          name: form.name, sku: form.sku, price: form.price, category: form.category,
          description: form.description, material: form.material, sizes: form.sizes, colors: form.colors,
          stock: form.initialStock, image: form.image || '/placeholder.svg',
        }).select('id').single();

        if (prodErr || !prod) throw prodErr || new Error('Erreur création produit');

        const { data: inv, error: invErr } = await supabase.from('inventory').insert({
          product_id: prod.id, sku: form.sku, name: form.name, channel: form.channel, threshold: form.threshold,
        }).select('id').single();

        if (invErr || !inv) throw invErr || new Error('Erreur création inventaire');

        const webLoc = locations.find(l => l.type === 'web');
        const historyEntries: any[] = [];

        if (webLoc) {
          const hasSizes = form.sizes.length > 0;
          const hasColors = form.colors.length > 0;

          if (hasSizes && hasColors) {
            for (const [color, sizes] of Object.entries(variantGrid)) {
              for (const [size, qty] of Object.entries(sizes)) {
                if (qty > 0) {
                  await supabase.from('stock_levels').insert({
                    inventory_id: inv.id, location_id: webLoc.id, quantity: qty, reserved: 0,
                    size, color, stocked_at: new Date().toISOString(),
                  });
                  historyEntries.push({ inventory_id: inv.id, location_id: webLoc.id, action: 'add', size, color, quantity_before: 0, quantity_after: qty, note: 'Stock initial' });
                }
              }
            }
          } else if (hasSizes && !hasColors) {
            for (const [size, qty] of Object.entries(sizeStockMap)) {
              if (qty > 0) {
                await supabase.from('stock_levels').insert({
                  inventory_id: inv.id, location_id: webLoc.id, quantity: qty, reserved: 0,
                  size, stocked_at: new Date().toISOString(),
                });
                historyEntries.push({ inventory_id: inv.id, location_id: webLoc.id, action: 'add', size, quantity_before: 0, quantity_after: qty, note: 'Stock initial' });
              }
            }
          } else if (!hasSizes && hasColors) {
            for (const [color, qty] of Object.entries(colorStockMap)) {
              if (qty > 0) {
                await supabase.from('stock_levels').insert({
                  inventory_id: inv.id, location_id: webLoc.id, quantity: qty, reserved: 0,
                  color, stocked_at: new Date().toISOString(),
                });
                historyEntries.push({ inventory_id: inv.id, location_id: webLoc.id, action: 'add', color, quantity_before: 0, quantity_after: qty, note: 'Stock initial' });
              }
            }
          } else if (form.initialStock > 0) {
            await supabase.from('stock_levels').insert({
              inventory_id: inv.id, location_id: webLoc.id, quantity: form.initialStock, reserved: 0,
              stocked_at: new Date().toISOString(),
            });
            historyEntries.push({ inventory_id: inv.id, location_id: webLoc.id, action: 'add', quantity_before: 0, quantity_after: form.initialStock, note: 'Stock initial' });
          }
        }

        if (historyEntries.length > 0) {
          await logStockHistory(historyEntries);
        }

        toast({ title: 'Produit ajouté à l\'inventaire' });
      }

      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? 'Modifier le produit' : 'Ajouter un produit à l\'inventaire'}</DialogTitle>
          <DialogDescription>
            {editData ? 'Modifiez les informations du produit et de l\'inventaire.' : 'Remplissez les informations pour créer un nouveau produit.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Image */}
          <div className="space-y-2">
            <Label className="text-xs">Image produit</Label>
            <div className="flex gap-3 items-start">
              <div className="w-16 h-16 rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center shrink-0">
                {form.image && form.image !== '/placeholder.svg' ? (
                  <img src={form.image} alt="Produit" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <Input
                  value={form.image}
                  onChange={e => setForm(p => ({ ...p, image: e.target.value }))}
                  placeholder="URL de l'image..."
                  className="h-8 text-xs"
                />
                <p className="text-[10px] text-muted-foreground">Collez l'URL d'une image ou laissez vide pour le placeholder</p>
              </div>
            </div>
          </div>

          {/* Name + SKU with AI */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nom *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="ALICANTE" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                SKU *
                <Button type="button" variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] gap-1 text-primary" onClick={generateSku} disabled={generatingSku}>
                  <Sparkles className="h-3 w-3" /> IA
                </Button>
              </Label>
              <Input value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} placeholder="ALC-001" />
            </div>
          </div>

          {/* Price + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Prix (€)</Label>
              <Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} min={0} step={0.01} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Catégorie</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description with AI */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              Description
              <Button type="button" variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] gap-1 text-primary" onClick={generateDescription} disabled={generatingDesc}>
                <Sparkles className="h-3 w-3" /> {generatingDesc ? 'Génération...' : 'Générer IA'}
              </Button>
            </Label>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="min-h-[60px]" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Matériau</Label>
            <Input value={form.material} onChange={e => setForm(p => ({ ...p, material: e.target.value }))} placeholder="Polyester recyclé" />
          </div>

          {/* Sizes */}
          <div className="space-y-2">
            <Label className="text-xs">Tailles</Label>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_SIZES.map(size => (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  className={cn(
                    "w-9 h-9 text-xs font-medium border rounded transition-all",
                    form.sizes.includes(size)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/30 text-muted-foreground border-border hover:border-primary/50"
                  )}
                >
                  {size}
                </button>
              ))}
              {form.sizes.filter(s => !DEFAULT_SIZES.includes(s)).map(size => (
                <span key={size} className="flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary border border-primary/30 rounded">
                  {size}
                  <button type="button" onClick={() => removeSize(size)}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newSize}
                onChange={e => setNewSize(e.target.value)}
                placeholder="Taille custom..."
                className="h-8 text-xs"
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomSize())}
              />
              <Button type="button" variant="outline" size="sm" onClick={addCustomSize} className="h-8 px-2">
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Colors with predefined palette */}
          <div className="space-y-2">
            <Label className="text-xs">Couleurs</Label>
            <div className="flex flex-wrap gap-1.5 p-2 bg-muted/30 rounded-lg border border-border/50">
              {PREDEFINED_COLORS.map(color => {
                const hex = getColorHex(color);
                const isSelected = form.colors.includes(color);
                const isLight = ['WHITE', 'BEIGE', 'YELLOW'].includes(color);
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => isSelected ? removeColor(color) : addColor(color)}
                    className={cn(
                      "w-7 h-7 rounded-full transition-all border-2 relative",
                      isSelected ? "border-primary scale-110 ring-2 ring-primary/30" : "border-transparent hover:scale-110",
                      isLight && !isSelected && "border-border/50"
                    )}
                    style={{ backgroundColor: hex }}
                    title={color}
                  >
                    {isSelected && (
                      <span className={cn("absolute inset-0 flex items-center justify-center text-[10px] font-bold", isLight ? "text-foreground" : "text-white")}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>
            {/* Selected colors */}
            <div className="flex flex-wrap gap-1.5">
              {form.colors.map(color => (
                <span key={color} className="flex items-center gap-1.5 px-2 py-1 text-xs bg-muted/50 border border-border rounded">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 border border-border/50"
                    style={{ backgroundColor: getColorHex(color) }}
                  />
                  {color}
                  <button type="button" onClick={() => removeColor(color)}><X className="w-3 h-3 text-muted-foreground hover:text-destructive" /></button>
                </span>
              ))}
            </div>
            {/* Custom color input */}
            <div className="flex gap-2">
              <Input
                value={newColor}
                onChange={e => setNewColor(e.target.value)}
                placeholder="Couleur custom (ex: CORAL)"
                className="h-8 text-xs"
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addColor())}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => addColor()} className="h-8 px-2">
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Warning for removed sizes/colors with stock */}
          {hasStockWarning && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive/50 bg-destructive/5 text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Attention : stock existant sera supprimé</p>
                {removedSizesWithStock.map(s => (
                  <p key={s} className="text-xs text-muted-foreground">Taille {s} : {getStockForSize(s)} unités en stock</p>
                ))}
                {removedColorsWithStock.map(c => (
                  <p key={c} className="text-xs text-muted-foreground">Couleur {c} : {getStockForColor(c)} unités en stock</p>
                ))}
              </div>
            </div>
          )}

          {/* Channel + Threshold */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Canal</Label>
              <Select value={form.channel} onValueChange={v => setForm(p => ({ ...p, channel: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Seuil d'alerte</Label>
              <Input type="number" value={form.threshold} onChange={e => setForm(p => ({ ...p, threshold: Number(e.target.value) }))} min={0} />
            </div>
          </div>

          {/* Stock initial sections - shown in create mode AND edit mode */}
          {!editData && form.sizes.length > 0 && form.colors.length > 0 ? (
            <div className="space-y-2">
              <Label className="text-xs">Stock initial par variante (Web)</Label>
              <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left py-2 px-3 font-medium">Couleur</th>
                      {form.sizes.map(s => (
                        <th key={s} className="text-center py-2 px-2 font-medium">{s}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {form.colors.map(color => (
                      <tr key={color} className="border-t border-border/50">
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full shrink-0 border border-border/50" style={{ backgroundColor: getColorHex(color) }} />
                            <span className="font-medium">{color}</span>
                          </div>
                        </td>
                        {form.sizes.map(size => (
                          <td key={size} className="text-center py-1 px-1">
                            <Input
                              type="number" min={0}
                              value={variantGrid[color]?.[size] ?? 0}
                              onChange={e => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                setVariantGrid(prev => ({ ...prev, [color]: { ...prev[color], [size]: val } }));
                              }}
                              className="w-14 h-6 text-center text-xs p-0 mx-auto"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : !editData && form.sizes.length > 0 && form.colors.length === 0 ? (
            <div className="space-y-2">
              <Label className="text-xs">Stock initial par taille (Web)</Label>
              <div className="grid grid-cols-3 gap-2">
                {form.sizes.map(size => (
                  <div key={size} className="flex items-center gap-2">
                    <span className="text-xs font-medium w-10">{size}</span>
                    <Input
                      type="number" min={0}
                      value={sizeStockMap[size] ?? 0}
                      onChange={e => setSizeStockMap(prev => ({ ...prev, [size]: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="h-7 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : !editData && form.colors.length > 0 && form.sizes.length === 0 ? (
            <div className="space-y-2">
              <Label className="text-xs">Stock initial par couleur (Web)</Label>
              <div className="grid grid-cols-2 gap-2">
                {form.colors.map(color => (
                  <div key={color} className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full shrink-0 border border-border/50" style={{ backgroundColor: getColorHex(color) }} />
                    <span className="text-xs font-medium w-16 truncate">{color}</span>
                    <Input
                      type="number" min={0}
                      value={colorStockMap[color] ?? 0}
                      onChange={e => setColorStockMap(prev => ({ ...prev, [color]: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="h-7 text-xs flex-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : !editData ? (
            <div className="space-y-1.5">
              <Label className="text-xs">Stock initial (Web)</Label>
              <Input type="number" value={form.initialStock} onChange={e => setForm(p => ({ ...p, initialStock: Math.max(0, Number(e.target.value) || 0) }))} min={0} />
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Enregistrement...' : editData ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
