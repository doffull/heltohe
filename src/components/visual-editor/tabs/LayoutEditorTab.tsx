import { useApp } from '@/context/AppContext';
import { useVisualEditor } from '../VisualEditorProvider';
import { Slider } from '@/components/ui/slider';

const SLIDER_HEIGHTS = [
  { label: '50vh', value: '50vh' },
  { label: '70vh', value: '70vh' },
  { label: '85vh', value: '85vh' },
  { label: '100vh', value: '100vh' },
];

const SPACING_OPTIONS = [
  { label: 'Compact', value: 'compact' },
  { label: 'Normal', value: 'normal' },
  { label: 'Aéré', value: 'spacious' },
];

export function LayoutEditorTab() {
  const { designSettings, updateDesignSettings } = useApp();
  const { setIsDirty } = useVisualEditor();

  function update(changes: Record<string, unknown>) {
    updateDesignSettings(changes as any);
    setIsDirty(true);
  }

  return (
    <div className="space-y-5">
      {/* Slider height */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Hauteur du Hero</p>
        <div className="grid grid-cols-4 gap-1.5">
          {SLIDER_HEIGHTS.map(opt => (
            <button
              key={opt.value}
              onClick={() => update({ sliderHeight: opt.value })}
              className={`py-2 rounded text-[10px] font-semibold border transition-all ${designSettings.sliderHeight === opt.value ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted/50 hover:bg-muted text-foreground'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category columns */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Colonnes catégories</p>
          <span className="text-xs font-bold text-primary">{designSettings.categoryColumns ?? 4}</span>
        </div>
        <Slider
          min={2}
          max={5}
          step={1}
          value={[designSettings.categoryColumns ?? 4]}
          onValueChange={([v]) => update({ categoryColumns: v })}
          className="mt-2"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>2</span><span>3</span><span>4</span><span>5</span>
        </div>
      </div>

      {/* Site spacing */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Espacement global</p>
        <div className="grid grid-cols-3 gap-1.5">
          {SPACING_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => update({ siteSpacing: opt.value })}
              className={`py-2 rounded text-[10px] font-semibold border transition-all ${designSettings.siteSpacing === opt.value ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted/50 hover:bg-muted text-foreground'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Auto-play slider */}
      <div className="flex items-center justify-between py-2 border-t border-border">
        <div>
          <p className="text-xs font-medium">Défilement automatique</p>
          <p className="text-[10px] text-muted-foreground">Hero Slider</p>
        </div>
        <button
          onClick={() => update({ sliderAutoPlay: !designSettings.sliderAutoPlay })}
          className={`relative w-10 h-5 rounded-full transition-colors ${designSettings.sliderAutoPlay ? 'bg-primary' : 'bg-muted border border-border'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${designSettings.sliderAutoPlay ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {/* Logo toggle */}
      <div className="flex items-center justify-between py-2 border-t border-border">
        <div>
          <p className="text-xs font-medium">Afficher le logo</p>
          <p className="text-[10px] text-muted-foreground">HUD overlay</p>
        </div>
        <button
          onClick={() => update({ showLogo: !designSettings.showLogo })}
          className={`relative w-10 h-5 rounded-full transition-colors ${designSettings.showLogo ? 'bg-primary' : 'bg-muted border border-border'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${designSettings.showLogo ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>
    </div>
  );
}
