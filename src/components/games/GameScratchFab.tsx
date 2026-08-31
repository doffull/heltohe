import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Copy, Check, X, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useRouletteConfig, useRouletteSegments, type RouletteSegment, type SpinResult } from '@/hooks/useRoulette';
import { useCooldown, fmtCooldown, persistResult, loadStoredResult, isValidEmail, useSpinRoulette } from '@/hooks/useGameSession';
import { useGameSounds } from '@/hooks/useGameSounds';
import { cn } from '@/lib/utils';

/**
 * Industrial-Luxury scratch card game — picks 1 of 3 cards.
 * Same server RPC as the wheel; only presentation differs.
 */

const CHAMFER = 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)';

interface Props {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  hideTrigger?: boolean;
}

export function GameScratchFab({ open: openProp, onOpenChange, hideTrigger }: Props = {}) {
  const { user } = useAuth();
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
  const [picked, setPicked] = useState<number | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [copied, setCopied] = useState(false);
  const cooldownH = config?.cooldown_hours ?? 24;
  const { canSpin, remaining } = useCooldown(cooldownH);

  useEffect(() => {
    const saved = loadStoredResult();
    if (saved && !canSpin) setResult(saved);
  }, [canSpin]);

  const cards = useMemo(() => [0, 1, 2], []);

  if (!config?.enabled || segments.length === 0) return null;

  const winningSegment: RouletteSegment | undefined = result?.segmentId
    ? segments.find((s) => s.id === result.segmentId)
    : undefined;

  const handlePick = async (idx: number) => {
    if (revealing || result || !canSpin) return;
    if (!user && !isValidEmail(email)) {
      toast.error('Email valide requis');
      return;
    }
    setPicked(idx);
    setRevealing(true);
    sounds.startScratch();
    try {
      const data = await spin.mutateAsync(user ? undefined : email);
      if (data.error === 'COOLDOWN') {
        toast.error("Tu as déjà joué récemment");
        setRevealing(false);
        setPicked(null);
        sounds.stopScratch();
        return;
      }
      if (data.error) {
        toast.error('Erreur : ' + data.error);
        setRevealing(false);
        setPicked(null);
        sounds.stopScratch();
        return;
      }
      setTimeout(() => {
        sounds.stopScratch();
        setRevealing(false);
        setResult(data);
        sounds.win();
        persistResult(data);
      }, 1100);
    } catch (e: any) {
      toast.error(e?.message || 'Erreur');
      setRevealing(false);
      setPicked(null);
      sounds.stopScratch();
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
              <span className="absolute inset-0 animate-ping bg-foreground/20" style={{ clipPath: CHAMFER }} />
            )}
            <Sparkles className="h-4 w-4 relative" />
            <span className="text-xs font-bold uppercase tracking-[0.18em] relative">
              {config.fab_label || 'Gratter'}
            </span>
          </div>
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent hideClose className="w-[min(94vw,440px)] max-w-none p-0 bg-background border-2 border-foreground/20 gap-0 overflow-hidden">
          <DialogTitle className="sr-only">{config.title}</DialogTitle>

          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-foreground/10">
            <button
              onClick={sounds.toggle}
              aria-label={sounds.enabled ? 'Couper le son' : 'Activer le son'}
              className="h-9 w-9 inline-flex items-center justify-center hover:bg-muted text-muted-foreground"
              style={{ clipPath: CHAMFER }}
            >
              {sounds.enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <div className="flex-1 text-center px-2 min-w-0">
              <p className="font-mono text-[9px] tracking-[0.3em] text-muted-foreground uppercase">// Jeu HELVETICA-MP</p>
              <h2 className="text-sm sm:text-base font-bold tracking-[0.2em] uppercase truncate">
                {config.title || 'Gratte & Gagne'}
              </h2>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="h-9 w-9 inline-flex items-center justify-center hover:bg-muted"
              style={{ clipPath: CHAMFER }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-4 pt-3 pb-4 text-center">
            <p className="text-[11px] text-muted-foreground mb-3 line-clamp-2">{config.subtitle}</p>

            {!user && !result && canSpin && (
              <div className="mb-3">
                <Input
                  type="email"
                  placeholder="ton@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-none border-foreground/30 text-center uppercase tracking-wider text-xs h-10"
                />
              </div>
            )}

            {!canSpin && !result && (
              <p className="text-xs text-muted-foreground mb-3">Reviens dans {fmtCooldown(remaining)}.</p>
            )}

            {/* Cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
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
                      isPicked ? 'scale-105' : 'hover:scale-[1.03]',
                      !canSpin || (!!result && !isPicked) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                      isReveal && 'ring-2 ring-primary shadow-lg'
                    )}
                    style={{
                      clipPath: CHAMFER,
                      background: isReveal
                        ? seg?.color || 'hsl(var(--foreground))'
                        : 'linear-gradient(135deg, hsl(var(--foreground)) 0%, hsl(var(--foreground) / 0.75) 100%)',
                      color: isReveal ? seg?.text_color : undefined,
                    }}
                  >
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
                      <>
                        <div className="absolute inset-0 bg-background/40 animate-pulse" />
                        <div
                          className="absolute inset-0 opacity-60 animate-pulse"
                          style={{
                            backgroundImage:
                              'repeating-linear-gradient(90deg, transparent 0 2px, hsl(var(--background) / 0.6) 2px 4px)',
                          }}
                        />
                      </>
                    )}
                    <div className="relative z-10 flex flex-col items-center gap-1 px-1 min-w-0 w-full">
                      {isReveal ? (
                        <>
                          <span className="text-2xl sm:text-3xl leading-none">{seg?.icon || '✦'}</span>
                          <span className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase mt-1 truncate w-full">
                            {seg?.label}
                          </span>
                        </>
                      ) : (
                        <span className="font-mono text-2xl sm:text-3xl font-bold opacity-80">0{i + 1}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {!result && !revealing && canSpin && (
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">Choisis une carte</p>
            )}

            {result && (
              <div className="space-y-3 animate-fade-in">
                <h3 className="text-lg font-bold uppercase tracking-wider">{result.label}</h3>
                {result.description && (
                  <p className="text-xs text-muted-foreground">{result.description}</p>
                )}
                {result.code && (
                  <div
                    className="flex items-center justify-center gap-2 p-2.5 bg-muted border border-foreground/20"
                    style={{ clipPath: CHAMFER }}
                  >
                    <code className="text-base font-mono font-bold tracking-wider break-all">{result.code}</code>
                    <Button variant="ghost" size="icon" onClick={copyCode} className="shrink-0" aria-label="Copier le code">
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
