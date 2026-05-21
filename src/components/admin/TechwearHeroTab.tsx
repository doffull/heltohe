import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useProducts } from '@/hooks/useProducts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileDropZone } from '@/components/admin/FileDropZone';
import { AiImageButton } from '@/components/admin/AiImageButton';
import { AiTextButton } from '@/components/admin/AiTextButton';
import { Plus, Trash2, RefreshCw, Sparkles, Eye, EyeOff, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import type { TechwearHeroConfig, TechwearHeroSlideData, TechwearColorOption, TechwearBackground } from '@/types';
import { toast } from 'sonner';
import { TechwearHero } from '@/components/home/TechwearHero';
import { getSlides, makeEmptySlide, duplicateSlide } from '@/lib/techwearHero';
import { HERO_PRESETS } from '@/config/techwearHeroPresets';
import { IconPicker } from '@/components/admin/IconPicker';

const ALL_SIZES_FALLBACK = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

const DEFAULT_BG: TechwearBackground = {
  type: 'gradient',
  gradientFrom: '#E0E0E0',
  gradientTo: '#E5E5E5',
  color: '#EBEBEB',
  overlayOpacity: 0,
};

export function TechwearHeroTab() {
  const { designSettings, updateDesignSettings, flushDesignSettings } = useApp();
  const cfg = designSettings.techwearHero;
  const { data: products } = useProducts();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await flushDesignSettings();
      toast.success('Hero Techwear enregistré');
    } catch (e) {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  // Always work on a slides[] array. Migrate legacy on first edit.
  const slides: TechwearHeroSlideData[] = useMemo(() => getSlides(cfg), [cfg]);
  const [activeId, setActiveId] = useState<string>(slides[0]?.id || '');

  const active = slides.find((s) => s.id === activeId) || slides[0];
  const activeIndex = slides.indexOf(active);
  const linkedProduct = active?.productId ? products?.find((p) => p.id === active.productId) : null;

  const persist = (newSlides: TechwearHeroSlideData[], extra: Partial<TechwearHeroConfig> = {}) => {
    // Keep top-level fields in sync with the FIRST slide for backward-compat with the legacy renderer.
    const first = newSlides[0];
    const next: TechwearHeroConfig = {
      ...cfg,
      ...(first || {}),
      enabled: cfg.enabled,
      slides: newSlides,
      ...extra,
    } as any;
    updateDesignSettings({ techwearHero: next });
  };

  const updateSlide = (id: string, patch: Partial<TechwearHeroSlideData>) => {
    persist(slides.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };
  const update = (patch: Partial<TechwearHeroSlideData>) => {
    if (!active) return;
    updateSlide(active.id, patch);
  };

  const updateColor = (i: number, patch: Partial<TechwearColorOption>) => {
    if (!active) return;
    const next = active.colorOptions.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
    update({ colorOptions: next });
  };
  const addColor = () => active && update({
    colorOptions: [...active.colorOptions, { name: 'Nouveau', hex: '#888888', image: '' }],
  });
  const removeColor = (i: number) => active && update({
    colorOptions: active.colorOptions.filter((_, idx) => idx !== i),
    defaultColor: Math.max(0, Math.min(active.defaultColor, active.colorOptions.length - 2)),
  });
  const updateStat = (i: number, patch: Partial<{ label: string; value: number }>) => {
    if (!active) return;
    const next = active.stats.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    update({ stats: next });
  };

  const syncFromProduct = () => {
    if (!linkedProduct || !active) return;
    let colorOptions: TechwearColorOption[] = active.colorOptions;
    if (linkedProduct.colorOptions?.length) {
      colorOptions = linkedProduct.colorOptions.map((c, i) => ({
        name: c.label || `Color ${i + 1}`, hex: c.color, image: c.image || linkedProduct.image,
      }));
    } else if (linkedProduct.colors?.length) {
      colorOptions = linkedProduct.colors.map((c) => ({ name: c, hex: c, image: linkedProduct.image }));
    }
    const visibleSizes = linkedProduct.sizes?.length ? linkedProduct.sizes : active.visibleSizes;
    update({
      colorOptions,
      defaultColor: 0,
      visibleSizes,
      defaultSize: visibleSizes[0] || active.defaultSize,
      ctaPrimary: {
        label: active.ctaPrimary?.label || 'ACQUÉRIR',
        href: `/boutique/${linkedProduct.id}`,
      },
      ctaSecondary: {
        label: active.ctaSecondary?.label || 'DÉTAILS',
        href: `/boutique/${linkedProduct.id}`,
      },
    });
    toast.success(`Slide « ${active.name || 'sans nom'} » synchronisée depuis ${linkedProduct.name}`);
  };

  const addSlide = () => {
    const s = makeEmptySlide(`Slide ${slides.length + 1}`);
    persist([...slides, s]);
    setActiveId(s.id);
    toast.success('Nouvelle slide ajoutée');
  };
  const duplicate = (id: string) => {
    const src = slides.find((s) => s.id === id);
    if (!src) return;
    const copy = duplicateSlide(src);
    persist([...slides, copy]);
    setActiveId(copy.id);
  };
  const removeSlide = (id: string) => {
    if (slides.length <= 1) {
      toast.error('Au moins une slide est requise');
      return;
    }
    const next = slides.filter((s) => s.id !== id);
    persist(next);
    if (activeId === id) setActiveId(next[0].id);
  };
  const moveSlide = (id: string, dir: -1 | 1) => {
    const i = slides.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= slides.length) return;
    const next = [...slides];
    [next[i], next[j]] = [next[j], next[i]];
    persist(next);
  };

  if (!active) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/20 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">Hero Techwear · Slider</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Créez plusieurs slides — chaque slide a sa propre configuration complète
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant={cfg.enabled ? 'default' : 'secondary'} className="gap-1">
            {cfg.enabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {cfg.enabled ? 'Actif' : 'Désactivé'}
          </Badge>
          <Switch checked={cfg.enabled} onCheckedChange={(v) => updateDesignSettings({ techwearHero: { ...cfg, enabled: v, slides } })} />
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
      </div>

      {/* PRESETS */}
      <Card className="p-4 border-2 border-primary/40">
        <div className="mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider">Presets layout + skin + animation</h3>
          <p className="text-xs text-muted-foreground">Applique un look complet (panneau, badge, anim titre, stats) à la slide active</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {HERO_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                update({
                  sidePanelPos: p.patch.sidePanelPos as any,
                  modelBadgePos: p.patch.modelBadgePos as any,
                  cardSize: p.patch.cardSize,
                  titleAnimation: p.patch.titleAnimation,
                  titleIcon: p.patch.titleIcon,
                  statsStyle: p.patch.statsStyle,
                  skinTokens: p.patch.skinTokens,
                } as any);
                toast.success(`Preset « ${p.name} » appliqué`);
              }}
              className="text-left border-2 border-border hover:border-primary p-3 transition"
              style={{ background: (p.patch.skinTokens.accent || '#000') + '14' }}
            >
              <div className="text-2xl mb-1">{p.emoji}</div>
              <div className="text-sm font-bold uppercase tracking-wider">{p.name}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{p.description}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="text-[9px] px-1.5 py-0.5 bg-foreground text-background uppercase tracking-wider">{p.patch.titleAnimation}</span>
                <span className="text-[9px] px-1.5 py-0.5 border border-foreground/40 uppercase tracking-wider">{p.patch.statsStyle}</span>
              </div>
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3">
          <Label className="text-xs uppercase tracking-wider">Animation titre</Label>
          <Select
            value={(active as any).titleAnimation || 'fade-up'}
            onValueChange={(v) => update({ titleAnimation: v } as any)}
          >
            <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(['none','fade-up','typewriter','glitch','neon','slide-in'] as const).map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label className="text-xs uppercase tracking-wider">Icône titre</Label>
          <div className="w-48">
            <IconPicker value={(active as any).titleIcon || 'Sparkles'} onChange={(v) => update({ titleIcon: v } as any)} />
          </div>
        </div>
      </Card>
      </div>

      {/* Slider settings */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Réglages du slider</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center justify-between rounded border px-3 py-2">
            <Label className="text-xs">Lecture auto</Label>
            <Switch checked={cfg.autoplay !== false} onCheckedChange={(v) => updateDesignSettings({ techwearHero: { ...cfg, autoplay: v, slides } })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Vitesse (ms)</Label>
            <Input type="number" min={2000} step={500}
              value={cfg.intervalMs ?? 6000}
              onChange={(e) => updateDesignSettings({ techwearHero: { ...cfg, intervalMs: parseInt(e.target.value, 10) || 6000, slides } })}
              className="h-9"
            />
          </div>
          <div className="flex items-center justify-between rounded border px-3 py-2">
            <Label className="text-xs">Flèches</Label>
            <Switch checked={cfg.showArrows !== false} onCheckedChange={(v) => updateDesignSettings({ techwearHero: { ...cfg, showArrows: v, slides } })} />
          </div>
          <div className="flex items-center justify-between rounded border px-3 py-2">
            <Label className="text-xs">Points</Label>
            <Switch checked={cfg.showDots !== false} onCheckedChange={(v) => updateDesignSettings({ techwearHero: { ...cfg, showDots: v, slides } })} />
          </div>
        </CardContent>
      </Card>

      {/* Slides list */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Slides ({slides.length})</CardTitle>
          <Button size="sm" onClick={addSlide} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Ajouter une slide
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {slides.map((s, i) => {
              const isActive = s.id === active.id;
              const cover = s.colorOptions?.[0]?.image;
              return (
                <div
                  key={s.id}
                  className={`relative rounded-lg border-2 transition cursor-pointer overflow-hidden ${
                    isActive ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/40'
                  }`}
                  onClick={() => setActiveId(s.id)}
                >
                  <div className="aspect-[16/9] bg-muted overflow-hidden">
                    {cover ? <img src={cover} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">Aucun média</div>}
                  </div>
                  <div className="p-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{s.name || `Slide ${i + 1}`}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {s.productId ? (products?.find((p) => p.id === s.productId)?.name || 'Produit lié') : 'Manuel'}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); moveSlide(s.id, -1); }} disabled={i === 0}>
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); moveSlide(s.id, 1); }} disabled={i === slides.length - 1}>
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); duplicate(s.id); }}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); removeSlide(s.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Active slide editor */}
      <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-2 text-center">
        <p className="text-xs font-bold uppercase tracking-wider">
          Édition · {active.name || `Slide ${activeIndex + 1}`}
        </p>
      </div>

      {/* Live preview (current slide only) — desktop only */}
      {cfg.enabled && (
        <Card className="hidden lg:block">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Aperçu de cette slide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg overflow-hidden border border-border bg-black" style={{ height: 480 }}>
              <div style={{ transform: 'scale(0.6)', transformOrigin: 'top left', width: '166%', height: '166%' }}>
                <TechwearHero onlySlideId={active.id} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {cfg.enabled && (
        <p className="lg:hidden text-[11px] text-muted-foreground text-center -mt-2">
          Aperçu live disponible sur écran large. Visualisez le rendu sur la page d'accueil.
        </p>
      )}

      {/* Slide identity */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Nom de la slide</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-1">
            <Input value={active.name || ''} onChange={(e) => update({ name: e.target.value })} placeholder={`Slide ${activeIndex + 1}`} />
            <AiTextButton field="slide_name" context={linkedProduct?.name} onGenerated={(v) => update({ name: v })} />
          </div>
        </CardContent>
      </Card>

      {/* Linked product */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Produit lié</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select value={active.productId ?? '__none__'} onValueChange={(v) => update({ productId: v === '__none__' ? null : v })}>
            <SelectTrigger><SelectValue placeholder="Aucun (configuration manuelle)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Aucun (configuration manuelle)</SelectItem>
              {(products || []).map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name} — {p.sku}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {linkedProduct && (
            <div className="flex items-center justify-between rounded-md bg-muted/50 p-3">
              <div className="text-xs">
                <p className="font-medium">{linkedProduct.name}</p>
                <p className="text-muted-foreground">
                  {linkedProduct.sizes?.length || 0} taille(s) · {linkedProduct.colors?.length || linkedProduct.colorOptions?.length || 0} couleur(s)
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={syncFromProduct} className="gap-1.5"
                title="Met à jour couleurs, tailles et CTA de cette slide depuis le produit lié">
                <RefreshCw className="h-3.5 w-3.5" /> Synchroniser depuis le produit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image display */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Image & affichage</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Mode d'affichage</Label>
            <Select value={active.imageFit} onValueChange={(v) => update({ imageFit: v as any })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">Cover (recadrer)</SelectItem>
                <SelectItem value="contain">Contain (entier)</SelectItem>
                <SelectItem value="fill">Remplir (étirer)</SelectItem>
                <SelectItem value="none">Original</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Position</Label>
            <Select value={active.imagePosition} onValueChange={(v) => update({ imagePosition: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="center">Centre</SelectItem>
                <SelectItem value="top">Haut</SelectItem>
                <SelectItem value="bottom">Bas</SelectItem>
                <SelectItem value="left">Gauche</SelectItem>
                <SelectItem value="right">Droite</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between rounded border px-2 py-1.5">
              <Label className="text-xs">Stats</Label>
              <Switch checked={active.showStats} onCheckedChange={(v) => update({ showStats: v })} />
            </div>
            <div className="flex items-center justify-between rounded border px-2 py-1.5">
              <Label className="text-xs">Couleurs</Label>
              <Switch checked={active.showColors} onCheckedChange={(v) => update({ showColors: v })} />
            </div>
            <div className="flex items-center justify-between rounded border px-2 py-1.5">
              <Label className="text-xs">Tailles</Label>
              <Switch checked={active.showSizes} onCheckedChange={(v) => update({ showSizes: v })} />
            </div>
            <div className="flex items-center justify-between rounded border px-2 py-1.5">
              <Label className="text-xs">Badge MODEL</Label>
              <Switch checked={active.showModelBadge} onCheckedChange={(v) => update({ showModelBadge: v })} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Background */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Arrière-plan</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(() => {
            const bg = active.background || DEFAULT_BG;
            const setBg = (patch: Partial<TechwearBackground>) => update({ background: { ...bg, ...patch } });
            return (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(['gradient', 'color', 'image', 'video'] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setBg({ type: t })}
                      className={`px-3 py-2 rounded border text-xs font-medium transition ${bg.type === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}
                    >
                      {t === 'gradient' ? 'Dégradé' : t === 'color' ? 'Couleur' : t === 'image' ? 'Image' : 'Vidéo'}
                    </button>
                  ))}
                </div>
                {bg.type === 'gradient' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Début</Label>
                      <div className="flex gap-1">
                        <input type="color" value={bg.gradientFrom || '#E0E0E0'} onChange={(e) => setBg({ gradientFrom: e.target.value })} className="h-9 w-12 rounded border" />
                        <Input value={bg.gradientFrom || ''} onChange={(e) => setBg({ gradientFrom: e.target.value })} className="h-9 flex-1 font-mono text-xs" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Fin</Label>
                      <div className="flex gap-1">
                        <input type="color" value={bg.gradientTo || '#E5E5E5'} onChange={(e) => setBg({ gradientTo: e.target.value })} className="h-9 w-12 rounded border" />
                        <Input value={bg.gradientTo || ''} onChange={(e) => setBg({ gradientTo: e.target.value })} className="h-9 flex-1 font-mono text-xs" />
                      </div>
                    </div>
                  </div>
                )}
                {bg.type === 'color' && (
                  <div className="space-y-1">
                    <Label className="text-xs">Couleur de fond</Label>
                    <div className="flex gap-1">
                      <input type="color" value={bg.color || '#EBEBEB'} onChange={(e) => setBg({ color: e.target.value })} className="h-9 w-12 rounded border" />
                      <Input value={bg.color || ''} onChange={(e) => setBg({ color: e.target.value })} className="h-9 flex-1 font-mono text-xs" />
                    </div>
                  </div>
                )}
                {(bg.type === 'image' || bg.type === 'video') && (
                  <div className="space-y-1">
                    <Label className="text-xs">{bg.type === 'video' ? 'Vidéo de fond (max 30 Mo, lecture en boucle)' : 'Image de fond'}</Label>
                    <FileDropZone
                      accept={bg.type === 'video' ? ['video'] : ['image']}
                      folder="techwear-hero-bg"
                      currentFile={bg.mediaUrl || ''}
                      onUpload={(url) => setBg({ mediaUrl: url, mediaType: bg.type as 'image' | 'video' })}
                      label={bg.type === 'video' ? 'Glissez une vidéo (mp4/webm)' : 'Glissez une image'}
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs flex justify-between">
                    <span>Opacité du voile sombre</span>
                    <span className="font-mono">{Math.round((bg.overlayOpacity ?? 0) * 100)}%</span>
                  </Label>
                  <Slider value={[Math.round((bg.overlayOpacity ?? 0) * 100)]} min={0} max={80} step={5}
                    onValueChange={([v]) => setBg({ overlayOpacity: v / 100 })}
                  />
                </div>
              </>
            );
          })()}
        </CardContent>
      </Card>

      {/* Card sizing */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Carte produit (taille & débord)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Taille de la carte</Label>
            <div className="grid grid-cols-4 gap-2">
              {(['sm', 'md', 'lg', 'xl'] as const).map((s) => (
                <button key={s} type="button" onClick={() => update({ cardSize: s })}
                  className={`px-3 py-2 rounded border text-xs font-bold uppercase transition ${(active.cardSize || 'md') === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}
                >{s}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between rounded border px-3 py-2">
            <div>
              <Label className="text-xs">Mannequin déborde de la carte</Label>
              <p className="text-[10px] text-muted-foreground">Affiche le modèle entier qui dépasse vers le haut</p>
            </div>
            <Switch checked={!!active.imageOverflow} onCheckedChange={(v) => update({ imageOverflow: v })} />
          </div>
        </CardContent>
      </Card>

      {/* Colors */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Couleurs ({active.colorOptions.length})</CardTitle>
          <Button size="sm" variant="outline" onClick={addColor} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {active.colorOptions.map((c, i) => (
            <div key={i} className="rounded-lg border p-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
              <div className="md:col-span-3 space-y-1">
                <Label className="text-xs">Nom</Label>
                <Input value={c.name} onChange={(e) => updateColor(i, { name: e.target.value })} className="h-8" />
              </div>
              <div className="md:col-span-3 space-y-1">
                <Label className="text-xs">Couleur</Label>
                <div className="flex gap-1">
                  <input type="color" value={c.hex} onChange={(e) => updateColor(i, { hex: e.target.value })} className="h-8 w-10 rounded border" />
                  <Input value={c.hex} onChange={(e) => updateColor(i, { hex: e.target.value })} className="h-8 flex-1" />
                </div>
              </div>
              <div className="md:col-span-5 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Médias mannequin (image OU vidéo, par device)</Label>
                  <AiImageButton
                    label="Image"
                    defaultPrompt={`Mannequin techwear ${c.name}, fond transparent, plein corps`}
                    onGenerated={(url) => updateColor(i, { image: url, mediaType: 'image' })}
                  />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">🖥️ Desktop (par défaut)</p>
                    <FileDropZone accept={['image', 'video']} folder="techwear-hero" currentFile={c.image}
                      onUpload={(url) => updateColor(i, { image: url, mediaType: /\.(mp4|webm)(\?|$)/i.test(url) ? 'video' : 'image' })}
                      label="Image PNG ou vidéo MP4 (max 30 Mo)"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">📱 Tablette (optionnel)</p>
                    <FileDropZone accept={['image', 'video']} folder="techwear-hero" currentFile={c.imageTablet || ''}
                      onUpload={(url) => updateColor(i, { imageTablet: url, mediaTypeTablet: /\.(mp4|webm)(\?|$)/i.test(url) ? 'video' : 'image' })}
                      label="Tablette"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">📱 Mobile (optionnel)</p>
                    <FileDropZone accept={['image', 'video']} folder="techwear-hero" currentFile={c.imageMobile || ''}
                      onUpload={(url) => updateColor(i, { imageMobile: url, mediaTypeMobile: /\.(mp4|webm)(\?|$)/i.test(url) ? 'video' : 'image' })}
                      label="Mobile"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded border px-2 py-1.5">
                    <Label className="text-xs">Vidéo en boucle</Label>
                    <Switch checked={c.videoLoop !== false} onCheckedChange={(v) => updateColor(i, { videoLoop: v })} />
                  </div>
                </div>
              </div>
              <div className="md:col-span-1 flex items-center justify-end">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeColor(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-2">
            <Label className="text-xs">Couleur par défaut :</Label>
            <Select value={String(active.defaultColor)} onValueChange={(v) => update({ defaultColor: parseInt(v, 10) })}>
              <SelectTrigger className="h-8 w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {active.colorOptions.map((c, i) => (
                  <SelectItem key={i} value={String(i)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sizes */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Tailles affichées</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {ALL_SIZES.map((sz) => {
              const isOn = active.visibleSizes.includes(sz);
              return (
                <button key={sz} type="button"
                  onClick={() => {
                    const next = isOn ? active.visibleSizes.filter((s) => s !== sz) : [...active.visibleSizes, sz];
                    update({ visibleSizes: next });
                  }}
                  className={`px-3 py-1.5 rounded border text-xs font-medium transition ${isOn ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}
                  aria-pressed={isOn}
                >{sz}</button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Taille par défaut :</Label>
            <Select value={active.defaultSize} onValueChange={(v) => update({ defaultSize: v })}>
              <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(active.visibleSizes.length ? active.visibleSizes : ALL_SIZES).map((sz) => (
                  <SelectItem key={sz} value={sz}>{sz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Statistiques</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {active.stats.map((s, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              <Input value={s.label} onChange={(e) => updateStat(i, { label: e.target.value })} className="h-9" placeholder="Label" />
              <div className="md:col-span-2 flex items-center gap-3">
                <Slider value={[s.value]} min={0} max={100} step={1} onValueChange={([v]) => updateStat(i, { value: v })} className="flex-1" />
                <span className="text-xs font-mono w-10 text-right">{s.value}%</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Model badge + CTAs */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Badge MODEL & CTAs</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Badge ligne 1</Label>
            <div className="flex gap-1">
              <Input value={active.modelBadge.line1} onChange={(e) => update({ modelBadge: { ...active.modelBadge, line1: e.target.value } })} />
              <AiTextButton field="badge_line1" context={active.name || linkedProduct?.name} onGenerated={(v) => update({ modelBadge: { ...active.modelBadge, line1: v } })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Badge ligne 2</Label>
            <div className="flex gap-1">
              <Input value={active.modelBadge.line2} onChange={(e) => update({ modelBadge: { ...active.modelBadge, line2: e.target.value } })} />
              <AiTextButton field="badge_line2" context={active.name || linkedProduct?.name} onGenerated={(v) => update({ modelBadge: { ...active.modelBadge, line2: v } })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">CTA principal — texte</Label>
            <div className="flex gap-1">
              <Input value={active.ctaPrimary.label} onChange={(e) => update({ ctaPrimary: { ...active.ctaPrimary, label: e.target.value } })} />
              <AiTextButton field="cta_primary" context={active.name || linkedProduct?.name} onGenerated={(v) => update({ ctaPrimary: { ...active.ctaPrimary, label: v } })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">CTA principal — lien</Label>
            <Input value={active.ctaPrimary.href} onChange={(e) => update({ ctaPrimary: { ...active.ctaPrimary, href: e.target.value } })} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">CTA secondaire — texte</Label>
            <div className="flex gap-1">
              <Input value={active.ctaSecondary.label} onChange={(e) => update({ ctaSecondary: { ...active.ctaSecondary, label: e.target.value } })} />
              <AiTextButton field="cta_secondary" context={active.name || linkedProduct?.name} onGenerated={(v) => update({ ctaSecondary: { ...active.ctaSecondary, label: v } })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">CTA secondaire — lien</Label>
            <Input value={active.ctaSecondary.href} onChange={(e) => update({ ctaSecondary: { ...active.ctaSecondary, href: e.target.value } })} />
          </div>
        </CardContent>
      </Card>

      <CtaDesignCard active={active} update={update} />
    </div>
  );
}

const DEFAULT_CTA_STYLE = {
  enabled: true,
  variant: 'glossy' as const,
  size: 'lg' as const,
  radius: 'md' as const,
  gap: 12,
  position: {
    desktop: { x: 50, y: 92, layout: 'row' as const },
    mobile:  { x: 50, y: 94, layout: 'column' as const },
  },
};

function CtaDesignCard({ active, update }: { active: any; update: (p: any) => void }) {
  const s = active.ctaStyle ?? DEFAULT_CTA_STYLE;
  const setS = (patch: any) => update({ ctaStyle: { ...s, ...patch } });
  const variants = [
    { v: 'glossy', label: 'Glossy' },
    { v: 'glass', label: 'Verre' },
    { v: 'neon', label: 'Néon' },
    { v: 'metal', label: 'Métal' },
    { v: 'outline', label: 'Outline' },
    { v: 'minimal', label: 'Minimal' },
  ];
  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">Design des CTA (positionnement & style)</CardTitle>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Personnalisé</Label>
          <Switch checked={!!s.enabled} onCheckedChange={(v) => setS({ enabled: v })} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs mb-2 block">Variant</Label>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {variants.map((v) => (
              <button
                key={v.v}
                type="button"
                onClick={() => setS({ variant: v.v })}
                className={`px-2 py-3 rounded border text-xs font-medium transition ${s.variant === v.v ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}
              >
                <div className={`hw-cta-btn hw-cta-v-${v.v} hw-cta-sz-sm hw-cta-rd-md mx-auto mb-1`} style={{ pointerEvents: 'none' }}>AA</div>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Taille</Label>
            <Select value={s.size} onValueChange={(v) => setS({ size: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sm">SM</SelectItem>
                <SelectItem value="md">MD</SelectItem>
                <SelectItem value="lg">LG</SelectItem>
                <SelectItem value="xl">XL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Arrondi</Label>
            <Select value={s.radius} onValueChange={(v) => setS({ radius: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                <SelectItem value="sm">Léger</SelectItem>
                <SelectItem value="md">Moyen</SelectItem>
                <SelectItem value="pill">Pilule</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Espacement (px)</Label>
            <Input type="number" min={0} max={48} value={s.gap} onChange={(e) => setS({ gap: parseInt(e.target.value, 10) || 0 })} className="h-9" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['desktop', 'mobile'] as const).map((dev) => {
            const p = s.position[dev];
            const setP = (patch: any) => setS({ position: { ...s.position, [dev]: { ...p, ...patch } } });
            return (
              <div key={dev} className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase">{dev === 'desktop' ? '🖥️ Desktop' : '📱 Mobile'}</p>
                  <Select value={p.layout} onValueChange={(v) => setP({ layout: v })}>
                    <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="row">Côte à côte</SelectItem>
                      <SelectItem value="column">Empilés</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] flex justify-between"><span>Position X</span><span className="font-mono">{p.x}%</span></Label>
                  <Slider value={[p.x]} min={0} max={100} step={1} onValueChange={([v]) => setP({ x: v })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] flex justify-between"><span>Position Y</span><span className="font-mono">{p.y}%</span></Label>
                  <Slider value={[p.y]} min={0} max={100} step={1} onValueChange={([v]) => setP({ y: v })} />
                </div>
                <div className="relative h-32 rounded border bg-muted/30 overflow-hidden">
                  <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                    <div className={`hw-cta-btn hw-cta-v-${s.variant} hw-cta-sz-sm hw-cta-rd-${s.radius}`}>CTA</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
          <div className="space-y-1">
            <Label className="text-[10px]">Fond CTA principal</Label>
            <div className="flex gap-1">
              <input type="color" value={s.primaryBg || '#ffffff'} onChange={(e) => setS({ primaryBg: e.target.value })} className="h-8 w-10 rounded border" />
              <Input value={s.primaryBg || ''} onChange={(e) => setS({ primaryBg: e.target.value })} className="h-8 text-xs" placeholder="auto" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Texte CTA principal</Label>
            <div className="flex gap-1">
              <input type="color" value={s.primaryFg || '#000000'} onChange={(e) => setS({ primaryFg: e.target.value })} className="h-8 w-10 rounded border" />
              <Input value={s.primaryFg || ''} onChange={(e) => setS({ primaryFg: e.target.value })} className="h-8 text-xs" placeholder="auto" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Fond CTA secondaire</Label>
            <div className="flex gap-1">
              <input type="color" value={s.secondaryBg || '#000000'} onChange={(e) => setS({ secondaryBg: e.target.value })} className="h-8 w-10 rounded border" />
              <Input value={s.secondaryBg || ''} onChange={(e) => setS({ secondaryBg: e.target.value })} className="h-8 text-xs" placeholder="auto" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Texte CTA secondaire</Label>
            <div className="flex gap-1">
              <input type="color" value={s.secondaryFg || '#ffffff'} onChange={(e) => setS({ secondaryFg: e.target.value })} className="h-8 w-10 rounded border" />
              <Input value={s.secondaryFg || ''} onChange={(e) => setS({ secondaryFg: e.target.value })} className="h-8 text-xs" placeholder="auto" />
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={async () => {
            try {
              const { supabase } = await import('@/integrations/supabase/client');
              const { data, error } = await supabase.functions.invoke('generate-cta-style', {
                body: { context: active.name || '' },
              });
              if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
              const preset = (data as any)?.preset;
              if (preset) {
                setS(preset);
                toast.success('Suggestion IA appliquée');
              }
            } catch (e: any) {
              toast.error(e.message || 'Erreur IA');
            }
          }}
        >
          <Sparkles className="h-3.5 w-3.5" /> Suggestion IA
        </Button>
      </CardContent>
    </Card>
  );
}

export default TechwearHeroTab;
