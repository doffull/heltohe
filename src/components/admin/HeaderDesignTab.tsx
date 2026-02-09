import { useApp } from '@/context/AppContext';
import { useCategories } from '@/hooks/useCategories';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type HeaderPreset = 'classic' | 'centered' | 'minimal' | 'fullwidth' | 'transparent';

const PRESETS: { id: HeaderPreset; name: string; description: string; preview: React.ReactNode }[] = [
  {
    id: 'classic',
    name: 'Classique',
    description: 'Logo à gauche, nav au centre, icônes à droite',
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
    description: 'Logo + icônes uniquement, nav dans le burger',
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
    description: 'Header transparent, se fond dans le hero',
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Configuration du Header</h3>
        <p className="text-sm text-muted-foreground">Presets, navigation, bandeau promo et couleurs</p>
      </div>

      {/* Preset Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Presets</CardTitle>
          <CardDescription>Cliquez pour appliquer un style de header</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset.id)}
                className={cn(
                  "border-2 rounded-lg p-3 transition-all text-left",
                  currentPreset === preset.id
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="h-12 bg-secondary rounded mb-2 overflow-hidden">
                  {preset.preview}
                </div>
                <p className="text-sm font-bold">{preset.name}</p>
                <p className="text-xs text-muted-foreground">{preset.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Navigation Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Liens de navigation</CardTitle>
          <CardDescription>Choisissez les liens affichés dans le header. Laissez vide pour les liens par défaut.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* System links */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider mb-2 block">Pages système</Label>
            <div className="space-y-2">
              {SYSTEM_LINKS.map((link) => (
                <label key={link.href} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={isNavItemSelected(link.href)}
                    onCheckedChange={() => toggleNavItem(link.label, link.href)}
                  />
                  <span className="text-sm">{link.label}</span>
                  <span className="text-xs text-muted-foreground">({link.href})</span>
                </label>
              ))}
            </div>
          </div>

          {/* Category links */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider mb-2 block">Catégories</Label>
            <div className="space-y-2">
              {categories.filter(c => !c.parentId).map((cat) => (
                <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={isNavItemSelected(`/boutique?category=${cat.title}`)}
                    onCheckedChange={() => toggleNavItem(cat.title, `/boutique?category=${cat.title}`)}
                  />
                  <span className="text-sm">{cat.title}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom links */}
          {headerNavItems.length > 0 && (
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider mb-2 block">Liens personnalisés</Label>
              <div className="space-y-2">
                {headerNavItems.map((item: any, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={item.label}
                      onChange={(e) => updateNavItem(index, { label: e.target.value })}
                      placeholder="Label"
                      className="flex-1"
                    />
                    <Input
                      value={item.href}
                      onChange={(e) => updateNavItem(index, { href: e.target.value })}
                      placeholder="URL"
                      className="flex-1"
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeNavItem(item.href)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={addCustomNavItem}>
            <Plus className="h-4 w-4 mr-2" /> Ajouter un lien
          </Button>
        </CardContent>
      </Card>

      {/* Top Banner */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bandeau supérieur</CardTitle>
          <CardDescription>Barre promotionnelle au-dessus du header</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Activer le bandeau</Label>
            <Switch
              checked={topBanner.enabled}
              onCheckedChange={(v) => updateTopBanner({ enabled: v })}
            />
          </div>
          {topBanner.enabled && (
            <>
              <div className="space-y-2">
                <Label className="text-xs">Texte du bandeau</Label>
                <Input
                  value={topBanner.text}
                  onChange={(e) => updateTopBanner({ text: e.target.value })}
                  placeholder="Ex: Livraison gratuite dès 50€"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Lien (optionnel)</Label>
                <Input
                  value={topBanner.link || ''}
                  onChange={(e) => updateTopBanner({ link: e.target.value })}
                  placeholder="/boutique"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Couleur de fond</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={topBanner.bgColor || '#000000'}
                      onChange={(e) => updateTopBanner({ bgColor: e.target.value })}
                      className="h-10 w-14 cursor-pointer rounded border border-border"
                    />
                    <Input value={topBanner.bgColor || ''} onChange={(e) => updateTopBanner({ bgColor: e.target.value })} className="flex-1" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Couleur du texte</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={topBanner.textColor || '#ffffff'}
                      onChange={(e) => updateTopBanner({ textColor: e.target.value })}
                      className="h-10 w-14 cursor-pointer rounded border border-border"
                    />
                    <Input value={topBanner.textColor || ''} onChange={(e) => updateTopBanner({ textColor: e.target.value })} className="flex-1" />
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Custom Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personnalisation</CardTitle>
          <CardDescription>Couleurs et comportement du header</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Couleur de fond</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={headerBgColor || '#000000'}
                  onChange={(e) => updateDesignSettings({ headerBgColor: e.target.value } as any)}
                  className="h-10 w-14 cursor-pointer rounded border border-border"
                />
                <Input
                  value={headerBgColor}
                  onChange={(e) => updateDesignSettings({ headerBgColor: e.target.value } as any)}
                  placeholder="Auto (thème)"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Couleur du texte</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={headerTextColor || '#ffffff'}
                  onChange={(e) => updateDesignSettings({ headerTextColor: e.target.value } as any)}
                  className="h-10 w-14 cursor-pointer rounded border border-border"
                />
                <Input
                  value={headerTextColor}
                  onChange={(e) => updateDesignSettings({ headerTextColor: e.target.value } as any)}
                  placeholder="Auto (thème)"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Header fixe (sticky)</Label>
              <p className="text-xs text-muted-foreground">Le header reste visible lors du scroll</p>
            </div>
            <Switch
              checked={headerFixed}
              onCheckedChange={(v) => updateDesignSettings({ headerFixed: v } as any)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Afficher le logo dans le header</Label>
              <p className="text-xs text-muted-foreground">Masquer le logo pour un look minimal</p>
            </div>
            <Switch
              checked={designSettings.showLogo !== false}
              onCheckedChange={(v) => updateDesignSettings({ showLogo: v })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
