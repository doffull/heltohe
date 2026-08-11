import { useState, useEffect } from 'react';
import { CategoryRecord, CategoryVisibility } from '@/hooks/useCategories';
import { usePages, useUpsertPage } from '@/hooks/usePages';
import { useFileUpload } from '@/hooks/useFileUpload';
import { FileDropZone } from './FileDropZone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sparkles, Loader2, X, Globe, Image as ImageIcon, Settings2, FileText } from 'lucide-react';

import { toast } from 'sonner';
import CategoryIcon, { CATEGORY_ICON_NAMES } from '@/components/categories/CategoryIcon';
import { cn } from '@/lib/utils';

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
    icon: '',
    iconImage: '',
    visibility: 'all' as CategoryVisibility,
  });
  const [aiLoading, setAiLoading] = useState(false);
  const { data: pages = [] } = usePages();
  const upsertPage = useUpsertPage();
  const categoryPage = category ? pages.find(p => p.categoryId === category.id) : undefined;


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
        icon: category?.icon || '',
        iconImage: category?.iconImage || '',
        visibility: category?.visibility || 'all',
      });
    }
  }, [open, category]);


  // Auto-generate slug from title
  useEffect(() => {
    if (!category && form.title && !form.slug) {
      const base = form.title
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
      // Find an available slug that doesn't conflict with existing ones
      const existingSlugs = new Set(categories.map(c => c.slug).filter(Boolean));
      let candidate = base;
      let suffix = 2;
      while (existingSlugs.has(candidate)) {
        candidate = `${base}-${suffix}`;
        suffix++;
      }
      setForm(p => ({ ...p, slug: candidate }));
    }
  }, [form.title, category, categories]);

  const parentOptions = categories.filter(c => !c.parentId && c.id !== category?.id);
  const slugConflict = !!form.slug && categories.some(
    c => c.slug === form.slug && c.id !== category?.id
  );

  const handleAiSeo = async () => {
    if (!form.title) {
      toast.error('Ajoutez un nom de catégorie d\'abord');
      return;
    }
    setAiLoading(true);
    try {
      // Simple AI-generated SEO based on category name
      const metaTitle = `${form.title} - Collection Premium | HELVETICA-MP`;
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
                  className={`bg-secondary/50 font-mono text-xs ${slugConflict ? 'border-destructive' : ''}`}
                />
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground font-mono">/{form.slug || '...'}</p>
                  {slugConflict && (
                    <p className="text-[10px] text-destructive font-mono">Slug déjà utilisé</p>
                  )}
                </div>
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

              {/* Visibilité */}
              <div className="space-y-2 pt-2 border-t border-border">
                <Label className="hud-text text-xs">Où afficher cette catégorie</Label>
                <select
                  value={form.visibility}
                  onChange={(e) => setForm(p => ({ ...p, visibility: e.target.value as CategoryVisibility }))}
                  className="w-full h-10 rounded-md border border-border bg-secondary/50 px-3 text-sm"
                >
                  <option value="all">Partout (site + menu)</option>
                  <option value="menu">Menu uniquement</option>
                  <option value="site">Site uniquement</option>
                </select>
                <p className="text-[10px] text-muted-foreground">
                  La page de la catégorie et son lien direct restent toujours accessibles.
                </p>
              </div>

              {/* Icône / logo */}
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <Label className="hud-text text-xs">Icône à côté du nom</Label>
                  <div className="flex items-center gap-2">
                    <CategoryIcon icon={form.icon} iconImage={form.iconImage} size="md" className="text-primary" />
                    {(form.icon || form.iconImage) && (
                      <button
                        type="button"
                        onClick={() => setForm(p => ({ ...p, icon: '', iconImage: '' }))}
                        className="text-[10px] text-muted-foreground hover:text-destructive uppercase tracking-wider"
                      >
                        Retirer
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-8 gap-1.5">
                  {CATEGORY_ICON_NAMES.map((name) => (
                    <button
                      key={name}
                      type="button"
                      title={name}
                      onClick={() => setForm(p => ({ ...p, icon: name, iconImage: '' }))}
                      className={cn(
                        'h-9 flex items-center justify-center border transition-colors',
                        form.icon === name && !form.iconImage
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border/50 bg-secondary/40 text-muted-foreground hover:border-primary/50'
                      )}
                    >
                      <CategoryIcon icon={name} size="sm" />
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label className="hud-text text-[10px] text-muted-foreground">
                    ou un logo personnalisé
                  </Label>
                  <FileDropZone
                    accept={['image']}
                    currentFile={form.iconImage}
                    onUpload={(url) => setForm(p => ({ ...p, iconImage: url, icon: '' }))}
                    folder="categories"
                    label="Logo de la catégorie"
                    className="min-h-[110px]"
                  />
                </div>
              </div>
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
                  <p className="text-xs text-muted-foreground font-mono">helvetica-mp.com/{form.slug || '...'}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{form.metaDescription || 'Aucune description définie.'}</p>
                </div>
              )}

              {/* Page de la catégorie */}
              <div className="mt-6 pt-5 border-t border-border space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs font-bold hud-text tracking-widest text-muted-foreground">PAGE DE LA CATÉGORIE</p>
                </div>

                {!category ? (
                  <p className="text-xs text-muted-foreground">
                    La page de cette catégorie sera créée automatiquement à l'enregistrement, à l'adresse
                    <span className="font-mono"> /{form.slug || '...'}</span>.
                  </p>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{categoryPage?.title || form.title}</p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">
                          /{categoryPage?.slug || form.slug}
                          {categoryPage ? ` · ${categoryPage.sections.length} section${categoryPage.sections.length !== 1 ? 's' : ''}` : ''}
                        </p>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${categoryPage?.isPublished ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {categoryPage?.isPublished ? 'Publiée' : 'Brouillon'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={!categoryPage}
                        onClick={() => categoryPage && window.open(`/admin/pages?page=${categoryPage.slug}`, '_blank')}
                      >
                        <Settings2 className="h-3 w-3" /> Modifier le contenu
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => window.open(`/${categoryPage?.slug || form.slug}`, '_blank')}
                      >
                        <Globe className="h-3 w-3" /> Voir la page
                      </Button>
                      {categoryPage && (
                        <Button
                          type="button"
                          variant={categoryPage.isPublished ? 'ghost' : 'default'}
                          size="sm"
                          disabled={upsertPage.isPending}
                          onClick={async () => {
                            await upsertPage.mutateAsync({ ...categoryPage, isPublished: !categoryPage.isPublished } as any);
                            toast.success(categoryPage.isPublished ? 'Page dépubliée' : 'Page publiée');
                          }}
                        >
                          {categoryPage.isPublished ? 'Dépublier' : 'Publier'}
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
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
