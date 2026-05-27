import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Copy, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import {
  useRouletteConfig,
  useRouletteSegments,
  useSpinRoulette,
  type RouletteSegment,
  type SpinResult,
} from '@/hooks/useRoulette';
import { cn } from '@/lib/utils';

/**
 * Industrial-Luxury scratch card game — replaces the visual roulette.
 * Uses the same server-side `spin_roulette` RPC so cooldown, codes and
 * segments stay identical. Only the presentation changes.
 *
 * Design: 3 face-down cards, biseaux 45°, Helvetica-MP. The user picks one
 * card, the front reveals with a soft scratch animation, the won segment
 * is highlighted with its label/icon and the promo code is copyable.
 */

const LS_LAST = 'roulette_last_spin';
const LS_RESULT = 'roulette_last_result';
const CHAMFER =
  'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)';

interface Props {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  hideTrigger?: boolean;
}

function useCooldown(hours: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const last = Number(localStorage.getItem(LS_LAST) || 0);
  const next = last + hours * 3600_000;
  const remaining = Math.max(0, next - now);
  return { canSpin: remaining === 0, remaining };
}

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function GameScratchFab({ open: openProp, onOpenChange, hideTrigger }: Props = {}) {
  const { user } = useAuth();
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
  const [picked, setPicked] = useState<number | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [copied, setCopied] = useState(false);
  const cooldownH = config?.cooldown_hours ?? 24;
  const { canSpin, remaining } = useCooldown(cooldownH);
  const pickedRef = useRef<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(LS_RESULT);
    if (saved && !canSpin) {
      try { setResult(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, [canSpin]);

  // Fake card slots — visual only. Real segment is decided server-side.
  const cards = useMemo(() => [0, 1, 2], []);

  if (!config?.enabled || segments.length === 0) return null;

  const winningSegment: RouletteSegment | undefined = result?.segmentId
    ? segments.find((s) => s.id === result.segmentId)
    : undefined;

  const handlePick = async (idx: number) => {
    if (revealing || result) return;
    if (!user && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error('Email valide requis');
      return;
    }
    pickedRef.current = idx;
    setPicked(idx);
    setRevealing(true);
    try {
      const data = await spin.mutateAsync(user ? undefined : email);
      if (data.error === 'COOLDOWN') {
        toast.error('Vous avez déjà joué récemment.');
        setRevealing(false);
        setPicked(null);
        return;
      }
      if (data.error) {
        toast.error('Erreur : ' + data.error);
        setRevealing(false);
        setPicked(null);
        return;
      }
      // Small reveal animation delay
      setTimeout(() => {
        setRevealing(false);
        setResult(data);
        localStorage.setItem(LS_LAST, String(Date.now()));
        localStorage.setItem(LS_RESULT, JSON.stringify(data));
      }, 900);
    } catch (e: any) {
      toast.error(e?.message || 'Erreur');
      setRevealing(false);
      setPicked(null);
    }
  };

  const copyCode = () => {
    if (!result?.code) return;
    navigator.clipboard.writeText(result.code);
    setCopied(true);
    toast.success('Code copié');
    setTimeout(() => setCopied(false), 1800);
  };

  const reset = () => {
    setResult(null);
    setPicked(null);
    pickedRef.current = null;
  };

  return (
    <>
      {!hideTrigger && (
        <button
          onClick={() => setOpen(true)}
          aria-label={config.fab_label || 'Tenter ma chance'}
          className="fixed bottom-4 left-4 md:bottom-6 md:left-6 z-40 group"
        >
          <div
            className="relative flex items-center gap-2 px-4 py-3 bg-foreground text-background border border-foreground/30 shadow-2xl hover:scale-105 transition-transform"
            style={{ clipPath: CHAMFER }}
          >
            {canSpin && (
              <span
                className="absolute inset-0 animate-ping bg-foreground/20"
                style={{ clipPath: CHAMFER }}
              />
            )}
            <Sparkles className="h-4 w-4 relative" />
            <span className="text-xs font-bold uppercase tracking-[0.18em] relative">
              {config.fab_label || 'Gratter'}
            </span>
          </div>
        </button>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!v) { /* keep result */ } setOpen(v); }}>
        <DialogContent className="max-w-md sm:max-w-lg p-0 bg-background border-2 border-foreground/20">
          <DialogTitle className="sr-only">{config.title}</DialogTitle>
          <button
            onClick={() => setOpen(false)}
            aria-label="Fermer"
            className="absolute right-2 top-2 z-30 inline-flex h-10 w-10 items-center justify-center bg-background/90 hover:bg-muted border border-foreground/20"
            style={{ clipPath: CHAMFER }}
          >
            <X className="h-4 w-4" />
          </button>

          <div className="p-5 sm:p-7 text-center">
            <p className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase mb-2">
              // Jeu LVTK6
            </p>
            <h2 className="text-xl sm:text-2xl font-bold tracking-[0.18em] uppercase mb-1">
              {config.title || 'Gratte & Gagne'}
            </h2>
            <p className="text-xs text-muted-foreground mb-5">{config.subtitle}</p>

            {!user && !result && (
              <div className="mb-4">
                <Input
                  type="email"
                  placeholder="Votre email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-none border-foreground/30 text-center uppercase tracking-wider text-xs"
                />
              </div>
            )}

            {!canSpin && !result && (
              <p className="text-xs text-muted-foreground mb-4">
                Reviens dans {fmt(remaining)}.
              </p>
            )}

            {/* Cards */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
              {cards.map((i) => {
                const isPicked = picked === i;
                const isReveal = isPicked && !!result;
                const seg = isReveal ? winningSegment : undefined;
                return (
                  <button
                    key={i}
                    onClick={() => handlePick(i)}
                    disabled={!canSpin || revealing || !!result}
                    className={cn(
                      'relative aspect-[2/3] flex items-center justify-center text-background overflow-hidden transition-all',
                      'border border-foreground/40',
                      isPicked ? 'scale-105' : 'hover:scale-105',
                      !canSpin || !!result ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                    )}
                    style={{
                      clipPath: CHAMFER,
                      background: isReveal
                        ? seg?.color || 'hsl(var(--foreground))'
                        : 'linear-gradient(135deg, hsl(var(--foreground)) 0%, hsl(var(--foreground) / 0.7) 100%)',
                      color: isReveal ? seg?.text_color : undefined,
                    }}
                  >
                    {/* Diagonal stripes pattern when face down */}
                    {!isReveal && (
                      <div
                        className="absolute inset-0 opacity-30"
                        style={{
                          backgroundImage:
                            'repeating-linear-gradient(45deg, transparent 0 6px, hsl(var(--background) / 0.4) 6px 7px)',
                        }}
                      />
                    )}
                    {isPicked && revealing && (
                      <div className="absolute inset-0 bg-background/40 animate-pulse" />
                    )}
                    <div className="relative z-10 flex flex-col items-center gap-1">
                      {isReveal ? (
                        <>
                          <span className="text-3xl leading-none">{seg?.icon || '✦'}</span>
                          <span className="text-[10px] font-bold tracking-wider uppercase mt-1">
                            {seg?.label}
                          </span>
                        </>
                      ) : (
                        <span className="font-mono text-3xl font-bold opacity-80">0{i + 1}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {!result && !revealing && canSpin && (
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
                Choisis une carte
              </p>
            )}

            {result && (
              <div className="space-y-3 animate-fade-in">
                <h3 className="text-lg font-bold uppercase tracking-wider">{result.label}</h3>
                {result.description && (
                  <p className="text-xs text-muted-foreground">{result.description}</p>
                )}
                {result.code && (
                  <div
                    className="flex items-center justify-center gap-2 p-3 bg-muted border border-foreground/20"
                    style={{ clipPath: CHAMFER }}
                  >
                    <code className="text-base font-mono font-bold tracking-wider">
                      {result.code}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={copyCode}
                      aria-label="Copier le code"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-none uppercase tracking-wider text-[10px]"
                  onClick={() => { reset(); setOpen(false); }}
                >
                  Fermer
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
