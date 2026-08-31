import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gift, X, Copy, Check, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAdminViewport } from '@/context/AdminViewportContext';
import { cornerStyle, type FabPos } from '@/lib/fabPosition';
import { useAdminDrag } from '@/lib/useAdminDrag';
import { getIcon } from '@/components/admin/IconPicker';
import { cn } from '@/lib/utils';
import { useRouletteConfig, useRouletteSegments, type SpinResult } from '@/hooks/useRoulette';
import {
  useCooldown,
  fmtCooldown,
  persistResult,
  loadStoredResult,
  isValidEmail,
  useSpinRoulette,
} from '@/hooks/useGameSession';
import { useGameSounds } from '@/hooks/useGameSounds';
import { RouletteWheel } from '@/components/games/RouletteWheel';

const SPIN_DURATION = 5500;

interface RouletteFabProps {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  hideTrigger?: boolean;
}

export function RouletteFab({ open: openProp, onOpenChange, hideTrigger }: RouletteFabProps = {}) {
  const { user, isAdmin } = useAuth() as any;
  const { designSettings, updateDesignSettings } = useApp();
  const { data: config } = useRouletteConfig();
  const { data: segments = [] } = useRouletteSegments();
  const spin = useSpinRoulette();
  const sounds = useGameSounds();

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
  const pendingResultRef = useRef<SpinResult | null>(null);
  const cooldownH = config?.cooldown_hours ?? 24;
  const { canSpin, remaining } = useCooldown(cooldownH);

  useEffect(() => {
    const saved = loadStoredResult();
    if (saved && !canSpin) setResult(saved);
  }, [canSpin]);

  // External open event
  const location = useLocation();
  const autoOpenedRef = useRef(false);
  const demoMode = (() => { try { return localStorage.getItem('lvtk:demoMode') === '1'; } catch { return false; } })();
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('lvtk:open-roulette', onOpen);
    return () => window.removeEventListener('lvtk:open-roulette', onOpen);
  }, []);
  useEffect(() => {
    if (autoOpenedRef.current) return;
    if (!config?.enabled || segments.length === 0) return;
    if ((config as any).auto_open_on_landing === false) return;
    if (location.pathname !== '/' && location.pathname !== '/index') return;
    if (!canSpin) return;
    const dismissH = (config as any).show_after_dismiss_hours ?? 24;
    const lastPrompt = Number(localStorage.getItem('roulette_auto_prompt_at') || 0);
    if (!demoMode && lastPrompt && Date.now() - lastPrompt < dismissH * 3600_000) return;
    autoOpenedRef.current = true;
    const delay = demoMode ? 800 : ((config as any).auto_open_delay_ms ?? 1500);
    const t = setTimeout(() => {
      setOpen(true);
      if (!demoMode) localStorage.setItem('roulette_auto_prompt_at', String(Date.now()));
    }, delay);
    return () => clearTimeout(t);
  }, [config?.enabled, segments.length, canSpin, location.pathname, demoMode]);

  // FAB trigger styling (admin drag, position, variants) — preserved.
  const cfg = (designSettings as any).unifiedFab || {};
  const rfab = cfg.rouletteFab || {};
  const { effectiveDevice } = useAdminViewport();
  const isMobile = useIsMobile();
  const deviceKey = effectiveDevice;
  const posKey = `position_${deviceKey}` as const;
  const sizeKey = `size_${deviceKey}` as const;
  const mobileDefaultPos: FabPos = { corner: 'bl', x: 12, y: 48 };
  const desktopDefaultPos: FabPos = { corner: 'bl', x: 24, y: 24 };
  const fabPosCurrent: FabPos =
    rfab[posKey] ||
    (deviceKey === 'mobile' ? rfab.position_mobile || mobileDefaultPos : rfab.position_desktop || desktopDefaultPos);

  const rouletteDrag = useAdminDrag({
    enabled: !!isAdmin,
    currentPos: fabPosCurrent,
    autoCommit: true,
    validationLabel: `${deviceKey} OK ?`,
    onCommit: (pos) => {
      updateDesignSettings({ ...(designSettings as any), unifiedFab: { ...cfg, rouletteFab: { ...rfab, [posKey]: pos } } } as any);
      toast.success(`Position ${deviceKey} sauvegardée`);
    },
  });

  if (!config?.enabled || segments.length === 0) return null;

  const handleSpin = async () => {
    if (!user && !isValidEmail(email)) {
      toast.error('Email valide requis');
      return;
    }
    setSpinning(true);
    setResult(null);
    try {
      const data = await spin.mutateAsync(user ? undefined : email);
      if (data.error === 'COOLDOWN') {
        toast.error("Tu as déjà joué récemment");
        setSpinning(false);
        return;
      }
      if (data.error) {
        toast.error('Erreur : ' + data.error);
        setSpinning(false);
        return;
      }
      pendingResultRef.current = data;
      const idx = segments.findIndex((s) => s.id === data.segmentId);
      if (idx >= 0) {
        const slice = 360 / segments.length;
        const target = rotation + 360 * 8 + (360 - (idx * slice + slice / 2)) - (rotation % 360);
        setRotation(target);
      } else {
        // No segment match — settle immediately.
        setSpinning(false);
        setResult(data);
        pendingResultRef.current = null;
      }
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
      setSpinning(false);
    }
  };

  const copyCode = () => {
    if (!result?.code) return;
    navigator.clipboard.writeText(result.code);
    setCopied(true);
    toast.success('Code copié !');
    setTimeout(() => setCopied(false), 2000);
  };

  const fabPos: FabPos = fabPosCurrent;
  const variant = rfab.variant || 'glossy';
  const shape = rfab.shape || 'pill';
  const size = rfab[sizeKey] || rfab.size || 'md';
  const accentColor = rfab.accentColor || 'hsl(var(--primary))';
  const Icon = rfab.icon ? getIcon(rfab.icon) : Gift;
  const label = rfab.label || config.fab_label;
  const sizeClass = size === 'sm' ? 'px-3 py-2 text-[10px]' : size === 'lg' ? 'px-6 py-4 text-sm' : size === 'xl' ? 'px-8 py-5 text-base' : 'px-4 py-3 text-xs';
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : size === 'xl' ? 'h-6 w-6' : 'h-4 w-4';
  const shapeStyle = shape === 'round' ? { borderRadius: '9999px' } : shape === 'rect-bevel' ? { clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' } : { borderRadius: '9999px' };

  const winningSeg = result?.segmentId ? segments.find((s) => s.id === result.segmentId) : undefined;

  return (
    <>
      {!hideTrigger && (
        <div
          className="z-40"
          style={{ ...cornerStyle(fabPos.corner, fabPos.x, fabPos.y), touchAction: isAdmin ? 'none' : undefined }}
        >
          <div className="relative flex items-center gap-1">
            <button
              onClick={() => { if (rouletteDrag.blockClickRef.current) return; setOpen(true); }}
              onPointerDown={rouletteDrag.onPointerDown}
              className={cn('group', isAdmin && 'ring-2 ring-primary/60 cursor-grab active:cursor-grabbing')}
              aria-label="Ouvrir la roulette"
            >
              {isMobile ? (
                <div className="relative flex flex-col items-center gap-1">
                  <div className="relative">
                    {canSpin && rfab.pulse !== false && (
                      <span className="absolute inset-0 animate-ping rounded-full" style={{ background: `${accentColor}33` }} />
                    )}
                    <div
                      className="relative flex items-center justify-center rounded-full shadow-xl"
                      style={{
                        width: 48, height: 48,
                        background: 'hsl(var(--background))',
                        color: 'hsl(var(--foreground))',
                        border: '1px solid hsl(var(--foreground) / 0.3)',
                        boxShadow: `0 6px 20px ${accentColor}55`,
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <span className="font-bold tracking-wider uppercase text-[8px] leading-none px-1.5 py-0.5 rounded bg-background/85 border border-foreground/20" style={{ maxWidth: 64, textAlign: 'center' }}>
                    {label}
                  </span>
                </div>
              ) : (
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
                    <span className="font-bold tracking-wider uppercase">{label}</span>
                  </div>
                </div>
              )}
            </button>
            {isAdmin && (
              <div className="flex flex-col gap-1" data-no-drag>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const reset = { corner: 'cc', x: 0, y: 0 } as FabPos;
                    updateDesignSettings({
                      ...(designSettings as any),
                      unifiedFab: { ...cfg, rouletteFab: { ...rfab, [posKey]: reset } },
                    } as any);
                    toast.success(`Position ${deviceKey} réinitialisée`);
                  }}
                  className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-background border border-primary/60 text-foreground rounded shadow"
                  title={`Réinitialiser position ${deviceKey}`}
                >⟳ {deviceKey[0].toUpperCase()}</button>
                <select
                  value={size}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateDesignSettings({
                      ...(designSettings as any),
                      unifiedFab: { ...cfg, rouletteFab: { ...rfab, [sizeKey]: v } },
                    } as any);
                    toast.success(`Taille ${deviceKey}: ${v.toUpperCase()}`);
                  }}
                  className="text-[9px] font-bold uppercase border border-primary/60 bg-background px-1 py-0.5"
                  title={`Taille pour ${deviceKey}`}
                >
                  {(['sm','md','lg','xl'] as const).map((s) => (
                    <option key={s} value={s}>{s.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent hideClose className="w-[min(94vw,440px)] max-w-none p-0 bg-background border-2 border-primary/20 gap-0 overflow-hidden">
          <DialogTitle className="sr-only">{config.title}</DialogTitle>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-foreground/10">
            <button
              onClick={sounds.toggle}
              aria-label={sounds.enabled ? 'Couper le son' : 'Activer le son'}
              className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground"
            >
              {sounds.enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <div className="flex-1 text-center px-2 min-w-0">
              <h2 className="text-sm sm:text-base font-bold tracking-[0.2em] uppercase truncate">{config.title}</h2>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-4 pt-3 pb-4 text-center">
            <p className="text-[11px] text-muted-foreground mb-3 line-clamp-2">{config.subtitle}</p>

            {/* Wheel */}
            <div className="mb-3 px-2">
              <RouletteWheel
                segments={segments}
                rotation={rotation}
                onTick={sounds.tick}
                onSettled={() => {
                  const data = pendingResultRef.current;
                  if (!data) return;
                  pendingResultRef.current = null;
                  setSpinning(false);
                  setResult(data);
                  sounds.win();
                  persistResult(data);
                }}
                durationMs={SPIN_DURATION}
              />
            </div>

            {/* Result block */}
            {result ? (
              <div className="space-y-2 animate-fade-in">
                <div className="text-2xl leading-none">{winningSeg?.icon}</div>
                <h3 className="text-lg font-bold uppercase tracking-wider">{result.label}</h3>
                {result.description && (
                  <p className="text-xs text-muted-foreground">{result.description}</p>
                )}
                {result.code && (
                  <div className="flex items-center justify-center gap-2 p-2.5 bg-muted rounded-md border-2 border-dashed border-primary/40">
                    <code className="text-base font-mono font-bold tracking-wider break-all">{result.code}</code>
                    <Button size="icon" variant="ghost" onClick={copyCode} className="h-8 w-8 shrink-0" aria-label={copied ? 'Code copié' : 'Copier le code'}>
                      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
                {result.expiresAt && (
                  <p className="text-[11px] text-muted-foreground">
                    Valide jusqu'au {new Date(result.expiresAt).toLocaleDateString('fr-FR')}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Reviens dans {fmtCooldown(remaining)} pour rejouer
                </p>
              </div>
            ) : !canSpin ? (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Tu as déjà joué aujourd'hui</p>
                <p className="font-mono text-base font-bold">{fmtCooldown(remaining)}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">avant ton prochain tour</p>
              </div>
            ) : (
              <div className="space-y-3">
                {!user && (
                  <Input
                    type="email"
                    placeholder="ton@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-center h-10"
                    disabled={spinning}
                  />
                )}
                <Button
                  onClick={handleSpin}
                  disabled={spinning}
                  size="lg"
                  className="w-full font-bold uppercase tracking-wider"
                >
                  {spinning ? 'La roue tourne…' : config.button_label}
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
