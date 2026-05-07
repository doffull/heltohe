import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gift, X, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { cornerStyle, type FabPos } from '@/lib/fabPosition';
import { useAdminDrag } from '@/lib/useAdminDrag';
import { getIcon } from '@/components/admin/IconPicker';
import { cn } from '@/lib/utils';
import {
  useRouletteConfig,
  useRouletteSegments,
  useSpinRoulette,
  type RouletteSegment,
  type SpinResult,
} from '@/hooks/useRoulette';

const LS_LAST = 'roulette_last_spin';
const LS_RESULT = 'roulette_last_result';

function useCooldown(cooldownHours: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const last = Number(localStorage.getItem(LS_LAST) || 0);
  const next = last + cooldownHours * 3600_000;
  const remaining = Math.max(0, next - now);
  return { canSpin: remaining === 0, remaining };
}

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
}

function Wheel({
  segments,
  rotation,
  size = 320,
}: {
  segments: RouletteSegment[];
  rotation: number;
  size?: number;
}) {
  const n = segments.length || 1;
  const slice = 360 / n;
  const r = size / 2;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Pointer */}
      <div
        className="absolute left-1/2 -translate-x-1/2 -top-2 z-10"
        style={{
          width: 0,
          height: 0,
          borderLeft: '14px solid transparent',
          borderRight: '14px solid transparent',
          borderTop: '24px solid hsl(var(--primary))',
        }}
      />
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: 'transform 5s cubic-bezier(0.18, 0.89, 0.32, 1.18)',
          filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))',
        }}
      >
        {segments.map((seg, i) => {
          const a0 = (i * slice - 90) * (Math.PI / 180);
          const a1 = ((i + 1) * slice - 90) * (Math.PI / 180);
          const x0 = r + r * Math.cos(a0);
          const y0 = r + r * Math.sin(a0);
          const x1 = r + r * Math.cos(a1);
          const y1 = r + r * Math.sin(a1);
          const large = slice > 180 ? 1 : 0;
          const path = `M ${r} ${r} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
          // Label position
          const am = ((i + 0.5) * slice - 90) * (Math.PI / 180);
          const lr = r * 0.65;
          const lx = r + lr * Math.cos(am);
          const ly = r + lr * Math.sin(am);
          const rot = i * slice + slice / 2;
          return (
            <g key={seg.id}>
              <path d={path} fill={seg.color} stroke="#fff" strokeWidth="2" />
              <g transform={`translate(${lx}, ${ly}) rotate(${rot})`}>
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={seg.text_color}
                  fontSize={size * 0.05}
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {seg.icon} {seg.label}
                </text>
              </g>
            </g>
          );
        })}
        <circle cx={r} cy={r} r={r * 0.12} fill="hsl(var(--primary))" stroke="#fff" strokeWidth="3" />
      </svg>
    </div>
  );
}

interface RouletteFabProps {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  hideTrigger?: boolean;
}

export function RouletteFab({ open: openProp, onOpenChange, hideTrigger }: RouletteFabProps = {}) {
  const { user } = useAuth();
  const { isAdmin } = useAuth() as any;
  const { designSettings, updateDesignSettings } = useApp();
  const { data: config } = useRouletteConfig();
  const { data: segments = [] } = useRouletteSegments();
  const spin = useSpinRoulette();

  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp !== undefined ? openProp : openInternal;
  const setOpen = (v: boolean) => {
    onOpenChange?.(v);
    if (openProp === undefined) setOpenInternal(v);
  };
  const [email, setEmail] = useState('');
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [copied, setCopied] = useState(false);
  const cooldownH = config?.cooldown_hours ?? 24;
  const { canSpin, remaining } = useCooldown(cooldownH);
  const wheelSize = useMemo(() => (typeof window !== 'undefined' && window.innerWidth < 480 ? 280 : 360), [open]);

  // Restore last result if still within cooldown
  useEffect(() => {
    const saved = localStorage.getItem(LS_RESULT);
    if (saved && !canSpin) {
      try { setResult(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, [canSpin]);

  // Auto-open on home if user can spin and hasn't been auto-prompted today
  const location = useLocation();
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (autoOpenedRef.current) return;
    if (!config?.enabled || segments.length === 0) return;
    if ((config as any).auto_open_on_landing === false) return;
    if (location.pathname !== '/' && location.pathname !== '/index') return;
    if (!canSpin) return;
    const dismissH = (config as any).show_after_dismiss_hours ?? 24;
    const lastPrompt = Number(localStorage.getItem('roulette_auto_prompt_at') || 0);
    if (lastPrompt && Date.now() - lastPrompt < dismissH * 3600_000) return;
    autoOpenedRef.current = true;
    const delay = (config as any).auto_open_delay_ms ?? 1500;
    const t = setTimeout(() => {
      setOpen(true);
      localStorage.setItem('roulette_auto_prompt_at', String(Date.now()));
    }, delay);
    return () => clearTimeout(t);
  }, [config?.enabled, segments.length, canSpin, location.pathname]);

  const dragRef = useRef({ blocked: false });

  if (!config?.enabled || segments.length === 0) return null;

  const handleSpin = async () => {
    if (!user && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error('Email valide requis');
      return;
    }
    setSpinning(true);
    setResult(null);
    try {
      const data = await spin.mutateAsync(user ? undefined : email);
      if (data.error === 'COOLDOWN') {
        toast.error('Vous avez déjà tourné aujourd\'hui');
        if (data.nextAvailableAt) {
          const last = new Date(data.nextAvailableAt).getTime() - cooldownH * 3600_000;
          localStorage.setItem(LS_LAST, String(last));
        }
        setSpinning(false);
        return;
      }
      if (data.error) {
        toast.error('Erreur : ' + data.error);
        setSpinning(false);
        return;
      }
      const idx = segments.findIndex((s) => s.id === data.segmentId);
      if (idx >= 0) {
        const slice = 360 / segments.length;
        // Rotate so chosen slice ends at top (pointer)
        const target = 360 * 8 + (360 - (idx * slice + slice / 2));
        setRotation(target);
      }
      setTimeout(() => {
        setSpinning(false);
        setResult(data);
        localStorage.setItem(LS_LAST, String(Date.now()));
        localStorage.setItem(LS_RESULT, JSON.stringify(data));
      }, 5200);
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
      setSpinning(false);
    }
  };

  const copyCode = () => {
    if (result?.code) {
      navigator.clipboard.writeText(result.code);
      setCopied(true);
      toast.success('Code copié !');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const cfg = (designSettings as any).unifiedFab || {};
  const rfab = cfg.rouletteFab || {};
  const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false;
  const fabPos: FabPos = (isMobile ? rfab.position_mobile : rfab.position_desktop) || { corner: 'cc', x: 0, y: 0 };
  const variant = rfab.variant || 'glossy';
  const shape = rfab.shape || 'pill';
  const size = rfab.size || 'md';
  const accentColor = rfab.accentColor || 'hsl(var(--primary))';
  const Icon = rfab.icon ? getIcon(rfab.icon) : Gift;
  const label = rfab.label || config.fab_label;
  const sizeClass = size === 'sm' ? 'px-3 py-2 text-[10px]' : size === 'lg' ? 'px-6 py-4 text-sm' : size === 'xl' ? 'px-8 py-5 text-base' : 'px-4 py-3 text-xs';
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : size === 'xl' ? 'h-6 w-6' : 'h-4 w-4';
  const shapeStyle = shape === 'round' ? { borderRadius: '9999px' } : shape === 'rect-bevel' ? { clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' } : { borderRadius: '9999px' };

  const rouletteDrag = useAdminDrag({
    enabled: !!isAdmin,
    onCommit: (pos) => {
      const key = isMobile ? 'position_mobile' : 'position_desktop';
      updateDesignSettings({ ...(designSettings as any), unifiedFab: { ...cfg, rouletteFab: { ...rfab, [key]: pos } } } as any);
      toast.success('Jeu-concours repositionné');
    },
  });

  return (
    <>
      {!hideTrigger && (
        <button
          onClick={() => { if (dragRef.current.blocked) return; setOpen(true); }}
          onPointerDown={onPointerDown}
          className={cn('group z-40', isAdmin && 'ring-2 ring-primary/60 cursor-grab active:cursor-grabbing')}
          style={{ ...cornerStyle(fabPos.corner, fabPos.x, fabPos.y), touchAction: isAdmin ? 'none' : undefined }}
          aria-label="Ouvrir la roulette"
        >
          <div className="relative">
            {canSpin && rfab.pulse !== false && (
              <span className="absolute inset-0 animate-ping" style={{ ...shapeStyle, background: `${accentColor}33` }} />
            )}
            <div
              className={cn(
                'relative flex items-center gap-2 shadow-xl transition-all',
                sizeClass,
                variant === 'glass' && 'bg-white/10 backdrop-blur-xl border border-white/20 text-foreground',
                variant === 'neon' && 'bg-foreground text-background border-2',
                variant === 'metal' && 'bg-gradient-to-b from-zinc-200 to-zinc-400 text-zinc-900 border border-zinc-500',
                variant === 'outline' && 'bg-transparent text-foreground border-2 border-foreground',
                variant === 'minimal' && 'bg-background text-foreground border border-foreground/20',
                variant === 'glossy' && 'bg-background text-foreground border border-foreground/30 backdrop-blur-md hover:bg-foreground hover:text-background'
              )}
              style={{
                ...shapeStyle,
                boxShadow: `0 8px 28px ${accentColor}55`,
                borderColor: variant === 'neon' ? accentColor : undefined,
              }}
            >
              <Icon className={iconSize} />
              <span className="font-bold tracking-wider uppercase">
                {label}
              </span>
            </div>
          </div>
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-background border-2 border-primary/20">
          <DialogTitle className="sr-only">{config.title}</DialogTitle>
          <button
            onClick={() => setOpen(false)}
            className="absolute right-3 top-3 z-20 p-1.5 rounded-full bg-background/80 hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="p-6 text-center">
            <h2 className="text-2xl font-bold tracking-wider uppercase mb-1">{config.title}</h2>
            <p className="text-sm text-muted-foreground mb-6">{config.subtitle}</p>

            <div className="flex justify-center mb-6">
              <Wheel segments={segments} rotation={rotation} size={wheelSize} />
            </div>

            {result ? (
              <div className="space-y-4 animate-fade-in">
                <div className="text-3xl">{segments.find(s => s.id === result.segmentId)?.icon}</div>
                <h3 className="text-xl font-bold uppercase">{result.label}</h3>
                <p className="text-sm text-muted-foreground">{result.description}</p>
                {result.code && (
                  <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg border-2 border-dashed border-primary/40">
                    <code className="text-lg font-mono font-bold tracking-wider">{result.code}</code>
                    <Button size="icon" variant="ghost" onClick={copyCode} className="h-8 w-8">
                      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
                {result.expiresAt && (
                  <p className="text-xs text-muted-foreground">
                    Valide jusqu'au {new Date(result.expiresAt).toLocaleDateString('fr-FR')}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Reviens dans {fmt(remaining)} pour rejouer
                </p>
              </div>
            ) : !canSpin ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Tu as déjà joué aujourd'hui</p>
                <p className="font-mono text-lg font-bold">{fmt(remaining)}</p>
                <p className="text-xs text-muted-foreground">avant ton prochain tour</p>
              </div>
            ) : (
              <div className="space-y-4">
                {!user && (
                  <Input
                    type="email"
                    placeholder="ton@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-center"
                    disabled={spinning}
                  />
                )}
                <Button
                  onClick={handleSpin}
                  disabled={spinning}
                  size="lg"
                  className="w-full font-bold uppercase tracking-wider"
                >
                  {spinning ? 'La roue tourne...' : config.button_label}
                </Button>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  1 tour par {cooldownH}h
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
