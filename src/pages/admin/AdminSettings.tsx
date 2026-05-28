import { useState } from 'react';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, CategoryRecord } from '@/hooks/useCategories';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, LayoutGrid, Settings, Paintbrush, Scale } from 'lucide-react';
import { CategoryFormDialog } from '@/components/admin/CategoryFormDialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminConfig, useSaveAdminConfig } from '@/hooks/useAdminConfig';

// CategoryForm moved to CategoryFormDialog component

export default function AdminSettings() {
  const { toast } = useToast();
  const { designSettings, updateDesignSettings } = useApp();
  const { data: adminConfig } = useAdminConfig();
  const saveAdminConfig = useSaveAdminConfig();

  // Categories
  const { data: categories = [], isLoading } = useCategories();
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

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-xl lg:text-3xl font-bold hud-text">PARAMÈTRES</h1>
        <p className="text-muted-foreground text-xs lg:text-sm mt-1">Configuration de la boutique</p>
      </div>

      <Tabs defaultValue="categories">
        <TabsList className="bg-muted/50 w-full overflow-x-auto justify-start flex-nowrap">
          <TabsTrigger value="categories" className="gap-2 text-xs sm:text-sm"><LayoutGrid className="h-4 w-4" />Catégories</TabsTrigger>
          <TabsTrigger value="customization" className="gap-2 text-xs sm:text-sm"><Paintbrush className="h-4 w-4" />Personnalisation</TabsTrigger>
          <TabsTrigger value="general" className="gap-2 text-xs sm:text-sm"><Settings className="h-4 w-4" />Général</TabsTrigger>
          <TabsTrigger value="legal" className="gap-2 text-xs sm:text-sm"><Scale className="h-4 w-4" />Légal</TabsTrigger>
        </TabsList>

        {/* ── CATEGORIES TAB ── */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Column selector */}
            <div className="flex items-center gap-3">
              <Label className="hud-text text-xs whitespace-nowrap">Colonnes :</Label>
              <div className="flex border border-border rounded overflow-hidden">
                {[2, 3, 4].map(n => (
                  <button
                    key={n}
                    onClick={() => updateDesignSettings({ categoryColumns: n })}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      (designSettings.categoryColumns ?? 4) === n
                        ? 'bg-foreground text-background'
                        : 'bg-background hover:bg-secondary'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
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
                {/* Group: root categories first, then children indented */}
                {categories.filter(c => !c.parentId).map((cat) => {
                  const children = categories.filter(c => c.parentId === cat.id);
                  return (
                    <div key={cat.id} className="space-y-2">
                      <div className="chamfer-hud bg-card border border-border overflow-hidden group">
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
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingCat(cat); setCatDialogOpen(true); }} title="Modifier">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setCatToDelete(cat)} title="Supprimer">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      {/* Sub-categories */}
                      {children.map(sub => (
                        <div key={sub.id} className="ml-4 chamfer-hud bg-card/60 border border-border/50 overflow-hidden">
                          <div className="p-3 flex items-center justify-between">
                            <div>
                              <p className="text-xs text-muted-foreground">↳</p>
                              <p className="font-medium text-sm hud-text">{sub.title}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingCat(sub); setCatDialogOpen(true); }} title="Modifier">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setCatToDelete(sub)} title="Supprimer">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
                {/* Orphan sub-categories (parent deleted) */}
                {categories.filter(c => c.parentId && !categories.find(p => p.id === c.parentId)).map((cat) => (
                  <div key={cat.id} className="chamfer-hud bg-card border border-border overflow-hidden group">
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm hud-text">{cat.title}</p>
                        <p className="text-xs text-destructive">Parent manquant</p>
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
                            if (confirm('Supprimer ?')) {
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

        {/* ── CUSTOMIZATION TAB ── */}
        <TabsContent value="customization" className="space-y-4">
          <div className="chamfer-hud bg-card/50 p-6 space-y-6">
            <h3 className="text-lg font-bold hud-text">TYPOGRAPHIE</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="hud-text text-xs">Police des titres</Label>
                <select
                  value={(designSettings as any).fontHeading || 'Helvetica'}
                  onChange={e => updateDesignSettings({ fontHeading: e.target.value } as any)}
                  className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="Helvetica">Helvetica</option>
                  <option value="Inter">Inter</option>
                  <option value="Playfair Display">Playfair Display</option>
                  <option value="Oswald">Oswald</option>
                  <option value="Montserrat">Montserrat</option>
                  <option value="Roboto">Roboto</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="hud-text text-xs">Police du corps</Label>
                <select
                  value={(designSettings as any).fontBody || 'Helvetica'}
                  onChange={e => updateDesignSettings({ fontBody: e.target.value } as any)}
                  className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="Helvetica">Helvetica</option>
                  <option value="Inter">Inter</option>
                  <option value="Lato">Lato</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Source Sans 3">Source Sans 3</option>
                </select>
              </div>
            </div>
          </div>

          <div className="chamfer-hud bg-card/50 p-6 space-y-6">
            <h3 className="text-lg font-bold hud-text">COULEURS</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="hud-text text-xs">Couleur primaire</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={designSettings.accentColor || '#00FF88'}
                    onChange={e => updateDesignSettings({ accentColor: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border border-border"
                  />
                  <Input
                    value={designSettings.accentColor || '#00FF88'}
                    onChange={e => updateDesignSettings({ accentColor: e.target.value })}
                    className="flex-1 bg-secondary/50 border-border/30 text-xs font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="hud-text text-xs">Fond header</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={(designSettings as any).headerBgColor || '#000000'}
                    onChange={e => updateDesignSettings({ headerBgColor: e.target.value } as any)}
                    className="w-10 h-10 rounded cursor-pointer border border-border"
                  />
                  <Input
                    value={(designSettings as any).headerBgColor || '#000000'}
                    onChange={e => updateDesignSettings({ headerBgColor: e.target.value } as any)}
                    className="flex-1 bg-secondary/50 border-border/30 text-xs font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="hud-text text-xs">Texte header</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={(designSettings as any).headerTextColor || '#ffffff'}
                    onChange={e => updateDesignSettings({ headerTextColor: e.target.value } as any)}
                    className="w-10 h-10 rounded cursor-pointer border border-border"
                  />
                  <Input
                    value={(designSettings as any).headerTextColor || '#ffffff'}
                    onChange={e => updateDesignSettings({ headerTextColor: e.target.value } as any)}
                    className="flex-1 bg-secondary/50 border-border/30 text-xs font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="hud-text text-xs">Fond sidebar</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={designSettings.sidebarBg || '#0A0A0A'}
                    onChange={e => updateDesignSettings({ sidebarBg: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border border-border"
                  />
                  <Input
                    value={designSettings.sidebarBg || '#0A0A0A'}
                    onChange={e => updateDesignSettings({ sidebarBg: e.target.value })}
                    className="flex-1 bg-secondary/50 border-border/30 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="chamfer-hud bg-card/50 p-6 space-y-6">
            <h3 className="text-lg font-bold hud-text">ESPACEMENT GLOBAL</h3>
            <div className="grid grid-cols-3 gap-3">
              {(['compact', 'normal', 'spacious'] as const).map(sp => (
                <button
                  key={sp}
                  onClick={() => updateDesignSettings({ siteSpacing: sp } as any)}
                  className={`p-4 chamfer-hud border text-center transition-colors ${
                    ((designSettings as any).siteSpacing || 'compact') === sp
                      ? 'border-foreground bg-foreground/5'
                      : 'border-border hover:border-foreground/50'
                  }`}
                >
                  <p className="font-bold text-sm uppercase">{sp === 'compact' ? 'Compact' : sp === 'normal' ? 'Normal' : 'Spacieux'}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {sp === 'compact' ? 'Minimum d\'espace' : sp === 'normal' ? 'Espacement équilibré' : 'Beaucoup d\'espace'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── GENERAL TAB ── */}
        <TabsContent value="general" className="space-y-4">
          <div className="chamfer-hud bg-card/50 p-6 space-y-6">
            <h3 className="text-lg font-bold hud-text">INFORMATIONS DU SITE</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="hud-text text-xs">Nom du site</Label>
                <Input
                  value={designSettings.siteName ?? ''}
                  onChange={e => updateDesignSettings({ siteName: e.target.value } as any)}
                  placeholder="Nom de votre boutique"
                  className="bg-secondary/50 border-border/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="hud-text text-xs">Tagline / Slogan</Label>
                <Input
                  value={(designSettings as any).siteTagline ?? ''}
                  onChange={e => updateDesignSettings({ siteTagline: e.target.value } as any)}
                  placeholder="Votre slogan..."
                  className="bg-secondary/50 border-border/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="hud-text text-xs">Email de contact</Label>
                <Input
                  type="email"
                  value={(designSettings as any).contactEmail ?? ''}
                  onChange={e => updateDesignSettings({ contactEmail: e.target.value } as any)}
                  placeholder="contact@votredomaine.com"
                  className="bg-secondary/50 border-border/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="hud-text text-xs">Téléphone de contact</Label>
                <Input
                  type="tel"
                  value={(designSettings as any).contactPhone ?? ''}
                  onChange={e => updateDesignSettings({ contactPhone: e.target.value } as any)}
                  placeholder="+33 6 00 00 00 00"
                  className="bg-secondary/50 border-border/30"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="hud-text text-xs">Devise</Label>
              <Input defaultValue="EUR (€)" className="bg-secondary/50 border-border/30" disabled />
            </div>
            <p className="text-xs text-muted-foreground">
              Ces informations sont sauvegardées automatiquement. Les paramètres de design avancés sont accessibles via la section Design.
            </p>
          </div>

          {/* Notifications */}
          <div className="chamfer-hud bg-card/50 p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold hud-text">NOTIFICATIONS EMAIL</h3>
              <p className="text-xs text-muted-foreground mt-1">Recevez une copie de chaque nouvelle commande passée sur la boutique.</p>
            </div>
            <div className="space-y-2">
              <Label className="hud-text text-xs">Email de notification admin</Label>
              <Input
                type="email"
                placeholder="admin@votredomaine.com"
                value={adminConfig?.adminNotificationEmail ?? ''}
                onChange={e => saveAdminConfig.mutate({ ...adminConfig, adminNotificationEmail: e.target.value })}
                className="bg-secondary/50 border-border/30"
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                Cet email recevra un récapitulatif complet + lien admin pour chaque nouvelle commande.
              </p>
            </div>
            {adminConfig?.adminNotificationEmail && (
              <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 border border-primary/20 chamfer-hud-sm px-3 py-2">
                <span>✓</span>
                <span>Notifications actives → <strong>{adminConfig.adminNotificationEmail}</strong></span>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── LEGAL TAB ── */}
        <TabsContent value="legal" className="space-y-4">
          <div className="chamfer-hud bg-card/50 p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold hud-text">INFORMATIONS LÉGALES DE LA SOCIÉTÉ</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Ces informations sont affichées automatiquement sur toutes les pages légales (Mentions légales, CGV, etc.).
                Les champs non remplis apparaîtront en orange sur les pages légales.
              </p>
            </div>

            {/* Identité société */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="hud-text text-xs">Raison sociale / Nom de la société</Label>
                <Input
                  value={(designSettings as any).legalCompanyName ?? ''}
                  onChange={e => updateDesignSettings({ legalCompanyName: e.target.value } as any)}
                  placeholder="ACME SAS, Jean Dupont..."
                  className="bg-secondary/50 border-border/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="hud-text text-xs">Forme juridique</Label>
                <Input
                  value={(designSettings as any).legalCompanyForm ?? ''}
                  onChange={e => updateDesignSettings({ legalCompanyForm: e.target.value } as any)}
                  placeholder="SARL, SAS, Auto-entrepreneur..."
                  className="bg-secondary/50 border-border/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="hud-text text-xs">Capital social (€)</Label>
                <Input
                  value={(designSettings as any).legalCapital ?? ''}
                  onChange={e => updateDesignSettings({ legalCapital: e.target.value } as any)}
                  placeholder="10 000"
                  className="bg-secondary/50 border-border/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="hud-text text-xs">Directeur de la publication</Label>
                <Input
                  value={(designSettings as any).legalDirector ?? ''}
                  onChange={e => updateDesignSettings({ legalDirector: e.target.value } as any)}
                  placeholder="Prénom Nom"
                  className="bg-secondary/50 border-border/30"
                />
              </div>
            </div>

            {/* Siège social */}
            <div>
              <h4 className="text-sm font-semibold hud-text mb-3 uppercase tracking-wide">Siège social</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2 sm:col-span-3">
                  <Label className="hud-text text-xs">Adresse (rue)</Label>
                  <Input
                    value={(designSettings as any).legalAddress ?? ''}
                    onChange={e => updateDesignSettings({ legalAddress: e.target.value } as any)}
                    placeholder="12 rue de la Paix"
                    className="bg-secondary/50 border-border/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="hud-text text-xs">Code postal</Label>
                  <Input
                    value={(designSettings as any).legalZip ?? ''}
                    onChange={e => updateDesignSettings({ legalZip: e.target.value } as any)}
                    placeholder="75001"
                    className="bg-secondary/50 border-border/30"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="hud-text text-xs">Ville</Label>
                  <Input
                    value={(designSettings as any).legalCity ?? ''}
                    onChange={e => updateDesignSettings({ legalCity: e.target.value } as any)}
                    placeholder="Paris"
                    className="bg-secondary/50 border-border/30"
                  />
                </div>
              </div>
            </div>

            {/* Immatriculation */}
            <div>
              <h4 className="text-sm font-semibold hud-text mb-3 uppercase tracking-wide">Immatriculation</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="hud-text text-xs">SIRET</Label>
                  <Input
                    value={(designSettings as any).legalSiret ?? ''}
                    onChange={e => updateDesignSettings({ legalSiret: e.target.value } as any)}
                    placeholder="XXX XXX XXX XXXXX"
                    className="bg-secondary/50 border-border/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="hud-text text-xs">RCS (Ville + numéro)</Label>
                  <Input
                    value={(designSettings as any).legalRcs ?? ''}
                    onChange={e => updateDesignSettings({ legalRcs: e.target.value } as any)}
                    placeholder="Paris B 123 456 789"
                    className="bg-secondary/50 border-border/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="hud-text text-xs">N° TVA intracommunautaire</Label>
                  <Input
                    value={(designSettings as any).legalVat ?? ''}
                    onChange={e => updateDesignSettings({ legalVat: e.target.value } as any)}
                    placeholder="FR XX XXX XXX XXX"
                    className="bg-secondary/50 border-border/30"
                  />
                </div>
              </div>
            </div>

            {/* Contacts légaux */}
            <div>
              <h4 className="text-sm font-semibold hud-text mb-3 uppercase tracking-wide">Contacts légaux</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="hud-text text-xs">Email RGPD / Protection des données</Label>
                  <Input
                    type="email"
                    value={(designSettings as any).legalRgpdEmail ?? ''}
                    onChange={e => updateDesignSettings({ legalRgpdEmail: e.target.value } as any)}
                    placeholder="rgpd@votredomaine.com"
                    className="bg-secondary/50 border-border/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="hud-text text-xs">Email service retours</Label>
                  <Input
                    type="email"
                    value={(designSettings as any).legalReturnEmail ?? ''}
                    onChange={e => updateDesignSettings({ legalReturnEmail: e.target.value } as any)}
                    placeholder="retours@votredomaine.com"
                    className="bg-secondary/50 border-border/30"
                  />
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground border-t border-border pt-4">
              Ces informations sont sauvegardées automatiquement. Elles remplacent les mentions "[Non configuré]" sur les pages légales publiques.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <CategoryFormDialog
        open={catDialogOpen}
        onOpenChange={(v) => { setCatDialogOpen(v); if (!v) setEditingCat(null); }}
        category={editingCat || undefined}
        categories={categories}
        onSubmit={handleCatSubmit}
      />
    </div>
  );
}
