import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Product, ColorOption } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ProductFormProps {
  product?: Product;
  onSubmit: (product: Omit<Product, 'id'> | Product) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const CATEGORIES = ['Homme', 'Femme', 'Enfant', 'Accessoires'];
const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export function ProductForm({ product, onSubmit, onCancel, isLoading }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    subtitle: '',
    price: 0,
    salePrice: undefined as number | undefined,
    image: '',
    category: 'Homme',
    stock: 0,
    sku: '',
    description: '',
    material: '',
    careInstructions: '',
    sizes: [] as string[],
    colors: [] as string[],
    colorOptions: [] as ColorOption[],
    attributes: {} as Record<string, string>,
    videoUrl: '',
  });

  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');
  const [newColor, setNewColor] = useState('#000000');
  const [newColorLabel, setNewColorLabel] = useState('');

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        subtitle: product.subtitle || '',
        price: product.price,
        salePrice: product.salePrice,
        image: product.image,
        category: product.category,
        stock: product.stock,
        sku: product.sku,
        description: product.description || '',
        material: product.material || '',
        careInstructions: product.careInstructions || '',
        sizes: product.sizes || [],
        colors: product.colors || [],
        colorOptions: product.colorOptions || [],
        attributes: product.attributes || {},
        videoUrl: product.videoUrl || '',
      });
    }
  }, [product]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      salePrice: formData.salePrice || undefined,
      videoUrl: formData.videoUrl || undefined,
    };
    
    if (product) {
      onSubmit({ ...submitData, id: product.id });
    } else {
      onSubmit(submitData);
    }
  };

  const toggleSize = (size: string) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size],
    }));
  };

  const addColorOption = () => {
    if (newColor && newColorLabel) {
      setFormData(prev => ({
        ...prev,
        colorOptions: [...prev.colorOptions, { color: newColor, label: newColorLabel }],
        colors: [...prev.colors, newColor],
      }));
      setNewColor('#000000');
      setNewColorLabel('');
    }
  };

  const removeColorOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      colorOptions: prev.colorOptions.filter((_, i) => i !== index),
      colors: prev.colors.filter((_, i) => i !== index),
    }));
  };

  const addAttribute = () => {
    if (newAttrKey && newAttrValue) {
      setFormData(prev => ({
        ...prev,
        attributes: { ...prev.attributes, [newAttrKey]: newAttrValue },
      }));
      setNewAttrKey('');
      setNewAttrValue('');
    }
  };

  const removeAttribute = (key: string) => {
    setFormData(prev => {
      const { [key]: _, ...rest } = prev.attributes;
      return { ...prev, attributes: rest };
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
      {/* Basic Info */}
      <div className="space-y-4">
        <h4 className="hud-text text-xs text-primary">// INFORMATIONS DE BASE</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="hud-text text-xs">Nom du produit *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="bg-secondary/50 border-border/30"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label className="hud-text text-xs">SKU *</Label>
            <Input
              value={formData.sku}
              onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
              className="bg-secondary/50 border-border/30"
              placeholder="ABC-001"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="hud-text text-xs">Sous-titre</Label>
          <Input
            value={formData.subtitle}
            onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
            className="bg-secondary/50 border-border/30"
            placeholder="PROTECTION THERMIQUE EXTRÊME"
          />
        </div>

        <div className="space-y-2">
          <Label className="hud-text text-xs">URL de l'image *</Label>
          <Input
            value={formData.image}
            onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
            className="bg-secondary/50 border-border/30"
            placeholder="https://..."
            required
          />
          {formData.image && (
            <img src={formData.image} alt="Preview" className="w-20 h-20 object-cover mt-2 border border-border/30" />
          )}
        </div>

        <div className="space-y-2">
          <Label className="hud-text text-xs">URL de la vidéo</Label>
          <Input
            value={formData.videoUrl}
            onChange={(e) => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
            className="bg-secondary/50 border-border/30"
            placeholder="https://youtube.com/watch?v=... ou lien MP4"
          />
          <p className="text-[10px] text-muted-foreground">YouTube, Vimeo ou lien MP4 direct</p>
        </div>

        <div className="space-y-2">
          <Label className="hud-text text-xs">Catégorie *</Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, category: cat }))}
                className={cn(
                  "px-3 py-1.5 hud-text text-xs border chamfer-hud-sm transition-all",
                  formData.category === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/30 text-muted-foreground border-border/30 hover:border-primary/50"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing & Stock */}
      <div className="space-y-4">
        <h4 className="hud-text text-xs text-primary">// PRIX & STOCK</h4>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="hud-text text-xs">Prix (€) *</Label>
            <Input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
              className="bg-secondary/50 border-border/30"
              min={0}
              step={0.01}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label className="hud-text text-xs">Prix soldé (€)</Label>
            <Input
              type="number"
              value={formData.salePrice || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, salePrice: e.target.value ? Number(e.target.value) : undefined }))}
              className="bg-secondary/50 border-border/30"
              min={0}
              step={0.01}
            />
          </div>
          
          <div className="space-y-2">
            <Label className="hud-text text-xs">Stock *</Label>
            <Input
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData(prev => ({ ...prev, stock: Number(e.target.value) }))}
              className="bg-secondary/50 border-border/30"
              min={0}
              required
            />
          </div>
        </div>
      </div>

      {/* Sizes */}
      <div className="space-y-4">
        <h4 className="hud-text text-xs text-primary">// TAILLES DISPONIBLES</h4>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_SIZES.map(size => (
            <button
              key={size}
              type="button"
              onClick={() => toggleSize(size)}
              className={cn(
                "w-10 h-10 flex items-center justify-center hud-text text-xs border transition-all",
                formData.sizes.includes(size)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/30 text-muted-foreground border-border/30 hover:border-primary/50"
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div className="space-y-4">
        <h4 className="hud-text text-xs text-primary">// OPTIONS COULEURS</h4>
        
        <div className="flex flex-wrap gap-2 mb-3">
          {formData.colorOptions.map((option, index) => (
            <div key={index} className="flex items-center gap-2 px-2 py-1 bg-secondary/30 border border-border/30">
              <div 
                className="w-5 h-5 rounded-sm border border-border/50"
                style={{ backgroundColor: option.color }}
              />
              <span className="hud-text text-xs">{option.label}</span>
              <button type="button" onClick={() => removeColorOption(index)}>
                <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-end gap-2">
          <div className="space-y-2">
            <Label className="hud-text text-xs">Couleur</Label>
            <Input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-12 h-9 p-1 cursor-pointer"
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label className="hud-text text-xs">Nom de la couleur</Label>
            <Input
              value={newColorLabel}
              onChange={(e) => setNewColorLabel(e.target.value)}
              className="bg-secondary/50 border-border/30"
              placeholder="Noir Obsidian"
            />
          </div>
          <Button type="button" variant="outline" size="icon" onClick={addColorOption}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Description & Material */}
      <div className="space-y-4">
        <h4 className="hud-text text-xs text-primary">// DÉTAILS</h4>
        
        <div className="space-y-2">
          <Label className="hud-text text-xs">Description</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="bg-secondary/50 border-border/30 min-h-[80px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="hud-text text-xs">Matériau</Label>
            <Input
              value={formData.material}
              onChange={(e) => setFormData(prev => ({ ...prev, material: e.target.value }))}
              className="bg-secondary/50 border-border/30"
              placeholder="Gore-Tex Pro 3L"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="hud-text text-xs">Entretien</Label>
            <Input
              value={formData.careInstructions}
              onChange={(e) => setFormData(prev => ({ ...prev, careInstructions: e.target.value }))}
              className="bg-secondary/50 border-border/30"
              placeholder="Lavage 30°C"
            />
          </div>
        </div>
      </div>

      {/* Attributes */}
      <div className="space-y-4">
        <h4 className="hud-text text-xs text-primary">// ATTRIBUTS TECHNIQUES</h4>
        
        <div className="space-y-2">
          {Object.entries(formData.attributes).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2 px-3 py-2 bg-secondary/30 border border-border/30">
              <span className="hud-text text-xs text-muted-foreground">{key}:</span>
              <span className="hud-text text-xs">{value}</span>
              <button type="button" onClick={() => removeAttribute(key)} className="ml-auto">
                <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-2">
            <Label className="hud-text text-xs">Attribut</Label>
            <Input
              value={newAttrKey}
              onChange={(e) => setNewAttrKey(e.target.value)}
              className="bg-secondary/50 border-border/30"
              placeholder="Imperméabilité"
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label className="hud-text text-xs">Valeur</Label>
            <Input
              value={newAttrValue}
              onChange={(e) => setNewAttrValue(e.target.value)}
              className="bg-secondary/50 border-border/30"
              placeholder="Niveau 5"
            />
          </div>
          <Button type="button" variant="outline" size="icon" onClick={addAttribute}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border/30">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Annuler
        </Button>
        <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90">
          {isLoading ? 'Enregistrement...' : product ? 'Mettre à jour' : 'Créer le produit'}
        </Button>
      </div>
    </form>
  );
}
