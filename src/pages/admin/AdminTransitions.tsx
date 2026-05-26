import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { TRANSITIONS, type TransitionId } from '@/components/transitions/transitionRegistry';
import { Save, Play, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useDemoMode, setLocalDemoMode } from '@/hooks/useDemoMode';

export default function AdminTransitions() {
  const { designSettings, updateDesignSettings, flushDesignSettings } = useApp();
  const current = (((designSettings as any)?.pageTransition as TransitionId) || 'shatter');
  const [selected, setSelected] = useState<TransitionId>(current);
  const [saving, setSaving] = useState(false);
  const demo = useDemoMode();

  const save = async () => {
    try {
      setSaving(true);
      updateDesignSettings({ pageTransition: selected } as any);
      await flushDesignSettings();
      toast.success('Transition enregistrée');
    } catch (e: any) {
      toast.error('Erreur', { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  const preview = () => {
    // Force a navigation tick by replacing state — easiest preview hack
    window.dispatchEvent(new Event('lvtk:preview-transition'));
    toast.info('Naviguez entre deux pages pour voir le rendu.');
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Transitions de page</h1>
        <p className="text-sm text-muted-foreground">Choisissez l'animation entre les pages du site.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Type de transition</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <RadioGroup value={selected} onValueChange={(v) => setSelected(v as TransitionId)}>
            {TRANSITIONS.map((t) => (
              <label
                key={t.id}
                className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition ${selected === t.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
              >
                <RadioGroupItem value={t.id} id={`tr-${t.id}`} className="mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{t.description}</div>
                </div>
              </label>
            ))}
          </RadioGroup>

          <div className="flex justify-between pt-2">
            <Button variant="outline" size="sm" onClick={preview} className="gap-1.5">
              <Play className="h-4 w-4" /> Tester
            </Button>
            <Button onClick={save} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mode démo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Active automatiquement tous les pop-ups, la roulette et la sidebar pour régler les réglages visuels.
            Le mode démo est local à ce navigateur.
          </p>
          <div className="flex items-center justify-between">
            <Label htmlFor="demo-toggle" className="text-sm">Activer le mode démo</Label>
            <Switch id="demo-toggle" checked={demo} onCheckedChange={(v) => { setLocalDemoMode(v); toast.success(v ? 'Mode démo activé' : 'Mode démo désactivé'); }} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
