import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { MediaLibraryDialog } from '@/components/visual-editor/MediaLibraryDialog';
import { ProductForm } from '@/components/admin/ProductForm';
import { ProductCard } from '@/components/products/ProductCard';
import { useCollabProducts } from '@/hooks/useShopProducts';
import { useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/hooks/useProducts';
import {
  useCollabSettings,
  useUpdateCollabSettings,
  DEFAULT_COLLAB_SETTINGS,
  type CollabSettings,
  type HoverEffect,
} from '@/hooks/useCollabSettings';
import { Plus, Save, Loader2, Trash2, Pencil, X, Images, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '@/types';

const HOVER_EFFECTS: { value: HoverEffect; label: string }[] = [
  { value: 'fade', label: 'Fondu' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'slide', label: 'Glissement' },
];

export default function AdminCollab() {
  const { data: conf, isLoading } = useCollabSettings();
  const updateSettings = useUpdateCollabSettings();
  const { data: products = [] } = useCollabProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [draft, setDraft] = useState<CollabSettings | null>(null);
  const [shopHoverDraft, setShopHoverDraft] = useState<{ enabled: boolean; effect: HoverEffect; duration: number } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [newSize, setNewSize] = useState('');
  const [newColor, setNewColor] = useState({ label: '', color: '#000000' });
  const [pickHero, setPickHero] = useState(false);

  const s = draft || conf?.collab || DEFAULT_COLLAB_SETTINGS;
  const shopHover = shopHoverDraft || conf?.shopHover || { enabled: true, effect: 'fade' as HoverEffect, duration: 500 };

  const patch = (p: Partial<CollabSettings>) => setDraft({ ...s, ...p });

  const previewProduct = useMemo(() => products[0], [products]);

  const save = async () => {
    try {
      await updateSettings.mutateAsync({ collab: s, shopHover });
      setDraft(null);
      setShopHoverDraft(null);
      toast.success('Réglages Collab enregistrés');
    } catch (e) {
      toast.error("Échec de l'enregistrement", { description: (e as Error).message });
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      const payload = { ...data, category: data.category || 'Collab' };
      if (editing) await updateProduct.mutateAsync({ id: editing.id, ...payload });
      else await createProduct.mutateAsync(payload);
      toast.success(editing ? 'Produit mis à jour' : 'Produit Collab créé');
      setFormOpen(false);
      setEditing(null);
    } catch (e) {
      toast.error('Erreur', { description: (e as Error).message });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (formOpen) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="hud-text text-lg font-bold uppercase">
            {editing ? `Modifier — ${editing.name}` : 'Nouveau produit Collab'}
          </h1>
          <Button variant="ghost" size="sm" onClick={() => { setFormOpen(false); setEditing(null); }}>
            <X className="h-4 w-4 mr-1.5" /> Fermer
          </Button>
        </div>
        <ProductForm
          product={editing ? { ...editing, category: editing.category || 'Collab' } : ({ category: 'Collab', subtitle: s.page.subtitle } as any)}
          onSubmit={handleSubmit}
          onCancel={() => { setFormOpen(false); setEditing(null); }}
          isLoading={createProduct.isPending || updateProduct.isPending}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="hud-text text-xl font-bold uppercase tracking-tight">// ESPACE COLLAB</h1>
          <p className="text-sm text-muted-foreground">
            Marketplace isolée : ces produits, tailles et couleurs n'apparaissent que sur /collab.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{products.length} produits</Badge>
          <Button onClick={save} disabled={updateSettings.isPending} className="gap-2">
            {updateSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </Button>
        </div>
      </div>

      <Tabs defaultValue="products">
        <TabsList className="flex-wrap">
          <TabsTrigger value="products">Produits</TabsTrigger>
          <TabsTrigger value="filters">Filtres</TabsTrigger>
          <TabsTrigger value="page">Textes & images</TabsTrigger>
          <TabsTrigger value="design">Animation & disposition</TabsTrigger>
        </TabsList>

        {/* PRODUITS */}
        <TabsContent value="products" className="space-y-4 pt-4">
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Créer un produit Collab
          </Button>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex gap-3 p-3">
                  <img src={p.image} alt={p.name} className="h-20 w-16 object-cover border border-border/40" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold uppercase">{p.name}</p>
                    <p className="truncate text-[10px] uppercase text-muted-foreground">{p.subtitle}</p>
                    <p className="text-xs">{p.salePrice || p.price}€ · stock {p.stock}</p>
                    <div className="mt-2 flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setEditing(p); setFormOpen(true); }}>
                        <Pencil className="h-3 w-3 mr-1" /> Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive"
                        onClick={() => {
                          if (confirm(`Supprimer « ${p.name} » ?`)) deleteProduct.mutate(p.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {products.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun produit Collab pour le moment.</p>
            )}
          </div>
        </TabsContent>

        {/* FILTRES */}
        <TabsContent value="filters" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tailles Collab</CardTitle>
              <CardDescription>Laisser vide pour déduire automatiquement des produits Collab.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {s.sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => patch({ sizes: s.sizes.filter((x) => x !== size) })}
                    className="border border-border px-3 py-1.5 text-xs font-bold uppercase hover:border-destructive hover:text-destructive"
                  >
                    {size} ×
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newSize}
                  onChange={(e) => setNewSize(e.target.value.toUpperCase())}
                  placeholder="Ex: 42"
                  className="max-w-[160px]"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const v = newSize.trim();
                    if (v && !s.sizes.includes(v)) patch({ sizes: [...s.sizes, v] });
                    setNewSize('');
                  }}
                >
                  Ajouter
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Couleurs Collab</CardTitle>
              <CardDescription>Coloris propres à la Collab, séparés de la boutique.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {s.colors.map((c, i) => (
                  <button
                    key={`${c.label}-${i}`}
                    type="button"
                    onClick={() => patch({ colors: s.colors.filter((_, idx) => idx !== i) })}
                    className="flex items-center gap-2 border border-border px-2 py-1.5 text-xs hover:border-destructive"
                  >
                    <span className="h-4 w-4 rounded-full border border-border/60" style={{ backgroundColor: c.color }} />
                    {c.label} ×
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={newColor.label}
                  onChange={(e) => setNewColor((p) => ({ ...p, label: e.target.value }))}
                  placeholder="Nom du coloris"
                  className="max-w-[200px]"
                />
                <input
                  type="color"
                  value={newColor.color}
                  onChange={(e) => setNewColor((p) => ({ ...p, color: e.target.value }))}
                  className="h-9 w-12 border border-border bg-transparent"
                  aria-label="Choisir la couleur"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const label = newColor.label.trim();
                    if (label) patch({ colors: [...s.colors, { label, color: newColor.color }] });
                    setNewColor({ label: '', color: '#000000' });
                  }}
                >
                  Ajouter
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TEXTES & IMAGES */}
        <TabsContent value="page" className="space-y-4 pt-4">
          <Card>
            <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Titre de la page</Label>
                <Input value={s.page.title} onChange={(e) => patch({ page: { ...s.page, title: e.target.value } })} />
              </div>
              <div className="space-y-2">
                <Label>Sous-titre</Label>
                <Input value={s.page.subtitle} onChange={(e) => patch({ page: { ...s.page, subtitle: e.target.value } })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Texte d'introduction</Label>
                <Textarea rows={3} value={s.page.intro} onChange={(e) => patch({ page: { ...s.page, intro: e.target.value } })} />
              </div>
              <div className="space-y-2">
                <Label>Libellé du bouton</Label>
                <Input value={s.page.ctaLabel} onChange={(e) => patch({ page: { ...s.page, ctaLabel: e.target.value } })} />
              </div>
              <div className="space-y-2">
                <Label>Lien du bouton</Label>
                <Input value={s.page.ctaHref} onChange={(e) => patch({ page: { ...s.page, ctaHref: e.target.value } })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Image d'en-tête</Label>
                {s.page.heroImage && (
                  <img src={s.page.heroImage} alt="Aperçu en-tête Collab" className="h-32 w-full object-cover border border-border/40" />
                )}
                <div className="flex gap-2">
                  <Input
                    value={s.page.heroImage}
                    onChange={(e) => patch({ page: { ...s.page, heroImage: e.target.value } })}
                    placeholder="URL de l'image..."
                  />
                  <Button type="button" variant="outline" onClick={() => setPickHero(true)}>
                    <Images className="h-4 w-4" />
                  </Button>
                </div>
                <MediaLibraryDialog
                  open={pickHero}
                  onOpenChange={setPickHero}
                  title="Image d'en-tête Collab"
                  onSelect={(url) => patch({ page: { ...s.page, heroImage: url } })}
                />
              </div>
              <div className="space-y-2">
                <Label>Titre SEO</Label>
                <Input value={s.page.metaTitle} onChange={(e) => patch({ page: { ...s.page, metaTitle: e.target.value } })} />
              </div>
              <div className="space-y-2">
                <Label>Description SEO</Label>
                <Input value={s.page.metaDescription} onChange={(e) => patch({ page: { ...s.page, metaDescription: e.target.value } })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ANIMATION & DISPOSITION */}
        <TabsContent value="design" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Effet au survol
              </CardTitle>
              <CardDescription>Swap d'image : image dédiée du produit, sinon 2e image de la galerie.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <Label>Activer sur /collab</Label>
                <Switch
                  checked={s.animation.hoverEnabled}
                  onCheckedChange={(v) => patch({ animation: { ...s.animation, hoverEnabled: v } })}
                />
              </div>
              <div className="space-y-2">
                <Label>Type d'effet (Collab)</Label>
                <Select
                  value={s.animation.hoverEffect}
                  onValueChange={(v) => patch({ animation: { ...s.animation, hoverEffect: v as HoverEffect } })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HOVER_EFFECTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Durée : {s.animation.hoverDuration} ms</Label>
                <Slider
                  min={150}
                  max={1200}
                  step={50}
                  value={[s.animation.hoverDuration]}
                  onValueChange={([v]) => patch({ animation: { ...s.animation, hoverDuration: v } })}
                />
              </div>

              <div className="border-t border-border/50 pt-4 space-y-4">
                <p className="hud-text text-xs uppercase text-muted-foreground">Boutique principale</p>
                <div className="flex items-center justify-between">
                  <Label>Activer le swap dans la boutique</Label>
                  <Switch
                    checked={shopHover.enabled}
                    onCheckedChange={(v) => setShopHoverDraft({ ...shopHover, enabled: v })}
                  />
                </div>
                <Select
                  value={shopHover.effect}
                  onValueChange={(v) => setShopHoverDraft({ ...shopHover, effect: v as HoverEffect })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HOVER_EFFECTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="space-y-2">
                  <Label>Durée : {shopHover.duration} ms</Label>
                  <Slider
                    min={150}
                    max={1200}
                    step={50}
                    value={[shopHover.duration]}
                    onValueChange={([v]) => setShopHoverDraft({ ...shopHover, duration: v })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Disposition de la grille Collab</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {([
                ['columnsMobile', 'Colonnes mobile', 1, 3],
                ['columnsTablet', 'Colonnes tablette', 1, 4],
                ['columnsDesktop', 'Colonnes desktop', 1, 5],
              ] as const).map(([key, label, min, max]) => (
                <div key={key} className="space-y-2">
                  <Label>{label} : {s.layout[key]}</Label>
                  <Slider
                    min={min}
                    max={max}
                    step={1}
                    value={[s.layout[key]]}
                    onValueChange={([v]) => patch({ layout: { ...s.layout, [key]: v } })}
                  />
                </div>
              ))}
              <div className="space-y-2">
                <Label>Style des pastilles</Label>
                <Select
                  value={s.layout.swatchStyle}
                  onValueChange={(v) => patch({ layout: { ...s.layout, swatchStyle: v as CollabSettings['layout']['swatchStyle'] } })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="round">Ronde</SelectItem>
                    <SelectItem value="square">Carrée</SelectItem>
                    <SelectItem value="separated">Séparée</SelectItem>
                    <SelectItem value="geometric">Géométrique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between md:col-span-2">
                <Label>Afficher les tailles sur la vignette</Label>
                <Switch
                  checked={s.layout.showSizes}
                  onCheckedChange={(v) => patch({ layout: { ...s.layout, showSizes: v } })}
                />
              </div>
            </CardContent>
          </Card>

          {previewProduct && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Aperçu (survolez la vignette)</CardTitle>
              </CardHeader>
              <CardContent className="max-w-[260px]">
                <ProductCard
                  product={previewProduct}
                  hoverEnabled={s.animation.hoverEnabled}
                  hoverEffect={s.animation.hoverEffect}
                  hoverDuration={s.animation.hoverDuration}
                  swatchStyle={s.layout.swatchStyle}
                  showSizes={s.layout.showSizes}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
