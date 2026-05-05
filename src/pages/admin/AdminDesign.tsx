import { useState } from 'react';
import type React from 'react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { FileDropZone } from '@/components/admin/FileDropZone';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { HeroSlide, HUDStat, HUDButton, MannequinHotspotConfig, Category, MarkerType } from '@/types';
import {
  Plus, Trash2, ChevronUp, ChevronDown, GripVertical, Eye, EyeOff,
  LayoutDashboard, ImagePlay, PanelTop, Image, PanelLeft, Grid3x3, Crosshair, BookOpen, Save, Loader2,
  Pencil, Check, X, Palette, RotateCcw, ExternalLink, AlertCircle,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { HeaderDesignTab } from '@/components/admin/HeaderDesignTab';
import { AiTextButton } from '@/components/admin/AiTextButton';
import { AiImageButton } from '@/components/admin/AiImageButton';
import { useProducts } from '@/hooks/useProducts';
import { useSaveDesignSettings } from '@/hooks/useDesignSettings';
import { CategoryFormDialog } from '@/components/admin/CategoryFormDialog';
import {
  useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory,
  CategoryRecord,
} from '@/hooks/useCategories';
import { usePages, useUpsertPage } from '@/hooks/usePages';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function generateId() {
  return `id-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
}

// ─── Nav items ───
const NAV_ITEMS = [
  { key: 'disposition', label: 'Disposition', icon: LayoutDashboard, desc: 'Presets globaux' },
  { key: 'hero',        label: 'Hero Slider',  icon: ImagePlay,       desc: 'Slides & parallaxe' },
  { key: 'header',      label: 'Header',       icon: PanelTop,        desc: 'Barre de navigation' },
  { key: 'logo',        label: 'Logo & Marque',icon: Image,           desc: 'Identité visuelle' },
  { key: 'couleurs',    label: 'Couleurs',     icon: Palette,         desc: 'Palette & thème' },
  { key: 'sidebar',     label: 'Sidebar',      icon: PanelLeft,       desc: 'Panneau latéral' },
  { key: 'categories',  label: 'Catégories',   icon: Grid3x3,         desc: 'Grille d\'accueil' },
  { key: 'hotspots',    label: 'Hotspots',     icon: Crosshair,       desc: 'Points interactifs' },
  { key: 'catalogue',   label: 'Catalogue',    icon: BookOpen,        desc: 'Affichage produits' },
  { key: 'admin-colors', label: 'Couleurs Admin', icon: Palette,      desc: 'Sections du dashboard' },
];

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
      {/* Header section */}
      <div className="rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/20 p-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <ImagePlay className="h-4 w-4 text-primary" />
            Hero Slider
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Slides avec 3 couches de parallaxe</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/20 text-primary text-xs font-bold px-3 py-1 border border-primary/30">
            {slides.length} slide{slides.length !== 1 ? 's' : ''}
          </span>
          <Button onClick={addSlide} size="sm" className="bg-primary text-primary-foreground">
            <Plus className="h-4 w-4 mr-1.5" /> Ajouter
          </Button>
        </div>
      </div>

      {/* Presets rapides */}
      <Card className="border-accent/20">
        <CardHeader className="pb-3 bg-gradient-to-r from-accent/10 to-transparent rounded-t-lg">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-accent-foreground/70 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
            Presets rapides
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {[
              { id: 'fullscreen', name: 'Plein écran',  desc: '100vh',  height: '100vh', grayscale: false, speed: 6000,  color: 'from-blue-500/10' },
              { id: 'half',       name: 'Demi-écran',   desc: '60vh',   height: '60vh',  grayscale: false, speed: 6000,  color: 'from-emerald-500/10' },
              { id: 'banner',     name: 'Bannière',     desc: '40vh',   height: '40vh',  grayscale: false, speed: 5000,  color: 'from-amber-500/10' },
              { id: 'cinematic',  name: 'Cinématique',  desc: '80vh N&B', height: '80vh', grayscale: true, speed: 10000, color: 'from-purple-500/10' },
              { id: 'minimal',    name: 'Minimal',      desc: '50vh',   height: '50vh',  grayscale: false, speed: 8000,  color: 'from-rose-500/10' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  updateDesignSettings({ sliderHeight: p.height, sliderGrayscale: p.grayscale, sliderSpeed: p.speed } as any);
                  toast.success(`Preset "${p.name}" appliqué`);
                }}
                className={cn(
                  "border border-border hover:border-primary/50 rounded-lg p-3 text-left transition-all bg-gradient-to-br to-transparent",
                  p.color
                )}
              >
                <p className="text-xs font-bold">{p.name}</p>
                <p className="text-[10px] text-muted-foreground">{p.desc}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Paramètres globaux */}
      <Card>
        <CardHeader className="pb-3 bg-gradient-to-r from-secondary/50 to-transparent rounded-t-lg">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-muted-foreground inline-block" />
            Paramètres globaux
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <Label className="text-sm">Lecture automatique</Label>
              <Switch
                checked={designSettings.sliderAutoPlay}
                onCheckedChange={(v) => updateDesignSettings({ sliderAutoPlay: v })}
              />
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <Label className="text-sm">Overlay gradient</Label>
              <Switch
                checked={designSettings.showSliderOverlay}
                onCheckedChange={(v) => updateDesignSettings({ showSliderOverlay: v })}
              />
            </div>
            <div className="flex items-center justify-between py-1">
              <Label className="text-sm">Noir & blanc</Label>
              <Switch
                checked={designSettings.sliderGrayscale}
                onCheckedChange={(v) => updateDesignSettings({ sliderGrayscale: v })}
              />
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Vitesse : {(designSettings.sliderSpeed / 1000).toFixed(1)}s</Label>
              <Slider
                value={[designSettings.sliderSpeed]}
                min={2000} max={15000} step={500}
                onValueChange={([v]) => updateDesignSettings({ sliderSpeed: v })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Opacité : {Math.round((designSettings.sliderImageOpacity ?? 1) * 100)}%</Label>
              <Slider
                value={[(designSettings.sliderImageOpacity ?? 1) * 100]}
                min={10} max={100} step={5}
                onValueChange={([v]) => updateDesignSettings({ sliderImageOpacity: v / 100 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Slides list */}
      {slides.map((slide, index) => {
        const bgMedia = slide.backgroundMedia || slide.media;
        const isVideo = slide.mediaType === 'video';
        const accent = slide.accentColor || '#3b82f6';
        return (
          <Card key={slide.id} className="relative overflow-hidden border-2" style={{ borderColor: `${accent}33` }}>
            {/* Slide header with accent color */}
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ background: `linear-gradient(90deg, ${accent}22, transparent)`, borderBottom: `1px solid ${accent}22` }}
            >
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: accent }}>
                  Slide {index + 1}
                </span>
                {bgMedia && (
                  <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                    {isVideo ? '🎬 Vidéo' : '🖼 Image'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSlide(index, -1)} disabled={index === 0}>
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSlide(index, 1)} disabled={index === slides.length - 1}>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => removeSlide(index)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <CardContent className="pt-4 space-y-5">
              {/* ── Live mini-preview 16:9 ── */}
              <div className="rounded-lg overflow-hidden border border-border/40 bg-muted" style={{ aspectRatio: '16/9', position: 'relative' }}>
                {bgMedia ? (
                  isVideo ? (
                    <video src={bgMedia} className="w-full h-full" style={{ objectFit: (slide.objectFit || 'cover') as any, objectPosition: slide.objectPosition || 'center' }} muted />
                  ) : (
                    <img src={bgMedia} alt={slide.title} className="w-full h-full" style={{ objectFit: (slide.objectFit || 'cover') as any, objectPosition: slide.objectPosition || 'center' }} />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                    Aucune image — ajoutez un fond ci-dessous
                  </div>
                )}
                {/* Overlay preview */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent pointer-events-none" />
                {/* Text preview */}
                <div className="absolute bottom-2 left-3 pointer-events-none">
                  <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: accent }}>{slide.subtitle || 'Sous-titre'}</p>
                  <p className="text-[11px] font-bold text-white leading-tight mt-0.5">{slide.title || 'Titre'}</p>
                  <div className="mt-1 px-2 py-0.5 text-[8px] font-bold uppercase rounded" style={{ backgroundColor: accent, color: '#fff' }}>
                    {slide.ctaText || 'CTA'}
                  </div>
                </div>
              </div>

              {/* ── Médias 3 couches ── */}
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1 mb-3">
                  Couches parallaxe
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block text-blue-400/80">🏔 Fond (lent)</Label>
                    <FileDropZone
                      accept={['image', 'video']}
                      folder="hero/background"
                      currentFile={slide.backgroundMedia || slide.media || ''}
                      onUpload={(url) => {
                        if (!url) {
                          // Clear both fields when removing
                          updateSlide(index, { backgroundMedia: '', media: '', mediaType: 'image' });
                        } else {
                          const isVid = /\.(mp4|webm|mov|ogg)$/i.test(url);
                          updateSlide(index, { backgroundMedia: url, media: url, mediaType: isVid ? 'video' : 'image' });
                        }
                      }}
                      label="Fond (défilement lent)"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block text-emerald-400/80">🌿 Intermédiaire</Label>
                    <FileDropZone
                      accept={['image']}
                      folder="hero/midground"
                      currentFile={slide.midgroundMedia || ''}
                      onUpload={(url) => updateSlide(index, { midgroundMedia: url })}
                      label="Décor (défilement moyen)"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block text-amber-400/80">✨ Premier plan</Label>
                    <FileDropZone
                      accept={['image']}
                      folder="hero/foreground"
                      currentFile={slide.foregroundMedia || ''}
                      onUpload={(url) => updateSlide(index, { foregroundMedia: url })}
                      label="Sujet (rapide)"
                    />
                  </div>
                </div>
              </div>

              {/* ── Mobile ── */}
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1 mb-3">
                  Média mobile (optionnel)
                </p>
                <FileDropZone
                  accept={['image', 'video']}
                  folder="hero/mobile"
                  currentFile={(slide as any).mobileImage || ''}
                  onUpload={(url) => {
                    const isVid = /\.(mp4|webm|mov|ogg)$/i.test(url);
                    updateSlide(index, { mobileImage: url, mobileMediaType: isVid ? 'video' : 'image' } as any);
                  }}
                  label="Image ou vidéo mobile (si vide → desktop utilisé)"
                />
              </div>

              {/* ── Affichage ── */}
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1 mb-3">
                  Affichage & position
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Desktop fit</Label>
                    <Select value={slide.objectFit || 'cover'} onValueChange={(v) => updateSlide(index, { objectFit: v as any })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cover">Cover</SelectItem>
                        <SelectItem value="contain">Contain</SelectItem>
                        <SelectItem value="fill">Remplir</SelectItem>
                        <SelectItem value="none">Original</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Desktop position</Label>
                    <Select value={slide.objectPosition || 'center'} onValueChange={(v) => updateSlide(index, { objectPosition: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="center">Centre</SelectItem>
                        <SelectItem value="top">Haut</SelectItem>
                        <SelectItem value="bottom">Bas</SelectItem>
                        <SelectItem value="left">Gauche</SelectItem>
                        <SelectItem value="right">Droite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Mobile fit</Label>
                    <Select value={slide.mobileObjectFit || 'cover'} onValueChange={(v) => updateSlide(index, { mobileObjectFit: v as any })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cover">Cover</SelectItem>
                        <SelectItem value="contain">Contain</SelectItem>
                        <SelectItem value="fill">Remplir</SelectItem>
                        <SelectItem value="none">Original</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Mobile position</Label>
                    <Select value={slide.mobileObjectPosition || 'center'} onValueChange={(v) => updateSlide(index, { mobileObjectPosition: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="center">Centre</SelectItem>
                        <SelectItem value="top">Haut</SelectItem>
                        <SelectItem value="bottom">Bas</SelectItem>
                        <SelectItem value="left">Gauche</SelectItem>
                        <SelectItem value="right">Droite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* ── Texte & couleur ── */}
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1 mb-3">
                  Contenu textuel
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Titre</Label>
                    <Input
                      value={slide.title}
                      onChange={(e) => updateSlide(index, { title: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Sous-titre</Label>
                    <Input
                      value={slide.subtitle}
                      onChange={(e) => updateSlide(index, { subtitle: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Texte du bouton CTA</Label>
                    <Input
                      value={slide.ctaText}
                      onChange={(e) => updateSlide(index, { ctaText: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Couleur d'accent</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={slide.accentColor || '#3b82f6'}
                        onChange={(e) => updateSlide(index, { accentColor: e.target.value })}
                        className="h-9 w-12 cursor-pointer rounded border border-border flex-shrink-0"
                      />
                      <Input
                        value={slide.accentColor || '#3b82f6'}
                        onChange={(e) => updateSlide(index, { accentColor: e.target.value })}
                        className="flex-1 h-9"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {slides.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center">
            <ImagePlay className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Aucune slide configurée.</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Cliquez sur "Ajouter" pour créer votre première slide.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Logo Tab ───
function LogoTab() {
  const { designSettings, updateDesignSettings } = useApp();

  return (
    <div className="space-y-6">
      {/* Live Preview */}
      {designSettings.hudLogo && (
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Aperçu du logo actuel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {/* Dark background preview */}
              <div className="rounded-lg p-6 flex items-center justify-center bg-black border border-border">
                <img src={designSettings.hudLogo} alt="Logo" className="h-12 w-auto object-contain max-w-[160px]" />
              </div>
              {/* Light background preview */}
              <div className="rounded-lg p-6 flex items-center justify-center bg-muted border border-border">
                <img src={designSettings.hudLogo} alt="Logo" className="h-12 w-auto object-contain max-w-[160px]" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">Fond sombre / Fond clair</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Brand Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identité de marque</CardTitle>
            <CardDescription>Footer, titre de l'onglet et header</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nom du site</Label>
              <Input
                value={designSettings.siteName ?? ''}
                onChange={(e) => updateDesignSettings({ siteName: e.target.value })}
                placeholder="Ex : LVTK6 CONCEPT"
              />
            </div>
            <div className="space-y-2">
              <Label>Slogan</Label>
              <Input
                value={designSettings.siteTagline ?? ''}
                onChange={(e) => updateDesignSettings({ siteTagline: e.target.value })}
                placeholder="Ex : Équipement tactique urbain"
              />
            </div>
            <div className="space-y-2">
              <Label>Email de contact</Label>
              <Input
                type="email"
                value={designSettings.contactEmail ?? ''}
                onChange={(e) => updateDesignSettings({ contactEmail: e.target.value })}
                placeholder="contact@monsite.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Téléphone (optionnel)</Label>
              <Input
                type="tel"
                value={designSettings.contactPhone ?? ''}
                onChange={(e) => updateDesignSettings({ contactPhone: e.target.value })}
                placeholder="+33 6 00 00 00 00"
              />
            </div>
          </CardContent>
        </Card>

        {/* Logos */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Logo principal</CardTitle>
              <CardDescription>Utilisé dans le header, la sidebar et le splash screen. PNG, JPG, SVG recommandé.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileDropZone
                accept={['image']}
                folder="branding"
                currentFile={designSettings.hudLogo}
                onUpload={(url) => updateDesignSettings({ hudLogo: url })}
                label="Glissez votre logo ici ou cliquez — PNG, JPG, SVG, GIF"
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Logo du footer</CardTitle>
              <CardDescription>Optionnel — utilise le logo principal par défaut</CardDescription>
            </CardHeader>
            <CardContent>
              <FileDropZone
                accept={['image']}
                folder="branding"
                currentFile={(designSettings as any).footerLogo}
                onUpload={(url) => updateDesignSettings({ footerLogo: url } as any)}
                label="Logo du footer"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Favicon</CardTitle>
              <CardDescription>Icône de l'onglet navigateur</CardDescription>
            </CardHeader>
            <CardContent>
              <FileDropZone
                accept={['image']}
                folder="branding"
                currentFile={(designSettings as any).faviconUrl}
                onUpload={(url) => updateDesignSettings({ faviconUrl: url } as any)}
                label="PNG, ICO, SVG"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Preset SVG Thumbnails ───
function PresetThumbnailClassic() {
  return (
    <svg viewBox="0 0 80 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="80" height="120" fill="#0a0a0a"/>
      {/* mannequin image area */}
      <rect x="8" y="8" width="64" height="52" rx="2" fill="#1a1a1a"/>
      <rect x="8" y="8" width="64" height="52" rx="2" fill="url(#img-classic)" opacity="0.7"/>
      {/* product card */}
      <rect x="8" y="66" width="64" height="28" rx="2" fill="#181818" stroke="#333" strokeWidth="0.5"/>
      <rect x="13" y="71" width="30" height="3" rx="1" fill="#e5e5e5" opacity="0.8"/>
      <rect x="13" y="77" width="22" height="2" rx="1" fill="#666"/>
      <rect x="13" y="82" width="14" height="2.5" rx="1" fill="#3b82f6" opacity="0.9"/>
      {/* stat bars */}
      <rect x="8" y="100" width="64" height="2" rx="1" fill="#222"/>
      <rect x="8" y="100" width="52" height="2" rx="1" fill="#fff" opacity="0.7"/>
      <rect x="8" y="106" width="64" height="2" rx="1" fill="#222"/>
      <rect x="8" y="106" width="30" height="2" rx="1" fill="#fff" opacity="0.5"/>
      <rect x="8" y="112" width="64" height="2" rx="1" fill="#222"/>
      <rect x="8" y="112" width="44" height="2" rx="1" fill="#fff" opacity="0.6"/>
      <defs>
        <linearGradient id="img-classic" x1="8" y1="8" x2="72" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#555"/>
          <stop offset="1" stopColor="#111"/>
        </linearGradient>
      </defs>
    </svg>
  );
}
function PresetThumbnailMinimal() {
  return (
    <svg viewBox="0 0 80 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="80" height="120" fill="#0a0a0a"/>
      {/* full-height image, no content */}
      <rect x="8" y="8" width="64" height="104" rx="2" fill="#1a1a1a" opacity="0.85"/>
      <rect x="8" y="8" width="64" height="104" rx="2" fill="url(#img-min)" opacity="0.55"/>
      {/* single brand label at bottom */}
      <rect x="22" y="100" width="36" height="3" rx="1" fill="#fff" opacity="0.25"/>
      <defs>
        <linearGradient id="img-min" x1="8" y1="8" x2="72" y2="112" gradientUnits="userSpaceOnUse">
          <stop stopColor="#444"/>
          <stop offset="1" stopColor="#0a0a0a"/>
        </linearGradient>
      </defs>
    </svg>
  );
}
function PresetThumbnailParallax() {
  return (
    <svg viewBox="0 0 80 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="80" height="120" fill="#0d0d0d"/>
      {/* gradient overlay */}
      <rect x="0" y="0" width="80" height="120" fill="url(#grad-par)" opacity="0.6"/>
      {/* image */}
      <rect x="8" y="8" width="64" height="48" rx="2" fill="#1a1a1a" opacity="0.9"/>
      {/* product card */}
      <rect x="8" y="62" width="64" height="24" rx="2" fill="#161616" stroke="#2a2a2a" strokeWidth="0.5"/>
      <rect x="13" y="67" width="28" height="2.5" rx="1" fill="#e5e5e5" opacity="0.75"/>
      <rect x="13" y="72" width="20" height="2" rx="1" fill="#555"/>
      {/* stat bars */}
      <rect x="8" y="92" width="64" height="1.5" rx="1" fill="#222"/>
      <rect x="8" y="92" width="48" height="1.5" rx="1" fill="#fff" opacity="0.65"/>
      <rect x="8" y="97" width="64" height="1.5" rx="1" fill="#222"/>
      <rect x="8" y="97" width="35" height="1.5" rx="1" fill="#fff" opacity="0.5"/>
      <rect x="8" y="102" width="64" height="1.5" rx="1" fill="#222"/>
      <rect x="8" y="102" width="55" height="1.5" rx="1" fill="#fff" opacity="0.6"/>
      {/* animated shimmer line */}
      <rect x="0" y="56" width="80" height="1" fill="url(#shimmer)" opacity="0.4"/>
      <defs>
        <linearGradient id="grad-par" x1="0" y1="0" x2="80" y2="120" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1a0a3a"/>
          <stop offset="0.5" stopColor="#0d0d0d"/>
          <stop offset="1" stopColor="#0a1a1a"/>
        </linearGradient>
        <linearGradient id="shimmer" x1="0" y1="0" x2="80" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="transparent"/>
          <stop offset="0.5" stopColor="#fff"/>
          <stop offset="1" stopColor="transparent"/>
        </linearGradient>
      </defs>
    </svg>
  );
}
function PresetThumbnailVitrine() {
  return (
    <svg viewBox="0 0 80 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="80" height="120" fill="#111"/>
      {/* strong gradient */}
      <rect x="0" y="0" width="80" height="120" fill="url(#grad-vit)" opacity="0.85"/>
      {/* image */}
      <rect x="8" y="8" width="64" height="55" rx="2" fill="#1c1c1c" opacity="0.7"/>
      {/* product card */}
      <rect x="8" y="68" width="64" height="18" rx="2" fill="#191919" stroke="#2d2d2d" strokeWidth="0.5"/>
      <rect x="13" y="73" width="34" height="2.5" rx="1" fill="#f0f0f0" opacity="0.8"/>
      <rect x="13" y="78" width="18" height="2" rx="1" fill="#888"/>
      {/* mini gallery at bottom */}
      <rect x="8" y="92" width="20" height="20" rx="1" fill="#1e1e1e"/>
      <rect x="30" y="92" width="20" height="20" rx="1" fill="#1e1e1e"/>
      <rect x="52" y="92" width="20" height="20" rx="1" fill="#1e1e1e"/>
      <defs>
        <linearGradient id="grad-vit" x1="0" y1="0" x2="80" y2="120" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2d1b69"/>
          <stop offset="0.5" stopColor="#111"/>
          <stop offset="1" stopColor="#0a2a2a"/>
        </linearGradient>
      </defs>
    </svg>
  );
}
function PresetThumbnailDark() {
  return (
    <svg viewBox="0 0 80 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="80" height="120" fill="#050505"/>
      {/* very dark image, barely visible */}
      <rect x="8" y="8" width="64" height="72" rx="2" fill="#111" opacity="0.25"/>
      {/* product number chip */}
      <rect x="52" y="10" width="18" height="10" rx="1" fill="#1a1a1a"/>
      <rect x="55" y="13" width="12" height="2" rx="1" fill="#fff" opacity="0.4"/>
      {/* only stat bars visible */}
      <rect x="8" y="88" width="64" height="2" rx="1" fill="#1a1a1a"/>
      <rect x="8" y="88" width="55" height="2" rx="1" fill="#fff" opacity="0.8"/>
      <rect x="8" y="95" width="64" height="2" rx="1" fill="#1a1a1a"/>
      <rect x="8" y="95" width="28" height="2" rx="1" fill="#fff" opacity="0.6"/>
      <rect x="8" y="102" width="64" height="2" rx="1" fill="#1a1a1a"/>
      <rect x="8" y="102" width="44" height="2" rx="1" fill="#fff" opacity="0.7"/>
    </svg>
  );
}
function PresetThumbnailCatalog() {
  return (
    <svg viewBox="0 0 80 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="80" height="120" fill="#0a0a0a"/>
      {/* 2 product images side by side */}
      <rect x="4" y="8" width="34" height="46" rx="2" fill="#1a1a1a"/>
      <rect x="42" y="8" width="34" height="46" rx="2" fill="#1a1a1a"/>
      {/* active indicator on left */}
      <rect x="4" y="8" width="34" height="46" rx="2" stroke="#fff" strokeWidth="1" opacity="0.25"/>
      {/* product info */}
      <rect x="4" y="60" width="72" height="2.5" rx="1" fill="#e5e5e5" opacity="0.7"/>
      <rect x="4" y="66" width="50" height="2" rx="1" fill="#555"/>
      <rect x="4" y="72" width="22" height="2.5" rx="1" fill="#3b82f6" opacity="0.8"/>
      {/* size badges */}
      <rect x="4" y="80" width="14" height="10" rx="1" fill="#181818" stroke="#333" strokeWidth="0.5"/>
      <rect x="21" y="80" width="14" height="10" rx="1" fill="#181818" stroke="#333" strokeWidth="0.5"/>
      <rect x="38" y="80" width="14" height="10" rx="1" fill="#181818" stroke="#333" strokeWidth="0.5"/>
      <rect x="55" y="80" width="14" height="10" rx="1" fill="#181818" stroke="#333" strokeWidth="0.5"/>
      {/* rotation dots */}
      <circle cx="32" cy="108" r="2.5" fill="#fff" opacity="0.8"/>
      <circle cx="40" cy="108" r="1.5" fill="#fff" opacity="0.3"/>
      <circle cx="47" cy="108" r="1.5" fill="#fff" opacity="0.3"/>
    </svg>
  );
}

const PRESET_THUMBNAILS: Record<string, React.FC> = {
  classic:  PresetThumbnailClassic,
  minimal:  PresetThumbnailMinimal,
  parallax: PresetThumbnailParallax,
  vitrine:  PresetThumbnailVitrine,
  dark:     PresetThumbnailDark,
  catalog:  PresetThumbnailCatalog,
};

// ─── Sidebar Presets ───
const SIDEBAR_PRESETS = [
  {
    id: 'classic',
    name: 'Classique',
    desc: 'Image + carte + stats',
    settings: {
      showSidebarProductCard: true,
      showSidebarSizes: true,
      showSidebarStats: true,
      showSidebarGallery: true,
      showSidebarProductNumber: true,
      sidebarBg: '#0a0a0a',
      sidebarGradient: false,
      gradientIntensity: 0,
      sidebarImageOpacity: 1,
      sidebarSliderEnabled: true,
      sidebarSliderSpeed: 6000,
      sidebarSliderMaxProducts: 5,
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    desc: 'Image seule, sans surcharge',
    settings: {
      showSidebarProductCard: false,
      showSidebarSizes: false,
      showSidebarStats: false,
      showSidebarGallery: false,
      showSidebarProductNumber: false,
      sidebarBg: '#0a0a0a',
      sidebarGradient: false,
      gradientIntensity: 0,
      sidebarImageOpacity: 0.85,
      sidebarSliderEnabled: false,
      sidebarSliderSpeed: 6000,
      sidebarSliderMaxProducts: 3,
    },
  },
  {
    id: 'parallax',
    name: 'Parallaxe',
    desc: 'Image + gradient animé',
    settings: {
      showSidebarProductCard: true,
      showSidebarSizes: true,
      showSidebarStats: true,
      showSidebarGallery: true,
      showSidebarProductNumber: true,
      sidebarBg: '#0d0d0d',
      sidebarGradient: true,
      gradientIntensity: 60,
      sidebarImageOpacity: 0.9,
      sidebarSliderEnabled: true,
      sidebarSliderSpeed: 8000,
      sidebarSliderMaxProducts: 5,
    },
  },
  {
    id: 'vitrine',
    name: 'Vitrine',
    desc: 'Gradient fort + galerie',
    settings: {
      showSidebarProductCard: true,
      showSidebarSizes: false,
      showSidebarStats: false,
      showSidebarGallery: true,
      showSidebarProductNumber: false,
      sidebarBg: '#111111',
      sidebarGradient: true,
      gradientIntensity: 85,
      sidebarImageOpacity: 0.7,
      sidebarSliderEnabled: true,
      sidebarSliderSpeed: 5000,
      sidebarSliderMaxProducts: 4,
    },
  },
  {
    id: 'dark',
    name: 'Sombre',
    desc: 'Fond très sombre + stats',
    settings: {
      showSidebarProductCard: false,
      showSidebarSizes: false,
      showSidebarStats: true,
      showSidebarGallery: false,
      showSidebarProductNumber: true,
      sidebarBg: '#050505',
      sidebarGradient: false,
      gradientIntensity: 0,
      sidebarImageOpacity: 0.25,
      sidebarSliderEnabled: true,
      sidebarSliderSpeed: 7000,
      sidebarSliderMaxProducts: 5,
    },
  },
  {
    id: 'catalog',
    name: 'Catalogue',
    desc: 'Rotation rapide de produits',
    settings: {
      showSidebarProductCard: true,
      showSidebarSizes: true,
      showSidebarStats: false,
      showSidebarGallery: true,
      showSidebarProductNumber: true,
      sidebarBg: '#0a0a0a',
      sidebarGradient: false,
      gradientIntensity: 0,
      sidebarImageOpacity: 0.6,
      sidebarSliderEnabled: true,
      sidebarSliderSpeed: 4000,
      sidebarSliderMaxProducts: 8,
    },
  },
];

function isPresetActive(presetSettings: Record<string, any>, designSettings: any): boolean {
  return Object.entries(presetSettings).every(([k, v]) => {
    const current = designSettings[k];
    if (typeof v === 'number') return Math.abs((current ?? 0) - v) < 0.01;
    return current === v;
  });
}

// ─── Sidebar Live Preview ───
const PREVIEW_DEFAULT_STATS = [
  { label: 'Durabilité', value: 85 },
  { label: 'Qualité/prix', value: 45 },
  { label: 'Tendance', value: 92 },
];

function SidebarLivePreview() {
  const { designSettings } = useApp();
  const { data: products = [] } = useProducts();
  const product = products[0] ?? null;

  const brandPosition = (designSettings as any).sidebarBrandPosition ?? 'top';
  const stats = designSettings.stats && designSettings.stats.length > 0 ? designSettings.stats : PREVIEW_DEFAULT_STATS;
  const sizes = designSettings.sidebarSizes && designSettings.sidebarSizes.length > 0
    ? designSettings.sidebarSizes
    : ['S', 'M', 'L', 'XL'];

  const sidebarBg = designSettings.sidebarBg || '#0a0a0a';
  const sidebarImage = designSettings.sidebarImage || null;
  const sidebarImageOpacity = designSettings.sidebarImageOpacity ?? 1;
  const sidebarGradient = designSettings.sidebarGradient ?? false;
  const brandName = designSettings.sidebarBrandName || '';
  const brandSubtitle = designSettings.sidebarBrandSubtitle || '';
  const infoText = designSettings.sidebarInfoText || '';

  const hasBrand = brandName || brandSubtitle;

  const brandBlockPreview = hasBrand ? (
    <div>
      {brandName && (
        <p className="font-bold text-[9px] tracking-[0.12em] uppercase" style={{ color: 'rgba(255,255,255,0.95)' }}>
          {brandName}
        </p>
      )}
      {brandSubtitle && (
        <p className="font-mono text-[7px] tracking-[0.18em] uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {brandSubtitle}
        </p>
      )}
    </div>
  ) : null;

  const filledColor = designSettings.statBarFilledColor || '#ffffff';
  const emptyColor = designSettings.statBarEmptyColor || 'rgba(255,255,255,0.15)';

  return (
    <div className="sticky top-6 xl:order-last">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Aperçu live</span>
        <span className="h-px flex-1 bg-border" />
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary uppercase tracking-wider">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Live
        </span>
      </div>

      {/* Sidebar simulation at ~260px natural width, tall aspect */}
      <div
        className="relative w-full overflow-hidden rounded-lg border border-border shadow-xl"
        style={{ aspectRatio: '9 / 20', background: sidebarBg }}
      >
        {/* Background image */}
        {sidebarImage && (
          <img
            src={sidebarImage}
            alt="Sidebar background"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: sidebarImageOpacity }}
          />
        )}

        {/* Gradient overlay */}
        {sidebarGradient && (
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.7) 100%)',
            }}
          />
        )}

        {/* HUD content overlay */}
        <div className="absolute inset-0 flex flex-col justify-between p-3" style={{ paddingTop: '2rem' }}>

          {/* Top zone */}
          <div className="flex items-start justify-between">
            {brandPosition === 'top' && brandBlockPreview}
            {brandPosition !== 'top' && <div />}
            {(designSettings as any).showSidebarProductNumber !== false && product?.sku && (
              <div className="bg-foreground flex items-center justify-center px-1.5 py-0.5 ml-auto">
                <span className="font-mono text-[8px] font-bold text-background">
                  {product.sku.split('-').pop()?.replace(/\D/g, '').padStart(3, '0') || '001'}
                </span>
              </div>
            )}
          </div>

          {/* Center zone */}
          <div className="flex-1 flex flex-col justify-center gap-2 py-2">
            {brandPosition === 'center' && brandBlockPreview}

            {/* Product card */}
            {(designSettings as any).showSidebarProductCard !== false && product && (
              <div className="bg-background/10 backdrop-blur-sm border border-white/10 rounded p-2 space-y-1">
                <p className="font-bold text-[9px] uppercase tracking-wider text-white leading-tight line-clamp-1">
                  {product.name}
                </p>
                {product.subtitle && (
                  <p className="font-mono text-[7px] text-white/50 line-clamp-1">{product.subtitle}</p>
                )}
                <div className="flex items-center gap-1.5 mt-1">
                  {product.salePrice && product.salePrice < product.price ? (
                    <>
                      <span className="font-bold text-[9px] text-white">{product.salePrice}€</span>
                      <span className="text-[7px] text-white/40 line-through">{product.price}€</span>
                    </>
                  ) : (
                    <span className="font-bold text-[9px] text-white">{product.price}€</span>
                  )}
                </div>
              </div>
            )}

            {/* Size badges */}
            {(designSettings as any).showSidebarSizes !== false && (
              <div className="flex flex-wrap gap-1">
                {sizes.slice(0, 4).map((size: string) => (
                  <div key={size} className="flex flex-col items-center bg-background/10 border border-white/10 px-1.5 py-0.5">
                    <span className="font-mono text-[6px] tracking-wider text-white/50">Taille</span>
                    <span className="font-bold text-[8px] uppercase text-white">{size}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Stats */}
            {(designSettings as any).showSidebarStats !== false && (
              <div className="space-y-1.5 mt-1">
                <div className="flex items-center gap-1.5">
                  <p className="font-mono text-[7px] tracking-[0.18em] uppercase text-white/60">Caractéristiques</p>
                  <div className="h-px flex-1 bg-white/20" />
                </div>
                {stats.slice(0, 3).map((stat: { label: string; value: number }, i: number) => (
                  <div key={i} className="space-y-0.5">
                    <div className="flex justify-between">
                      <span className="font-mono text-[7px] uppercase tracking-wider text-white/70">{stat.label}</span>
                      <span className="font-mono text-[7px] text-white/50">{stat.value}%</span>
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 10 }).map((_, idx) => (
                        <div
                          key={idx}
                          className="h-1 flex-1 rounded-[1px]"
                          style={{
                            backgroundColor: idx < Math.round((stat.value / 100) * 10) ? filledColor : emptyColor,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom zone */}
          <div className="space-y-2">
            {brandPosition === 'bottom' && brandBlockPreview}

            {/* CTA buttons */}
            {designSettings.hudButtons && designSettings.hudButtons.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {designSettings.hudButtons.slice(0, 2).map((btn) => (
                  <div
                    key={btn.id}
                    className="px-2 py-1 text-[7px] font-bold uppercase tracking-wider"
                    style={{ backgroundColor: btn.style.bg, color: btn.style.text }}
                  >
                    {btn.label}
                  </div>
                ))}
              </div>
            )}

            {/* Info bar */}
            {infoText && (
              <p className="font-mono text-[7px] tracking-[0.18em] uppercase text-white/40">{infoText}</p>
            )}
          </div>
        </div>

        {/* "APERÇU LIVE" watermark badge */}
        <div className="absolute top-2 right-2 bg-primary/80 backdrop-blur-sm px-1.5 py-0.5 rounded-sm">
          <span className="font-mono text-[7px] font-bold tracking-widest uppercase text-primary-foreground">Aperçu</span>
        </div>
      </div>

      {/* Info note */}
      <p className="text-[10px] text-muted-foreground mt-2 text-center">Mise à jour en temps réel</p>
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

  const addStat = () => updateDesignSettings({ stats: [...stats, { label: 'NOUVEAU', value: 50 }] });
  const removeStat = (index: number) => updateDesignSettings({ stats: stats.filter((_, i) => i !== index) });

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
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_240px] gap-6 items-start">
    <div className="space-y-6">

      {/* ── Presets ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Presets Sidebar</CardTitle>
          <CardDescription>Cliquez pour appliquer — le preset actif est surligné en vert</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SIDEBAR_PRESETS.map((p) => {
              const active = isPresetActive(p.settings, designSettings);
              const Thumbnail = PRESET_THUMBNAILS[p.id];
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    updateDesignSettings(p.settings as any);
                    toast.success(`Preset "${p.name}" appliqué`);
                  }}
                  className={cn(
                    'relative border-2 rounded-lg overflow-hidden text-left transition-all group',
                    active
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  {/* SVG thumbnail */}
                  <div className="w-full aspect-[2/3] bg-[#0a0a0a] relative overflow-hidden">
                    {Thumbnail && <Thumbnail />}
                    {/* hover overlay */}
                    <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors duration-200" />
                  </div>
                  {/* active checkmark badge */}
                  {active && (
                    <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary shadow-lg">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                  {/* label row */}
                  <div className={cn(
                    'px-2.5 py-2 border-t',
                    active ? 'border-primary/40 bg-primary/5' : 'border-border'
                  )}>
                    <p className="text-xs font-bold leading-tight">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{p.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Row 2: Réapparition + Apparence ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Réapparition automatique</CardTitle>
            <CardDescription>Délai avant réouverture après fermeture</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Activée</Label>
              <Switch
                checked={((designSettings as any).sidebarReappearDelay ?? 10000) > 0}
                onCheckedChange={(checked) => updateDesignSettings({ sidebarReappearDelay: checked ? 30000 : 0 } as any)}
              />
            </div>
            {((designSettings as any).sidebarReappearDelay ?? 10000) > 0 && (
              <div className="flex gap-2">
                {[{ label: '10s', value: 10000 }, { label: '30s', value: 30000 }, { label: '1 min', value: 60000 }].map(opt => (
                  <Button
                    key={opt.value}
                    size="sm"
                    variant={((designSettings as any).sidebarReappearDelay ?? 10000) === opt.value ? 'default' : 'outline'}
                    onClick={() => updateDesignSettings({ sidebarReappearDelay: opt.value } as any)}
                    className="flex-1"
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Apparence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Couleur de fond</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={designSettings.sidebarBg}
                  onChange={(e) => updateDesignSettings({ sidebarBg: e.target.value })}
                  className="h-9 w-12 cursor-pointer rounded border border-border"
                />
                <Input
                  value={designSettings.sidebarBg}
                  onChange={(e) => updateDesignSettings({ sidebarBg: e.target.value })}
                  className="flex-1 h-9"
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

      {/* ── Row 3: Images mannequin + Identité de marque ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Image du mannequin</CardTitle>
            <CardDescription>Photo de fond du panneau latéral</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs font-medium mb-2 block">Desktop</Label>
              <FileDropZone
                accept={['image']}
                folder="sidebar"
                currentFile={designSettings.sidebarImage}
                onUpload={(url) => updateDesignSettings({ sidebarImage: url })}
                label="Image desktop"
              />
            </div>
            <div>
              <Label className="text-xs font-medium mb-2 block">Mobile (optionnel)</Label>
              <FileDropZone
                accept={['image', 'video']}
                folder="sidebar/mobile"
                currentFile={(designSettings as any).mobileSidebarImage}
                onUpload={(url) => {
                  const isVideo = /\.(mp4|webm|mov|ogg)$/i.test(url);
                  updateDesignSettings({ mobileSidebarImage: url, mobileSidebarMediaType: isVideo ? 'video' : 'image' } as any);
                }}
                label="Image ou vidéo mobile"
              />
              <p className="text-xs text-muted-foreground mt-1">Si vide, l'image desktop est utilisée.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Opacité ({Math.round((designSettings.sidebarImageOpacity ?? 1) * 100)}%)</Label>
              <Slider
                value={[(designSettings.sidebarImageOpacity ?? 1) * 100]}
                min={0} max={100} step={5}
                onValueChange={([v]) => updateDesignSettings({ sidebarImageOpacity: v / 100 })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Identité de marque */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Identité de marque</CardTitle>
              <CardDescription>Laissez vide pour ne rien afficher sur la sidebar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Nom de marque</Label>
                <Input
                  value={designSettings.sidebarBrandName || ''}
                  onChange={(e) => updateDesignSettings({ sidebarBrandName: e.target.value })}
                  placeholder="(vide = rien n'est affiché)"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sous-titre</Label>
                <Input
                  value={designSettings.sidebarBrandSubtitle || ''}
                  onChange={(e) => updateDesignSettings({ sidebarBrandSubtitle: e.target.value })}
                  placeholder="(vide = rien n'est affiché)"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Position sur l'image</Label>
                <div className="flex gap-2">
                  {[
                    { label: 'Haut', value: 'top' },
                    { label: 'Milieu', value: 'center' },
                    { label: 'Bas', value: 'bottom' },
                  ].map(opt => (
                    <Button
                      key={opt.value}
                      size="sm"
                      variant={((designSettings as any).sidebarBrandPosition ?? 'top') === opt.value ? 'default' : 'outline'}
                      onClick={() => updateDesignSettings({ sidebarBrandPosition: opt.value } as any)}
                      className="flex-1"
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Texte info (bas)</Label>
                <Input
                  value={designSettings.sidebarInfoText || ''}
                  onChange={(e) => updateDesignSettings({ sidebarInfoText: e.target.value })}
                  placeholder="(vide = rien n'est affiché)"
                />
              </div>
            </CardContent>
          </Card>

          {/* Carte produit texte */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Carte produit</CardTitle>
              <CardDescription>Laissez vide pour utiliser le produit actif</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Titre personnalisé</Label>
                <Input
                  value={designSettings.sidebarProductTitle || ''}
                  onChange={(e) => updateDesignSettings({ sidebarProductTitle: e.target.value })}
                  placeholder="(nom du produit actif)"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Input
                  value={designSettings.sidebarProductDescription || ''}
                  onChange={(e) => updateDesignSettings({ sidebarProductDescription: e.target.value })}
                  placeholder="(sous-titre du produit actif)"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 3: Éléments visibles + Tailles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Éléments visibles</CardTitle>
            <CardDescription>Activez ou désactivez les composants</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: 'showSidebarProductNumber', label: 'Numéro de produit (SKU)' },
              { key: 'showSidebarProductCard',   label: 'Carte produit' },
              { key: 'showSidebarSizes',         label: 'Sélecteurs de taille' },
              { key: 'showSidebarGallery',       label: 'Galerie miniature' },
              { key: 'showSidebarStats',         label: 'Barres de statistiques' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-1">
                <Label className="text-sm">{label}</Label>
                <Switch
                  checked={Boolean((designSettings as any)[key] ?? true)}
                  onCheckedChange={(v) => updateDesignSettings({ [key]: v } as any)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tailles affichées</CardTitle>
            <CardDescription>Cochez les tailles à proposer</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
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
                    className={cn(
                      'px-4 py-2 border text-sm font-bold uppercase transition-colors rounded',
                      isActive
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-background text-muted-foreground border-border hover:border-foreground'
                    )}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Barres de stats + Couleurs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Barres de statistiques</CardTitle>
              <CardDescription>Indicateurs affichés sur la sidebar</CardDescription>
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
                className="w-36"
                placeholder="Label"
              />
              <div className="flex-1 space-y-1">
                <Slider value={[stat.value]} min={0} max={100} step={1} onValueChange={([v]) => updateStat(index, { value: v })} />
              </div>
              <span className="text-sm font-mono text-muted-foreground w-10 text-right">{stat.value}%</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeStat(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {stats.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Aucune barre configurée</p>
          )}
          <div className="border-t border-border pt-4 flex items-center gap-6">
            <Label className="text-xs font-semibold uppercase tracking-wider">Couleurs</Label>
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
        </CardContent>
      </Card>

      {/* Row 5: Boutons de la sidebar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Boutons de la sidebar</CardTitle>
              <CardDescription>Boutons d'action CTA</CardDescription>
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
                <Input value={btn.label} onChange={(e) => updateButton(index, { label: e.target.value })} placeholder="Label" className="flex-1" />
                <Input value={btn.url} onChange={(e) => updateButton(index, { url: e.target.value })} placeholder="URL" className="flex-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeButton(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Fond</Label>
                  <input type="color" value={btn.style.bg} onChange={(e) => updateButtonStyle(index, { bg: e.target.value })} className="h-8 w-10 cursor-pointer rounded border border-border" />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Texte</Label>
                  <input type="color" value={btn.style.text} onChange={(e) => updateButtonStyle(index, { text: e.target.value })} className="h-8 w-10 cursor-pointer rounded border border-border" />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Taille police</Label>
                  <Input type="number" value={btn.style.fontSize || 10} onChange={(e) => updateButtonStyle(index, { fontSize: Number(e.target.value) })} className="w-16 h-8" min={8} max={24} />
                </div>
              </div>
            </div>
          ))}
          {hudButtons.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun bouton configuré</p>
          )}
        </CardContent>
      </Card>
    </div>

      {/* Live Preview — sticky right column */}
      <SidebarLivePreview />
    </div>
  );
}

const CATEGORY_PRESETS = [
  { id: 'compact',  name: 'Grille compacte',   description: '4 colonnes, ratio 4:3',     columns: 4, aspectRatio: '4/3',  gap: 'sm' },
  { id: 'square',   name: 'Grille carrée',      description: '4 colonnes, ratio 1:1',     columns: 4, aspectRatio: '1/1',  gap: 'md' },
  { id: 'portrait', name: 'Grille portrait',    description: '4 colonnes, ratio 3:4',     columns: 4, aspectRatio: '3/4',  gap: 'md' },
  { id: 'banner',   name: 'Bande horizontale',  description: '4 colonnes, ratio 16:9',    columns: 4, aspectRatio: '16/9', gap: 'sm' },
  { id: 'wide',     name: '2 colonnes larges',  description: '2 colonnes, ratio 16:9',    columns: 2, aspectRatio: '16/9', gap: 'lg' },
];

// ─── Sortable category card ───
function SortableCategoryCard({
  cat,
  onEdit,
  onDelete,
  linkedPage,
  onCreatePage,
}: {
  cat: CategoryRecord;
  onEdit: (cat: CategoryRecord) => void;
  onDelete: (id: string) => void;
  linkedPage?: { id: string; slug: string } | null;
  onCreatePage: (cat: CategoryRecord) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const updateCategory = useUpdateCategory();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-xl overflow-hidden border border-border bg-card",
        "transition-shadow hover:shadow-md",
        isDragging && "shadow-xl ring-2 ring-primary/40"
      )}
    >
      {/* Image background */}
      <div className="relative h-32 bg-muted overflow-hidden">
        {cat.image ? (
          <img src={cat.image} alt={cat.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Pas d'image</div>
        )}
        {/* Quick image upload overlay */}
        <label className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
          <div className="flex flex-col items-center gap-1 text-foreground">
            <Image className="h-5 w-5" />
            <span className="text-[10px] font-semibold">Changer l'image</span>
          </div>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const { supabase } = await import('@/integrations/supabase/client');
              const ext = file.name.split('.').pop();
              const path = `categories/${Date.now()}.${ext}`;
              const { data, error } = await supabase.storage.from('media').upload(path, file, { upsert: true });
              if (error) { toast.error('Erreur upload'); return; }
              const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(data.path);
              updateCategory.mutate({ ...cat, image: publicUrl }, {
                onSuccess: () => toast.success('Image mise à jour'),
                onError: () => toast.error('Erreur de sauvegarde'),
              });
            }}
          />
        </label>
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 p-1 bg-background/70 rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4 text-foreground" />
        </div>

        {/* Page link status badge */}
        <div className="absolute top-2 right-2">
          {linkedPage ? (
            <Badge variant="outline" className="text-[10px] bg-green-500/20 text-green-400 border-green-500/40 gap-1">
              <Check className="h-2.5 w-2.5" /> Page liée
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] bg-destructive/20 text-destructive border-destructive/40 gap-1">
              <AlertCircle className="h-2.5 w-2.5" /> Aucune page
            </Badge>
          )}
        </div>
      </div>

      {/* Info row */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{cat.title}</p>
            {cat.slug && <p className="text-xs text-muted-foreground font-mono truncate">/{cat.slug}</p>}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => onEdit(cat)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" onClick={() => onDelete(cat.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Page action button */}
        {linkedPage ? (
          <a
            href={`/admin/pages?edit=${linkedPage.id}`}
            className="flex items-center gap-1.5 text-[11px] text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" /> Éditer la page dédiée
          </a>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 text-[11px] gap-1.5"
            onClick={() => onCreatePage(cat)}
          >
            <Plus className="h-3 w-3" /> Créer la page
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Categories Tab ───
function CategoriesTab() {
  const { designSettings, updateDesignSettings } = useApp();
  const { data: dbCategories = [] } = useCategories();
  const { data: allPages = [] } = usePages();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const upsertPage = useUpsertPage();
  const [editCat, setEditCat] = useState<CategoryRecord | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Separate root and sub-categories
  const rootCats = dbCategories.filter(c => !c.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
  const subCats = dbCategories.filter(c => !!c.parentId);

  // Build a map: categoryId → page
  const pagesByCategoryId = new Map(
    allPages.filter(p => p.categoryId).map(p => [p.categoryId!, { id: p.id, slug: p.slug }])
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rootCats.findIndex(c => c.id === active.id);
    const newIndex = rootCats.findIndex(c => c.id === over.id);
    const reordered = arrayMove(rootCats, oldIndex, newIndex);
    reordered.forEach((cat, idx) => {
      if (cat.sortOrder !== idx) {
        updateCategory.mutate({ ...cat, sortOrder: idx });
      }
    });
  }

  // Create a dedicated page for a category
  function handleCreatePage(cat: CategoryRecord) {
    const slug = cat.slug || cat.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    upsertPage.mutate({
      title: cat.title,
      slug,
      type: 'category',
      categoryId: cat.id,
      isPublished: true,
      sections: [],
    }, {
      onSuccess: () => toast.success(`Page "/${slug}" créée et liée à ${cat.title}`),
      onError: (e: any) => toast.error(`Erreur: ${e.message}`),
    });
  }

  return (
    <div className="space-y-6">
      {/* Grid layout presets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Disposition de la grille</CardTitle>
          <CardDescription>Choisissez un preset de mise en page</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {CATEGORY_PRESETS.map((preset) => {
              const currentPreset = (designSettings as any).categoryLayout?.preset;
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    updateDesignSettings({ categoryLayout: { preset: preset.id, columns: preset.columns, aspectRatio: preset.aspectRatio, gap: preset.gap }, categoryColumns: preset.columns } as any);
                    toast.success(`Preset "${preset.name}" appliqué`);
                  }}
                  className={cn(
                    "border-2 rounded-lg p-3 transition-all text-left",
                    currentPreset === preset.id
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <p className="text-sm font-bold">{preset.name}</p>
                  <p className="text-xs text-muted-foreground">{preset.description}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* DB Categories management */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Catégories ({rootCats.length})</h3>
          <p className="text-sm text-muted-foreground">Glissez pour réordonner · Survolez une carte pour changer l'image</p>
        </div>
        <Button size="sm" onClick={() => { setEditCat(undefined); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-1.5" /> Nouvelle catégorie
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rootCats.map(c => c.id)} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rootCats.map(cat => (
              <div key={cat.id}>
                <SortableCategoryCard
                  cat={cat}
                  linkedPage={pagesByCategoryId.get(cat.id) || null}
                  onEdit={(c) => { setEditCat(c); setFormOpen(true); }}
                  onDelete={(id) => {
                    if (!confirm('Supprimer cette catégorie ?')) return;
                    deleteCategory.mutate(id, {
                      onSuccess: () => toast.success('Catégorie supprimée'),
                      onError: () => toast.error('Erreur lors de la suppression'),
                    });
                  }}
                  onCreatePage={handleCreatePage}
                />
                {/* Sub-categories */}
                {subCats.filter(s => s.parentId === cat.id).map(sub => (
                  <div key={sub.id} className="mt-2 ml-4 rounded-lg border border-border bg-muted/30 flex items-center gap-2 px-3 py-2">
                    {sub.image && <img src={sub.image} alt={sub.title} className="h-8 w-8 rounded object-cover" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{sub.title}</p>
                      {sub.slug && <p className="text-[10px] text-muted-foreground font-mono">/{sub.slug}</p>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditCat(sub); setFormOpen(true); }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => {
                      if (!confirm('Supprimer ?')) return;
                      deleteCategory.mutate(sub.id);
                    }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ))}
            {rootCats.length === 0 && (
              <div className="col-span-3 border-2 border-dashed border-border rounded-xl p-10 text-center text-muted-foreground text-sm">
                Aucune catégorie. Cliquez sur "Nouvelle catégorie" pour commencer.
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editCat}
        categories={dbCategories}
        onSubmit={(data) => {
          if (editCat) {
            updateCategory.mutate({ ...data, id: editCat.id }, {
              onSuccess: () => { toast.success('Catégorie mise à jour'); setFormOpen(false); },
              onError: () => toast.error('Erreur lors de la mise à jour'),
            });
          } else {
            // Create category then auto-create its page
            createCategory.mutate({ ...data, sortOrder: rootCats.length }, {
              onSuccess: () => {
                toast.success('Catégorie créée');
                setFormOpen(false);
                // Auto-create the dedicated page after a brief delay to let the category be saved
                // (the page will be linked via slug matching, not categoryId, until the user refreshes)
                if (data.slug) {
                  setTimeout(() => {
                    upsertPage.mutate({
                      title: data.title,
                      slug: data.slug!,
                      type: 'category',
                      isPublished: true,
                      sections: [],
                    }, {
                      onSuccess: () => toast.success(`Page "/${data.slug}" créée automatiquement`),
                    });
                  }, 500);
                }
              },
              onError: () => toast.error('Erreur lors de la création'),
            });
          }
        }}
      />
    </div>
  );
}

// ─── Hotspots Tab ───
function HotspotsTab() {
  const { designSettings, updateDesignSettings } = useApp();
  const { data: products = [] } = useProducts();
  const hotspots = designSettings.mannequinHotspots || [];
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const updateHotspot = (index: number, updates: Partial<MannequinHotspotConfig>) => {
    const newHotspots = [...hotspots];
    newHotspots[index] = { ...newHotspots[index], ...updates };
    updateDesignSettings({ mannequinHotspots: newHotspots });
  };

  const addHotspot = () => {
    updateDesignSettings({
      mannequinHotspots: [...hotspots, { id: generateId(), x: '50%', y: '50%', label: 'NOUVEAU', details: 'Description', icon: 'Shield', enabled: true, markerType: 'dot', contentMode: 'manual' }],
    });
    toast.success('Hotspot ajouté');
  };

  const removeHotspot = (index: number) => {
    updateDesignSettings({ mannequinHotspots: hotspots.filter((_, i) => i !== index) });
    toast.success('Hotspot supprimé');
  };

  const ICONS = ['Shield', 'Package', 'Layers', 'Move'];
  const MARKER_TYPES: { value: MarkerType; label: string }[] = [
    { value: 'dot', label: '● Point' },
    { value: 'cross', label: '✕ Croix' },
    { value: 'diamond', label: '◆ Losange' },
    { value: 'square', label: '■ Carré' },
    { value: 'ring', label: '○ Anneau' },
  ];

  const handlePreviewMouseDown = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    setDragIndex(index);
  };

  const handlePreviewMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragIndex === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    updateHotspot(dragIndex, { x: `${Math.round(x)}%`, y: `${Math.round(y)}%` });
  };

  const handlePreviewMouseUp = () => setDragIndex(null);
  const sidebarImage = designSettings.sidebarImage;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Presets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Presets Hotspots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'interactive', name: 'Mode interactif', desc: 'Points cliquables avec tooltip' },
                { id: 'showcase',    name: 'Mode vitrine',    desc: 'Labels statiques visibles' },
                { id: 'disabled',    name: 'Désactivé',       desc: 'Masquer tous les hotspots' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    if (p.id === 'disabled')     updateDesignSettings({ mannequinHotspots: hotspots.map(h => ({ ...h, enabled: false })) });
                    else if (p.id === 'interactive') updateDesignSettings({ mannequinHotspots: hotspots.map(h => ({ ...h, enabled: true })) });
                    toast.success(`Preset "${p.name}" appliqué`);
                  }}
                  className="border border-border hover:border-primary/60 rounded-lg p-3 text-left transition-all hover:bg-muted/40"
                >
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Visual Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aperçu visuel</CardTitle>
            <CardDescription>Glissez les points pour les repositionner</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="relative w-full border border-border rounded-lg overflow-hidden select-none"
              style={{ aspectRatio: '3/4', background: sidebarImage ? `url(${sidebarImage}) center/cover` : 'hsl(var(--muted))' }}
              onMouseMove={handlePreviewMouseMove}
              onMouseUp={handlePreviewMouseUp}
              onMouseLeave={handlePreviewMouseUp}
            >
              {!sidebarImage && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                  Aucune image sidebar configurée
                </div>
              )}
              {hotspots.map((hs, index) => (
                <div
                  key={hs.id}
                  className={cn(
                    "absolute w-5 h-5 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing transition-shadow",
                    hs.enabled !== false ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-muted-foreground/50 text-background',
                    dragIndex === index && 'ring-2 ring-primary scale-125'
                  )}
                  style={{ left: hs.x, top: hs.y, transform: 'translate(-50%, -50%)', zIndex: dragIndex === index ? 50 : 10 }}
                  onMouseDown={handlePreviewMouseDown(index)}
                >
                  <span className="text-[8px] font-bold">{index + 1}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

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
        <Card key={hs.id} className={hs.enabled === false ? 'opacity-50' : ''}>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost" size="icon" className="h-8 w-8"
                onClick={() => updateHotspot(index, { enabled: hs.enabled === false ? true : false })}
                title={hs.enabled !== false ? 'Désactiver' : 'Activer'}
              >
                {hs.enabled !== false ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
              <Input value={hs.label} onChange={(e) => updateHotspot(index, { label: e.target.value })} placeholder="Label" className="flex-1" />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeHotspot(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Input value={hs.details} onChange={(e) => updateHotspot(index, { details: e.target.value })} placeholder="Détails" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                <select value={hs.icon} onChange={(e) => updateHotspot(index, { icon: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Forme du marqueur</Label>
                <select value={hs.markerType || 'dot'} onChange={(e) => updateHotspot(index, { markerType: e.target.value as MarkerType })} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {MARKER_TYPES.map(mt => <option key={mt.value} value={mt.value}>{mt.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium mb-2 block">Média du popup</Label>
              <FileDropZone accept={['image', 'video']} folder="hotspots" currentFile={hs.media} onUpload={(url) => updateHotspot(index, { media: url })} label="Image ou vidéo du hotspot" />
            </div>
            <div className="space-y-3 border-t border-border pt-4">
              <Label className="text-xs font-semibold uppercase tracking-wider">Contenu du popup</Label>
              <div className="flex gap-2">
                <Button size="sm" variant={hs.contentMode !== 'product' ? 'default' : 'outline'} onClick={() => updateHotspot(index, { contentMode: 'manual' })}>Manuel</Button>
                <Button size="sm" variant={hs.contentMode === 'product' ? 'default' : 'outline'} onClick={() => updateHotspot(index, { contentMode: 'product' })}>Produit existant</Button>
              </div>
              {hs.contentMode === 'product' ? (
                <div className="space-y-2">
                  <Label className="text-xs">Sélectionner un produit</Label>
                  <Select value={hs.productId || ''} onValueChange={(v) => updateHotspot(index, { productId: v })}>
                    <SelectTrigger><SelectValue placeholder="Choisir un produit..." /></SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="flex items-center gap-2">
                            {p.image && <img src={p.image} alt="" className="w-5 h-5 rounded object-cover" />}
                            {p.name} — {p.price}€
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nom du produit</Label>
                    <Input value={hs.productName || ''} onChange={(e) => updateHotspot(index, { productName: e.target.value })} placeholder="Nom" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Prix (€)</Label>
                    <Input type="number" value={hs.productPrice || ''} onChange={(e) => updateHotspot(index, { productPrice: Number(e.target.value) || undefined })} placeholder="0" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Prix promo (€)</Label>
                    <Input type="number" value={hs.productSalePrice || ''} onChange={(e) => updateHotspot(index, { productSalePrice: Number(e.target.value) || undefined })} placeholder="0" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tailles (séparées par ,)</Label>
                    <Input value={hs.productSizes?.join(', ') || ''} onChange={(e) => updateHotspot(index, { productSizes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="S, M, L" />
                  </div>
                </div>
              )}
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
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Mode d'affichage</Label>
              <p className="text-xs text-muted-foreground mt-1">
                {mode === 'swatches' ? 'Pastilles de couleur rondes' : 'Miniatures d\'images produit'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn("text-xs font-medium", mode === 'swatches' ? 'text-foreground' : 'text-muted-foreground')}>Pastilles</span>
              <Switch checked={mode === 'images'} onCheckedChange={(v) => updateDesignSettings({ colorDisplayMode: v ? 'images' : 'swatches' })} />
              <span className={cn("text-xs font-medium", mode === 'images' ? 'text-foreground' : 'text-muted-foreground')}>Images</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Disposition Tab ───
function DispositionTab() {
  const { updateDesignSettings } = useApp();

  const GLOBAL_PRESETS = [
    {
      id: 'luxe-industriel',
      name: 'Luxe Industriel',
      desc: 'Hero 100vh, sidebar visible, 4 colonnes portrait, espacement compact',
      settings: { sliderHeight: '100vh', headerPreset: 'classic', categoryLayout: { preset: 'portrait', columns: 4, aspectRatio: '3/4', gap: 'md' }, siteSpacing: 'compact' },
    },
    {
      id: 'boutique-epuree',
      name: 'Boutique épurée',
      desc: 'Hero 60vh, 2 colonnes larges, header centré, espacement normal',
      settings: { sliderHeight: '60vh', headerPreset: 'centered', categoryLayout: { preset: 'wide', columns: 2, aspectRatio: '16/9', gap: 'lg' }, siteSpacing: 'normal' },
    },
    {
      id: 'vitrine-minimaliste',
      name: 'Vitrine minimaliste',
      desc: 'Hero 100vh, bannières 16:9, header minimal',
      settings: { sliderHeight: '100vh', headerPreset: 'minimal', categoryLayout: { preset: 'banner', columns: 4, aspectRatio: '16/9', gap: 'sm' }, siteSpacing: 'compact' },
    },
    {
      id: 'catalogue-dense',
      name: 'Catalogue dense',
      desc: 'Hero 40vh, compact 4/3, header fullwidth',
      settings: { sliderHeight: '40vh', headerPreset: 'fullwidth', categoryLayout: { preset: 'compact', columns: 4, aspectRatio: '4/3', gap: 'sm' }, siteSpacing: 'compact' },
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Disposition globale</h3>
        <p className="text-sm text-muted-foreground">Appliquez un style complet au site en un clic</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {GLOBAL_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => {
              updateDesignSettings(preset.settings as any);
              toast.success(`Disposition "${preset.name}" appliquée`);
            }}
            className="border-2 border-border hover:border-primary/50 rounded-lg p-5 text-left transition-all hover:shadow-md"
          >
            <p className="text-base font-bold mb-1">{preset.name}</p>
            <p className="text-sm text-muted-foreground">{preset.desc}</p>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Espacement des sections</CardTitle>
          <CardDescription>Contrôlez l'espacement global entre les sections du site</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'compact', name: 'Compact',  desc: 'Espacement minimal' },
              { id: 'normal',  name: 'Normal',   desc: 'Espacement standard' },
              { id: 'spacious',name: 'Aéré',     desc: 'Espacement large' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => updateDesignSettings({ siteSpacing: s.id } as any)}
                className="border-2 border-border hover:border-primary/50 rounded-lg p-3 text-left transition-all"
              >
                <p className="text-sm font-bold">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Colours Tab ───
function CouleursTab() {
  const { designSettings, updateDesignSettings } = useApp();
  const ds = designSettings as any;

  const HEADER_PRESETS = [
    { label: 'Classic', value: 'classic', bg: '#ffffff', text: '#000000' },
    { label: 'Dark', value: 'dark', bg: '#0a0a0a', text: '#ffffff' },
    { label: 'Trans.', value: 'transparent', bg: 'transparent', text: '#ffffff' },
    { label: 'Light', value: 'minimal', bg: '#f5f5f5', text: '#111111' },
  ];

  function update(key: string, value: string) {
    updateDesignSettings({ [key]: value } as any);
  }
  function reset(key: string) {
    updateDesignSettings({ [key]: '' } as any);
  }

  interface ColorRowProps { label: string; value: string; onChange: (v: string) => void; onReset?: () => void; }
  function ColorRow({ label, value, onChange, onReset }: ColorRowProps) {
    const display = value === 'transparent' ? '#ffffff' : (value || '#ffffff');
    return (
      <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
        <div className="flex-1">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground font-mono">{value || '— thème par défaut'}</p>
        </div>
        {onReset && (
          <button onClick={onReset} title="Réinitialiser" className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
        <input
          type="color"
          value={display}
          onChange={e => onChange(e.target.value)}
          className="w-9 h-8 rounded cursor-pointer border border-border bg-transparent flex-shrink-0"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold mb-1">Couleurs & Thème</h2>
        <p className="text-sm text-muted-foreground">Personnalisez toutes les couleurs de votre site. Cliquez sur 🔄 pour réinitialiser au thème par défaut.</p>
      </div>

      {/* Header */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Header / Navigation</CardTitle>
          <CardDescription>Presets et couleurs de la barre de navigation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {HEADER_PRESETS.map(preset => {
              const isActive = ds.headerPreset === preset.value;
              return (
                <button
                  key={preset.value}
                  onClick={() => updateDesignSettings({ headerPreset: preset.value, headerBgColor: preset.bg, headerTextColor: preset.text } as any)}
                  className={`py-2.5 rounded text-xs font-semibold border transition-all ${isActive ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary/40'}`}
                  style={{
                    background: isActive ? undefined : preset.bg === 'transparent' ? 'repeating-linear-gradient(45deg, #ccc 0, #ccc 2px, #fff 0, #fff 8px)' : preset.bg,
                    color: isActive ? undefined : preset.text === '#ffffff' ? '#000' : preset.text,
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          <div className="divide-y divide-border border border-border rounded px-3">
            <ColorRow label="Fond du header" value={ds.headerBgColor || ''} onChange={v => update('headerBgColor', v)} onReset={() => reset('headerBgColor')} />
            <ColorRow label="Texte & liens du header" value={ds.headerTextColor || ''} onChange={v => update('headerTextColor', v)} onReset={() => reset('headerTextColor')} />
          </div>
          {/* Live header preview */}
          <div className="rounded border border-border overflow-hidden" style={{ backgroundColor: ds.headerBgColor === 'transparent' ? 'rgba(0,0,0,0.5)' : (ds.headerBgColor || '#ffffff') }}>
            <div className="flex items-center justify-between px-4 py-2.5">
              {ds.hudLogo ? (
                <img src={ds.hudLogo} alt="Logo" className="h-6 w-auto object-contain" />
              ) : (
                <span className="text-sm font-bold" style={{ color: ds.headerTextColor || '#000000' }}>{ds.siteName || 'MARQUE'}</span>
              )}
              <div className="flex gap-4">
                {['Homme', 'Femme', 'Boutique', 'Contact'].map(item => (
                  <span key={item} className="text-xs font-medium" style={{ color: ds.headerTextColor || '#000000' }}>{item}</span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Global site */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Couleurs globales du site</CardTitle>
          <CardDescription>Fond, texte, accent — s'appliquent sur toutes les pages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border border border-border rounded px-3">
            <ColorRow label="Couleur primaire / accent" value={ds.accentColor || ''} onChange={v => update('accentColor', v)} onReset={() => reset('accentColor')} />
            <ColorRow label="Fond du site" value={ds.globalBgColor || ''} onChange={v => update('globalBgColor', v)} onReset={() => reset('globalBgColor')} />
            <ColorRow label="Texte principal" value={ds.globalTextColor || ''} onChange={v => update('globalTextColor', v)} onReset={() => reset('globalTextColor')} />
            <ColorRow label="Fond des cartes / sections" value={ds.globalCardColor || ''} onChange={v => update('globalCardColor', v)} onReset={() => reset('globalCardColor')} />
            <ColorRow label="Texte secondaire (muted)" value={ds.globalMutedColor || ''} onChange={v => update('globalMutedColor', v)} onReset={() => reset('globalMutedColor')} />
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Footer</CardTitle>
          <CardDescription>Couleurs du pied de page</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border border border-border rounded px-3">
            <ColorRow label="Fond du footer" value={ds.footerBgColor || ''} onChange={v => update('footerBgColor', v)} onReset={() => reset('footerBgColor')} />
            <ColorRow label="Texte du footer" value={ds.footerTextColor || ''} onChange={v => update('footerTextColor', v)} onReset={() => reset('footerTextColor')} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ───
// ─── Admin Colors Tab ───
function AdminColorsTab() {
  const { designSettings, updateDesignSettings } = useApp();

  const DEFAULT_COLORS: Record<string, string> = {
    '/admin': '#6B7280', '/admin/produits': '#3B82F6', '/admin/commandes': '#F59E0B',
    '/admin/checkout': '#10B981', '/admin/clients': '#8B5CF6', '/admin/pages': '#6366F1',
    '/admin/media': '#EC4899', '/admin/marketing': '#EF4444', '/admin/design': '#06B6D4',
    '/admin/stock': '#D97706', '/admin/colissimo': '#EAB308', '/admin/chatbot': '#14B8A6',
    '/admin/woocommerce': '#7C3AED', '/admin/audit': '#6B7280', '/admin/parametres': '#64748B',
  };

  const savedColors: Record<string, string> = (designSettings as any).adminSectionColors || {};
  const colors = { ...DEFAULT_COLORS, ...savedColors };

  const SECTIONS = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/produits', label: 'Produits' },
    { href: '/admin/commandes', label: 'Commandes' },
    { href: '/admin/checkout', label: 'Checkout' },
    { href: '/admin/clients', label: 'Clients' },
    { href: '/admin/pages', label: 'Pages' },
    { href: '/admin/media', label: 'Média' },
    { href: '/admin/marketing', label: 'Marketing' },
    { href: '/admin/design', label: 'Design' },
    { href: '/admin/stock', label: 'Stock' },
    { href: '/admin/colissimo', label: 'Colissimo' },
    { href: '/admin/chatbot', label: 'Chatbot' },
    { href: '/admin/woocommerce', label: 'WooCommerce' },
    { href: '/admin/audit', label: 'Audit' },
    { href: '/admin/parametres', label: 'Paramètres' },
  ];

  const handleColorChange = (href: string, color: string) => {
    const newColors = { ...savedColors, [href]: color };
    updateDesignSettings({ adminSectionColors: newColors } as any);
  };

  const handleReset = () => {
    updateDesignSettings({ adminSectionColors: {} } as any);
    toast.success('Couleurs réinitialisées');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-sm font-semibold">Couleurs des sections admin</CardTitle>
              <CardDescription>Personnalisez la couleur de chaque section du tableau de bord</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
              <RotateCcw className="h-3 w-3" /> Réinitialiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SECTIONS.map((section) => (
              <div key={section.href} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <input
                  type="color"
                  value={colors[section.href] || '#6B7280'}
                  onChange={(e) => handleColorChange(section.href, e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{section.label}</p>
                  <p className="text-xs text-muted-foreground font-mono">{colors[section.href]}</p>
                </div>
                <div className="w-3 h-8 rounded" style={{ backgroundColor: colors[section.href] }} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Live preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Aperçu sidebar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-card border border-border rounded-lg p-2 max-w-xs">
            {SECTIONS.slice(0, 8).map((section) => (
              <div key={section.href} className="flex items-center gap-2 px-3 py-2 rounded text-sm">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[section.href] }} />
                <span className="text-muted-foreground text-xs">{section.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const TAB_COMPONENTS: Record<string, React.ComponentType> = {
  disposition: DispositionTab,
  hero:        HeroSliderTab,
  header:      HeaderDesignTab,
  logo:        LogoTab,
  couleurs:    CouleursTab,
  sidebar:     SidebarTab,
  categories:  CategoriesTab,
  hotspots:    HotspotsTab,
  catalogue:   CatalogueTab,
  'admin-colors': AdminColorsTab,
};

export default function AdminDesign() {
  const [activeTab, setActiveTab] = useState('disposition');
  const { designSettings } = useApp();
  const saveDesign = useSaveDesignSettings();
  const ActiveComponent = TAB_COMPONENTS[activeTab] || DispositionTab;

  const handleSave = async () => {
    try {
      await saveDesign.mutateAsync(designSettings);
      toast.success('Design sauvegardé !');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-4 lg:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">Design & Visuels</h1>
          <p className="text-muted-foreground text-xs lg:text-sm mt-1">Personnalisez l'apparence de votre boutique</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saveDesign.isPending}
          className="chamfer-hud-sm gap-2 w-full sm:w-auto"
        >
          {saveDesign.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Sauvegarder
        </Button>
      </div>

      {/* Mobile tab selector */}
      <div className="md:hidden mb-4">
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NAV_ITEMS.map((item) => (
              <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6 min-h-0">
        {/* Left nav - hidden on mobile */}
        <nav className="w-52 shrink-0 hidden md:block">
          <div className="flex flex-col gap-1 sticky top-4">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={cn(
                    "flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-all w-full",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                  <div className="min-w-0">
                    <p className={cn("text-sm font-medium leading-tight", isActive ? "text-primary-foreground" : "text-foreground")}>{item.label}</p>
                    <p className={cn("text-xs mt-0.5 leading-tight truncate", isActive ? "text-primary-foreground/70" : "text-muted-foreground")}>{item.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Right content */}
        <div className="flex-1 min-w-0 pb-8">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}
