import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Sparkles, Loader2, Images, GripVertical } from 'lucide-react';
import { MediaLibraryDialog } from '@/components/visual-editor/MediaLibraryDialog';
import { Product, ColorOption } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { FileDropZone } from '@/components/admin/FileDropZone';
import { useApp } from '@/context/AppContext';
import { AiTextButton } from '@/components/admin/AiTextButton';
import { LimitedEditionBadge, BADGE_POSITIONS } from '@/components/product/LimitedEditionBadge';
import { GifBuilderDialog } from '@/components/admin/GifBuilderDialog';


import { AiColorNameButton } from '@/components/admin/AiColorNameButton';
import { AiAttributesButton } from '@/components/admin/AiAttributesButton';
import { AiProductVideoButton } from '@/components/admin/AiProductVideoButton';
import { AiPoseButton } from '@/components/admin/AiPoseEditorDialog';

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePageTemplates } from '@/hooks/usePageTemplates';
import { useCategories, useCreateCategory } from '@/hooks/useCategories';
import { getSwatchStyle } from '@/lib/swatch';
import { generateSwatchFromImages, swatchToColorOption } from '@/lib/generateSwatch';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ProductFormProps {
  product?: Product;
  onSubmit: (
    product: Omit<Product, 'id'> | Product,
    variantStock?: VariantStockData,
    opts?: { silent?: boolean },
  ) => void | Promise<void>;
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

const DEFAULT_SIZES_FALLBACK = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

const COLOR_HEX_MAP: Record<string, string> = {
  '#000000': '#000000', '#ffffff': '#ffffff',
};

function colorSwatch(hex: string) {
  return hex && hex.startsWith('#') ? hex : '#888888';
}

export function ProductForm({ product, onSubmit, onCancel, isLoading }: ProductFormProps) {
  const { designSettings } = useApp();
  const { data: dbCategories = [] } = useCategories();
  const createCategory = useCreateCategory();
  const [newCategoryDraft, setNewCategoryDraft] = useState('');
  const DEFAULT_SIZES = designSettings.globalProductSizes?.length ? designSettings.globalProductSizes : DEFAULT_SIZES_FALLBACK;
  const productDefaults = designSettings.productDefaults;
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
    material: productDefaults?.material || '100% polyester, rembourrage synthétique, doublure polyester.',
    careInstructions: productDefaults?.careInstructions || 'Lavage 30°C, séchage à plat, ne pas repasser.',
    sizes: [] as string[],
    colors: [] as string[],
    colorOptions: [] as ColorOption[],
    attributes: { Isolation: 'Duvet synthétique' } as Record<string, string>,
    videoUrl: '',
    tags: [] as string[],
    modelHeight: '',
    modelSizeWorn: '',
    modelName: '',
    galleryImages: [] as string[],
    hoverImage: '',
    titleLogo: '',

    templateId: null as string | null,
    limitedEdition: false,
    limitedEditionLabel: '',
    limitedEditionColor: '',
    limitedEditionTextColor: '',
    limitedEditionPosition: 'bottom-right' as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',

  });

  // Variant stock state (local to form — passed up on submit)
  const [variantGrid, setVariantGrid] = useState<Record<string, Record<string, number>>>({});
  const [sizeStockMap, setSizeStockMap] = useState<Record<string, number>>({});
  const [colorStockMap, setColorStockMap] = useState<Record<string, number>>({});

  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');
  const [newColor, setNewColor] = useState('#000000');
  const [newColor2, setNewColor2] = useState<string>('');
  const [newColorLabel, setNewColorLabel] = useState('');
  const [newSwatchImage, setNewSwatchImage] = useState<string>('');
  const [customSizeDraft, setCustomSizeDraft] = useState('');
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [aiObservations, setAiObservations] = useState<string[]>([]);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [showMainPicker, setShowMainPicker] = useState(false);
  const [showHoverPicker, setShowHoverPicker] = useState(false);
  const [showGifBuilder, setShowGifBuilder] = useState(false);

  const [showLogoPicker, setShowLogoPicker] = useState(false);

  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [autoSaveState, setAutoSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [swatchBusy, setSwatchBusy] = useState(false);
  const [swatchDraft, setSwatchDraft] = useState<ColorOption | null>(null);
  const skipAutoSaveRef = useRef(true);

  const categoryNames = Array.from(
    new Set([
      ...dbCategories.filter((c) => !c.parentId).map((c) => c.title),
      ...dbCategories.filter((c) => c.parentId).map((c) => c.title),
      ...(formData.category ? [formData.category] : []),
    ].filter(Boolean))
  );

  const addCategory = async () => {
    const title = newCategoryDraft.trim();
    if (!title) return;
    if (!categoryNames.some((c) => c.toLowerCase() === title.toLowerCase())) {
      try {
        await createCategory.mutateAsync({
          title,
          sortOrder: dbCategories.length,
          displaySize: 'medium',
          coverMode: 'cover',
        });
        toast.success(`Catégorie « ${title} » créée`);
      } catch (e) {
        toast.error("Impossible de créer la catégorie");
        return;
      }
    }
    setFormData((prev) => ({ ...prev, category: title }));
    setNewCategoryDraft('');
  };

  const generateSwatch = async () => {
    setSwatchBusy(true);
    try {
      const res = await generateSwatchFromImages({
        image: formData.image,
        galleryImages: formData.galleryImages,
        
        name: formData.name,
        category: formData.category,
      });
      if (res.observations?.length) setAiObservations(res.observations);
      setSwatchDraft(swatchToColorOption(res, { filterOnly: formData.colorOptions.length === 0 }));
      toast.success('Pastille générée — vérifiez puis ajoutez');
    } catch (e: any) {
      toast.error(e?.message || 'Erreur lors de la génération de la pastille');
    } finally {
      setSwatchBusy(false);
    }
  };

  const confirmSwatch = () => {
    if (!swatchDraft) return;
    const opt = { ...swatchDraft, label: (swatchDraft.label || '').trim() || 'Couleur produit' };
    if (formData.colorOptions.some(o => (o.label || '').toLowerCase() === opt.label.toLowerCase())) {
      toast.error('Cette pastille existe déjà');
      return;
    }
    setFormData(prev => ({
      ...prev,
      colorOptions: [...prev.colorOptions, opt],
      colors: [...prev.colors, opt.color],
    }));
    setSwatchDraft(null);
    toast.success('Pastille ajoutée');
  };

  const setAsMainImage = (url: string, index: number) => {
    setFormData(prev => {
      const previousMain = prev.image;
      const newGallery = prev.galleryImages.filter((_, i) => i !== index);
      if (previousMain && !newGallery.includes(previousMain)) {
        newGallery.unshift(previousMain);
      }
      return { ...prev, image: url, galleryImages: newGallery.slice(0, 10) };
    });
    toast.success('Image principale mise à jour');
  };

  // Generic helper for product-ai-helpers edge function
  const runProductAi = async (action: string, extra: Record<string, any> = {}) => {
    setAiBusy(action);
    try {
      const imageUrls = [formData.image, ...(formData.galleryImages || [])]
        .filter((u): u is string => typeof u === 'string' && /^https?:\/\//i.test(u))
        .slice(0, 4);
      const { data, error } = await supabase.functions.invoke('product-ai-helpers', {
        body: {
          action,
          name: formData.name,
          category: formData.category,
          imageUrl: formData.image,
          imageUrls,
          colors: (formData.colorOptions || []).map((c: any) => c?.label).filter(Boolean),
          sizes: formData.sizes,
          ...extra,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      if (Array.isArray((data as any)?.observations) && (data as any).observations.length) {
        setAiObservations((data as any).observations);
      }
      return data as any;
    } catch (e: any) {
      toast.error(e.message || 'Erreur IA');
      return null;
    } finally {
      setAiBusy(null);
    }
  };

  // Auto-name new color when hex changes and label is empty
  useEffect(() => {
    if (!newColor || newColorLabel) return;
    const t = setTimeout(async () => {
      if (newColorLabel) return; // user typed in the meantime
      const res = await runProductAi('color-name', { hex: newColor });
      if (res?.value && !newColorLabel) setNewColorLabel(res.value);
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newColor]);

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
        galleryImages: product.galleryImages || [],
        hoverImage: product.hoverImage || '',
        titleLogo: product.titleLogo || '',

        templateId: product.templateId ?? null,
        limitedEdition: product.limitedEdition ?? false,
        limitedEditionLabel: product.limitedEditionLabel || '',
        limitedEditionColor: product.limitedEditionColor || '',
        limitedEditionTextColor: product.limitedEditionTextColor || '',
        limitedEditionPosition: product.limitedEditionPosition || 'bottom-right',

      });
    }
  }, [product]);

  // Nouveau produit dans la catégorie Collab → badge « LIMITED EDITION » pré-coché
  useEffect(() => {
    if (product) return;
    if ((formData.category || '').trim().toLowerCase() !== 'collab') return;
    setFormData(prev => (prev.limitedEdition ? prev : { ...prev, limitedEdition: true }));
  }, [formData.category, product]);



  const buildPayload = () => {
    const submitData = {
      ...formData,
      salePrice: formData.salePrice || undefined,
      videoUrl: formData.videoUrl || undefined,
      hoverImage: formData.hoverImage || undefined,
      titleLogo: formData.titleLogo || undefined,

      tags: formData.tags,
    };
    const variantStockData: VariantStockData = {
      variantGrid,
      sizeStockMap,
      colorStockMap,
      globalStock: formData.stock,
    };
    return { submitData, variantStockData };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { submitData, variantStockData } = buildPayload();
    setAutoSaveState('saving');
    try {
      if (product) {
        await onSubmit({ ...submitData, id: product.id }, variantStockData);
      } else {
        await onSubmit(submitData, variantStockData);
      }
      skipAutoSaveRef.current = true;
      setAutoSaveState('saved');
      setLastSavedAt(Date.now());
    } catch {
      setAutoSaveState('error');
    }
  };

  // ---- Autosave (édition uniquement) : la fiche reste ouverte ----
  useEffect(() => {
    if (!product || !autoSaveEnabled) return;
    if (skipAutoSaveRef.current) { skipAutoSaveRef.current = false; return; }
    const t = setTimeout(async () => {
      const { submitData, variantStockData } = buildPayload();
      setAutoSaveState('saving');
      try {
        await onSubmit({ ...submitData, id: product.id }, variantStockData, { silent: true });
        setAutoSaveState('saved');
        setLastSavedAt(Date.now());
      } catch {
        setAutoSaveState('error');
      }
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, variantGrid, sizeStockMap, colorStockMap, autoSaveEnabled, product?.id]);


  const toggleSize = (size: string) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size],
    }));
  };

  const addCustomSize = () => {
    const v = customSizeDraft.trim().toUpperCase();
    if (!v) return;
    if (formData.sizes.includes(v)) { toast.error('Taille déjà ajoutée'); return; }
    setFormData(prev => ({ ...prev, sizes: [...prev.sizes, v] }));
    setCustomSizeDraft('');
  };

  const removeSize = (size: string) => {
    setFormData(prev => ({ ...prev, sizes: prev.sizes.filter(s => s !== size) }));
  };

  const sizeSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onSizeDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = formData.sizes.indexOf(String(active.id));
    const to = formData.sizes.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    setFormData(prev => ({ ...prev, sizes: arrayMove(prev.sizes, from, to) }));
  };

  const addColorOption = () => {
    if (!newColorLabel) return;
    if (!newColor && !newSwatchImage) return;
    const opt: ColorOption = {
      color: newColor,
      label: newColorLabel,
      color2: newColor2 || null,
      swatchImage: newSwatchImage || null,
    };
    setFormData(prev => ({
      ...prev,
      colorOptions: [...prev.colorOptions, opt],
      colors: [...prev.colors, newColor],
    }));
    setNewColor('#000000');
    setNewColor2('');
    setNewColorLabel('');
    setNewSwatchImage('');
  };

  const removeColorOption = (index: number) => {
    const removed = formData.colorOptions[index];
    setFormData(prev => ({
      ...prev,
      colorOptions: prev.colorOptions.filter((_, i) => i !== index),
      colors: prev.colors.filter((_, i) => i !== index),
    }));
    if (removed) {
      setVariantGrid(prev => { const n = { ...prev }; delete n[removed.color]; return n; });
      setColorStockMap(prev => { const n = { ...prev }; delete n[removed.color]; return n; });
    }
  };

  const removeColorByValue = (color: string) => {
    setFormData(prev => ({
      ...prev,
      colorOptions: prev.colorOptions.filter(o => o.color !== color),
      colors: prev.colors.filter(c => c !== color),
    }));
    setVariantGrid(prev => { const n = { ...prev }; delete n[color]; return n; });
    setColorStockMap(prev => { const n = { ...prev }; delete n[color]; return n; });
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
            <div className="flex items-center justify-between">
              <Label className="hud-text text-xs">Nom du produit *</Label>
              <Button
                type="button" size="sm" variant="ghost"
                className="h-6 px-2 gap-1 text-primary hover:bg-primary/10"
                disabled={aiBusy === 'name'}
                onClick={async () => {
                  const r = await runProductAi('name');
                  if (r?.value) setFormData(prev => ({ ...prev, name: r.value }));
                }}
              >
                {aiBusy === 'name' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                <span className="text-[10px]">IA</span>
              </Button>
            </div>
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
          <div className="flex items-center justify-between">
            <Label className="hud-text text-xs">Sous-titre</Label>
            <Button
              type="button" size="sm" variant="ghost"
              className="h-6 px-2 gap-1 text-primary hover:bg-primary/10"
              disabled={aiBusy === 'subtitle'}
              onClick={async () => {
                const r = await runProductAi('subtitle');
                if (r?.value) setFormData(prev => ({ ...prev, subtitle: r.value }));
              }}
            >
              {aiBusy === 'subtitle' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              <span className="text-[10px]">IA</span>
            </Button>
          </div>
          <Input
            value={formData.subtitle}
            onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value.toUpperCase() }))}
            className="bg-secondary/50 border-border/30 uppercase"
            placeholder="PROTECTION THERMIQUE EXTRÊME"
          />
        </div>

        {/* Édition limitée */}
        <div className="space-y-3 border border-border/40 bg-secondary/30 px-3 py-2.5">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={formData.limitedEdition}
              onChange={(e) => setFormData(prev => ({ ...prev, limitedEdition: e.target.checked }))}
              className="h-4 w-4 accent-primary"
            />
            <span className="flex flex-col">
              <span className="hud-text text-xs">Édition limitée</span>
              <span className="text-[10px] text-muted-foreground">
                Affiche le badge « LIMITED EDITION » sur la vignette et la fiche produit.
              </span>
            </span>
          </label>

          {formData.limitedEdition && (
            <div className="space-y-3 border-t border-border/40 pt-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="hud-text text-[10px]">Texte du badge</Label>
                  <Input
                    value={formData.limitedEditionLabel}
                    onChange={(e) => setFormData(prev => ({ ...prev, limitedEditionLabel: e.target.value }))}
                    className="bg-secondary/50 border-border/30"
                    placeholder="Limited Edition"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="hud-text text-[10px]">Position sur l'image</Label>
                  <select
                    value={formData.limitedEditionPosition}
                    onChange={(e) => setFormData(prev => ({ ...prev, limitedEditionPosition: e.target.value as typeof prev.limitedEditionPosition }))}
                    className="h-10 w-full border border-border/30 bg-secondary/50 px-2 text-xs"
                  >
                    {BADGE_POSITIONS.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="hud-text text-[10px]">Couleur de fond</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.limitedEditionColor || '#ffffff'}
                      onChange={(e) => setFormData(prev => ({ ...prev, limitedEditionColor: e.target.value }))}
                      className="h-10 w-12 border border-border/30 bg-transparent p-0.5"
                    />
                    <Input
                      value={formData.limitedEditionColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, limitedEditionColor: e.target.value }))}
                      className="bg-secondary/50 border-border/30 text-xs"
                      placeholder="Défaut"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="hud-text text-[10px]">Couleur du texte</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.limitedEditionTextColor || '#000000'}
                      onChange={(e) => setFormData(prev => ({ ...prev, limitedEditionTextColor: e.target.value }))}
                      className="h-10 w-12 border border-border/30 bg-transparent p-0.5"
                    />
                    <Input
                      value={formData.limitedEditionTextColor}
                      onChange={(e) => setFormData(prev => ({ ...prev, limitedEditionTextColor: e.target.value }))}
                      className="bg-secondary/50 border-border/30 text-xs"
                      placeholder="Défaut"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Aperçu :</span>
                  <LimitedEditionBadge
                    animate={false}
                    product={{
                      limitedEdition: true,
                      limitedEditionLabel: formData.limitedEditionLabel,
                      limitedEditionColor: formData.limitedEditionColor,
                      limitedEditionTextColor: formData.limitedEditionTextColor,
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-[10px]"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    limitedEditionLabel: '',
                    limitedEditionColor: '',
                    limitedEditionTextColor: '',
                    limitedEditionPosition: 'bottom-right',
                  }))}
                >
                  Réinitialiser
                </Button>
              </div>
            </div>
          )}
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowMainPicker(true)}
            className="w-full h-8 text-xs"
          >
            <Images className="h-3.5 w-3.5 mr-1.5" />
            Choisir depuis la médiathèque
          </Button>
          <MediaLibraryDialog
            open={showMainPicker}
            onOpenChange={setShowMainPicker}
            title="Sélectionner l'image principale"
            onSelect={(url) => setFormData(prev => ({ ...prev, image: url }))}
          />

          {/* Image de survol (effet swap sur la vignette) */}
          <div className="space-y-2 border border-border/40 bg-secondary/20 p-3">
            <Label className="hud-text text-[11px]">// IMAGE AU SURVOL (SWAP)</Label>
            <p className="text-[10px] text-muted-foreground">
              Si vide, la 2e image de la galerie est utilisée automatiquement.
            </p>
            {formData.hoverImage && (
              <img src={formData.hoverImage} alt="Aperçu survol" className="h-24 w-auto object-cover border border-border/40" />
            )}
            <Input
              value={formData.hoverImage || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, hoverImage: e.target.value }))}
              className="bg-secondary/50 border-border/30"
              placeholder="URL de l'image affichée au survol..."
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => setShowHoverPicker(true)}>
                <Images className="h-3.5 w-3.5 mr-1.5" />
                Médiathèque
              </Button>
              {formData.hoverImage && (
                <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setFormData(prev => ({ ...prev, hoverImage: '' }))}>
                  Retirer
                </Button>
              )}
            </div>
            <MediaLibraryDialog
              open={showHoverPicker}
              onOpenChange={setShowHoverPicker}
              title="Sélectionner l'image de survol"
              onSelect={(url) => setFormData(prev => ({ ...prev, hoverImage: url }))}
            />
          </div>

          {/* Logo affiché à côté du titre du produit */}
          <div className="space-y-2 border border-border/40 bg-secondary/20 p-3">
            <Label className="hud-text text-[11px]">// LOGO À CÔTÉ DU TITRE</Label>
            <p className="text-[10px] text-muted-foreground">
              Affiché à gauche du nom du produit (fiche produit + vignette). PNG transparent recommandé.
            </p>
            {formData.titleLogo && (
              <div className="flex items-center gap-3 bg-background/60 p-2 border border-border/30">
                <img src={formData.titleLogo} alt="Aperçu logo" className="h-8 w-auto max-w-[110px] object-contain" />
                <span className="text-[10px] text-muted-foreground">Aperçu</span>
              </div>
            )}
            <FileDropZone
              accept={['image']}
              folder="products"
              currentFile={formData.titleLogo}
              onUpload={(url) => setFormData(prev => ({ ...prev, titleLogo: url }))}
              label="Glissez le logo ou cliquez"
            />
            <Input
              value={formData.titleLogo || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, titleLogo: e.target.value }))}
              className="bg-secondary/50 border-border/30"
              placeholder="Ou collez une URL de logo..."
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => setShowLogoPicker(true)}>
                <Images className="h-3.5 w-3.5 mr-1.5" />
                Médiathèque
              </Button>
              {formData.titleLogo && (
                <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setFormData(prev => ({ ...prev, titleLogo: '' }))}>
                  Retirer
                </Button>
              )}
            </div>
            <MediaLibraryDialog
              open={showLogoPicker}
              onOpenChange={setShowLogoPicker}
              title="Sélectionner le logo du titre"
              onSelect={(url) => setFormData(prev => ({ ...prev, titleLogo: url }))}
            />
          </div>


          {/* IA : nouvelle pose / expression (super admin) */}
          <AiPoseButton
            className="w-full"
            imageUrl={formData.image}
            onReplace={(url) => setFormData(prev => ({ ...prev, image: url }))}
            onAddToGallery={(url) =>
              setFormData(prev => ({
                ...prev,
                galleryImages: Array.from(new Set([...(prev.galleryImages || []), url])).slice(0, 10),
              }))
            }
          />


          {/* Pastille de couleur automatique (depuis les images) */}
          <div className="space-y-2 border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="hud-text text-[11px] text-primary">// PASTILLE COULEUR AUTO</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateSwatch}
                disabled={swatchBusy}
                className="h-7 text-[11px] gap-1"
              >
                {swatchBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Générer la pastille
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Analyse les photos et crée la pastille utilisée par les filtres Couleurs de la boutique.
            </p>
            {swatchDraft && (
              <div className="space-y-2 pt-2 border-t border-border/30">
                <div className="flex items-center gap-2">
                  <div
                    className="w-9 h-9 rounded-sm border border-border/60 shrink-0"
                    style={getSwatchStyle({ color: swatchDraft.color, color2: swatchDraft.color2 || null })}
                  />
                  <Input
                    type="color"
                    value={swatchDraft.color}
                    onChange={(e) => setSwatchDraft(d => (d ? { ...d, color: e.target.value } : d))}
                    className="w-12 h-9 p-1 cursor-pointer"
                  />
                  <Input
                    value={swatchDraft.label}
                    onChange={(e) => setSwatchDraft(d => (d ? { ...d, label: e.target.value } : d))}
                    className="h-9 flex-1 bg-secondary/50 border-border/30 text-xs"
                    placeholder="Nom de la couleur"
                  />
                </div>
                <label className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={swatchDraft.filterOnly !== false}
                    onChange={(e) => setSwatchDraft(d => (d ? { ...d, filterOnly: e.target.checked } : d))}
                  />
                  Utiliser uniquement dans les filtres boutique (masquée sur la page produit)
                </label>
                <div className="flex gap-2">
                  <Button type="button" size="sm" className="h-7 text-[11px]" onClick={confirmSwatch}>
                    <Plus className="h-3 w-3 mr-1" />Ajouter la pastille
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setSwatchDraft(null)}>
                    Annuler
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>


        {/* Gallery (additional images) */}
        <div className="space-y-2">
          <Label className="hud-text text-xs">Galerie d'images supplémentaires</Label>
          <p className="text-[10px] text-muted-foreground">
            L'image principale ci-dessus reste la cover. Ajoutez jusqu'à 10 images supplémentaires affichées dans la fiche produit.
          </p>

          {formData.galleryImages.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {formData.galleryImages.map((img, i) => (
                <div key={`${img}-${i}`} className="relative group border border-border/30 bg-secondary/40 aspect-square overflow-hidden">
                  <img src={img} alt={`Galerie ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setAsMainImage(img, i)}
                    className="absolute top-1 left-1 right-1 text-[9px] px-1 py-0.5 bg-primary/90 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary"
                    title="Définir comme image principale"
                  >
                    ★ Image principale
                  </button>
                  <div className="absolute inset-x-0 bottom-0 flex justify-between items-center px-1 py-0.5 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-0.5">
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => {
                          const arr = [...formData.galleryImages];
                          [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
                          setFormData(prev => ({ ...prev, galleryImages: arr }));
                        }}
                        className="text-[10px] px-1 disabled:opacity-30"
                      >←</button>
                      <button
                        type="button"
                        disabled={i === formData.galleryImages.length - 1}
                        onClick={() => {
                          const arr = [...formData.galleryImages];
                          [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
                          setFormData(prev => ({ ...prev, galleryImages: arr }));
                        }}
                        className="text-[10px] px-1 disabled:opacity-30"
                      >→</button>
                      <AiPoseButton
                        compact
                        imageUrl={img}
                        onReplace={(url) => {
                          const arr = [...formData.galleryImages];
                          arr[i] = url;
                          setFormData(prev => ({ ...prev, galleryImages: arr }));
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, galleryImages: prev.galleryImages.filter((_, idx) => idx !== i) }))}
                      className="text-[10px] text-destructive px-1"
                      aria-label="Supprimer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {formData.galleryImages.length < 10 && (
            <div className="space-y-2">
              <FileDropZone
                accept={['image']}
                folder="products/gallery"
                onUpload={(url) => {
                  if (!url) return;
                  setFormData(prev => ({ ...prev, galleryImages: [...prev.galleryImages, url] }));
                }}
                label={`+ Ajouter une image (${formData.galleryImages.length}/10)`}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowGalleryPicker(true)}
                className="w-full h-8 text-xs"
              >
                <Images className="h-3.5 w-3.5 mr-1.5" />
                Choisir plusieurs depuis la médiathèque
              </Button>
            </div>
          )}
          <MediaLibraryDialog
            open={showGalleryPicker}
            onOpenChange={setShowGalleryPicker}
            multi
            title="Sélectionner plusieurs images pour la galerie"
            onSelectMulti={(urls) => {
              setFormData(prev => ({
                ...prev,
                galleryImages: Array.from(new Set([...prev.galleryImages, ...urls])).slice(0, 10),
              }));
            }}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="hud-text text-xs">Vidéo du produit</Label>
            <AiProductVideoButton
              imageUrl={formData.image}
              productName={formData.name}
              durationSec={6}
              onGenerated={(url) => setFormData(prev => ({ ...prev, videoUrl: url }))}
            />

          </div>
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
            {categoryNames.map(cat => (
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
          <div className="flex gap-2 items-center">
            <Input
              value={newCategoryDraft}
              onChange={(e) => setNewCategoryDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } }}
              placeholder="Nouvelle catégorie..."
              className="bg-secondary/50 border-border/30 h-8 text-xs max-w-[220px]"
            />
            <Button type="button" size="sm" variant="outline" className="h-8 chamfer-hud-sm" onClick={addCategory} disabled={createCategory.isPending || !newCategoryDraft.trim()}>
              <Plus className="h-3.5 w-3.5" /> Ajouter
            </Button>
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
        <div className="flex items-center justify-between">
          <h4 className="hud-text text-xs text-primary">// TAILLES DISPONIBLES</h4>
          <span className="text-[10px] text-muted-foreground">Glissez pour réordonner · cliquez pour retirer</span>
        </div>

        {/* Selected sizes — sortable */}
        {formData.sizes.length > 0 && (
          <DndContext sensors={sizeSensors} collisionDetection={closestCenter} onDragEnd={onSizeDragEnd}>
            <SortableContext items={formData.sizes} strategy={horizontalListSortingStrategy}>
              <div className="flex flex-wrap gap-2 p-2 border border-border/30 bg-secondary/20 rounded">
                {formData.sizes.map((size) => (
                  <SortableSizeChip key={size} size={size} onRemove={() => removeSize(size)} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Preset picker (from global sizes catalog) */}
        <div className="space-y-2">
          <Label className="hud-text text-[10px] text-muted-foreground">Ajouter depuis le catalogue global</Label>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_SIZES.filter(s => !formData.sizes.includes(s)).map(size => (
              <button
                key={size}
                type="button"
                onClick={() => toggleSize(size)}
                className="w-10 h-10 flex items-center justify-center hud-text text-xs border bg-secondary/30 text-muted-foreground border-border/30 hover:border-primary/50 transition-all"
              >
                {size}
              </button>
            ))}
            {productDefaults?.childSizes?.length ? (
              <>
                <span className="w-full text-[10px] text-muted-foreground uppercase tracking-wider mt-2">Enfant</span>
                {productDefaults.childSizes.filter(s => !formData.sizes.includes(s)).map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleSize(size)}
                    className="min-w-[2.5rem] h-9 px-2 flex items-center justify-center hud-text text-[11px] border bg-secondary/30 text-muted-foreground border-border/30 hover:border-primary/50 transition-all"
                  >
                    {size}
                  </button>
                ))}
              </>
            ) : null}
          </div>
        </div>

        {/* Custom size input */}
        <div className="flex items-center gap-2">
          <Input
            value={customSizeDraft}
            onChange={(e) => setCustomSizeDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSize(); } }}
            placeholder="Taille personnalisée (ex. 42, ONE-SIZE, 16A)"
            className="h-8 text-xs bg-secondary/50 border-border/30 max-w-[240px]"
          />
          <Button type="button" size="sm" variant="outline" onClick={addCustomSize} className="h-8 gap-1">
            <Plus className="h-3 w-3" /> Ajouter
          </Button>
        </div>
      </div>

      {/* Colors */}
      <div className="space-y-4">
        <h4 className="hud-text text-xs text-primary">// OPTIONS COULEURS</h4>

        {/* Add new color — single + bicolor + swatch image */}
        <div className="space-y-2 p-3 border border-border/30 bg-secondary/20 rounded">
          <div className="flex items-end gap-2 flex-wrap">
            <div className="space-y-1">
              <Label className="hud-text text-[10px]">Couleur 1</Label>
              <Input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="w-12 h-9 p-1 cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <Label className="hud-text text-[10px]">Couleur 2 (bicolore)</Label>
              <div className="flex gap-1">
                <Input
                  type="color"
                  value={newColor2 || '#ffffff'}
                  onChange={(e) => setNewColor2(e.target.value)}
                  className="w-12 h-9 p-1 cursor-pointer"
                  disabled={!!newSwatchImage}
                />
                {newColor2 && (
                  <button type="button" onClick={() => setNewColor2('')} className="text-muted-foreground hover:text-destructive px-1" title="Retirer bicolore">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-[160px] space-y-1">
              <div className="flex items-center justify-between">
                <Label className="hud-text text-[10px]">Nom <span className="text-muted-foreground">(auto-IA)</span></Label>
                <AiColorNameButton hex={newColor} onGenerated={setNewColorLabel} />
              </div>
              <Input
                value={newColorLabel}
                onChange={(e) => setNewColorLabel(e.target.value)}
                className="h-9 bg-secondary/50 border-border/30"
                placeholder="Noir Obsidian"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addColorOption())}
              />
            </div>
            <Button type="button" variant="outline" size="icon" onClick={addColorOption} title="Ajouter la couleur">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Swatch preview + optional texture image */}
          <div className="flex items-center gap-3 pt-2 border-t border-border/20">
            <div
              className="w-10 h-10 rounded-sm border border-border/60 shrink-0 overflow-hidden"
              style={getSwatchStyle({ color: newColor, color2: newColor2 || null, swatchImage: newSwatchImage || null })}
              title="Aperçu"
            />
            <div className="flex-1 space-y-1">
              <Label className="hud-text text-[10px]">Échantillon / texture (PNG / JPG) — remplace les couleurs</Label>
              <FileDropZone
                accept={['image']}
                folder="products/swatches"
                currentFile={newSwatchImage}
                onUpload={(url) => setNewSwatchImage(url || '')}
                label="Glissez une texture ou cliquez"
              />
              {newSwatchImage && (
                <button
                  type="button"
                  onClick={() => setNewSwatchImage('')}
                  className="text-[10px] text-muted-foreground hover:text-destructive underline"
                >
                  Retirer la texture
                </button>
              )}
            </div>
          </div>
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
                    className="w-7 h-7 rounded-sm border border-border/50 flex-shrink-0 overflow-hidden"
                    style={getSwatchStyle(option)}
                  />
                  <span className="hud-text text-xs font-medium flex-1">{option.label}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{option.color}</span>
                  <button type="button" onClick={() => removeColorOption(index)} className="ml-1">
                    <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>

                <label className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={!!option.filterOnly}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFormData(prev => {
                        const next = [...prev.colorOptions];
                        next[index] = { ...next[index], filterOnly: checked };
                        return { ...prev, colorOptions: next };
                      });
                    }}
                  />
                  Utiliser uniquement dans les filtres boutique (masquée sur la page produit)
                </label>


                {/* Images multiples pour cette couleur */}
                {(() => {
                  const imgs: string[] = option.images && option.images.length
                    ? option.images
                    : (option.image ? [option.image] : []);
                  const updateImages = (next: string[]) => {
                    const newOptions = [...formData.colorOptions];
                    newOptions[index] = { ...newOptions[index], images: next, image: next[0] };
                    setFormData(prev => ({ ...prev, colorOptions: newOptions }));
                  };
                  return (
                    <div className="space-y-2">
                      {imgs.length > 0 && (
                        <div className="grid grid-cols-5 gap-1.5">
                          {imgs.map((url, i) => (
                            <div key={`${url}-${i}`} className="relative group border border-border/30 bg-secondary/40 aspect-square overflow-hidden">
                              <img src={url} alt={`${option.label} ${i + 1}`} className="w-full h-full object-cover" />
                              {i === 0 && (
                                <span className="absolute top-0.5 left-0.5 text-[8px] px-1 bg-primary/90 text-primary-foreground">PRINCIPALE</span>
                              )}
                              <div className="absolute inset-x-0 bottom-0 flex justify-between items-center px-1 py-0.5 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex gap-0.5">
                                  <button type="button" disabled={i === 0}
                                    onClick={() => { const a = [...imgs]; [a[i-1], a[i]] = [a[i], a[i-1]]; updateImages(a); }}
                                    className="text-[10px] px-1 disabled:opacity-30">←</button>
                                  <button type="button" disabled={i === imgs.length - 1}
                                    onClick={() => { const a = [...imgs]; [a[i+1], a[i]] = [a[i], a[i+1]]; updateImages(a); }}
                                    className="text-[10px] px-1 disabled:opacity-30">→</button>
                                </div>
                                <button type="button"
                                  onClick={() => updateImages(imgs.filter((_, idx) => idx !== i))}
                                  className="text-[10px] text-destructive px-1" aria-label="Supprimer">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <FileDropZone
                        accept={['image']}
                        folder="products/colors"
                        onUpload={(url) => { if (url) updateImages([...imgs, url]); }}
                        label={imgs.length ? `+ Ajouter une image (${imgs.length})` : `Image pour "${option.label}"`}
                      />
                      <Input
                        value=""
                        onChange={(e) => { const v = e.target.value.trim(); if (v) updateImages([...imgs, v]); e.currentTarget.value = ''; }}
                        onBlur={(e) => { e.currentTarget.value = ''; }}
                        className="bg-secondary/50 border-border/30 text-xs h-7"
                        placeholder="Ou collez une URL et Entrée pour ajouter..."
                      />
                    </div>
                  );
                })()}
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
                          <button
                            type="button"
                            onClick={() => removeColorByValue(opt.color)}
                            className="text-muted-foreground hover:text-destructive shrink-0"
                            title={`Retirer ${opt.label}`}
                            aria-label={`Retirer ${opt.label}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
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
                            <button
                              type="button"
                              onClick={() => removeColorByValue(color)}
                              className="text-muted-foreground hover:text-destructive shrink-0"
                              title={`Retirer ${color}`}
                              aria-label={`Retirer ${color}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
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
          <div className="flex items-center justify-between">
            <Label className="hud-text text-xs">Description</Label>
            <Button
              type="button" size="sm" variant="ghost"
              className="h-6 px-2 gap-1 text-primary hover:bg-primary/10"
              disabled={aiBusy === 'description' || !formData.image}
              title={!formData.image ? "Ajoutez d'abord une image" : "Générer une description fidèle aux photos"}
              onClick={async () => {
                const r = await runProductAi('description');
                if (r?.value) setFormData(prev => ({ ...prev, description: r.value }));
              }}
            >
              {aiBusy === 'description' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              <span className="text-[10px]">IA fidèle aux photos</span>
            </Button>
          </div>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="bg-secondary/50 border-border/30 min-h-[80px]"
          />
          {aiObservations.length > 0 && (
            <p className="text-[10px] text-muted-foreground leading-snug">
              <span className="text-primary">Basé sur : </span>
              {aiObservations.join(' · ')}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="hud-text text-xs">Matériau</Label>
              <Button
                type="button" size="sm" variant="ghost"
                className="h-6 px-2 gap-1 text-primary hover:bg-primary/10"
                disabled={aiBusy === 'material' || !formData.image}
                onClick={async () => {
                  const r = await runProductAi('material');
                  if (r?.value) setFormData(prev => ({ ...prev, material: r.value }));
                }}
              >
                {aiBusy === 'material' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                <span className="text-[10px]">IA</span>
              </Button>
            </div>
            <Input
              value={formData.material}
              onChange={(e) => setFormData(prev => ({ ...prev, material: e.target.value }))}
              className="bg-secondary/50 border-border/30"
              placeholder="Gore-Tex Pro 3L"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="hud-text text-xs">Entretien</Label>
              <Button
                type="button" size="sm" variant="ghost"
                className="h-6 px-2 gap-1 text-primary hover:bg-primary/10"
                disabled={aiBusy === 'care'}
                onClick={async () => {
                  const r = await runProductAi('care', { material: formData.material });
                  if (r?.value) setFormData(prev => ({ ...prev, careInstructions: r.value }));
                }}
              >
                {aiBusy === 'care' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                <span className="text-[10px]">IA</span>
              </Button>
            </div>
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
        <div className="flex items-center justify-between">
          <h4 className="hud-text text-xs text-primary">// ATTRIBUTS TECHNIQUES</h4>
          <AiAttributesButton
            name={formData.name}
            category={formData.category}
            imageUrl={formData.image}
            imageUrls={[formData.image, ...(formData.galleryImages || [])].filter((u): u is string => typeof u === 'string' && /^https?:\/\//i.test(u)).slice(0, 4)}
            onGenerated={(items) => setFormData(prev => ({ ...prev, attributes: { ...prev.attributes, ...items } }))}
          />
        </div>

        
        <div className="space-y-2">
          {Object.entries(formData.attributes).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2 px-3 py-2 bg-secondary/30 border border-border/30">
              <Input
                value={key}
                onChange={(e) => {
                  const newKey = e.target.value;
                  setFormData(prev => {
                    const entries = Object.entries(prev.attributes);
                    const updated = Object.fromEntries(
                      entries.map(([k, v]) => (k === key ? [newKey, v] : [k, v]))
                    );
                    return { ...prev, attributes: updated };
                  });
                }}
                className="hud-text text-xs h-7 bg-transparent border-0 border-b border-transparent hover:border-border/50 focus:border-primary rounded-none px-1 w-40 uppercase"
              />
              <span className="hud-text text-xs text-muted-foreground">:</span>
              <Input
                value={value}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setFormData(prev => ({ ...prev, attributes: { ...prev.attributes, [key]: newValue } }));
                }}
                className="hud-text text-xs h-7 bg-transparent border-0 border-b border-transparent hover:border-border/50 focus:border-primary rounded-none px-1 flex-1"
              />
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

      <TemplateSelector
        value={formData.templateId}
        onChange={(id) => setFormData(prev => ({ ...prev, templateId: id }))}
      />

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/30">
        {product ? (
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={autoSaveEnabled}
              onChange={(e) => setAutoSaveEnabled(e.target.checked)}
              className="accent-primary"
            />
            Sauvegarde auto
            <span className="ml-1">
              {autoSaveState === 'saving' && <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Enregistrement…</span>}
              {autoSaveState === 'saved' && lastSavedAt && `· enregistré à ${new Date(lastSavedAt).toLocaleTimeString('fr-FR')}`}
              {autoSaveState === 'error' && <span className="text-destructive">· échec, réessayez</span>}
            </span>
          </label>
        ) : <span />}
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            {product ? 'Fermer' : 'Annuler'}
          </Button>
          <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90">
            {isLoading ? 'Enregistrement...' : product ? 'Enregistrer' : 'Créer le produit'}
          </Button>
        </div>
      </div>
    </form>
  );
}

function TemplateSelector({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const { data: templates = [] } = usePageTemplates('product');
  return (
    <div className="space-y-2">
      <h4 className="hud-text text-xs text-primary">// TEMPLATE DE PAGE PRODUIT</h4>
      <p className="text-[10px] text-muted-foreground">
        Choisissez un template pour la page de ce produit. "Défaut du site" utilisera le template par défaut configuré dans Templates de pages.
      </p>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full bg-secondary/50 border border-border/30 rounded px-3 py-2 text-sm"
      >
        <option value="">Défaut du site</option>
        {templates.map((t: any) => (
          <option key={t.id} value={t.id}>{t.name}{t.isDefault ? ' (par défaut)' : ''}</option>
        ))}
      </select>
    </div>
  );
}

function SortableSizeChip({ size, onRemove }: { size: string; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: size });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="inline-flex items-center gap-1 border border-primary bg-primary/10 text-primary-foreground rounded px-1"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-primary/70 hover:text-primary touch-none"
        aria-label={`Déplacer ${size}`}
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <span className="hud-text text-xs font-bold text-primary min-w-[1.5rem] text-center py-1">{size}</span>
      <button
        type="button"
        onClick={onRemove}
        className="text-primary/70 hover:text-destructive"
        aria-label={`Retirer ${size}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}


