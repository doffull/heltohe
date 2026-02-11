import { useState } from 'react';
import { usePages, useUpsertPage, useDeletePage, useBulkDeletePages, type Page, type PageSection } from '@/hooks/usePages';
import { useCategories } from '@/hooks/useCategories';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, FileText, Trash2, Pencil, Search, ExternalLink, Sparkles, Filter
} from 'lucide-react';
import PageBuilder from '@/components/admin/PageBuilder';

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function AdminPages() {
  const { data: pages = [], isLoading } = usePages();
  const { data: categories = [] } = useCategories();
  const upsertPage = useUpsertPage();
  const deletePage = useDeletePage();
  const bulkDelete = useBulkDeletePages();
  const { toast } = useToast();

  const [editingPage, setEditingPage] = useState<Partial<Page> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredPages = pages.filter(p => {
    if (searchFilter && !p.title.toLowerCase().includes(searchFilter.toLowerCase()) && !p.slug.toLowerCase().includes(searchFilter.toLowerCase())) return false;
    if (typeFilter === 'custom' && p.type !== 'custom') return false;
    if (typeFilter === 'category' && p.type !== 'category') return false;
    if (typeFilter === 'published' && !p.isPublished) return false;
    if (typeFilter === 'draft' && p.isPublished) return false;
    return true;
  });

  const { selectedIds, toggle, toggleAll, clear, allSelected, someSelected, count, ids } = useBulkSelection(filteredPages);

  const handleBulkDelete = async () => {
    if (!confirm(`Supprimer ${count} page(s) ?`)) return;
    try {
      await bulkDelete.mutateAsync(ids);
      toast({ title: `${count} page(s) supprimée(s)` });
      clear();
    } catch {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const openNew = () => {
    setEditingPage({ title: '', slug: '', type: 'custom', isPublished: false, sections: [], metaTitle: null, metaDescription: null, seoKeywords: null, menuLink: null });
    setDialogOpen(true);
  };

  const openEdit = (page: Page) => { setEditingPage({ ...page }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!editingPage?.title || !editingPage?.slug) {
      toast({ title: 'Erreur', description: 'Titre et slug obligatoires', variant: 'destructive' });
      return;
    }
    try {
      await upsertPage.mutateAsync(editingPage as any);
      toast({ title: 'Page sauvegardée' });
      setDialogOpen(false);
      setEditingPage(null);
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette page ?')) return;
    await deletePage.mutateAsync(id);
    toast({ title: 'Page supprimée' });
  };

  const handleAiSeo = () => {
    if (!editingPage) return;
    setEditingPage(p => p ? {
      ...p,
      metaTitle: `${p.title} — Collection Premium | LVTK6`,
      metaDescription: `Découvrez ${p.title?.toLowerCase()} dans notre boutique. Collection exclusive, livraison rapide et paiement sécurisé.`,
    } : p);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Pages</h1>
          <p className="text-sm text-muted-foreground">{pages.length} page{pages.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Nouvelle page</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={searchFilter} onChange={e => setSearchFilter(e.target.value)} className="pl-10" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]"><Filter className="h-3 w-3 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="custom">Personnalisées</SelectItem>
            <SelectItem value="category">Catégories</SelectItem>
            <SelectItem value="published">Publiées</SelectItem>
            <SelectItem value="draft">Brouillons</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {someSelected && (
        <div className="chamfer-hud bg-primary/10 border border-primary/30 p-3 flex items-center gap-4 mb-4">
          <span className="text-sm font-bold">{count} sélectionnée(s)</span>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDelete.isPending}>
            <Trash2 className="h-3 w-3 mr-2" />Supprimer
          </Button>
          <Button variant="ghost" size="sm" onClick={clear}>Désélectionner</Button>
        </div>
      )}

      {/* Select All */}
      {filteredPages.length > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
          <span className="text-xs text-muted-foreground">Tout sélectionner</span>
        </div>
      )}

      {/* Pages list */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Chargement...</div>
        ) : filteredPages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Aucune page</p>
          </div>
        ) : (
          filteredPages.map(page => (
            <div key={page.id} className={`flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors ${selectedIds.has(page.id) ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <Checkbox checked={selectedIds.has(page.id)} onCheckedChange={() => toggle(page.id)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium truncate">{page.title}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${page.type === 'category' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {page.type === 'category' ? 'Catégorie' : 'Personnalisée'}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${page.isPublished ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {page.isPublished ? 'Publiée' : 'Brouillon'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">/{page.slug} · {page.sections.length} section{page.sections.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(`/boutique/${page.slug}`, '_blank')}><ExternalLink className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(page)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(page.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 overflow-hidden">
          {editingPage && (
            <div className="flex flex-col h-full">
              <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">{editingPage.id ? 'Modifier la page' : 'Nouvelle page'}</h2>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
                  <Button onClick={handleSave} disabled={upsertPage.isPending}>{upsertPage.isPending ? 'Enregistrement...' : 'Enregistrer'}</Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <Tabs defaultValue="general" className="w-full">
                  <TabsList className="mb-6">
                    <TabsTrigger value="general">Général</TabsTrigger>
                    <TabsTrigger value="builder">Page Builder</TabsTrigger>
                    <TabsTrigger value="seo">SEO</TabsTrigger>
                  </TabsList>
                  <TabsContent value="general">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
                      <div className="space-y-4">
                        <div><Label>Titre de la page</Label><Input value={editingPage.title || ''} onChange={e => { const title = e.target.value; setEditingPage(p => p ? { ...p, title, slug: p.id ? p.slug : slugify(title) } : p); }} /></div>
                        <div><Label>Slug (URL)</Label><Input value={editingPage.slug || ''} onChange={e => setEditingPage(p => p ? { ...p, slug: e.target.value } : p)} /><p className="text-xs text-muted-foreground mt-1">URL: /boutique/{editingPage.slug || '...'}</p></div>
                        <div><Label>Type</Label>
                          <Select value={editingPage.type || 'custom'} onValueChange={v => setEditingPage(p => p ? { ...p, type: v as any } : p)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="custom">Personnalisée</SelectItem><SelectItem value="category">Catégorie</SelectItem></SelectContent>
                          </Select>
                        </div>
                        {editingPage.type === 'category' && (
                          <div><Label>Catégorie liée</Label>
                            <Select value={editingPage.categoryId || ''} onValueChange={v => setEditingPage(p => p ? { ...p, categoryId: v } : p)}>
                              <SelectTrigger><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
                              <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        <div><Label>Lien dans le menu</Label><Input placeholder="/boutique/homme ou /homme" value={editingPage.menuLink || ''} onChange={e => setEditingPage(p => p ? { ...p, menuLink: e.target.value } : p)} /><p className="text-xs text-muted-foreground mt-1">Optionnel: URL pour le menu de navigation</p></div>
                        <div className="flex items-center gap-3 pt-4"><Switch checked={editingPage.isPublished || false} onCheckedChange={v => setEditingPage(p => p ? { ...p, isPublished: v } : p)} /><Label>Publiée</Label></div>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="builder"><PageBuilder sections={(editingPage.sections || []) as PageSection[]} onChange={sections => setEditingPage(p => p ? { ...p, sections } : p)} /></TabsContent>
                  <TabsContent value="seo">
                    <div className="max-w-2xl space-y-4">
                      <div className="flex justify-end"><Button variant="outline" size="sm" className="gap-2" onClick={handleAiSeo}><Sparkles className="h-3 w-3" /> IA SEO</Button></div>
                      <div><Label>Meta Title</Label><Input value={editingPage.metaTitle || ''} onChange={e => setEditingPage(p => p ? { ...p, metaTitle: e.target.value } : p)} maxLength={60} /><p className="text-xs text-muted-foreground mt-1">{(editingPage.metaTitle || '').length}/60</p></div>
                      <div><Label>Meta Description</Label><Textarea value={editingPage.metaDescription || ''} onChange={e => setEditingPage(p => p ? { ...p, metaDescription: e.target.value } : p)} maxLength={160} rows={3} /><p className="text-xs text-muted-foreground mt-1">{(editingPage.metaDescription || '').length}/160</p></div>
                      <div><Label>Mots-clés SEO</Label><Input value={editingPage.seoKeywords || ''} onChange={e => setEditingPage(p => p ? { ...p, seoKeywords: e.target.value } : p)} placeholder="mode, homme, luxe..." /></div>
                      <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border">
                        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Aperçu Google</p>
                        <p className="text-blue-400 text-base hover:underline cursor-pointer">{editingPage.metaTitle || editingPage.title || 'Titre de la page'}</p>
                        <p className="text-green-400 text-xs">lvtk6.com/boutique/{editingPage.slug || '...'}</p>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{editingPage.metaDescription || 'Description de la page...'}</p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
