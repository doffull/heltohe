import { useApp } from '@/context/AppContext';
import { useVisualEditor } from '../VisualEditorProvider';

const HEADER_PRESETS = [
  { label: 'Classic', value: 'classic', bg: '#ffffff', text: '#000000' },
  { label: 'Dark', value: 'dark', bg: '#0a0a0a', text: '#ffffff' },
  { label: 'Trans.', value: 'transparent', bg: 'transparent', text: '#ffffff' },
  { label: 'Light', value: 'minimal', bg: '#f5f5f5', text: '#111111' },
];

interface ColorRowProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

function ColorRow({ label, value, onChange }: ColorRowProps) {
  const displayValue = value === 'transparent' ? '#ffffff' : (value || '#ffffff');
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
      <div className="flex-1">
        <p className="text-xs font-medium">{label}</p>
        <p className="text-[10px] text-muted-foreground font-mono">{value || '—'}</p>
      </div>
      <input
        type="color"
        value={displayValue}
        onChange={e => onChange(e.target.value)}
        className="w-8 h-7 rounded cursor-pointer border border-border bg-transparent flex-shrink-0"
      />
    </div>
  );
}

export function ColorsEditorTab() {
  const { designSettings, updateDesignSettings } = useApp();
  const { setIsDirty } = useVisualEditor();

  function update(key: string, value: string) {
    updateDesignSettings({ [key]: value } as any);
    setIsDirty(true);
  }

  function applyHeaderPreset(preset: typeof HEADER_PRESETS[0]) {
    updateDesignSettings({ headerPreset: preset.value, headerBgColor: preset.bg, headerTextColor: preset.text });
    setIsDirty(true);
  }

  return (
    <div className="space-y-4">
      {/* Header Presets */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Presets Header</p>
        <div className="grid grid-cols-4 gap-1.5">
          {HEADER_PRESETS.map(preset => {
            const isActive = designSettings.headerPreset === preset.value;
            return (
              <button
                key={preset.value}
                onClick={() => applyHeaderPreset(preset)}
                className={`py-2 rounded text-[10px] font-semibold border transition-all ${isActive ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted/50 hover:bg-muted'}`}
                style={{ background: isActive ? undefined : preset.bg === 'transparent' ? 'repeating-linear-gradient(45deg, #ccc 0, #ccc 2px, #fff 0, #fff 8px)' : preset.bg, color: isActive ? undefined : preset.text === '#ffffff' ? '#000' : preset.text }}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Colors */}
      <div className="bg-muted/30 rounded border border-border px-3 py-1">
        <ColorRow
          label="Couleur accent"
          value={designSettings.accentColor || ''}
          onChange={v => update('accentColor', v)}
        />
        <ColorRow
          label="Fond header"
          value={designSettings.headerBgColor || ''}
          onChange={v => update('headerBgColor', v)}
        />
        <ColorRow
          label="Texte header"
          value={designSettings.headerTextColor || ''}
          onChange={v => update('headerTextColor', v)}
        />
      </div>

      {/* Live header preview */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Aperçu Header</p>
        <div
          className="rounded border border-border overflow-hidden"
          style={{ backgroundColor: designSettings.headerBgColor === 'transparent' ? 'rgba(0,0,0,0.5)' : (designSettings.headerBgColor || '#ffffff') }}
        >
          <div className="flex items-center justify-between px-3 py-2">
            {designSettings.hudLogo ? (
              <img src={designSettings.hudLogo} alt="Logo" className="h-5 w-auto object-contain" />
            ) : (
              <span className="text-xs font-bold" style={{ color: designSettings.headerTextColor || '#000000' }}>
                {designSettings.siteName || 'HMP'}
              </span>
            )}
            <div className="flex gap-2">
              {['Homme', 'Femme', 'Boutique'].map(item => (
                <span key={item} className="text-[9px] font-medium" style={{ color: designSettings.headerTextColor || '#000000' }}>{item}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
