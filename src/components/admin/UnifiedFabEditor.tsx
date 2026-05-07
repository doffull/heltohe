import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GripVertical, Save } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_ITEMS = [
  { id: 'voice' as const, label: 'Voix', icon: 'Mic', visible: true, order: 0 },
  { id: 'chat' as const, label: 'Assistant', icon: 'Bot', visible: true, order: 1 },
  { id: 'roulette' as const, label: 'Jeu-concours', icon: 'Gift', visible: true, order: 2 },
];

const CORNERS = [
  { v: 'br', label: 'Bas droite' },
  { v: 'bl', label: 'Bas gauche' },
  { v: 'tr', label: 'Haut droite' },
  { v: 'tl', label: 'Haut gauche' },
];

export function UnifiedFabEditor() {
  const { designSettings, updateDesignSettings } = useApp();
  const initial = (designSettings as any).unifiedFab || {};
  const [enabled, setEnabled] = useState(initial.enabled !== false);
  const [accent, setAccent] = useState(initial.accentColor || '#ffffff');
  const [posD, setPosD] = useState(initial.position_desktop || { corner: 'br', x: 24, y: 24 });
  const [posM, setPosM] = useState(initial.position_mobile || { corner: 'br', x: 16, y: 16 });
  const [items, setItems] = useState(initial.items?.length ? initial.items : DEFAULT_ITEMS);
  const [mode, setMode] = useState<'socle' | 'free' | 'grouped'>(initial.mode || 'socle');
  const [groupSide, setGroupSide] = useState<'left' | 'right'>(initial.groupSide || 'left');
  const [groupOffsetY, setGroupOffsetY] = useState<number>(initial.groupOffsetY ?? 220);

  useEffect(() => {
    const cur = (designSettings as any).unifiedFab || {};
    if (cur.items) setItems(cur.items);
  }, [designSettings]);

  const save = async () => {
    await updateDesignSettings({
      ...(designSettings as any),
      unifiedFab: { enabled, accentColor: accent, mode, groupSide, groupOffsetY, position_desktop: posD, position_mobile: posM, items },
    } as any);
    toast.success('Bouton flottant enregistré');
  };

  const toggle = (id: string) => setItems(items.map((it: any) => it.id === id ? { ...it, visible: !it.visible } : it));
  const move = (id: string, dir: -1 | 1) => {
    const sorted = [...items].sort((a, b) => a.order - b.order);
    const i = sorted.findIndex((x) => x.id === id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    const [a, b] = [sorted[i].order, sorted[j].order];
    setItems(items.map((it: any) => it.id === sorted[i].id ? { ...it, order: b } : it.id === sorted[j].id ? { ...it, order: a } : it));
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Bouton flottant unifié (Voix · Chat · Jeu-concours)</span>
          <div className="flex items-center gap-2 text-sm font-normal">
            <Label htmlFor="ufab-enabled">Activé</Label>
            <Switch id="ufab-enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mode */}
        <div className="space-y-2 p-3 border rounded">
          <Label className="text-xs uppercase tracking-wider">Mode d'affichage</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: 'socle', label: 'Socle unifié' },
              { v: 'grouped', label: 'Voix+Assistant groupés' },
              { v: 'free', label: 'Icônes libres' },
            ].map((m) => (
              <button
                key={m.v}
                type="button"
                onClick={() => setMode(m.v as any)}
                className={`text-xs font-bold uppercase tracking-wider p-2 border-2 transition ${mode === m.v ? 'border-primary bg-primary/10' : 'border-border'}`}
              >{m.label}</button>
            ))}
          </div>

          {mode === 'grouped' && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <Label className="text-[10px]">Côté</Label>
                <div className="flex gap-2 mt-1">
                  {(['left', 'right'] as const).map((s) => (
                    <button key={s} type="button" onClick={() => setGroupSide(s)}
                      className={`flex-1 text-xs p-2 border-2 ${groupSide === s ? 'border-primary bg-primary/10' : 'border-border'}`}>
                      {s === 'left' ? 'Gauche' : 'Droite'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-[10px]">Décalage vertical ({groupOffsetY}px)</Label>
                <Slider value={[groupOffsetY]} min={60} max={600} step={8} onValueChange={([v]) => setGroupOffsetY(v)} />
              </div>
            </div>
          )}
        </div>

        {/* Position */}
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { label: 'Desktop', pos: posD, set: setPosD },
            { label: 'Mobile', pos: posM, set: setPosM },
          ].map(({ label, pos, set }) => (
            <div key={label} className="space-y-2 p-3 border rounded">
              <div className="text-xs font-semibold uppercase tracking-wider">{label}</div>
              <Select value={pos.corner} onValueChange={(v) => set({ ...pos, corner: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CORNERS.map((c) => <SelectItem key={c.v} value={c.v}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
              <div>
                <Label className="text-[10px]">Décalage X ({pos.x}px)</Label>
                <Slider value={[pos.x]} min={0} max={200} step={4} onValueChange={([v]) => set({ ...pos, x: v })} />
              </div>
              <div>
                <Label className="text-[10px]">Décalage Y ({pos.y}px)</Label>
                <Slider value={[pos.y]} min={0} max={200} step={4} onValueChange={([v]) => set({ ...pos, y: v })} />
              </div>
            </div>
          ))}
        </div>

        {/* Accent */}
        <div className="grid grid-cols-[auto_1fr] gap-3 items-center max-w-sm">
          <Label>Couleur du halo</Label>
          <div className="flex gap-2">
            <Input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="w-14 h-10 p-1" />
            <Input value={accent} onChange={(e) => setAccent(e.target.value)} />
          </div>
        </div>

        {/* Items */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider">Sous-boutons (ordre & visibilité)</Label>
          {[...items].sort((a: any, b: any) => a.order - b.order).map((it: any) => {
            const grouped = (it.groupedIn ?? (it.id === 'voice' || it.id === 'chat' ? 'group' : 'free')) === 'group';
            return (
              <div key={it.id} className="flex items-center gap-3 p-2 border rounded flex-wrap">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 text-sm min-w-[120px]">
                  <span className="font-medium">{it.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">({it.id})</span>
                </div>
                {mode === 'grouped' && (
                  <button
                    type="button"
                    onClick={() => setItems(items.map((x: any) => x.id === it.id ? { ...x, groupedIn: grouped ? 'free' : 'group' } : x))}
                    className={`text-[10px] uppercase tracking-wider px-2 py-1 border-2 ${grouped ? 'border-primary bg-primary/10' : 'border-border'}`}
                  >{grouped ? 'Dans le socle' : 'Libre'}</button>
                )}
                <Button size="sm" variant="ghost" onClick={() => move(it.id, -1)}>↑</Button>
                <Button size="sm" variant="ghost" onClick={() => move(it.id, 1)}>↓</Button>
                <Switch checked={it.visible} onCheckedChange={() => toggle(it.id)} />
              </div>
            );
          })}
          <p className="text-[10px] text-muted-foreground">Astuce : en mode admin, vous pouvez aussi glisser-déposer le socle directement sur la page d'accueil.</p>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} className="gap-2"><Save className="h-4 w-4" /> Enregistrer</Button>
        </div>
      </CardContent>
    </Card>
  );
}
