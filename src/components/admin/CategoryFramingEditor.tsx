import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { RotateCcw, Crop } from 'lucide-react';
import CategoryIcon from '@/components/categories/CategoryIcon';
import {
  categoryImageStyle,
  categoryImageBackground,
  COVER_MODE_OPTIONS,
  FOCAL_PRESETS,
  DEFAULT_FRAMING,
  parsePosition,
  formatPosition,
} from '@/lib/categoryImageStyle';

export interface FramingValue {
  coverMode: string;
  coverPosition: string;
  coverZoom: number;
  coverBg: string;
}

interface Props {
  image?: string;
  title: string;
  icon?: string;
  iconImage?: string;
  value: FramingValue;
  onChange: (patch: Partial<FramingValue>) => void;
}

type PreviewKind = 'grid' | 'banner';

export function CategoryFramingEditor({ image, title, icon, iconImage, value, onChange }: Props) {
  const [preview, setPreview] = useState<PreviewKind>('grid');
  const { x, y } = parsePosition(value.coverPosition);

  const imgStyle = categoryImageStyle(value);
  const bgStyle = categoryImageBackground(value);

  const reset = () => onChange({ ...DEFAULT_FRAMING, coverBg: '' });

  return (
    <div className="space-y-4 pt-2 border-t border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crop className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-bold hud-text tracking-widest text-muted-foreground">CADRAGE</p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" /> Réinitialiser
        </button>
      </div>

      {/* Live preview */}
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          {([
            { k: 'grid' as PreviewKind, label: 'Grille accueil' },
            { k: 'banner' as PreviewKind, label: 'Bandeau de page' },
          ]).map(t => (
            <button
              key={t.k}
              type="button"
              onClick={() => setPreview(t.k)}
              className={cn(
                'px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded border transition-colors',
                preview === t.k
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div
          className={cn(
            'relative w-full overflow-hidden bg-secondary/40',
            preview === 'grid' ? 'h-64 chamfer-hud max-w-[320px]' : 'h-52'
          )}
          style={bgStyle}
        >
          {image ? (
            <img src={image} alt={title || 'Aperçu'} className="w-full h-full" style={imgStyle} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[11px] text-muted-foreground">
              Ajoutez une image pour voir l'aperçu
            </div>
          )}
          <div
            className={cn(
              'absolute inset-0 pointer-events-none',
              preview === 'grid'
                ? 'bg-gradient-to-t from-background via-background/50 to-transparent'
                : 'bg-gradient-to-t from-background via-background/60 to-background/20'
            )}
          />
          <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
            <h3 className="hud-text text-lg font-bold tracking-wider text-foreground flex items-center gap-2">
              <CategoryIcon icon={icon} iconImage={iconImage} size="md" className="text-primary" />
              <span className="truncate">{title || 'Catégorie'}</span>
            </h3>
          </div>
          {/* focal crosshair */}
          {image && value.coverMode !== 'fill' && (
            <div
              className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border-2 border-primary bg-primary/20 pointer-events-none"
              style={{ left: `${x}%`, top: `${y}%` }}
            />
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Aperçu aux proportions réelles du site. Cliquez sur la grille ci-dessous pour choisir la zone à garder visible.
        </p>
      </div>

      {/* Mode */}
      <div className="space-y-2">
        <Label className="hud-text text-xs">Mode image</Label>
        <div className="grid grid-cols-3 gap-2">
          {COVER_MODE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ coverMode: opt.value })}
              className={cn(
                'rounded-md border p-2 text-left transition-colors',
                value.coverMode === opt.value
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-secondary/40 hover:border-border/80'
              )}
            >
              <span className="block text-xs font-bold hud-text">{opt.label}</span>
              <span className="block text-[9px] leading-tight text-muted-foreground mt-0.5">{opt.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Focal point */}
      <div className="grid grid-cols-2 gap-4 items-start">
        <div className="space-y-2">
          <Label className="hud-text text-xs">Point focal</Label>
          <div className="grid grid-cols-3 gap-1 w-[108px]">
            {FOCAL_PRESETS.map(p => (
              <button
                key={p.value}
                type="button"
                title={p.label}
                onClick={() => onChange({ coverPosition: p.value })}
                className={cn(
                  'h-8 w-8 rounded border transition-colors',
                  value.coverPosition === p.value
                    ? 'border-primary bg-primary/30'
                    : 'border-border bg-secondary/40 hover:bg-secondary'
                )}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="hud-text text-[10px]">Horizontal · {Math.round(x)}%</Label>
            <input
              type="range"
              min={0}
              max={100}
              value={x}
              onChange={e => onChange({ coverPosition: formatPosition(Number(e.target.value), y) })}
              className="w-full accent-primary"
            />
          </div>
          <div className="space-y-1">
            <Label className="hud-text text-[10px]">Vertical · {Math.round(y)}%</Label>
            <input
              type="range"
              min={0}
              max={100}
              value={y}
              onChange={e => onChange({ coverPosition: formatPosition(x, Number(e.target.value)) })}
              className="w-full accent-primary"
            />
          </div>
        </div>
      </div>

      {/* Zoom */}
      <div className="space-y-1">
        <Label className="hud-text text-[10px]">Zoom · {Math.round((value.coverZoom || 1) * 100)}%</Label>
        <input
          type="range"
          min={100}
          max={200}
          step={5}
          value={Math.round((value.coverZoom || 1) * 100)}
          onChange={e => onChange({ coverZoom: Number(e.target.value) / 100 })}
          className="w-full accent-primary"
        />
      </div>

      {/* Background color (contain) */}
      {value.coverMode === 'contain' && (
        <div className="space-y-2">
          <Label className="hud-text text-xs">Couleur de fond (marges)</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={value.coverBg || '#111111'}
              onChange={e => onChange({ coverBg: e.target.value })}
              className="h-9 w-12 rounded border border-border bg-transparent"
            />
            {value.coverBg && (
              <button
                type="button"
                onClick={() => onChange({ coverBg: '' })}
                className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-destructive"
              >
                Retirer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CategoryFramingEditor;
