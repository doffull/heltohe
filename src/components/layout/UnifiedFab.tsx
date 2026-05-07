import { useEffect, useMemo, useState } from 'react';
import { Mic, Gift, Bot, Sparkles, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useRouletteConfig } from '@/hooks/useRoulette';
import { useHomeFabButtons } from '@/hooks/useHomeFabButtons';
import { useAuth } from '@/context/AuthContext';
import { VoiceCommandFab } from '@/components/voice/VoiceCommandFab';
import { RouletteFab } from '@/components/home/RouletteFab';
import { ChatBotWidget } from './ChatBotWidget';
import { getIcon } from '@/components/admin/IconPicker';
import { cn } from '@/lib/utils';
import type { HomeFabButton } from '@/types';

const HINT_KEY = 'voice_hint_seen';
const POS_KEY = 'unified_fab_pos_v1';

const ICON_MAP: Record<string, any> = { voice: Mic, chat: Bot, roulette: Gift };

const DEFAULT_ITEMS = [
  { id: 'voice' as const, label: 'Voix', icon: 'Mic', visible: true, order: 0 },
  { id: 'chat' as const, label: 'Assistant', icon: 'Bot', visible: true, order: 1 },
  { id: 'roulette' as const, label: 'Jeu-concours', icon: 'Gift', visible: true, order: 2 },
];

function cornerStyle(corner: string, x: number, y: number): React.CSSProperties {
  const s: React.CSSProperties = { position: 'fixed', zIndex: 50 };
  if (corner === 'br') { s.right = x; s.bottom = y; }
  else if (corner === 'bl') { s.left = x; s.bottom = y; }
  else if (corner === 'tr') { s.right = x; s.top = y; }
  else if (corner === 'tl') { s.left = x; s.top = y; }
  return s;
}

export function UnifiedFab() {
  const { designSettings } = useApp();
  const { isAdmin } = useAuth();
  const { data: rouletteConfig } = useRouletteConfig();
  const { data: customFabs = [] } = useHomeFabButtons();
  const [open, setOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [rouletteOpen, setRouletteOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(() => {
    try { const v = localStorage.getItem(POS_KEY); return v ? JSON.parse(v) : null; } catch { return null; }
  });

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const cfg = (designSettings as any).unifiedFab || {};
  const accent = cfg.accentColor || '#ffffff';
  const mode: 'socle' | 'free' | 'grouped' = cfg.mode === 'free' ? 'free' : cfg.mode === 'grouped' ? 'grouped' : 'socle';
  const groupSide: 'left' | 'right' = cfg.groupSide === 'right' ? 'right' : 'left';
  const groupOffsetY: number = typeof cfg.groupOffsetY === 'number' ? cfg.groupOffsetY : 220;
  const items = (cfg.items && cfg.items.length ? cfg.items : DEFAULT_ITEMS) as any[];
  const posCfg = isMobile
    ? (cfg.position_mobile || { corner: 'br', x: 16, y: 16 })
    : (cfg.position_desktop || { corner: 'br', x: 24, y: 24 });

  const voiceEnabled = designSettings.voiceCommandEnabled;
  const hintEnabled = (designSettings as any).voiceOnboardingHint !== false;

  useEffect(() => {
    if (!voiceEnabled || !hintEnabled) return;
    try { if (localStorage.getItem(HINT_KEY)) return; } catch { return; }
    const t = setTimeout(() => setShowHint(true), 2500);
    const t2 = setTimeout(() => {
      setShowHint(false);
      try { localStorage.setItem(HINT_KEY, '1'); } catch {}
    }, 9000);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [voiceEnabled, hintEnabled]);

  const visibleCustom = useMemo(
    () => customFabs.filter((b) => isMobile ? b.visible_mobile : b.visible_desktop),
    [customFabs, isMobile]
  );

  const handleAction = (b: HomeFabButton) => {
    switch (b.action_type) {
      case 'roulette': setRouletteOpen(true); break;
      case 'voice': setVoiceOpen(true); break;
      case 'chat': setChatOpen(true); break;
      case 'newsletter': window.dispatchEvent(new CustomEvent('open-newsletter-popup')); break;
      case 'external': window.open(b.action_value, '_blank', 'noopener,noreferrer'); break;
      case 'route': default: window.location.assign(b.action_value || '/');
    }
  };

  const triggerItem = (id: 'voice' | 'chat' | 'roulette') => {
    setOpen(false);
    if (id === 'voice') {
      try { localStorage.setItem(HINT_KEY, '1'); } catch {}
      setShowHint(false);
      setVoiceOpen(true);
    } else if (id === 'chat') setChatOpen(true);
    else if (id === 'roulette') setRouletteOpen(true);
  };

  const visibleItems = items
    .filter((it) => it.visible)
    .filter((it) => it.id !== 'voice' || voiceEnabled)
    .filter((it) => it.id !== 'roulette' || rouletteConfig?.enabled)
    .sort((a, b) => a.order - b.order);

  // Drag (admin only)
  const onDragStart = (e: React.PointerEvent) => {
    if (!isAdmin) return;
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const init = dragPos || { x: window.innerWidth - 80, y: window.innerHeight - 80 };
    const move = (ev: PointerEvent) => {
      setDragPos({
        x: Math.max(8, Math.min(window.innerWidth - 64, init.x + (ev.clientX - startX))),
        y: Math.max(8, Math.min(window.innerHeight - 64, init.y + (ev.clientY - startY))),
      });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      try { localStorage.setItem(POS_KEY, JSON.stringify(dragPos)); } catch {}
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const baseStyle: React.CSSProperties = isAdmin && dragPos
    ? { position: 'fixed', left: dragPos.x, top: dragPos.y, zIndex: 50 }
    : cornerStyle(posCfg.corner, posCfg.x, posCfg.y);

  return (
    <>
      {/* Custom DB FABs (preserved, independent placement) */}
      {visibleCustom.map((b) => {
        const pos = isMobile ? b.position_mobile : b.position_desktop;
        const I = getIcon(b.icon);
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => handleAction(b)}
            aria-label={b.label}
            title={b.label}
            className={`hw-cta-btn hw-cta-v-${b.variant} hw-cta-rd-md w-12 h-12 p-0 shadow-xl`}
            style={cornerStyle(pos.corner, pos.x, pos.y)}
          >
            <I className="h-5 w-5" />
            {b.badge && (
              <span className="absolute -top-1.5 -right-1.5 bg-foreground text-background text-[8px] font-bold px-1.5 py-0.5 uppercase tracking-wider">
                {b.badge}
              </span>
            )}
          </button>
        );
      })}

      {/* Hint bubble */}
      {showHint && voiceEnabled && (
        <div
          className="fixed z-[51] bg-foreground text-background px-3 py-2 text-[10px] uppercase tracking-[0.18em] font-bold animate-fade-in shadow-2xl"
          style={{
            ...(baseStyle.left !== undefined
              ? { left: (baseStyle.left as number) - 200, top: baseStyle.top as number }
              : { right: (posCfg.x as number) + 70, bottom: (posCfg.y as number) + 8 }),
          }}
        >
          Nouveau · commande vocale
        </div>
      )}

      <ChatBotWidget open={chatOpen} onOpenChange={setChatOpen} hideTrigger />

      {mode === 'free' || mode === 'grouped' ? (
        <>
          {(() => {
            const groupedIds = mode === 'grouped'
              ? new Set(visibleItems.filter((it: any) => (it.groupedIn ?? (it.id === 'voice' || it.id === 'chat' ? 'group' : 'free')) === 'group').map((it: any) => it.id))
              : new Set();
            const freeOnes = visibleItems.filter((it: any) => !groupedIds.has(it.id));
            return (
              <>
                {/* Mini-socle Voix + Assistant */}
                {mode === 'grouped' && groupedIds.size > 0 && (
                  <div
                    className="fixed z-40 flex flex-col gap-2 p-2 rounded-2xl backdrop-blur-xl bg-background/80 border border-foreground/20 shadow-2xl"
                    style={{
                      [groupSide]: 16,
                      top: groupOffsetY,
                      boxShadow: `0 8px 32px ${accent}33`,
                    } as any}
                  >
                    {visibleItems
                      .filter((it: any) => groupedIds.has(it.id))
                      .map((it: any) => {
                        const Icon = ICON_MAP[it.id] || Sparkles;
                        return (
                          <button
                            key={it.id}
                            onClick={() => triggerItem(it.id)}
                            aria-label={it.label}
                            title={it.label}
                            className="group relative w-11 h-11 rounded-full bg-background/90 border-2 border-foreground/40 text-foreground hover:scale-110 hover:bg-foreground hover:text-background transition-all flex items-center justify-center"
                          >
                            <Icon className="h-4 w-4" />
                            <span className={cn(
                              'absolute top-1/2 -translate-y-1/2 px-2 py-1 bg-foreground text-background text-[10px] uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none',
                              groupSide === 'left' ? 'left-full ml-3' : 'right-full mr-3'
                            )}>
                              {it.label}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                )}
                {/* Free items (Roulette, Message, etc.) */}
                {freeOnes.map((it: any) => {
                  const Icon = ICON_MAP[it.id] || Sparkles;
                  const p = (isMobile ? it.position_mobile : it.position_desktop) || (isMobile ? { corner: 'br', x: 16, y: 16 + (it.order || 0) * 70 } : { corner: 'br', x: 24, y: 24 + (it.order || 0) * 70 });
                  return (
                    <button
                      key={it.id}
                      onClick={() => triggerItem(it.id)}
                      aria-label={it.label}
                      title={it.label}
                      className="group w-12 h-12 rounded-full backdrop-blur-xl bg-background/80 border-2 border-foreground/40 text-foreground hover:scale-110 hover:bg-foreground hover:text-background transition-all shadow-xl flex items-center justify-center"
                      style={{ ...cornerStyle(p.corner, p.x, p.y), boxShadow: `0 8px 24px ${accent}44, 0 0 0 3px ${accent}11` }}
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  );
                })}
              </>
            );
          })()}
        </>
      ) : (
        <div style={baseStyle} className="flex flex-col items-center gap-3">
          {open && (
            <div className="flex flex-col items-center gap-2 animate-fade-in">
              {visibleItems.map((it: any) => {
                const Icon = ICON_MAP[it.id] || Sparkles;
                return (
                  <button
                    key={it.id}
                    onClick={() => triggerItem(it.id)}
                    aria-label={it.label}
                    title={it.label}
                    className="group relative w-12 h-12 rounded-full backdrop-blur-xl bg-background/70 border border-foreground/30 text-foreground hover:scale-110 hover:bg-foreground hover:text-background transition-all shadow-xl"
                    style={{ boxShadow: `0 0 24px ${accent}33` }}
                  >
                    <Icon className="h-5 w-5 mx-auto" />
                    <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-foreground text-background text-[10px] uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      {it.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <button
            onPointerDown={onDragStart}
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Fermer' : 'Ouvrir le menu flottant'}
            className={cn(
              'relative w-14 h-14 rounded-full backdrop-blur-xl border-2 transition-all flex items-center justify-center',
              open
                ? 'bg-foreground text-background border-foreground rotate-45'
                : 'bg-background/80 text-foreground border-foreground/40 hover:scale-110'
            )}
            style={{ boxShadow: `0 8px 32px ${accent}55, 0 0 0 4px ${accent}11, inset 0 0 20px ${accent}22` }}
          >
            <span className="absolute inset-0 rounded-full animate-pulse pointer-events-none" style={{ boxShadow: `0 0 20px ${accent}66`, opacity: 0.6 }} />
            {open ? <X className="h-5 w-5 relative -rotate-45" /> : <Sparkles className="h-5 w-5 relative" />}
          </button>
        </div>
      )}

      <VoiceCommandFab open={voiceOpen} onOpenChange={setVoiceOpen} hideTrigger />
      <RouletteFab open={rouletteOpen} onOpenChange={setRouletteOpen} hideTrigger />
    </>
  );
}
