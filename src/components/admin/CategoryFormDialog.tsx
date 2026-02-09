import { useState, useEffect } from 'react';
import { CategoryRecord } from '@/hooks/useCategories';
import { useFileUpload } from '@/hooks/useFileUpload';
import { FileDropZone } from './FileDropZone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sparkles, Loader2, X, Globe, Image as ImageIcon, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: CategoryRecord;
  categories: CategoryRecord[];
  onSubmit: (data: Omit<CategoryRecord, 'id'>) => void;
}

export function CategoryFormDialog({ open, onOpenChange, category, categories, onSubmit }: CategoryFormDialogProps) {
  const [form, setForm] = useState({
    title: '',
    slug: '',
    image: '',
    sortOrder: 0,
    displaySize: 'medium',
    coverMode: 'cover',
    parentId: '',
    metaTitle: '',
    metaDescription: '',
    seoKeywords: '',
  });
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        title: category?.title || '',
        slug: category?.slug || '',
        image: category?.image || '',
        sortOrder: category?.sortOrder || 0,
        displaySize: category?.displaySize || 'medium',
        coverMode: category?.coverMode || 'cover',
        parentId: category?.parentId || '',
        metaTitle: category?.metaTitle || '',
        metaDescription: category?.metaDescription || '',
        seoKeywords: category?.seoKeywords || '',
      });
    }
  }, [open, category]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!category && form.title && !form.slug) {
      const autoSlug = form.title
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
      setForm(p => ({ ...p, slug: autoSlug }));
    }
  }, [form.title, category]);

  const parentOptions = categories.filter(c => !c.parentId && c.id !== category?.id);

  const handleAiSeo = async () => {
    if (!form.title) {
      toast.error('Ajoutez un nom de catégorie d\'abord');
      return;
    }
    setAiLoading(true);
    try {
      // Simple AI-generated SEO based on category name
      const metaTitle = `${form.title} - Collection Premium | LVTK6`;
      const metaDesc = `Découvrez notre collection ${form.title.toLowerCase()} : vêtements et accessoires techniques haut de gamme. Livraison offerte dès 100€.`;
      setForm(p => ({
        ...p,
        metaTitle: metaTitle.substring(0, 60),
        metaDescription: metaDesc.substring(0, 160),
        seoKeywords: `${form.title.toLowerCase()}, mode, vêtements techniques, premium`,
      }));
      toast.success('SEO généré avec succès');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...form,
      parentId: form.parentId || null,
      slug: form.slug || undefined,
      metaTitle: form.metaTitle || undefined,
      metaDescription: form.metaDescription || undefined,
      seoKeywords: form.seoKeywords || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] max-h-[95vh] p-0 flex flex-col overflow-hidden">
        {/* Sticky header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0">
          <h2 className="text-xl font-bold hud-text tracking-wider">
            {category ? 'MODIFIER LA CATÉGORIE' : 'NOUVELLE CATÉGORIE'}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content - horizontal layout */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 min-h-full">
            
            {/* Column 1: General info */}
            <div className="p-6 space-y-5 border-r border-border">
              <div className="flex items-center gap-2 mb-4">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-bold hud-text tracking-widest text-muted-foreground">INFORMATIONS</p>
              </div>

              <div className="space-y-2">
                <Label className="hud-text text-xs">Nom de la catégorie *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
                  required
                  placeholder="Ex: Homme, Femme, Enfant..."
                  className="bg-secondary/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="hud-text text-xs">Slug URL</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm(p => ({ ...p, slug: e.target.value }))}
                  placeholder="auto-généré"
                  className="bg-secondary/50 font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground font-mono">/boutique/{form.slug || '...'}</p>
              </div>

              <div className="space-y-2">
                <Label className="hud-text text-xs">Catégorie parente</Label>
                <select
                  value={form.parentId}
                  onChange={(e) => setForm(p => ({ ...p, parentId: e.target.value }))}
                  className="w-full h-10 rounded-md border border-border bg-secondary/50 px-3 text-sm"
                >
                  <option value="">— Aucune (catégorie principale) —</option>
                  {parentOptions.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="hud-text text-xs">Ordre d'affichage</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm(p => ({ ...p, sortOrder: Number(e.target.value) }))}
                  className="bg-secondary/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="hud-text text-xs">Taille d'affichage</Label>
                  <select
                    value={form.displaySize}
                    onChange={e => setForm(p => ({ ...p, displaySize: e.target.value }))}
                    className="w-full h-10 rounded-md border border-border bg-secondary/50 px-3 text-sm"
                  >
                    <option value="small">Petit</option>
                    <option value="medium">Moyen</option>
                    <option value="large">Grand</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="hud-text text-xs">Mode image</Label>
                  <select
                    value={form.coverMode}
                    onChange={e => setForm(p => ({ ...p, coverMode: e.target.value }))}
                    className="w-full h-10 rounded-md border border-border bg-secondary/50 px-3 text-sm"
                  >
                    <option value="cover">Cover</option>
                    <option value="contain">Contain</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Column 2: Image */}
            <div className="p-6 space-y-5 border-r border-border">
              <div className="flex items-center gap-2 mb-4">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-bold hud-text tracking-widest text-muted-foreground">IMAGE PRINCIPALE</p>
              </div>

              <FileDropZone
                accept={['image']}
                currentFile={form.image}
                onUpload={(url) => setForm(p => ({ ...p, image: url }))}
                folder="categories"
                label="Glissez une image ici ou cliquez pour uploader"
                className="min-h-[250px]"
              />

              {form.image && (
                <p className="text-[10px] text-muted-foreground font-mono break-all">{form.image}</p>
              )}
            </div>

            {/* Column 3: SEO */}
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs font-bold hud-text tracking-widest text-muted-foreground">SEO & RÉFÉRENCEMENT</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAiSeo}
                  disabled={aiLoading || !form.title}
                  className="gap-2"
                >
                  {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  IA SEO
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="hud-text text-xs">Titre SEO (meta title)</Label>
                <Input
                  value={form.metaTitle}
                  onChange={(e) => setForm(p => ({ ...p, metaTitle: e.target.value }))}
                  placeholder="Titre pour les moteurs de recherche"
                  className="bg-secondary/50"
                />
                <div className="flex justify-between">
                  <p className="text-[10px] text-muted-foreground">Recommandé : 50-60 caractères</p>
                  <p className={`text-[10px] ${(form.metaTitle?.length || 0) > 60 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {form.metaTitle?.length || 0}/60
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="hud-text text-xs">Meta description</Label>
                <textarea
                  value={form.metaDescription}
                  onChange={(e) => setForm(p => ({ ...p, metaDescription: e.target.value }))}
                  placeholder="Description pour les moteurs de recherche"
                  className="w-full h-28 rounded-md border border-border bg-secondary/50 px-3 py-2 text-sm resize-none"
                />
                <div className="flex justify-between">
                  <p className="text-[10px] text-muted-foreground">Recommandé : 120-160 caractères</p>
                  <p className={`text-[10px] ${(form.metaDescription?.length || 0) > 160 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {form.metaDescription?.length || 0}/160
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="hud-text text-xs">Mots-clés SEO</Label>
                <Input
                  value={form.seoKeywords}
                  onChange={(e) => setForm(p => ({ ...p, seoKeywords: e.target.value }))}
                  placeholder="mot1, mot2, mot3"
                  className="bg-secondary/50"
                />
              </div>

              {/* SEO Preview */}
              {(form.metaTitle || form.title) && (
                <div className="mt-4 p-4 rounded-lg bg-secondary/30 border border-border space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Aperçu Google</p>
                  <p className="text-sm text-primary font-medium truncate">{form.metaTitle || form.title}</p>
                  <p className="text-xs text-muted-foreground font-mono">lvtk6.com/boutique/{form.slug || '...'}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{form.metaDescription || 'Aucune description définie.'}</p>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Sticky footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-card shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit}>{category ? 'Mettre à jour' : 'Créer la catégorie'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
