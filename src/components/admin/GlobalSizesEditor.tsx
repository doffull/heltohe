import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

const PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

export function GlobalSizesEditor() {
  const { designSettings, updateDesignSettings, flushDesignSettings } = useApp();
  const [sizes, setSizes] = useState<string[]>(
    designSettings.globalProductSizes && designSettings.globalProductSizes.length > 0
      ? designSettings.globalProductSizes
      : [...PRESETS]
  );
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (designSettings.globalProductSizes && designSettings.globalProductSizes.length > 0) {
      setSizes(designSettings.globalProductSizes);
    }
  }, [designSettings.globalProductSizes]);

  const add = () => {
    const v = draft.trim().toUpperCase();
    if (!v) return;
    if (sizes.includes(v)) { toast.error('Taille déjà ajoutée'); return; }
    setSizes((s) => [...s, v]);
    setDraft('');
  };
  const remove = (s: string) => setSizes((xs) => xs.filter((x) => x !== s));
  const move = (i: number, dir: -1 | 1) => {
    setSizes((xs) => {
      const next = [...xs];
      const j = i + dir;
      if (j < 0 || j >= next.length) return xs;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      updateDesignSettings({ globalProductSizes: sizes } as any);
      await flushDesignSettings();
      toast.success('Tailles globales enregistrées');
    } catch {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tailles produits globales</CardTitle>
        <p className="text-xs text-muted-foreground">
          Ces tailles sont utilisées dans tous les formulaires produits et dans le hero d'accueil.
          Aucune taille n'est sélectionnée par défaut — vous choisissez celles à activer par produit.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {sizes.map((s, i) => (
            <div
              key={s}
              className="inline-flex items-center gap-1 border border-border bg-background px-2 py-1 text-xs font-bold tracking-wider uppercase"
            >
              <button type="button" onClick={() => move(i, -1)} className="text-muted-foreground hover:text-foreground" aria-label={`Monter ${s}`}>
                <GripVertical className="h-3 w-3" />
              </button>
              <span>{s}</span>
              <button type="button" onClick={() => remove(s)} className="text-muted-foreground hover:text-destructive" aria-label={`Retirer ${s}`}>
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {sizes.length === 0 && (
            <span className="text-xs text-muted-foreground italic">Aucune taille — ajoutez-en ci-dessous.</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            placeholder="Nouvelle taille (ex : XXXXL, 38, ONE-SIZE)"
            className="h-9 max-w-xs"
          />
          <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1">
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </div>

        <div className="flex flex-wrap gap-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground self-center mr-1">Presets :</span>
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => !sizes.includes(p) && setSizes((s) => [...s, p])}
              disabled={sizes.includes(p)}
              className="text-[10px] border border-border px-2 py-0.5 hover:bg-muted disabled:opacity-40"
            >
              + {p}
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} size="sm">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
