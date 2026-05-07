import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Monitor, Smartphone, RotateCcw } from 'lucide-react';
import { Mic, Bot, Gift } from 'lucide-react';
import { toast } from 'sonner';

type Corner = 'tl' | 'tr' | 'bl' | 'br';
type Pos = { corner: Corner; x: number; y: number };
type ItemId = 'voice' | 'chat' | 'roulette';
interface Item {
  id: ItemId;
  label: string;
  icon: string;
  visible: boolean;
  order: number;
  position_desktop: Pos;
  position_mobile: Pos;
}

const DEFAULTS: Item[] = [
  { id: 'voice', label: 'Voix', icon: 'Mic', visible: true, order: 0,
    position_desktop: { corner: 'br', x: 24, y: 96 }, position_mobile: { corner: 'br', x: 16, y: 80 } },
  { id: 'chat', label: 'Assistant', icon: 'Bot', visible: true, order: 1,
    position_desktop: { corner: 'br', x: 24, y: 24 }, position_mobile: { corner: 'br', x: 16, y: 16 } },
  { id: 'roulette', label: 'Jeu-concours', icon: 'Gift', visible: true, order: 2,
    position_desktop: { corner: 'bl', x: 24, y: 24 }, position_mobile: { corner: 'bl', x: 16, y: 16 } },
];

const ICONS: Record<ItemId, any> = { voice: Mic, chat: Bot, roulette: Gift };

const SIZES = {
  desktop: { w: 1280, h: 800 },
  mobile: { w: 390, h: 780 },
};

function pxToPos(left: number, top: number, w: number, h: number, btn = 56): Pos {
  // Decide nearest corner
  const cx = left + btn / 2;
  const cy = top + btn / 2;
  const right = cx > w / 2;
  const bottom = cy > h / 2;
  const corner: Corner = `${bottom ? 'b' : 't'}${right ? 'r' : 'l'}` as Corner;
  const x = Math.max(0, Math.round(right ? w - left - btn : left));
  const y = Math.max(0, Math.round(bottom ? h - top - btn : top));
  return { corner, x, y };
}

function posToPx(p: Pos, w: number, h: number, btn = 56): { left: number; top: number } {
  const left = p.corner.endsWith('r') ? w - p.x - btn : p.x;
  const top = p.corner.startsWith('b') ? h - p.y - btn : p.y;
  return { left, top };
}

export function FabLivePreview() {
  const { designSettings, updateDesignSettings } = useApp();
  const cfg = (designSettings as any).unifiedFab || {};
  const initial: Item[] = useMemo(() => {
    const src = (cfg.items?.length ? cfg.items : DEFAULTS) as any[];
    return src.map((s, i) => ({
      ...DEFAULTS.find((d) => d.id === s.id) || DEFAULTS[i] || DEFAULTS[0],
      ...s,
      position_desktop: s.position_desktop || DEFAULTS.find((d) => d.id === s.id)?.position_desktop || { corner: 'br', x: 24, y: 24 },
      position_mobile: s.position_mobile || DEFAULTS.find((d) => d.id === s.id)?.position_mobile || { corner: 'br', x: 16, y: 16 },
    }));
  }, [designSettings]);

  const [items, setItems] = useState<Item[]>(initial);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [mode, setMode] = useState<'free' | 'socle' | 'grouped'>(cfg.mode || 'socle');
  const [groupSide, setGroupSide] = useState<'left' | 'right'>(cfg.groupSide || 'left');
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setItems(initial); setMode(cfg.mode || 'socle'); setGroupSide(cfg.groupSide || 'left'); }, [designSettings]);

  const size = SIZES[device];
  const posKey = device === 'desktop' ? 'position_desktop' : 'position_mobile';

  const onDrag = (id: ItemId) => (e: React.PointerEvent) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    const containerRect = containerRef.current!.getBoundingClientRect();
    const startLeft = target.offsetLeft;
    const startTop = target.offsetTop;
    const startX = e.clientX, startY = e.clientY;
    const move = (ev: PointerEvent) => {
      const left = Math.max(0, Math.min(size.w - 56, startLeft + (ev.clientX - startX)));
      const top = Math.max(0, Math.min(size.h - 56, startTop + (ev.clientY - startY)));
      target.style.left = `${left}px`;
      target.style.top = `${top}px`;
      target.style.right = 'auto';
      target.style.bottom = 'auto';
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const left = parseInt(target.style.left || '0');
      const top = parseInt(target.style.top || '0');
      const newPos = pxToPos(left, top, size.w, size.h);
      setItems((prev) => prev.map((it) => it.id === id ? { ...it, [posKey]: newPos } : it));
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const save = async () => {
    await updateDesignSettings({
      ...(designSettings as any),
      unifiedFab: { ...cfg, mode, groupSide, items },
    } as any);
    toast.success('Positions enregistrées');
  };

  const reset = () => setItems(DEFAULTS);

  const toggleVisible = (id: ItemId) => setItems(items.map((it) => it.id === id ? { ...it, visible: !it.visible } : it));

  return (
    <Card className="border-2 border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center justify-between flex-wrap gap-2">
          <span>Aperçu live · positionnement libre</span>
          <div className="flex items-center gap-2 text-sm font-normal">
            <Label>Mode</Label>
            <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="socle" className="text-xs">Socle</TabsTrigger>
                <TabsTrigger value="grouped" className="text-xs">Groupés</TabsTrigger>
                <TabsTrigger value="free" className="text-xs">Libres</TabsTrigger>
              </TabsList>
            </Tabs>
            {mode === 'grouped' && (
              <div className="flex gap-1">
                {(['left', 'right'] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setGroupSide(s)}
                    className={`text-[10px] uppercase px-2 py-1 border-2 ${groupSide === s ? 'border-primary bg-primary/10' : 'border-border'}`}>
                    {s === 'left' ? 'Gauche' : 'Droite'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Tabs value={device} onValueChange={(v) => setDevice(v as any)}>
            <TabsList>
              <TabsTrigger value="desktop" className="gap-1"><Monitor className="h-3.5 w-3.5" /> Desktop</TabsTrigger>
              <TabsTrigger value="mobile" className="gap-1"><Smartphone className="h-3.5 w-3.5" /> Mobile</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={reset} className="gap-1"><RotateCcw className="h-3.5 w-3.5" /> Réinitialiser</Button>
            <Button onClick={save} size="sm" className="gap-1"><Save className="h-3.5 w-3.5" /> Enregistrer</Button>
          </div>
        </div>

        {mode === 'socle' && (
          <div className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
            Mode <strong>Socle unifié</strong> actif : les 3 icônes restent groupées dans un seul bouton flottant.
            Passez en <strong>Icônes libres</strong> pour pouvoir les déplacer indépendamment ci-dessous.
          </div>
        )}

        <div className="overflow-auto border rounded bg-muted/20">
          <div
            ref={containerRef}
            className="relative mx-auto bg-background"
            style={{ width: size.w, height: size.h, maxWidth: '100%' }}
          >
            <iframe
              src="/"
              title="Aperçu home"
              className="absolute inset-0 w-full h-full border-0 pointer-events-none"
              style={{ width: size.w, height: size.h }}
            />
            {/* Draggable icons overlay */}
            {items.filter((it) => it.visible).map((it) => {
              const Icon = ICONS[it.id];
              const p = (it as any)[posKey] as Pos;
              const { left, top } = posToPx(p, size.w, size.h);
              return (
                <div
                  key={it.id}
                  onPointerDown={onDrag(it.id)}
                  className="absolute w-14 h-14 rounded-full bg-foreground text-background flex items-center justify-center shadow-2xl cursor-grab active:cursor-grabbing select-none ring-2 ring-primary/60"
                  style={{ left, top, touchAction: 'none' }}
                  title={`${it.label} — ${p.corner} ${p.x}/${p.y}`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="absolute -bottom-6 text-[9px] font-mono text-foreground bg-background px-1 rounded whitespace-nowrap">
                    {p.corner} {p.x}·{p.y}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between border rounded p-2">
              <span className="text-sm font-medium">{it.label}</span>
              <div className="flex items-center gap-2">
                <Label className="text-[10px]">Visible</Label>
                <Switch checked={it.visible} onCheckedChange={() => toggleVisible(it.id)} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
