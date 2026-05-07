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
  onSubmit: (product: Omit<Product, 'id'> | Product, variantStock?: VariantStockData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface VariantStockData {
  /** couleur × taille → quantité */
  variantGrid: Record<string, Record<string, number>>;
  /** taille seule → quantité */
  sizeStockMap: Record<string, number>;
  /** couleur seule → quantité */
  colorStockMap: Record<string, number>;
  /** stock global (aucune variante) */
  globalStock: number;
}

const CATEGORIES = ['Homme', 'Femme', 'Enfant', 'Accessoires'];
const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const COLOR_HEX_MAP: Record<string, string> = {
  '#000000': '#000000', '#ffffff': '#ffffff',
};

function colorSwatch(hex: string) {
  return hex && hex.startsWith('#') ? hex : '#888888';
}

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
    modelHeight: '',
    modelSizeWorn: '',
    modelName: '',
  });

  // Variant stock state (local to form — passed up on submit)
  const [variantGrid, setVariantGrid] = useState<Record<string, Record<string, number>>>({});
  const [sizeStockMap, setSizeStockMap] = useState<Record<string, number>>({});
  const [colorStockMap, setColorStockMap] = useState<Record<string, number>>({});

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
        modelHeight: product.modelHeight || '',
        modelSizeWorn: product.modelSizeWorn || '',
        modelName: product.modelName || '',
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

    const variantStockData: VariantStockData = {
      variantGrid,
      sizeStockMap,
      colorStockMap,
      globalStock: formData.stock,
    };

    if (product) {
      onSubmit({ ...submitData, id: product.id }, variantStockData);
    } else {
      onSubmit(submitData, variantStockData);
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

  // Derived helpers for the stock grid
  const hasSizes = formData.sizes.length > 0;
  const hasColors = formData.colors.length > 0;

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

      {/* Pricing */}
      <div className="space-y-4">
        <h4 className="hud-text text-xs text-primary">// PRIX</h4>
        
        <div className="grid grid-cols-2 gap-4">
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

      {/* ── STOCK PAR VARIANTE ── */}
      <div className="space-y-4">
        <h4 className="hud-text text-xs text-primary">// STOCK</h4>

        {/* Tailles × Couleurs → grille */}
        {hasSizes && hasColors ? (
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Stock par taille &amp; couleur
            </p>
            <div className="border border-border/30 rounded overflow-auto max-h-56">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/40">
                    <th className="text-left py-2 px-3 font-medium hud-text">Couleur</th>
                    {formData.sizes.map(s => (
                      <th key={s} className="text-center py-2 px-2 font-medium hud-text">{s}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {formData.colorOptions.map((opt) => (
                    <tr key={opt.color} className="border-t border-border/20">
                      <td className="py-1.5 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 border border-border/50"
                            style={{ backgroundColor: colorSwatch(opt.color) }}
                          />
                          <span className="truncate max-w-[80px]">{opt.label}</span>
                        </div>
                      </td>
                      {formData.sizes.map(size => (
                        <td key={size} className="text-center py-1 px-1">
                          <Input
                            type="number"
                            min={0}
                            value={variantGrid[opt.color]?.[size] ?? 0}
                            onChange={e => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setVariantGrid(prev => ({
                                ...prev,
                                [opt.color]: { ...prev[opt.color], [size]: val },
                              }));
                            }}
                            className="w-14 h-6 text-center text-xs p-0 mx-auto bg-secondary/50 border-border/30"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                  {/* Fallback rows for colors without colorOptions label */}
                  {formData.colors
                    .filter(c => !formData.colorOptions.find(o => o.color === c))
                    .map(color => (
                      <tr key={color} className="border-t border-border/20">
                        <td className="py-1.5 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0 border border-border/50"
                              style={{ backgroundColor: colorSwatch(color) }}
                            />
                            <span className="truncate max-w-[80px]">{color}</span>
                          </div>
                        </td>
                        {formData.sizes.map(size => (
                          <td key={size} className="text-center py-1 px-1">
                            <Input
                              type="number"
                              min={0}
                              value={variantGrid[color]?.[size] ?? 0}
                              onChange={e => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                setVariantGrid(prev => ({
                                  ...prev,
                                  [color]: { ...prev[color], [size]: val },
                                }));
                              }}
                              className="w-14 h-6 text-center text-xs p-0 mx-auto bg-secondary/50 border-border/30"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : hasSizes && !hasColors ? (
          /* Tailles seules */
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Stock par taille</p>
            <div className="grid grid-cols-3 gap-2">
              {formData.sizes.map(size => (
                <div key={size} className="flex items-center gap-2 bg-secondary/20 border border-border/30 px-3 py-2">
                  <span className="text-xs font-bold hud-text w-8 shrink-0">{size}</span>
                  <Input
                    type="number"
                    min={0}
                    value={sizeStockMap[size] ?? 0}
                    onChange={e => setSizeStockMap(prev => ({
                      ...prev,
                      [size]: Math.max(0, parseInt(e.target.value) || 0),
                    }))}
                    className="h-7 text-xs bg-secondary/50 border-border/30"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : !hasSizes && hasColors ? (
          /* Couleurs seules */
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Stock par couleur</p>
            <div className="space-y-1.5">
              {formData.colorOptions.map(opt => (
                <div key={opt.color} className="flex items-center gap-3 bg-secondary/20 border border-border/30 px-3 py-2">
                  <span
                    className="w-4 h-4 rounded-sm shrink-0 border border-border/50"
                    style={{ backgroundColor: colorSwatch(opt.color) }}
                  />
                  <span className="text-xs flex-1 truncate">{opt.label}</span>
                  <Input
                    type="number"
                    min={0}
                    value={colorStockMap[opt.color] ?? 0}
                    onChange={e => setColorStockMap(prev => ({
                      ...prev,
                      [opt.color]: Math.max(0, parseInt(e.target.value) || 0),
                    }))}
                    className="w-20 h-7 text-xs bg-secondary/50 border-border/30"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Stock global */
          <div className="space-y-2">
            <Label className="hud-text text-xs">Stock global *</Label>
            <Input
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData(prev => ({ ...prev, stock: Number(e.target.value) }))}
              className="bg-secondary/50 border-border/30"
              min={0}
              required
            />
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

      {/* Mannequin */}
      <div className="space-y-4">
        <h4 className="hud-text text-xs text-primary">// MANNEQUIN (optionnel)</h4>
        <p className="text-[11px] text-muted-foreground">Affiché sur la fiche produit pour aider au choix de la taille.</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label className="hud-text text-xs">Taille (ex: 1m80)</Label>
            <Input
              value={formData.modelHeight}
              onChange={(e) => setFormData(prev => ({ ...prev, modelHeight: e.target.value }))}
              className="bg-secondary/50 border-border/30"
              placeholder="1m80"
            />
          </div>
          <div className="space-y-2">
            <Label className="hud-text text-xs">Taille portée</Label>
            <Input
              value={formData.modelSizeWorn}
              onChange={(e) => setFormData(prev => ({ ...prev, modelSizeWorn: e.target.value }))}
              className="bg-secondary/50 border-border/30"
              placeholder="M"
            />
          </div>
          <div className="space-y-2">
            <Label className="hud-text text-xs">Nom (optionnel)</Label>
            <Input
              value={formData.modelName}
              onChange={(e) => setFormData(prev => ({ ...prev, modelName: e.target.value }))}
              className="bg-secondary/50 border-border/30"
              placeholder="Lucas"
            />
          </div>
        </div>
      </div>
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
