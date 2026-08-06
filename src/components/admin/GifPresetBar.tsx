import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, X } from 'lucide-react';
import { toast } from 'sonner';
import type { GifPreset } from '@/lib/gifBuilder';
import { makePreset } from '@/lib/gifPresets';
import type { GifLastUsed } from '@/lib/gifPresets';

interface Props {
  current: GifLastUsed;
  onApply: (preset: GifPreset) => void;
}

/** Shared named-presets bar for the GIF builders (single product + bulk). */
export function GifPresetBar({ current, onApply }: Props) {
  const { designSettings, updateDesignSettings, flushDesignSettings } = useApp();
  const presets: GifPreset[] = ((designSettings as any).gifPresets as GifPreset[]) || [];
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const persist = async (next: GifPreset[]) => {
    setSaving(true);
    try {
      updateDesignSettings({ gifPresets: next } as any);
      await flushDesignSettings({ gifPresets: next } as any);
    } catch {
      toast.error("Erreur lors de l'enregistrement du preset");
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    const next = [...presets, makePreset(name, current)];
    setName('');
    await persist(next);
    toast.success('Preset enregistré');
  };

  const remove = async (id: string) => {
    await persist(presets.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-2 border border-border/40 p-3">
      <Label className="text-xs">Presets</Label>
      {presets.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">Aucun preset enregistré.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <div key={p.id} className="inline-flex items-center gap-1 border border-border bg-background text-xs">
              <button
                type="button"
                onClick={() => onApply(p)}
                className="px-2 py-1 hover:bg-muted"
                title={`${p.width} px · ${p.delay} ms`}
              >
                <span className="font-bold">{p.name}</span>
                <span className="text-muted-foreground ml-1">{p.width}px · {p.delay}ms</span>
              </button>
              <button
                type="button"
                onClick={() => remove(p.id)}
                disabled={saving}
                className="px-1 text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du preset (ex. Vignette 550)"
          className="h-8 text-xs max-w-xs"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } }}
        />
        <Button type="button" variant="outline" size="sm" onClick={save} disabled={saving} className="h-8 text-xs gap-1">
          <Save className="h-3.5 w-3.5" /> Enregistrer les réglages
        </Button>
      </div>
    </div>
  );
}
