import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { FileDropZone } from '@/components/admin/FileDropZone';
import { useApp } from '@/context/AppContext';
import { HeroSlide, HUDStat, HUDButton, MannequinHotspotConfig, Category } from '@/types';
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

function generateId() {
  return `id-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
}

// ─── Hero Slider Tab ───
function HeroSliderTab() {
  const { designSettings, updateDesignSettings } = useApp();
  const slides = designSettings.heroSlides;

  const updateSlide = (index: number, updates: Partial<HeroSlide>) => {
    const newSlides = [...slides];
    newSlides[index] = { ...newSlides[index], ...updates };
    updateDesignSettings({ heroSlides: newSlides });
  };

  const addSlide = () => {
    const newSlide: HeroSlide = {
      id: generateId(),
      media: '',
      mediaType: 'image',
      title: 'Nouveau Titre',
      subtitle: 'Sous-titre',
      ctaText: 'DÉCOUVRIR',
      ctaUrl: '/boutique',
      accentColor: '#3b82f6',
    };
    updateDesignSettings({ heroSlides: [...slides, newSlide] });
    toast.success('Slide ajoutée');
  };

  const removeSlide = (index: number) => {
    updateDesignSettings({ heroSlides: slides.filter((_, i) => i !== index) });
    toast.success('Slide supprimée');
  };

  const moveSlide = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= slides.length) return;
    const newSlides = [...slides];
    [newSlides[index], newSlides[newIndex]] = [newSlides[newIndex], newSlides[index]];
    updateDesignSettings({ heroSlides: newSlides });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Hero Slider Parallax</h3>
          <p className="text-sm text-muted-foreground">Configurez chaque slide avec 3 couches de profondeur</p>
        </div>
        <Button onClick={addSlide} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Ajouter une slide
        </Button>
      </div>

      {slides.map((slide, index) => (
        <Card key={slide.id} className="relative">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                Slide {index + 1}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveSlide(index, -1)} disabled={index === 0}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveSlide(index, 1)} disabled={index === slides.length - 1}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeSlide(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Parallax Layers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-medium mb-2 block">Arrière-plan (fond)</Label>
                <FileDropZone
                  accept={['image', 'video']}
                  folder="hero/background"
                  currentFile={slide.backgroundMedia || slide.media}
                  onUpload={(url) => updateSlide(index, { backgroundMedia: url, media: url || slide.media })}
                  label="Fond (défilement lent)"
                />
              </div>
              <div>
                <Label className="text-xs font-medium mb-2 block">Plan intermédiaire</Label>
                <FileDropZone
                  accept={['image']}
                  folder="hero/midground"
                  currentFile={slide.midgroundMedia}
                  onUpload={(url) => updateSlide(index, { midgroundMedia: url })}
                  label="Décor (défilement moyen)"
                />
              </div>
              <div>
                <Label className="text-xs font-medium mb-2 block">Premier plan</Label>
                <FileDropZone
                  accept={['image']}
                  folder="hero/foreground"
                  currentFile={slide.foregroundMedia}
                  onUpload={(url) => updateSlide(index, { foregroundMedia: url })}
                  label="Sujet (défilement rapide)"
                />
              </div>
            </div>

            {/* Mobile Image */}
            <div>
              <Label className="text-xs font-medium mb-2 block">Image mobile (optionnel)</Label>
              <FileDropZone
                accept={['image']}
                folder="hero/mobile"
                currentFile={(slide as any).mobileImage}
                onUpload={(url) => updateSlide(index, { mobileImage: url } as any)}
                label="Image adaptée mobile"
              />
              <p className="text-xs text-muted-foreground mt-1">Si vide, l'image desktop sera utilisée</p>
            </div>

            {/* Text Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Titre</Label>
                <Input value={slide.title} onChange={(e) => updateSlide(index, { title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Sous-titre</Label>
                <Input value={slide.subtitle} onChange={(e) => updateSlide(index, { subtitle: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Texte du bouton</Label>
                <Input value={slide.ctaText} onChange={(e) => updateSlide(index, { ctaText: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Couleur d'accent</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={slide.accentColor || '#3b82f6'}
                    onChange={(e) => updateSlide(index, { accentColor: e.target.value })}
                    className="h-10 w-14 cursor-pointer rounded border border-border"
                  />
                  <Input
                    value={slide.accentColor || '#3b82f6'}
                    onChange={(e) => updateSlide(index, { accentColor: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {slides.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucune slide configurée. Ajoutez-en une pour commencer.
          </CardContent>
        </Card>
      )}

      {/* Slider Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paramètres du Slider</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Lecture automatique</Label>
            <Switch
              checked={designSettings.sliderAutoPlay}
              onCheckedChange={(v) => updateDesignSettings({ sliderAutoPlay: v })}
            />
          </div>
          <div className="space-y-2">
            <Label>Vitesse ({(designSettings.sliderSpeed / 1000).toFixed(1)}s)</Label>
            <Slider
              value={[designSettings.sliderSpeed]}
              min={2000}
              max={15000}
              step={500}
              onValueChange={([v]) => updateDesignSettings({ sliderSpeed: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Overlay gradient</Label>
            <Switch
              checked={designSettings.showSliderOverlay}
              onCheckedChange={(v) => updateDesignSettings({ showSliderOverlay: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Noir & blanc</Label>
            <Switch
              checked={designSettings.sliderGrayscale}
              onCheckedChange={(v) => updateDesignSettings({ sliderGrayscale: v })}
            />
          </div>
          <div className="space-y-2">
            <Label>Opacité des images ({Math.round((designSettings.sliderImageOpacity ?? 1) * 100)}%)</Label>
            <Slider
              value={[(designSettings.sliderImageOpacity ?? 1) * 100]}
              min={10}
              max={100}
              step={5}
              onValueChange={([v]) => updateDesignSettings({ sliderImageOpacity: v / 100 })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Logo Tab ───
function LogoTab() {
  const { designSettings, updateDesignSettings } = useApp();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logo du site</CardTitle>
          <CardDescription>Uploadez votre logo pour le sidebar et le header</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FileDropZone
            accept={['image']}
            folder="branding"
            currentFile={designSettings.hudLogo}
            onUpload={(url) => updateDesignSettings({ hudLogo: url })}
            label="Glissez votre logo ici"
          />

          <div className="flex items-center justify-between">
            <Label>Afficher le logo</Label>
            <Switch
              checked={designSettings.showLogo}
              onCheckedChange={(v) => updateDesignSettings({ showLogo: v })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sidebar Tab ───
function SidebarTab() {
  const { designSettings, updateDesignSettings } = useApp();
  const stats = designSettings.stats || [];
  const hudButtons = designSettings.hudButtons || [];
  const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
  const currentSizes = designSettings.sidebarSizes || ALL_SIZES;

  const updateStat = (index: number, updates: Partial<HUDStat>) => {
    const newStats = [...stats];
    newStats[index] = { ...newStats[index], ...updates };
    updateDesignSettings({ stats: newStats });
  };

  const addStat = () => {
    updateDesignSettings({ stats: [...stats, { label: 'NOUVEAU', value: 50 }] });
  };

  const removeStat = (index: number) => {
    updateDesignSettings({ stats: stats.filter((_, i) => i !== index) });
  };

  const addButton = () => {
    const newBtn: HUDButton = {
      id: generateId(),
      label: 'NOUVEAU',
      url: '/boutique',
      style: { bg: '#000000', text: '#ffffff', scale: 1, animation: 'none', pos: {}, fontSize: 10 },
    };
    updateDesignSettings({ hudButtons: [...hudButtons, newBtn] });
    toast.success('Bouton ajouté');
  };

  const updateButton = (index: number, updates: Partial<HUDButton>) => {
    const newBtns = [...hudButtons];
    newBtns[index] = { ...newBtns[index], ...updates };
    updateDesignSettings({ hudButtons: newBtns });
  };

  const updateButtonStyle = (index: number, styleUpdates: Record<string, any>) => {
    const newBtns = [...hudButtons];
    newBtns[index] = { ...newBtns[index], style: { ...newBtns[index].style, ...styleUpdates } };
    updateDesignSettings({ hudButtons: newBtns });
  };

  const removeButton = (index: number) => {
    updateDesignSettings({ hudButtons: hudButtons.filter((_, i) => i !== index) });
    toast.success('Bouton supprimé');
  };

  return (
    <div className="space-y-6">
      {/* Brand Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identité de marque</CardTitle>
          <CardDescription>Textes affichés en haut de la sidebar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nom de marque</Label>
            <Input
              value={designSettings.sidebarBrandName || ''}
              onChange={(e) => updateDesignSettings({ sidebarBrandName: e.target.value })}
              placeholder="LVTK6"
            />
          </div>
          <div className="space-y-2">
            <Label>Sous-titre</Label>
            <Input
              value={designSettings.sidebarBrandSubtitle || ''}
              onChange={(e) => updateDesignSettings({ sidebarBrandSubtitle: e.target.value })}
              placeholder="NEW EDITION"
            />
          </div>
          <div className="space-y-2">
            <Label>Texte info (bas de sidebar)</Label>
            <Input
              value={designSettings.sidebarInfoText || ''}
              onChange={(e) => updateDesignSettings({ sidebarInfoText: e.target.value })}
              placeholder="Model 001"
            />
          </div>
        </CardContent>
      </Card>

      {/* Visibility Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Éléments visibles</CardTitle>
          <CardDescription>Activez ou désactivez les composants de la sidebar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Numéro de produit (badge SKU)</Label>
            <Switch
              checked={designSettings.showSidebarProductNumber !== false}
              onCheckedChange={(v) => updateDesignSettings({ showSidebarProductNumber: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Carte produit (info)</Label>
            <Switch
              checked={designSettings.showSidebarProductCard !== false}
              onCheckedChange={(v) => updateDesignSettings({ showSidebarProductCard: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Sélecteurs de taille</Label>
            <Switch
              checked={designSettings.showSidebarSizes !== false}
              onCheckedChange={(v) => updateDesignSettings({ showSidebarSizes: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Galerie miniature</Label>
            <Switch
              checked={designSettings.showSidebarGallery !== false}
              onCheckedChange={(v) => updateDesignSettings({ showSidebarGallery: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Barres de statistiques</Label>
            <Switch
              checked={designSettings.showSidebarStats !== false}
              onCheckedChange={(v) => updateDesignSettings({ showSidebarStats: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Mannequin Image */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Image du mannequin</CardTitle>
          <CardDescription>Photo de fond du panneau latéral gauche</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileDropZone
            accept={['image']}
            folder="sidebar"
            currentFile={designSettings.sidebarImage}
            onUpload={(url) => updateDesignSettings({ sidebarImage: url })}
            label="Glissez l'image du mannequin"
          />
          <div className="space-y-2">
            <Label>Opacité de l'image ({Math.round((designSettings.sidebarImageOpacity ?? 1) * 100)}%)</Label>
            <Slider
              value={[(designSettings.sidebarImageOpacity ?? 1) * 100]}
              min={0}
              max={100}
              step={5}
              onValueChange={([v]) => updateDesignSettings({ sidebarImageOpacity: v / 100 })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Product Card Text */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Carte produit (texte personnalisé)</CardTitle>
          <CardDescription>Laissez vide pour utiliser les infos du produit actif</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Titre personnalisé</Label>
            <Input
              value={designSettings.sidebarProductTitle || ''}
              onChange={(e) => updateDesignSettings({ sidebarProductTitle: e.target.value })}
              placeholder="(nom du produit actif)"
            />
          </div>
          <div className="space-y-2">
            <Label>Description personnalisée</Label>
            <Input
              value={designSettings.sidebarProductDescription || ''}
              onChange={(e) => updateDesignSettings({ sidebarProductDescription: e.target.value })}
              placeholder="(sous-titre du produit actif)"
            />
          </div>
        </CardContent>
      </Card>

      {/* Size Selectors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tailles affichées</CardTitle>
          <CardDescription>Sélectionnez les tailles à afficher sur la sidebar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {ALL_SIZES.map((size) => {
              const isActive = currentSizes.includes(size);
              return (
                <button
                  key={size}
                  onClick={() => {
                    const newSizes = isActive
                      ? currentSizes.filter(s => s !== size)
                      : [...currentSizes, size].sort((a, b) => ALL_SIZES.indexOf(a) - ALL_SIZES.indexOf(b));
                    updateDesignSettings({ sidebarSizes: newSizes });
                  }}
                  className={`px-4 py-2 border text-sm font-bold uppercase transition-colors ${
                    isActive 
                      ? 'bg-foreground text-background border-foreground' 
                      : 'bg-background text-muted-foreground border-border hover:border-foreground'
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stat Bars */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Barres de statistiques</CardTitle>
              <CardDescription>Configurez les indicateurs affichés sur la sidebar</CardDescription>
            </div>
            <Button onClick={addStat} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" /> Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats.map((stat, index) => (
            <div key={index} className="flex items-center gap-3 p-3 border border-border rounded-lg">
              <Input
                value={stat.label}
                onChange={(e) => updateStat(index, { label: e.target.value })}
                className="w-40"
                placeholder="Label"
              />
              <div className="flex-1 space-y-1">
                <Slider
                  value={[stat.value]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([v]) => updateStat(index, { value: v })}
                />
              </div>
              <span className="text-sm font-mono text-muted-foreground w-10 text-right">{stat.value}%</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeStat(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {stats.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune barre configurée
            </p>
          )}

          {/* Stat Bar Colors */}
          <div className="border-t border-border pt-4 mt-4">
            <Label className="text-xs font-semibold uppercase tracking-wider mb-3 block">Couleurs des barres</Label>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Remplie</Label>
                <input
                  type="color"
                  value={designSettings.statBarFilledColor || '#000000'}
                  onChange={(e) => updateDesignSettings({ statBarFilledColor: e.target.value })}
                  className="h-8 w-10 cursor-pointer rounded border border-border"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Vide</Label>
                <input
                  type="color"
                  value={designSettings.statBarEmptyColor || '#e5e5e5'}
                  onChange={(e) => updateDesignSettings({ statBarEmptyColor: e.target.value })}
                  className="h-8 w-10 cursor-pointer rounded border border-border"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* HUD Buttons */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Boutons de la sidebar</CardTitle>
              <CardDescription>Boutons d'action affichés sur la sidebar</CardDescription>
            </div>
            <Button onClick={addButton} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" /> Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {hudButtons.map((btn, index) => (
            <div key={btn.id} className="p-3 border border-border rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={btn.label}
                  onChange={(e) => updateButton(index, { label: e.target.value })}
                  placeholder="Label"
                  className="flex-1"
                />
                <Input
                  value={btn.url}
                  onChange={(e) => updateButton(index, { url: e.target.value })}
                  placeholder="URL"
                  className="flex-1"
                />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeButton(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Fond</Label>
                  <input
                    type="color"
                    value={btn.style.bg}
                    onChange={(e) => updateButtonStyle(index, { bg: e.target.value })}
                    className="h-8 w-10 cursor-pointer rounded border border-border"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Texte</Label>
                  <input
                    type="color"
                    value={btn.style.text}
                    onChange={(e) => updateButtonStyle(index, { text: e.target.value })}
                    className="h-8 w-10 cursor-pointer rounded border border-border"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Taille</Label>
                  <Input
                    type="number"
                    value={btn.style.fontSize || 10}
                    onChange={(e) => updateButtonStyle(index, { fontSize: Number(e.target.value) })}
                    className="w-16 h-8"
                    min={8}
                    max={24}
                  />
                </div>
              </div>
            </div>
          ))}
          {hudButtons.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun bouton configuré</p>
          )}
        </CardContent>
      </Card>

      {/* Sidebar Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Apparence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Couleur de fond</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={designSettings.sidebarBg}
                onChange={(e) => updateDesignSettings({ sidebarBg: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded border border-border"
              />
              <Input
                value={designSettings.sidebarBg}
                onChange={(e) => updateDesignSettings({ sidebarBg: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Dégradé</Label>
            <Switch
              checked={designSettings.sidebarGradient}
              onCheckedChange={(v) => updateDesignSettings({ sidebarGradient: v })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Categories Tab ───
function CategoriesTab() {
  const { designSettings, updateDesignSettings } = useApp();
  const categories = designSettings.categories || [];

  const updateCategory = (index: number, updates: Partial<Category>) => {
    const newCats = [...categories];
    newCats[index] = { ...newCats[index], ...updates };
    updateDesignSettings({ categories: newCats });
  };

  const addCategory = () => {
    updateDesignSettings({
      categories: [...categories, { id: generateId(), title: 'Nouvelle catégorie', image: '' }],
    });
    toast.success('Catégorie ajoutée');
  };

  const removeCategory = (index: number) => {
    updateDesignSettings({ categories: categories.filter((_, i) => i !== index) });
    toast.success('Catégorie supprimée');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Catégories</h3>
          <p className="text-sm text-muted-foreground">Vignettes affichées sur la page d'accueil</p>
        </div>
        <Button onClick={addCategory} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Ajouter
        </Button>
      </div>

      {categories.map((cat, index) => (
        <Card key={cat.id}>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <Input
                value={cat.title}
                onChange={(e) => updateCategory(index, { title: e.target.value })}
                placeholder="Titre"
                className="flex-1"
              />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeCategory(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <FileDropZone
              accept={['image']}
              folder="categories"
              currentFile={cat.image}
              onUpload={(url) => updateCategory(index, { image: url })}
              label="Image de la catégorie"
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Hotspots Tab ───
function HotspotsTab() {
  const { designSettings, updateDesignSettings } = useApp();
  const hotspots = designSettings.mannequinHotspots || [];

  const updateHotspot = (index: number, updates: Partial<MannequinHotspotConfig>) => {
    const newHotspots = [...hotspots];
    newHotspots[index] = { ...newHotspots[index], ...updates };
    updateDesignSettings({ mannequinHotspots: newHotspots });
  };

  const addHotspot = () => {
    updateDesignSettings({
      mannequinHotspots: [...hotspots, { id: generateId(), x: '50%', y: '50%', label: 'NOUVEAU', details: 'Description', icon: 'Shield' }],
    });
    toast.success('Hotspot ajouté');
  };

  const removeHotspot = (index: number) => {
    updateDesignSettings({ mannequinHotspots: hotspots.filter((_, i) => i !== index) });
    toast.success('Hotspot supprimé');
  };

  const ICONS = ['Shield', 'Package', 'Layers', 'Move'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Hotspots du mannequin</h3>
          <p className="text-sm text-muted-foreground">Points interactifs sur l'image de la sidebar</p>
        </div>
        <Button onClick={addHotspot} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Ajouter
        </Button>
      </div>

      {hotspots.map((hs, index) => (
        <Card key={hs.id}>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <Input value={hs.label} onChange={(e) => updateHotspot(index, { label: e.target.value })} placeholder="Label" className="flex-1" />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeHotspot(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Input value={hs.details} onChange={(e) => updateHotspot(index, { details: e.target.value })} placeholder="Détails" />
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Position X</Label>
                <Input value={hs.x} onChange={(e) => updateHotspot(index, { x: e.target.value })} placeholder="50%" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Position Y</Label>
                <Input value={hs.y} onChange={(e) => updateHotspot(index, { y: e.target.value })} placeholder="50%" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Icône</Label>
                <select
                  value={hs.icon}
                  onChange={(e) => updateHotspot(index, { icon: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {hotspots.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">Aucun hotspot configuré</CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Catalogue Tab ───
function CatalogueTab() {
  const { designSettings, updateDesignSettings } = useApp();
  const mode = designSettings.colorDisplayMode || 'swatches';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Affichage des variantes couleur</CardTitle>
          <CardDescription>Choisissez comment les couleurs sont affichées sur la fiche produit</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Mode d'affichage</Label>
              <p className="text-xs text-muted-foreground mt-1">
                {mode === 'swatches' ? 'Pastilles de couleur rondes' : 'Miniatures d\'images produit'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium ${mode === 'swatches' ? 'text-foreground' : 'text-muted-foreground'}`}>Pastilles</span>
              <Switch
                checked={mode === 'images'}
                onCheckedChange={(v) => updateDesignSettings({ colorDisplayMode: v ? 'images' : 'swatches' })}
              />
              <span className={`text-xs font-medium ${mode === 'images' ? 'text-foreground' : 'text-muted-foreground'}`}>Images</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ───
export default function AdminDesign() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Design & Visuels</h1>
        <p className="text-muted-foreground mt-1">Gérez le hero slider, le logo, la sidebar et le catalogue</p>
      </div>

      <Tabs defaultValue="hero" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="hero">Hero Slider</TabsTrigger>
          <TabsTrigger value="logo">Logo</TabsTrigger>
          <TabsTrigger value="sidebar">Sidebar</TabsTrigger>
          <TabsTrigger value="categories">Catégories</TabsTrigger>
          <TabsTrigger value="hotspots">Hotspots</TabsTrigger>
          <TabsTrigger value="catalogue">Catalogue</TabsTrigger>
        </TabsList>

        <TabsContent value="hero">
          <HeroSliderTab />
        </TabsContent>
        <TabsContent value="logo">
          <LogoTab />
        </TabsContent>
        <TabsContent value="sidebar">
          <SidebarTab />
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesTab />
        </TabsContent>
        <TabsContent value="hotspots">
          <HotspotsTab />
        </TabsContent>
        <TabsContent value="catalogue">
          <CatalogueTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
