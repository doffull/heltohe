import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

export function HeaderDesignTab() {
  const { designSettings, updateDesignSettings } = useApp();
  const currentPreset = (designSettings as any).headerPreset || 'classic';
  const headerBgColor = (designSettings as any).headerBgColor || '';
  const headerTextColor = (designSettings as any).headerTextColor || '';
  const headerFixed = (designSettings as any).headerFixed !== false;

  const applyPreset = (preset: HeaderPreset) => {
    updateDesignSettings({ headerPreset: preset } as any);
    toast.success(`Preset "${PRESETS.find(p => p.id === preset)?.name}" appliqué`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Configuration du Header</h3>
        <p className="text-sm text-muted-foreground">Choisissez un preset et personnalisez les couleurs</p>
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
        </CardContent>
      </Card>
    </div>
  );
}
