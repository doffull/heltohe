import { useState } from 'react';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, CategoryRecord } from '@/hooks/useCategories';
import { usePages } from '@/hooks/usePages';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, LayoutGrid, ExternalLink } from 'lucide-react';
import { CategoryFormDialog } from '@/components/admin/CategoryFormDialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Gestion unifiée des catégories et de leur page.
 * Une catégorie = une page : tous les réglages (image, cadrage, SEO, contenu)
 * se font depuis un seul formulaire.
 */
export function CategoriesManager() {
  const { toast } = useToast();
  const { designSettings, updateDesignSettings, flushDesignSettings } = useApp();
  const [savingCols, setSavingCols] = useState(false);

  const cols = designSettings.categoryColumns ?? 4;

  const handleColumnsChange = async (n: number) => {
    updateDesignSettings({ categoryColumns: n });
    setSavingCols(true);
    try {
      await flushDesignSettings({ categoryColumns: n });
      toast({ title: 'Disposition enregistrée ✓', description: `${n} colonnes appliquées.` });
    } catch {
      toast({ title: 'Erreur', description: "Impossible d'enregistrer.", variant: 'destructive' });
    } finally {
      setSavingCols(false);
    }
  };

  const { data: categories = [], isLoading } = useCategories();
  const { data: pages = [] } = usePages();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoryRecord | null>(null);
  const [catToDelete, setCatToDelete] = useState<CategoryRecord | null>(null);

  const handleCatSubmit = async (data: Omit<CategoryRecord, 'id'>) => {
    try {
      if (editingCat) {
        await updateCategory.mutateAsync({ ...data, id: editingCat.id });
      } else {
        await createCategory.mutateAsync(data);
      }
      toast({ title: editingCat ? 'Catégorie mise à jour' : 'Catégorie créée' });
      setCatDialogOpen(false);
      setEditingCat(null);
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const pageFor = (cat: CategoryRecord) => pages.find(p => p.categoryId === cat.id);

  const Row = ({ cat, isChild }: { cat: CategoryRecord; isChild?: boolean }) => {
    const page = pageFor(cat);
    return (
      <div className={`flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors border-border ${isChild ? 'ml-6 bg-card/40' : 'bg-card/60'}`}>
        {cat.image ? (
          <img src={cat.image} alt={cat.title} className="h-12 w-12 object-cover rounded shrink-0" />
        ) : (
          <div className="h-12 w-12 rounded bg-muted flex items-center justify-center shrink-0">
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {isChild && <span className="text-[10px] text-muted-foreground">↳</span>}
            <p className="font-bold text-sm truncate">{cat.title}</p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${page?.isPublished ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
              {page ? (page.isPublished ? 'Page publiée' : 'Page brouillon') : 'Page en attente'}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground font-mono truncate">
            /{page?.slug || cat.slug || '—'}
            {page ? ` · ${page.sections.length} section${page.sections.length !== 1 ? 's' : ''}` : ''}
            {` · position ${cat.sortOrder}`}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Voir la page" onClick={() => window.open(`/${page?.slug || cat.slug}`, '_blank')}>
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" title="Modifier" onClick={() => { setEditingCat(cat); setCatDialogOpen(true); }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 text-destructive border-destructive/30" title="Supprimer" onClick={() => setCatToDelete(cat)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  const roots = categories.filter(c => !c.parentId);
  const orphans = categories.filter(c => c.parentId && !categories.find(p => p.id === c.parentId));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Label className="text-xs whitespace-nowrap">Colonnes sur l'accueil :</Label>
          <div className="flex border border-border rounded overflow-hidden">
            {[2, 3, 4, 5, 6].map(n => (
              <button
                key={n}
                onClick={() => handleColumnsChange(n)}
                disabled={savingCols}
                className={`px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${cols === n ? 'bg-foreground text-background' : 'bg-background hover:bg-secondary'}`}
              >
                {n}
              </button>
            ))}
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            {savingCols ? 'Enregistrement…' : `Enregistré · ${cols} col.`}
          </span>
        </div>
        <Button onClick={() => { setEditingCat(null); setCatDialogOpen(true); }} size="sm" className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Nouvelle catégorie
        </Button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground">Chargement...</div>
      ) : categories.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground">
          <LayoutGrid className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Aucune catégorie</p>
        </div>
      ) : (
        <div className="space-y-2">
          {roots.map(cat => (
            <div key={cat.id} className="space-y-2">
              <Row cat={cat} />
              {categories.filter(c => c.parentId === cat.id).map(sub => <Row key={sub.id} cat={sub} isChild />)}
            </div>
          ))}
          {orphans.map(cat => <Row key={cat.id} cat={cat} />)}
        </div>
      )}

      <CategoryFormDialog
        open={catDialogOpen}
        onOpenChange={(v) => { setCatDialogOpen(v); if (!v) setEditingCat(null); }}
        category={editingCat || undefined}
        categories={categories}
        onSubmit={handleCatSubmit}
      />

      <AlertDialog open={!!catToDelete} onOpenChange={(v) => { if (!v) setCatToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Supprimer {catToDelete?.parentId ? 'cette sous-catégorie' : 'cette catégorie'} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-foreground">« {catToDelete?.title} »</span> sera supprimée définitivement, ainsi que sa page.
              Les produits liés ne seront pas supprimés mais perdront cette catégorie.
              {!catToDelete?.parentId && categories.some((c) => c.parentId === catToDelete?.id) && (
                <span className="block mt-2 text-destructive">⚠ Ses sous-catégories deviendront orphelines.</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!catToDelete) return;
                try {
                  await deleteCategory.mutateAsync(catToDelete.id);
                  toast({ title: catToDelete.parentId ? 'Sous-catégorie supprimée' : 'Catégorie supprimée' });
                } catch {
                  toast({ title: 'Erreur lors de la suppression', variant: 'destructive' });
                } finally {
                  setCatToDelete(null);
                }
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default CategoriesManager;
