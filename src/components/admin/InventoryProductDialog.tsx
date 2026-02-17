import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
};

function getColorHex(name: string) {
  return COLOR_HEX_MAP[name.toUpperCase().trim()] || '#888888';
}

interface InventoryProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  locations: { id: string; type: string }[];
  /** If set, edit mode */
  editData?: {
    inventoryId: string;
    productId: string;
  } | null;
}

export function InventoryProductDialog({ open, onOpenChange, onSaved, locations, editData }: InventoryProductDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    sku: '',
    price: 0,
    category: 'Homme',
    description: '',
    material: '',
    sizes: [] as string[],
    colors: [] as string[],
    channel: 'b2c',
    threshold: 10,
    initialStock: 0,
  });
  const [variantGrid, setVariantGrid] = useState<Record<string, Record<string, number>>>({});
  const [sizeStockMap, setSizeStockMap] = useState<Record<string, number>>({});
  const [newColor, setNewColor] = useState('');
  const [newSize, setNewSize] = useState('');

  // Load data when editing
  useEffect(() => {
    if (!open) return;
    if (editData) {
      loadEditData();
    } else {
      setForm({
        name: '', sku: '', price: 0, category: 'Homme', description: '', material: '',
        sizes: [], colors: [], channel: 'b2c', threshold: 10, initialStock: 0,
      });
    }
  }, [open, editData]);

  const loadEditData = async () => {
    if (!editData) return;
    const [{ data: prod }, { data: inv }] = await Promise.all([
      supabase.from('products').select('*').eq('id', editData.productId).single(),
      supabase.from('inventory').select('*').eq('id', editData.inventoryId).single(),
    ]);
    if (prod && inv) {
      setForm({
        name: prod.name,
        sku: prod.sku,
        price: prod.price,
        category: prod.category,
        description: prod.description || '',
        material: prod.material || '',
        sizes: prod.sizes || [],
        colors: prod.colors || [],
        channel: inv.channel,
        threshold: inv.threshold,
        initialStock: 0,
      });
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

  const addColor = () => {
    const c = newColor.trim().toUpperCase();
    if (c && !form.colors.includes(c)) {
      setForm(prev => ({ ...prev, colors: [...prev.colors, c] }));
    }
    setNewColor('');
  };

  const removeColor = (color: string) => {
    setForm(prev => ({ ...prev, colors: prev.colors.filter(c => c !== color) }));
  };

  const removeSize = (size: string) => {
    setForm(prev => ({ ...prev, sizes: prev.sizes.filter(s => s !== size) }));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.sku) {
      toast({ title: 'Nom et SKU requis', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editData) {
        // UPDATE products + inventory
        await supabase.from('products').update({
          name: form.name,
          sku: form.sku,
          price: form.price,
          category: form.category,
          description: form.description,
          material: form.material,
          sizes: form.sizes,
          colors: form.colors,
        }).eq('id', editData.productId);

        await supabase.from('inventory').update({
          name: form.name,
          sku: form.sku,
          channel: form.channel,
          threshold: form.threshold,
        }).eq('id', editData.inventoryId);

        toast({ title: 'Produit mis à jour' });
      } else {
        // INSERT product
        const { data: prod, error: prodErr } = await supabase.from('products').insert({
          name: form.name,
          sku: form.sku,
          price: form.price,
          category: form.category,
          description: form.description,
          material: form.material,
          sizes: form.sizes,
          colors: form.colors,
          stock: form.initialStock,
          image: '/placeholder.svg',
        }).select('id').single();

        if (prodErr || !prod) throw prodErr || new Error('Erreur création produit');

        // INSERT inventory
        const { data: inv, error: invErr } = await supabase.from('inventory').insert({
          product_id: prod.id,
          sku: form.sku,
          name: form.name,
          channel: form.channel,
          threshold: form.threshold,
        }).select('id').single();

        if (invErr || !inv) throw invErr || new Error('Erreur création inventaire');

        // INSERT initial stock
        const webLoc = locations.find(l => l.type === 'web');
        if (webLoc) {
          const hasSizesAndColors = form.sizes.length > 0 && form.colors.length > 0;
          const hasSizesOnly = form.sizes.length > 0 && form.colors.length === 0;

          if (hasSizesAndColors) {
            for (const [color, sizes] of Object.entries(variantGrid)) {
              for (const [size, qty] of Object.entries(sizes)) {
                if (qty > 0) {
                  await supabase.from('stock_levels').insert({
                    inventory_id: inv.id,
                    location_id: webLoc.id,
                    quantity: qty,
                    reserved: 0,
                    size,
                    color,
                    stocked_at: new Date().toISOString(),
                  });
                }
              }
            }
          } else if (hasSizesOnly) {
            for (const [size, qty] of Object.entries(sizeStockMap)) {
              if (qty > 0) {
                await supabase.from('stock_levels').insert({
                  inventory_id: inv.id,
                  location_id: webLoc.id,
                  quantity: qty,
                  reserved: 0,
                  size,
                  stocked_at: new Date().toISOString(),
                });
              }
            }
          } else if (form.initialStock > 0) {
            await supabase.from('stock_levels').insert({
              inventory_id: inv.id,
              location_id: webLoc.id,
              quantity: form.initialStock,
              reserved: 0,
              stocked_at: new Date().toISOString(),
            });
          }
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
          {/* Name + SKU */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nom *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="ALICANTE" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">SKU *</Label>
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

          {/* Description + Material */}
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
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

          {/* Colors */}
          <div className="space-y-2">
            <Label className="text-xs">Couleurs</Label>
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
            <div className="flex gap-2">
              <Input
                value={newColor}
                onChange={e => setNewColor(e.target.value)}
                placeholder="Nom de couleur (ex: PINK)"
                className="h-8 text-xs"
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addColor())}
              />
              <Button type="button" variant="outline" size="sm" onClick={addColor} className="h-8 px-2">
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>

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

          {/* Initial stock (create only) */}
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
                            <span
                              className="w-3 h-3 rounded-full shrink-0 border border-border/50"
                              style={{ backgroundColor: getColorHex(color) }}
                            />
                            <span className="font-medium">{color}</span>
                          </div>
                        </td>
                        {form.sizes.map(size => (
                          <td key={size} className="text-center py-1 px-1">
                            <Input
                              type="number"
                              min={0}
                              value={variantGrid[color]?.[size] ?? 0}
                              onChange={e => {
                                const val = parseInt(e.target.value) || 0;
                                setVariantGrid(prev => ({
                                  ...prev,
                                  [color]: { ...prev[color], [size]: val },
                                }));
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
                      type="number"
                      min={0}
                      value={sizeStockMap[size] ?? 0}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 0;
                        setSizeStockMap(prev => ({ ...prev, [size]: val }));
                      }}
                      className="h-7 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : !editData ? (
            <div className="space-y-1.5">
              <Label className="text-xs">Stock initial (Web)</Label>
              <Input type="number" value={form.initialStock} onChange={e => setForm(p => ({ ...p, initialStock: Number(e.target.value) }))} min={0} />
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
