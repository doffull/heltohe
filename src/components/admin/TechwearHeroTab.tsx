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
import { Plus, Trash2, RefreshCw, Sparkles, Eye, EyeOff } from 'lucide-react';
import type { TechwearHeroConfig, TechwearColorOption } from '@/types';
import { toast } from 'sonner';
import { TechwearHero } from '@/components/home/TechwearHero';

const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

export function TechwearHeroTab() {
  const { designSettings, updateDesignSettings } = useApp();
  const cfg = designSettings.techwearHero;
  const { data: products } = useProducts();
  const linkedProduct = cfg.productId ? products?.find((p) => p.id === cfg.productId) : null;

  const update = (patch: Partial<TechwearHeroConfig>) => {
    updateDesignSettings({ techwearHero: { ...cfg, ...patch } });
  };

  const updateColor = (i: number, patch: Partial<TechwearColorOption>) => {
    const next = cfg.colorOptions.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
    update({ colorOptions: next });
  };

  const addColor = () => update({
    colorOptions: [...cfg.colorOptions, { name: 'Nouveau', hex: '#888888', image: '' }],
  });

  const removeColor = (i: number) => update({
    colorOptions: cfg.colorOptions.filter((_, idx) => idx !== i),
    defaultColor: Math.max(0, Math.min(cfg.defaultColor, cfg.colorOptions.length - 2)),
  });

  const updateStat = (i: number, patch: Partial<{ label: string; value: number }>) => {
    const next = cfg.stats.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    update({ stats: next });
  };

  const syncFromProduct = () => {
    if (!linkedProduct) return;
    let colorOptions: TechwearColorOption[] = cfg.colorOptions;
    if (linkedProduct.colorOptions?.length) {
      colorOptions = linkedProduct.colorOptions.map((c, i) => ({
        name: c.label || `Color ${i + 1}`,
        hex: c.color,
        image: c.image || linkedProduct.image,
      }));
    } else if (linkedProduct.colors?.length) {
      colorOptions = linkedProduct.colors.map((c) => ({ name: c, hex: c, image: linkedProduct.image }));
    }
    const visibleSizes = linkedProduct.sizes?.length ? linkedProduct.sizes : cfg.visibleSizes;
    update({
      colorOptions,
      visibleSizes,
      defaultSize: visibleSizes[0] || cfg.defaultSize,
      ctaPrimary: { ...cfg.ctaPrimary, href: `/boutique/${linkedProduct.id}` },
    });
    toast.success('Couleurs et tailles synchronisées depuis le produit');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/20 p-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Hero Techwear
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Carte produit dynamique reliée à un produit du catalogue
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={cfg.enabled ? 'default' : 'secondary'} className="gap-1">
            {cfg.enabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {cfg.enabled ? 'Actif' : 'Désactivé'}
          </Badge>
          <Switch checked={cfg.enabled} onCheckedChange={(v) => update({ enabled: v })} />
        </div>
      </div>

      {/* Live preview */}
      {cfg.enabled && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Aperçu en direct</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg overflow-hidden border border-border bg-black" style={{ height: 480 }}>
              <div style={{ transform: 'scale(0.6)', transformOrigin: 'top left', width: '166%', height: '166%' }}>
                <TechwearHero />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Linked product */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Produit lié</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select
            value={cfg.productId ?? '__none__'}
            onValueChange={(v) => update({ productId: v === '__none__' ? null : v })}
          >
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
              <Button size="sm" variant="outline" onClick={syncFromProduct} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Synchroniser
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
            <Select value={cfg.imageFit} onValueChange={(v) => update({ imageFit: v as any })}>
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
            <Select value={cfg.imagePosition} onValueChange={(v) => update({ imagePosition: v })}>
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
              <Switch checked={cfg.showStats} onCheckedChange={(v) => update({ showStats: v })} />
            </div>
            <div className="flex items-center justify-between rounded border px-2 py-1.5">
              <Label className="text-xs">Couleurs</Label>
              <Switch checked={cfg.showColors} onCheckedChange={(v) => update({ showColors: v })} />
            </div>
            <div className="flex items-center justify-between rounded border px-2 py-1.5">
              <Label className="text-xs">Tailles</Label>
              <Switch checked={cfg.showSizes} onCheckedChange={(v) => update({ showSizes: v })} />
            </div>
            <div className="flex items-center justify-between rounded border px-2 py-1.5">
              <Label className="text-xs">Badge MODEL</Label>
              <Switch checked={cfg.showModelBadge} onCheckedChange={(v) => update({ showModelBadge: v })} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Colors */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Couleurs ({cfg.colorOptions.length})</CardTitle>
          <Button size="sm" variant="outline" onClick={addColor} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {cfg.colorOptions.map((c, i) => (
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
              <div className="md:col-span-5 space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Image mannequin</Label>
                  <AiImageButton
                    label="Image"
                    defaultPrompt={`Mannequin techwear ${c.name}, fond transparent, plein corps`}
                    onGenerated={(url) => updateColor(i, { image: url })}
                  />
                </div>
                <FileDropZone
                  accept={['image']}
                  folder="techwear-hero"
                  currentFile={c.image}
                  onUpload={(url) => updateColor(i, { image: url })}
                  label="PNG mannequin"
                />
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
            <Select
              value={String(cfg.defaultColor)}
              onValueChange={(v) => update({ defaultColor: parseInt(v, 10) })}
            >
              <SelectTrigger className="h-8 w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {cfg.colorOptions.map((c, i) => (
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
              const isOn = cfg.visibleSizes.includes(sz);
              return (
                <button
                  key={sz}
                  type="button"
                  onClick={() => {
                    const next = isOn ? cfg.visibleSizes.filter((s) => s !== sz) : [...cfg.visibleSizes, sz];
                    update({ visibleSizes: next });
                  }}
                  className={`px-3 py-1.5 rounded border text-xs font-medium transition ${
                    isOn ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'
                  }`}
                  aria-pressed={isOn}
                >
                  {sz}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Taille par défaut :</Label>
            <Select value={cfg.defaultSize} onValueChange={(v) => update({ defaultSize: v })}>
              <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(cfg.visibleSizes.length ? cfg.visibleSizes : ALL_SIZES).map((sz) => (
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
          {cfg.stats.map((s, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              <Input
                value={s.label}
                onChange={(e) => updateStat(i, { label: e.target.value })}
                className="h-9"
                placeholder="Label"
              />
              <div className="md:col-span-2 flex items-center gap-3">
                <Slider
                  value={[s.value]}
                  min={0} max={100} step={1}
                  onValueChange={([v]) => updateStat(i, { value: v })}
                  className="flex-1"
                />
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
            <Input value={cfg.modelBadge.line1} onChange={(e) => update({ modelBadge: { ...cfg.modelBadge, line1: e.target.value } })} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Badge ligne 2</Label>
            <Input value={cfg.modelBadge.line2} onChange={(e) => update({ modelBadge: { ...cfg.modelBadge, line2: e.target.value } })} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">CTA principal — texte</Label>
            <Input value={cfg.ctaPrimary.label} onChange={(e) => update({ ctaPrimary: { ...cfg.ctaPrimary, label: e.target.value } })} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">CTA principal — lien</Label>
            <Input value={cfg.ctaPrimary.href} onChange={(e) => update({ ctaPrimary: { ...cfg.ctaPrimary, href: e.target.value } })} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">CTA secondaire — texte</Label>
            <Input value={cfg.ctaSecondary.label} onChange={(e) => update({ ctaSecondary: { ...cfg.ctaSecondary, label: e.target.value } })} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">CTA secondaire — lien</Label>
            <Input value={cfg.ctaSecondary.href} onChange={(e) => update({ ctaSecondary: { ...cfg.ctaSecondary, href: e.target.value } })} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default TechwearHeroTab;
