import { useApp } from '@/context/AppContext';
import { useCategories } from '@/hooks/useCategories';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, Trash2, Eye, Monitor, PanelTop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type React from 'react';

type HeaderPreset = 'classic' | 'centered' | 'minimal' | 'fullwidth' | 'transparent';

const PRESETS: { id: HeaderPreset; name: string; description: string; color: string; preview: React.ReactNode }[] = [
  {
    id: 'classic',
    name: 'Classique',
    description: 'Logo à gauche, nav au centre',
    color: 'from-blue-500/15',
    preview: (
      <div className="flex items-center justify-between h-full px-2">
        <div className="w-6 h-3 bg-foreground/70 rounded-sm" />
        <div className="flex gap-1.5">
          <div className="w-4 h-1.5 bg-foreground/40 rounded-sm" />
          <div className="w-4 h-1.5 bg-foreground/40 rounded-sm" />
          <div className="w-4 h-1.5 bg-foreground/40 rounded-sm" />
        </div>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-foreground/30" />
          <div className="w-2 h-2 rounded-full bg-foreground/30" />
        </div>
      </div>
    ),
  },
  {
    id: 'centered',
    name: 'Centré',
    description: 'Logo centré, navigation en dessous',
    color: 'from-violet-500/15',
    preview: (
      <div className="flex flex-col items-center justify-center h-full gap-1">
        <div className="w-8 h-3 bg-foreground/70 rounded-sm" />
        <div className="flex gap-1.5">
          <div className="w-3 h-1 bg-foreground/40 rounded-sm" />
          <div className="w-3 h-1 bg-foreground/40 rounded-sm" />
          <div className="w-3 h-1 bg-foreground/40 rounded-sm" />
        </div>
      </div>
    ),
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Logo + icônes, nav burger',
    color: 'from-emerald-500/15',
    preview: (
      <div className="flex items-center justify-between h-full px-2">
        <div className="w-6 h-3 bg-foreground/70 rounded-sm" />
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-foreground/30" />
          <div className="flex flex-col gap-0.5">
            <div className="w-3 h-0.5 bg-foreground/50" />
            <div className="w-3 h-0.5 bg-foreground/50" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'fullwidth',
    name: 'Full-width',
    description: 'Navigation étalée avec logo inline',
    color: 'from-amber-500/15',
    preview: (
      <div className="flex items-center justify-between h-full px-1">
        <div className="w-5 h-2.5 bg-foreground/70 rounded-sm" />
        <div className="flex gap-1 flex-1 justify-center">
          <div className="w-3 h-1 bg-foreground/40 rounded-sm" />
          <div className="w-3 h-1 bg-foreground/40 rounded-sm" />
          <div className="w-3 h-1 bg-foreground/40 rounded-sm" />
          <div className="w-3 h-1 bg-foreground/40 rounded-sm" />
        </div>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-foreground/30" />
          <div className="w-2 h-2 rounded-full bg-foreground/30" />
        </div>
      </div>
    ),
  },
  {
    id: 'transparent',
    name: 'Transparent',
    description: 'Se fond dans le hero',
    color: 'from-sky-500/15',
    preview: (
      <div className="flex items-center justify-between h-full px-2 bg-gradient-to-b from-foreground/10 to-transparent">
        <div className="w-6 h-3 bg-foreground/50 rounded-sm" />
        <div className="flex gap-1.5">
          <div className="w-4 h-1.5 bg-foreground/30 rounded-sm" />
          <div className="w-4 h-1.5 bg-foreground/30 rounded-sm" />
        </div>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-foreground/20" />
          <div className="w-2 h-2 rounded-full bg-foreground/20" />
        </div>
      </div>
    ),
  },
];

const SYSTEM_LINKS = [
  { label: 'Accueil', href: '/' },
  { label: 'Boutique', href: '/boutique' },
  { label: 'À Propos', href: '/a-propos' },
];

export function HeaderDesignTab() {
  const { designSettings, updateDesignSettings } = useApp();
  const { data: categories = [] } = useCategories();

  const currentPreset = (designSettings as any).headerPreset || 'classic';
  const headerBgColor = (designSettings as any).headerBgColor || '';
  const headerTextColor = (designSettings as any).headerTextColor || '';
  const headerFixed = (designSettings as any).headerFixed !== false;
  const headerNavItems: { label: string; href: string }[] = (designSettings as any).headerNavItems || [];
  const topBanner = (designSettings as any).topBanner || { enabled: false, text: '', bgColor: '#000000', textColor: '#ffffff', link: '' };

  const applyPreset = (preset: HeaderPreset) => {
    updateDesignSettings({ headerPreset: preset } as any);
    toast.success(`Preset "${PRESETS.find(p => p.id === preset)?.name}" appliqué`);
  };

  const isNavItemSelected = (href: string) => {
    return headerNavItems.some((item: any) => item.href === href);
  };

  const toggleNavItem = (label: string, href: string) => {
    if (isNavItemSelected(href)) {
      updateDesignSettings({ headerNavItems: headerNavItems.filter((item: any) => item.href !== href) } as any);
    } else {
      updateDesignSettings({ headerNavItems: [...headerNavItems, { label, href }] } as any);
    }
  };

  const removeNavItem = (href: string) => {
    updateDesignSettings({ headerNavItems: headerNavItems.filter((item: any) => item.href !== href) } as any);
  };

  const addCustomNavItem = () => {
    updateDesignSettings({ headerNavItems: [...headerNavItems, { label: 'Nouveau', href: '/boutique' }] } as any);
  };

  const updateNavItem = (index: number, updates: Partial<{ label: string; href: string }>) => {
    const newItems = [...headerNavItems];
    newItems[index] = { ...newItems[index], ...updates };
    updateDesignSettings({ headerNavItems: newItems } as any);
  };

  const updateTopBanner = (updates: Record<string, any>) => {
    updateDesignSettings({ topBanner: { ...topBanner, ...updates } } as any);
  };

  // Determine what nav items to preview
  const navPreviewItems = headerNavItems.length > 0
    ? headerNavItems.slice(0, 4)
    : [{ label: 'Accueil', href: '/' }, { label: 'Boutique', href: '/boutique' }];

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/20 p-4 flex items-center gap-3">
        <PanelTop className="h-5 w-5 text-primary flex-shrink-0" />
        <div>
          <h3 className="text-base font-bold text-foreground">Configuration du Header</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Presets, navigation, bandeau promo et couleurs</p>
        </div>
      </div>

      {/* ── LIVE PREVIEW ── */}
      <Card className="border-2 border-primary/20 overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-primary/10 to-transparent">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            Aperçu en direct
          </CardTitle>
          <CardDescription className="text-xs">Reflète vos réglages actuels</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Top banner preview */}
          {topBanner.enabled && topBanner.text && (
            <div
              className="px-4 py-1.5 text-center text-xs font-medium"
              style={{ backgroundColor: topBanner.bgColor || '#000', color: topBanner.textColor || '#fff' }}
            >
              {topBanner.text}
            </div>
          )}
          {/* Header preview */}
          <div
            className="h-14 flex items-center px-5 border-b border-border/30"
            style={{
              backgroundColor: headerBgColor || 'hsl(var(--background))',
              color: headerTextColor || 'hsl(var(--foreground))',
            }}
          >
            {currentPreset === 'centered' ? (
              <div className="w-full flex flex-col items-center justify-center gap-1">
                {designSettings.hudLogo ? (
                  <img src={designSettings.hudLogo} alt="logo" className="h-5 w-auto object-contain max-w-[80px]" />
                ) : (
                  <span className="text-xs font-bold uppercase tracking-widest opacity-80">
                    {designSettings.siteName || 'MARQUE'}
                  </span>
                )}
                <div className="flex items-center gap-3">
                  {navPreviewItems.map((item, i) => (
                    <span key={i} className="text-[10px] opacity-60">{item.label}</span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {designSettings.hudLogo ? (
                    <img src={designSettings.hudLogo} alt="logo" className="h-7 w-auto object-contain max-w-[80px]" />
                  ) : (
                    <span className="text-xs font-bold uppercase tracking-widest opacity-80">
                      {designSettings.siteName || 'MARQUE'}
                    </span>
                  )}
                </div>
                {currentPreset !== 'minimal' && (
                  <div className="flex items-center gap-4">
                    {navPreviewItems.map((item, i) => (
                      <span key={i} className="text-[11px] opacity-60">{item.label}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 opacity-50">
                  <div className="w-4 h-4 rounded-full border border-current" />
                  <div className="w-4 h-4 rounded-full border border-current" />
                </div>
              </div>
            )}
          </div>
          {/* Hero area hint */}
          <div className="h-10 bg-gradient-to-b from-muted/30 to-transparent flex items-center justify-center">
            <span className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">zone hero</span>
          </div>
          <div className="px-4 pb-3 flex items-center gap-2 flex-wrap pt-2">
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              Preset : <strong>{currentPreset}</strong>
            </span>
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {headerFixed ? '📌 Fixe' : '🔓 Normal'}
            </span>
            {headerBgColor && (
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full inline-block border border-border" style={{ backgroundColor: headerBgColor }} />
                Fond personnalisé
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── PRESETS ── */}
      <Card>
        <CardHeader className="pb-3 bg-gradient-to-r from-blue-500/10 to-transparent rounded-t-lg">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            Presets de layout
          </CardTitle>
          <CardDescription className="text-xs">Cliquez pour appliquer instantanément</CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset.id)}
                className={cn(
                  "border-2 rounded-xl p-3 transition-all text-left bg-gradient-to-br to-transparent",
                  preset.color,
                  currentPreset === preset.id
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="h-11 bg-secondary/80 rounded-lg mb-2 overflow-hidden border border-border/30">
                  {preset.preview}
                </div>
                <p className="text-xs font-bold">{preset.name}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{preset.description}</p>
                {currentPreset === preset.id && (
                  <span className="inline-block mt-1 text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold">
                    Actif
                  </span>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── NAVIGATION ── */}
      <Card>
        <CardHeader className="pb-3 bg-gradient-to-r from-emerald-500/10 to-transparent rounded-t-lg">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Liens de navigation
          </CardTitle>
          <CardDescription className="text-xs">Choisissez les liens affichés dans le header</CardDescription>
        </CardHeader>
        <CardContent className="pt-3 space-y-4">
          {/* System links */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider mb-2 block text-muted-foreground">Pages système</Label>
            <div className="space-y-2">
              {SYSTEM_LINKS.map((link) => (
                <label key={link.href} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded-lg px-2 py-1.5 transition-colors">
                  <Checkbox
                    checked={isNavItemSelected(link.href)}
                    onCheckedChange={() => toggleNavItem(link.label, link.href)}
                  />
                  <span className="text-sm font-medium">{link.label}</span>
                  <span className="text-xs text-muted-foreground ml-auto font-mono">{link.href}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Category links */}
          {categories.filter(c => !c.parentId).length > 0 && (
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider mb-2 block text-muted-foreground">Catégories</Label>
              <div className="space-y-2">
                {categories.filter(c => !c.parentId).map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded-lg px-2 py-1.5 transition-colors">
                    <Checkbox
                      checked={isNavItemSelected(`/boutique?category=${cat.title}`)}
                      onCheckedChange={() => toggleNavItem(cat.title, `/boutique?category=${cat.title}`)}
                    />
                    <span className="text-sm font-medium">{cat.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Custom links */}
          {headerNavItems.length > 0 && (
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider mb-2 block text-muted-foreground">Liens actifs & personnalisés</Label>
              <div className="space-y-2">
                {headerNavItems.map((item: any, index: number) => (
                  <div key={index} className="flex items-center gap-2 bg-muted/30 rounded-lg p-2">
                    <Input
                      value={item.label}
                      onChange={(e) => updateNavItem(index, { label: e.target.value })}
                      placeholder="Label"
                      className="flex-1 h-8 text-sm bg-background"
                    />
                    <Input
                      value={item.href}
                      onChange={(e) => updateNavItem(index, { href: e.target.value })}
                      placeholder="URL"
                      className="flex-1 h-8 text-sm bg-background font-mono"
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0" onClick={() => removeNavItem(item.href)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={addCustomNavItem} className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Ajouter un lien personnalisé
          </Button>
        </CardContent>
      </Card>

      {/* ── TOP BANNER ── */}
      <Card>
        <CardHeader className="pb-3 bg-gradient-to-r from-amber-500/10 to-transparent rounded-t-lg">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            Bandeau supérieur
          </CardTitle>
          <CardDescription className="text-xs">Barre promotionnelle au-dessus du header</CardDescription>
        </CardHeader>
        <CardContent className="pt-3 space-y-4">
          <div className="flex items-center justify-between py-1">
            <Label className="text-sm">Activer le bandeau</Label>
            <Switch
              checked={topBanner.enabled}
              onCheckedChange={(v) => updateTopBanner({ enabled: v })}
            />
          </div>
          {topBanner.enabled && (
            <>
              {/* Mini preview */}
              {topBanner.text && (
                <div
                  className="rounded-lg px-4 py-2 text-center text-xs font-medium border border-border/20"
                  style={{ backgroundColor: topBanner.bgColor || '#000', color: topBanner.textColor || '#fff' }}
                >
                  {topBanner.text}
                </div>
              )}
              {/* Presets */}
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider mb-2 block text-muted-foreground">Presets couleurs</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'neutral', name: 'Neutre', bg: '#f5f5f5', text: '#000000' },
                    { id: 'urgent',  name: 'Urgent', bg: '#dc2626', text: '#ffffff' },
                    { id: 'elegant', name: 'Élégant', bg: '#000000', text: '#d4a843' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        updateTopBanner({ bgColor: p.bg, textColor: p.text });
                        toast.success(`Couleur "${p.name}" appliquée`);
                      }}
                      className="border border-border hover:border-primary/50 rounded-lg p-2 text-left transition-all overflow-hidden"
                    >
                      <div className="h-5 rounded mb-1.5" style={{ backgroundColor: p.bg, border: '1px solid #ddd' }} />
                      <p className="text-[10px] font-medium">{p.name}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Texte du bandeau</Label>
                <Input
                  value={topBanner.text}
                  onChange={(e) => updateTopBanner({ text: e.target.value })}
                  placeholder="Ex: Livraison gratuite dès 50€ 🚚"
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Lien (optionnel)</Label>
                <Input
                  value={topBanner.link || ''}
                  onChange={(e) => updateTopBanner({ link: e.target.value })}
                  placeholder="/boutique"
                  className="h-9 font-mono text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Fond</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={topBanner.bgColor || '#000000'}
                      onChange={(e) => updateTopBanner({ bgColor: e.target.value })}
                      className="h-9 w-12 cursor-pointer rounded border border-border flex-shrink-0"
                    />
                    <Input value={topBanner.bgColor || ''} onChange={(e) => updateTopBanner({ bgColor: e.target.value })} className="flex-1 h-9 font-mono text-xs" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Texte</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={topBanner.textColor || '#ffffff'}
                      onChange={(e) => updateTopBanner({ textColor: e.target.value })}
                      className="h-9 w-12 cursor-pointer rounded border border-border flex-shrink-0"
                    />
                    <Input value={topBanner.textColor || ''} onChange={(e) => updateTopBanner({ textColor: e.target.value })} className="flex-1 h-9 font-mono text-xs" />
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── PERSONNALISATION ── */}
      <Card>
        <CardHeader className="pb-3 bg-gradient-to-r from-violet-500/10 to-transparent rounded-t-lg">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
            Couleurs & comportement
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Fond du header</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={headerBgColor || '#000000'}
                  onChange={(e) => updateDesignSettings({ headerBgColor: e.target.value } as any)}
                  className="h-9 w-12 cursor-pointer rounded border border-border flex-shrink-0"
                />
                <Input
                  value={headerBgColor}
                  onChange={(e) => updateDesignSettings({ headerBgColor: e.target.value } as any)}
                  placeholder="Auto (thème)"
                  className="flex-1 h-9 font-mono text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Texte du header</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={headerTextColor || '#ffffff'}
                  onChange={(e) => updateDesignSettings({ headerTextColor: e.target.value } as any)}
                  className="h-9 w-12 cursor-pointer rounded border border-border flex-shrink-0"
                />
                <Input
                  value={headerTextColor}
                  onChange={(e) => updateDesignSettings({ headerTextColor: e.target.value } as any)}
                  placeholder="Auto (thème)"
                  className="flex-1 h-9 font-mono text-xs"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between py-1 border-t border-border/30">
            <div>
              <Label className="text-sm">Header fixe (sticky)</Label>
              <p className="text-xs text-muted-foreground">Reste visible lors du scroll</p>
            </div>
            <Switch
              checked={headerFixed}
              onCheckedChange={(v) => updateDesignSettings({ headerFixed: v } as any)}
            />
          </div>
          <div className="flex items-center justify-between py-1 border-t border-border/30">
            <div>
              <Label className="text-sm">Afficher le logo</Label>
              <p className="text-xs text-muted-foreground">Masquer pour un look minimal</p>
            </div>
            <Switch
              checked={designSettings.showLogo !== false}
              onCheckedChange={(v) => updateDesignSettings({ showLogo: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── LOGO GLOBAL ── */}
      <Card>
        <CardHeader className="pb-3 bg-gradient-to-r from-pink-500/10 to-transparent rounded-t-lg">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-pink-500 inline-block" />
            Logo global (header / footer / favicon)
          </CardTitle>
          <CardDescription className="text-xs">Taille, forme de fond, favicon, logo footer</CardDescription>
        </CardHeader>
        <CardContent className="pt-3 space-y-5">
          {/* Size slider */}
          <div className="space-y-1.5">
            <Label className="text-xs flex justify-between">
              <span>Taille du logo</span>
              <span className="font-mono">{(designSettings as any).logoSize ?? 40}px</span>
            </Label>
            <input
              type="range"
              min={24}
              max={120}
              step={2}
              value={(designSettings as any).logoSize ?? 40}
              onChange={(e) => updateDesignSettings({ logoSize: parseInt(e.target.value, 10) } as any)}
              className="w-full"
            />
          </div>

          {/* Background shape */}
          <div className="space-y-1.5">
            <Label className="text-xs">Forme de fond derrière le logo</Label>
            <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
              {(['none', 'circle', 'square', 'triangle', 'hexagon', 'diamond', 'blob'] as const).map((shape) => {
                const active = ((designSettings as any).logoBackgroundShape || 'none') === shape;
                const labels: Record<string, string> = {
                  none: 'Aucune', circle: 'Cercle', square: 'Carré',
                  triangle: 'Triangle', hexagon: 'Hexagone', diamond: 'Losange', blob: 'Blob',
                };
                return (
                  <button
                    key={shape}
                    type="button"
                    onClick={() => updateDesignSettings({ logoBackgroundShape: shape } as any)}
                    className={cn(
                      'rounded-lg border-2 p-2 text-[10px] font-medium transition',
                      active ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                    )}
                  >
                    {labels[shape]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Background color & padding */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Couleur du fond</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={(designSettings as any).logoBackgroundColor || '#ffffff'}
                  onChange={(e) => updateDesignSettings({ logoBackgroundColor: e.target.value } as any)}
                  className="h-9 w-12 cursor-pointer rounded border border-border flex-shrink-0"
                />
                <Input
                  value={(designSettings as any).logoBackgroundColor || ''}
                  onChange={(e) => updateDesignSettings({ logoBackgroundColor: e.target.value } as any)}
                  placeholder="(transparent)"
                  className="flex-1 h-9 font-mono text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex justify-between">
                <span>Padding interne</span>
                <span className="font-mono">{(designSettings as any).logoBackgroundPadding ?? 8}px</span>
              </Label>
              <input
                type="range"
                min={0}
                max={32}
                step={1}
                value={(designSettings as any).logoBackgroundPadding ?? 8}
                onChange={(e) => updateDesignSettings({ logoBackgroundPadding: parseInt(e.target.value, 10) } as any)}
                className="w-full"
              />
            </div>
          </div>

          {/* Footer logo & favicon URL inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-border/30 pt-4">
            <div className="space-y-1.5">
              <Label className="text-xs">URL Logo footer</Label>
              <Input
                value={(designSettings as any).footerLogo || ''}
                onChange={(e) => updateDesignSettings({ footerLogo: e.target.value } as any)}
                placeholder="https://… (laisser vide → utilise le logo principal)"
                className="h-9 font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">URL Favicon (.ico/.png)</Label>
              <Input
                value={(designSettings as any).faviconUrl || ''}
                onChange={(e) => updateDesignSettings({ faviconUrl: e.target.value } as any)}
                placeholder="https://… ou /favicon.ico"
                className="h-9 font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">L'onglet du navigateur sera mis à jour après sauvegarde.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
