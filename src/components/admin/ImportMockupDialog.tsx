import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wand2, Upload, X, Loader2, Check, ImageIcon, Sparkles, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCreateProduct } from '@/hooks/useProducts';
import { useFileUpload } from '@/hooks/useFileUpload';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ColorOption {
  color: string;
  label: string;
}

interface ExtractedProductData {
  name: string;
  subtitle: string;
  price: number;
  category: string;
  sizes: string[];
  material: string;
  description: string;
  tags: string[];
  season: string;
  colorOptions: ColorOption[];
  sku: string;
  stock: number;
}

interface ImportMockupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (productId: string) => void;
}

export function ImportMockupDialog({ open, onOpenChange, onSuccess }: ImportMockupDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedProductData | null>(null);
  const [creating, setCreating] = useState(false);
  const [editPrice, setEditPrice] = useState('');
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editableColors, setEditableColors] = useState<ColorOption[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const createProduct = useCreateProduct();
  const { upload } = useFileUpload({ folder: 'products' });

  const handleFile = (f: File) => {
    if (!f.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image (JPG, PNG, WEBP)');
      return;
    }
    setFile(f);
    setExtracted(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = '';
  };

  const handleAnalyze = async () => {
    if (!file || !preview) return;
    setAnalyzing(true);
    try {
      const base64 = preview.split(',')[1];
      const { data, error } = await supabase.functions.invoke('analyze-product-image', {
        body: { imageBase64: base64, mimeType: file.type },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.product) throw new Error("Aucune donnée extraite");
      
      const p: ExtractedProductData = data.product;
      setExtracted(p);
      setEditPrice(String(p.price));
      setEditName(p.name);
      setEditCategory(p.category);
      setEditableColors(p.colorOptions || []);
      toast.success(`Produit analysé : ${p.name}`);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'analyse");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCreate = async () => {
    if (!extracted || !file) return;
    setCreating(true);
    try {
      // Upload image to storage
      const imageUrl = await upload(file);
      if (!imageUrl) throw new Error("Erreur lors de l'upload de l'image");

      // Merge editable fields
      const finalData = {
        ...extracted,
        name: editName || extracted.name,
        price: parseFloat(editPrice) || extracted.price,
        category: editCategory || extracted.category,
        image: imageUrl,
        colors: editableColors.map(c => c.label),
        colorOptions: editableColors,
        attributes: {},
        careInstructions: undefined,
        salePrice: undefined,
        videoUrl: undefined,
      };

      const created = await createProduct.mutateAsync({
        name: finalData.name,
        subtitle: finalData.subtitle || undefined,
        price: finalData.price,
        image: finalData.image,
        category: finalData.category,
        stock: finalData.stock,
        sku: finalData.sku,
        description: finalData.description || undefined,
        material: finalData.material || undefined,
        sizes: finalData.sizes,
        colors: finalData.colors,
        colorOptions: finalData.colorOptions,
        attributes: {},
        tags: finalData.tags,
      });

      toast.success(`Produit "${finalData.name}" créé avec succès !`);
      onSuccess?.(created.id);
      handleClose();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setExtracted(null);
    setAnalyzing(false);
    setCreating(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="hud-text flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            IMPORTER UNE MAQUETTE IA
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
          {/* Left: Image upload */}
          <div className="space-y-4">
            <Label className="text-xs font-bold hud-text">MAQUETTE PRODUIT</Label>
            {preview ? (
              <div className="relative rounded-lg overflow-hidden border border-border aspect-[3/4] bg-muted">
                <img src={preview} alt="Maquette" className="w-full h-full object-contain" />
                {/* Scan animation overlay */}
                <AnimatePresence>
                  {analyzing && (
                    <motion.div
                      className="absolute inset-0 bg-primary/10 flex flex-col items-center justify-center gap-3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {/* Scan line */}
                      <motion.div
                        className="absolute left-0 right-0 h-0.5 bg-primary/80 shadow-[0_0_12px_hsl(var(--primary))]"
                        initial={{ top: '0%' }}
                        animate={{ top: '100%' }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      />
                      <div className="bg-background/90 rounded-lg px-4 py-3 flex items-center gap-2 z-10">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-xs font-bold hud-text">ANALYSE IA EN COURS...</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {!analyzing && (
                  <button
                    className="absolute top-2 right-2 bg-background/80 rounded-full p-1 hover:bg-background"
                    onClick={() => { setFile(null); setPreview(null); setExtracted(null); }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-lg aspect-[3/4] flex flex-col items-center justify-center gap-3 cursor-pointer transition-all",
                  dragOver ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50 hover:bg-muted/30"
                )}
              >
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium">Glissez votre maquette</p>
                  <p className="text-xs text-muted-foreground mt-1">ou cliquez pour sélectionner</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG, WEBP</p>
                </div>
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} className="hidden" />

            {preview && !extracted && (
              <Button
                className="w-full chamfer-hud-sm"
                onClick={handleAnalyze}
                disabled={analyzing}
              >
                {analyzing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyse en cours...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" />Analyser avec l'IA</>
                )}
              </Button>
            )}
          </div>

          {/* Right: Extracted data */}
          <div className="space-y-4">
            <Label className="text-xs font-bold hud-text">DONNÉES EXTRAITES</Label>

            {!extracted && !analyzing && (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground py-12">
                <Wand2 className="h-10 w-10 opacity-30" />
                <p className="text-sm text-center">
                  {preview ? "Cliquez sur « Analyser » pour extraire les données produit" : "Importez une maquette pour commencer"}
                </p>
              </div>
            )}

            {analyzing && (
              <div className="space-y-3 animate-pulse">
                {[60, 40, 80, 50, 70].map((w, i) => (
                  <div key={i} className="h-4 bg-muted rounded" style={{ width: `${w}%` }} />
                ))}
              </div>
            )}

            {extracted && (
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                {/* Name */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">NOM DU PRODUIT</Label>
                  <Input value={editName} onChange={e => setEditName(e.target.value)} className="font-bold" />
                </div>

                {/* Subtitle / Season */}
                {(extracted.subtitle || extracted.season) && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">SOUS-TITRE / COLLECTION</Label>
                    <p className="text-sm bg-muted/50 rounded px-3 py-2">
                      {[extracted.subtitle, extracted.season].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                )}

                {/* Price */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">PRIX (€)</Label>
                  <Input
                    type="number"
                    value={editPrice}
                    onChange={e => setEditPrice(e.target.value)}
                    className="font-bold text-primary"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">CATÉGORIE</Label>
                  <Input value={editCategory} onChange={e => setEditCategory(e.target.value)} />
                </div>

                {/* Sizes */}
                {extracted.sizes.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">TAILLES DÉTECTÉES</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {extracted.sizes.map(s => (
                        <span key={s} className="px-2 py-0.5 bg-primary/10 border border-primary/30 rounded text-xs font-bold hud-text">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Color swatches */}
                {extracted.colorOptions.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">COLORIS DÉTECTÉS ({extracted.colorOptions.length})</Label>
                    <div className="flex flex-wrap gap-2">
                      {extracted.colorOptions.map((c, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-muted/50 rounded px-2 py-1">
                          <div
                            className="w-4 h-4 rounded-full border border-border shadow-sm"
                            style={{ backgroundColor: c.color }}
                          />
                          <span className="text-xs">{c.label}</span>
                          <span className="text-xs text-muted-foreground font-mono">{c.color}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Material */}
                {extracted.material && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">COMPOSITION</Label>
                    <p className="text-sm bg-muted/50 rounded px-3 py-2 font-mono">{extracted.material}</p>
                  </div>
                )}

                {/* Description */}
                {extracted.description && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">DESCRIPTION GÉNÉRÉE</Label>
                    <p className="text-xs text-muted-foreground bg-muted/30 rounded px-3 py-2 leading-relaxed">
                      {extracted.description}
                    </p>
                  </div>
                )}

                {/* Tags */}
                {extracted.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {extracted.tags.map(t => (
                      <span key={t} className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                {/* CTA */}
                <div className="pt-2 border-t border-border flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={handleClose} disabled={creating}>
                    Annuler
                  </Button>
                  <Button className="flex-1 chamfer-hud-sm" onClick={handleCreate} disabled={creating}>
                    {creating ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Création...</>
                    ) : (
                      <><Check className="h-4 w-4 mr-2" />Créer le produit</>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
