import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import type { ProductDefaults } from '@/types';

const CHILD_PRESETS = ['2A', '4A', '6A', '8A', '10A', '12A', '14A', '16A'];

export function ProductDefaultsEditor() {
  const { designSettings, updateDesignSettings, flushDesignSettings } = useApp();
  const initial: ProductDefaults = (designSettings as any).productDefaults || {};
  const [material, setMaterial] = useState(initial.material || '100% polyester, rembourrage synthétique, doublure polyester.');
  const [care, setCare] = useState(initial.careInstructions || 'Lavage 30°C, séchage à plat, ne pas repasser.');
  const [childSizes, setChildSizes] = useState<string[]>(initial.childSizes || ['2A','4A','6A','8A','10A','12A','14A']);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const cur: ProductDefaults = (designSettings as any).productDefaults || {};
    if (cur.material) setMaterial(cur.material);
    if (cur.careInstructions) setCare(cur.careInstructions);
    if (cur.childSizes?.length) setChildSizes(cur.childSizes);
  }, [designSettings]);

  const addChild = () => {
    const v = draft.trim().toUpperCase();
    if (!v) return;
    if (childSizes.includes(v)) { toast.error('Taille déjà présente'); return; }
    setChildSizes(s => [...s, v]);
    setDraft('');
  };

  const save = async () => {
    setSaving(true);
    try {
      const next: ProductDefaults = { material, careInstructions: care, childSizes };
      updateDesignSettings({ productDefaults: next } as any);
      await flushDesignSettings({ productDefaults: next } as any);
      toast.success('Défauts produits enregistrés');
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Défauts produits</CardTitle>
        <p className="text-xs text-muted-foreground">
          Ces valeurs sont pré-remplies à la création d'un nouveau produit. Les tailles enfant apparaissent dans le picker "Enfant" du formulaire produit.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Matériau par défaut</Label>
            <Input value={material} onChange={e => setMaterial(e.target.value)} placeholder="Polyester" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Entretien par défaut</Label>
            <Textarea value={care} onChange={e => setCare(e.target.value)} rows={2} placeholder="Lavable à 30°C…" />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Tailles enfant (2A → 14A/16A)</Label>
          <div className="flex flex-wrap gap-2">
            {childSizes.map(s => (
              <div key={s} className="inline-flex items-center gap-1 border border-border bg-background px-2 py-1 text-xs font-bold">
                {s}
                <button type="button" onClick={() => setChildSizes(cur => cur.filter(x => x !== s))} className="text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addChild(); } }}
              placeholder="Nouvelle taille enfant (ex. 18A)"
              className="h-9 max-w-xs"
            />
            <Button type="button" variant="outline" size="sm" onClick={addChild} className="gap-1">
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground self-center mr-1">Presets :</span>
            {CHILD_PRESETS.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => !childSizes.includes(p) && setChildSizes(s => [...s, p])}
                disabled={childSizes.includes(p)}
                className="text-[10px] border border-border px-2 py-0.5 hover:bg-muted disabled:opacity-40"
              >
                + {p}
              </button>
            ))}
          </div>
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
