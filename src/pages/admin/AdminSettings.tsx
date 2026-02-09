import { useState } from 'react';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, CategoryRecord } from '@/hooks/useCategories';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, MoreHorizontal, LayoutGrid, Settings } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function CategoryForm({ category, onSubmit, onCancel }: {
  category?: CategoryRecord;
  onSubmit: (data: Omit<CategoryRecord, 'id'>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    title: category?.title || '',
    image: category?.image || '',
    sortOrder: category?.sortOrder || 0,
    displaySize: category?.displaySize || 'medium',
    coverMode: category?.coverMode || 'cover',
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div className="space-y-2">
        <Label className="hud-text text-xs">Nom de la catégorie *</Label>
        <Input value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} required />
      </div>
      <div className="space-y-2">
        <Label className="hud-text text-xs">Image URL</Label>
        <Input value={form.image} onChange={(e) => setForm(p => ({ ...p, image: e.target.value }))} />
        {form.image && <img src={form.image} alt="Preview" className="h-20 object-cover border border-border" />}
      </div>
      <div className="space-y-2">
        <Label className="hud-text text-xs">Ordre d'affichage</Label>
        <Input type="number" value={form.sortOrder} onChange={(e) => setForm(p => ({ ...p, sortOrder: Number(e.target.value) }))} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="hud-text text-xs">Taille d'affichage</Label>
          <select value={form.displaySize} onChange={e => setForm(p => ({ ...p, displaySize: e.target.value }))} className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm">
            <option value="small">Petit</option>
            <option value="medium">Moyen</option>
            <option value="large">Grand</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label className="hud-text text-xs">Mode image</Label>
          <select value={form.coverMode} onChange={e => setForm(p => ({ ...p, coverMode: e.target.value }))} className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm">
            <option value="cover">Cover</option>
            <option value="contain">Contain</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit">Enregistrer</Button>
      </div>
    </form>
  );
}

export default function AdminSettings() {
  const { toast } = useToast();

  // Categories
  const { data: categories = [], isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoryRecord | null>(null);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold hud-text">PARAMÈTRES</h1>
        <p className="text-muted-foreground mt-1">Configuration de la boutique</p>
      </div>

      <Tabs defaultValue="categories">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="categories" className="gap-2"><LayoutGrid className="h-4 w-4" />Catégories</TabsTrigger>
          <TabsTrigger value="general" className="gap-2"><Settings className="h-4 w-4" />Général</TabsTrigger>
        </TabsList>

        {/* ── CATEGORIES TAB ── */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingCat(null); setCatDialogOpen(true); }} className="chamfer-hud-sm">
              <Plus className="h-4 w-4 mr-2" />Nouvelle catégorie
            </Button>
          </div>
          <div className="chamfer-hud bg-card/50 overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" /></div>
            ) : categories.length === 0 ? (
              <div className="p-12 text-center">
                <LayoutGrid className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucune catégorie</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {categories.map((cat) => (
                  <div key={cat.id} className="chamfer-hud bg-card border border-border overflow-hidden group">
                    {cat.image && (
                      <div className="h-32 overflow-hidden">
                        <img src={cat.image} alt={cat.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm hud-text">{cat.title}</p>
                        <p className="text-xs text-muted-foreground">Position: {cat.sortOrder}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingCat(cat); setCatDialogOpen(true); }}>
                            <Pencil className="h-4 w-4 mr-2" />Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={async () => {
                            if (confirm('Supprimer cette catégorie ?')) {
                              await deleteCategory.mutateAsync(cat.id);
                              toast({ title: 'Catégorie supprimée' });
                            }
                          }}>
                            <Trash2 className="h-4 w-4 mr-2" />Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── GENERAL TAB ── */}
        <TabsContent value="general" className="space-y-4">
          <div className="chamfer-hud bg-card/50 p-6 space-y-6">
            <h3 className="text-lg font-bold hud-text">INFORMATIONS DU SITE</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="hud-text text-xs">Nom du site</Label>
                <Input defaultValue="LVTK6 Concept" className="bg-secondary/50 border-border/30" />
              </div>
              <div className="space-y-2">
                <Label className="hud-text text-xs">Email de contact</Label>
                <Input defaultValue="contact@lvtk6.com" className="bg-secondary/50 border-border/30" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="hud-text text-xs">Devise</Label>
              <Input defaultValue="EUR (€)" className="bg-secondary/50 border-border/30" disabled />
            </div>
            <p className="text-xs text-muted-foreground">
              Les paramètres de design avancés (logo, couleurs, HUD) sont accessibles via la section Design dans le panneau admin.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="hud-text">{editingCat ? 'MODIFIER LA CATÉGORIE' : 'NOUVELLE CATÉGORIE'}</DialogTitle>
          </DialogHeader>
          <CategoryForm category={editingCat || undefined} onSubmit={handleCatSubmit} onCancel={() => setCatDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
