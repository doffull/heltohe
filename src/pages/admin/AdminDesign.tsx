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
import { HeroSlide, HUDStat } from '@/types';
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

  return (
    <div className="space-y-6">
      {/* Mannequin Image */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Image du mannequin</CardTitle>
          <CardDescription>Photo de fond du panneau latéral gauche</CardDescription>
        </CardHeader>
        <CardContent>
          <FileDropZone
            accept={['image']}
            folder="sidebar"
            currentFile={designSettings.sidebarImage}
            onUpload={(url) => updateDesignSettings({ sidebarImage: url })}
            label="Glissez l'image du mannequin"
          />
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

// ─── Main Page ───
export default function AdminDesign() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Design & Visuels</h1>
        <p className="text-muted-foreground mt-1">Gérez le hero slider, le logo et la sidebar</p>
      </div>

      <Tabs defaultValue="hero" className="space-y-6">
        <TabsList>
          <TabsTrigger value="hero">Hero Slider</TabsTrigger>
          <TabsTrigger value="logo">Logo</TabsTrigger>
          <TabsTrigger value="sidebar">Sidebar</TabsTrigger>
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
      </Tabs>
    </div>
  );
}
