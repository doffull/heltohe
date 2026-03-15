import { useApp } from '@/context/AppContext';
import { useVisualEditor } from '../VisualEditorProvider';
import { RotateCcw } from 'lucide-react';

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
  onReset?: () => void;
}

function ColorRow({ label, value, onChange, onReset }: ColorRowProps) {
  const displayValue = value === 'transparent' ? '#ffffff' : (value || '#ffffff');
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
      <div className="flex-1">
        <p className="text-xs font-medium">{label}</p>
        <p className="text-[10px] text-muted-foreground font-mono">{value || '—'}</p>
      </div>
      {onReset && (
        <button
          onClick={onReset}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          title="Réinitialiser"
        >
          <RotateCcw className="h-3 w-3" />
        </button>
      )}
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

  function reset(key: string) {
    updateDesignSettings({ [key]: '' } as any);
    setIsDirty(true);
  }

  function applyHeaderPreset(preset: typeof HEADER_PRESETS[0]) {
    updateDesignSettings({ headerPreset: preset.value, headerBgColor: preset.bg, headerTextColor: preset.text });
    setIsDirty(true);
  }

  const ds = designSettings as any;

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

      {/* Header colors */}
      <div className="bg-muted/30 rounded border border-border px-3 py-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pt-2 pb-1">Couleurs Header</p>
        <ColorRow
          label="Fond header"
          value={ds.headerBgColor || ''}
          onChange={v => update('headerBgColor', v)}
          onReset={() => reset('headerBgColor')}
        />
        <ColorRow
          label="Texte / liens header"
          value={ds.headerTextColor || ''}
          onChange={v => update('headerTextColor', v)}
          onReset={() => reset('headerTextColor')}
        />
      </div>

      {/* Live header preview */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Aperçu Header</p>
        <div
          className="rounded border border-border overflow-hidden"
          style={{ backgroundColor: designSettings.headerBgColor === 'transparent' ? 'rgba(0,0,0,0.5)' : (ds.headerBgColor || '#ffffff') }}
        >
          <div className="flex items-center justify-between px-3 py-2">
            {designSettings.hudLogo ? (
              <img src={designSettings.hudLogo} alt="Logo" className="h-5 w-auto object-contain" />
            ) : (
              <span className="text-xs font-bold" style={{ color: ds.headerTextColor || '#000000' }}>
                {ds.siteName || 'HMP'}
              </span>
            )}
            <div className="flex gap-2">
              {['Homme', 'Femme', 'Boutique'].map(item => (
                <span key={item} className="text-[9px] font-medium" style={{ color: ds.headerTextColor || '#000000' }}>{item}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Global site colors */}
      <div className="bg-muted/30 rounded border border-border px-3 py-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pt-2 pb-1">Couleurs globales du site</p>
        <ColorRow
          label="Couleur accent / primaire"
          value={ds.accentColor || ''}
          onChange={v => update('accentColor', v)}
          onReset={() => reset('accentColor')}
        />
        <ColorRow
          label="Fond du site"
          value={ds.globalBgColor || ''}
          onChange={v => update('globalBgColor', v)}
          onReset={() => reset('globalBgColor')}
        />
        <ColorRow
          label="Texte principal"
          value={ds.globalTextColor || ''}
          onChange={v => update('globalTextColor', v)}
          onReset={() => reset('globalTextColor')}
        />
        <ColorRow
          label="Fond des cartes"
          value={ds.globalCardColor || ''}
          onChange={v => update('globalCardColor', v)}
          onReset={() => reset('globalCardColor')}
        />
        <ColorRow
          label="Texte secondaire / muted"
          value={ds.globalMutedColor || ''}
          onChange={v => update('globalMutedColor', v)}
          onReset={() => reset('globalMutedColor')}
        />
      </div>

      {/* Footer colors */}
      <div className="bg-muted/30 rounded border border-border px-3 py-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pt-2 pb-1">Couleurs Footer</p>
        <ColorRow
          label="Fond footer"
          value={ds.footerBgColor || ''}
          onChange={v => update('footerBgColor', v)}
          onReset={() => reset('footerBgColor')}
        />
        <ColorRow
          label="Texte footer"
          value={ds.footerTextColor || ''}
          onChange={v => update('footerTextColor', v)}
          onReset={() => reset('footerTextColor')}
        />
      </div>

      <p className="text-[10px] text-muted-foreground italic">
        Cliquez sur 🔄 pour réinitialiser une couleur à la valeur par défaut du thème.
      </p>
    </div>
  );
}
