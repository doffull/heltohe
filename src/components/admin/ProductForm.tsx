import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Product, ColorOption } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { FileDropZone } from '@/components/admin/FileDropZone';

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
    tags: [] as string[],
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
        tags: product.tags || [],
      });
    }
  }, [product]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      salePrice: formData.salePrice || undefined,
      videoUrl: formData.videoUrl || undefined,
      tags: formData.tags,
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
          <Label className="hud-text text-xs">Image du produit *</Label>
          <FileDropZone
            accept={['image']}
            folder="products"
            currentFile={formData.image}
            onUpload={(url) => setFormData(prev => ({ ...prev, image: url }))}
            label="Glissez une image ou cliquez"
          />
          <Input
            value={formData.image}
            onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
            className="bg-secondary/50 border-border/30"
            placeholder="Ou collez une URL..."
          />
        </div>

        <div className="space-y-2">
          <Label className="hud-text text-xs">Vidéo du produit</Label>
          <FileDropZone
            accept={['video']}
            folder="products/videos"
            currentFile={formData.videoUrl}
            onUpload={(url) => setFormData(prev => ({ ...prev, videoUrl: url }))}
            label="Glissez une vidéo ou cliquez"
          />
          <Input
            value={formData.videoUrl}
            onChange={(e) => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
            className="bg-secondary/50 border-border/30"
            placeholder="Ou collez une URL..."
          />
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

      {/* Homepage Sections Tags */}
      <div className="space-y-4">
        <h4 className="hud-text text-xs text-primary">// SECTIONS PAGE D'ACCUEIL</h4>
        <p className="text-xs text-muted-foreground">Sélectionnez dans quelles sections ce produit apparaîtra sur la page d'accueil</p>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'top', label: 'Meilleures Ventes' },
            { id: 'trending', label: 'Tendances' },
            { id: 'featured', label: 'À la Une' },
            { id: 'new_arrival', label: 'Dernières Arrivées' },
            { id: 'style', label: 'Focus Style' },
            { id: 'promo', label: 'Promo' },
          ].map(tag => (
            <button
              key={tag.id}
              type="button"
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  tags: prev.tags.includes(tag.id)
                    ? prev.tags.filter(t => t !== tag.id)
                    : [...prev.tags, tag.id],
                }));
              }}
              className={cn(
                "px-3 py-1.5 hud-text text-xs border chamfer-hud-sm transition-all",
                formData.tags.includes(tag.id)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/30 text-muted-foreground border-border/30 hover:border-primary/50"
              )}
            >
              {tag.label}
            </button>
          ))}
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

        {/* Add new color */}
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
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addColorOption())}
            />
          </div>
          <Button type="button" variant="outline" size="icon" onClick={addColorOption}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Color options with inline image upload */}
        {formData.colorOptions.length > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Cliquez sur une variante pour assigner son image produit
            </p>
            {formData.colorOptions.map((option, index) => (
              <div key={index} className="border border-border/30 bg-secondary/20 p-3 space-y-3">
                {/* Header row */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-sm border border-border/50 flex-shrink-0"
                    style={{ backgroundColor: option.color }}
                  />
                  <span className="hud-text text-xs font-medium flex-1">{option.label}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{option.color}</span>
                  <button type="button" onClick={() => removeColorOption(index)} className="ml-1">
                    <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>

                {/* Image upload for this color */}
                <div className="flex items-start gap-3">
                  {/* Thumbnail preview */}
                  <div className="flex-shrink-0 w-16 h-16 border border-border/30 bg-secondary/40 overflow-hidden relative">
                    {option.image ? (
                      <>
                        <img
                          src={option.image}
                          alt={option.label}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newOptions = [...formData.colorOptions];
                            newOptions[index] = { ...newOptions[index], image: undefined };
                            setFormData(prev => ({ ...prev, colorOptions: newOptions }));
                          }}
                          className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </>
                    ) : (
                      <div
                        className="w-full h-full opacity-20"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                  </div>

                  {/* Drop zone */}
                  <div className="flex-1 min-w-0">
                    <FileDropZone
                      accept={['image']}
                      folder="products/colors"
                      currentFile={option.image}
                      onUpload={(url) => {
                        const newOptions = [...formData.colorOptions];
                        newOptions[index] = { ...newOptions[index], image: url };
                        setFormData(prev => ({ ...prev, colorOptions: newOptions }));
                      }}
                      label={option.image ? `Remplacer l'image` : `Image pour "${option.label}"`}
                    />
                    <Input
                      value={option.image || ''}
                      onChange={(e) => {
                        const newOptions = [...formData.colorOptions];
                        newOptions[index] = { ...newOptions[index], image: e.target.value || undefined };
                        setFormData(prev => ({ ...prev, colorOptions: newOptions }));
                      }}
                      className="mt-1 bg-secondary/50 border-border/30 text-xs h-7"
                      placeholder="Ou collez une URL d'image..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
