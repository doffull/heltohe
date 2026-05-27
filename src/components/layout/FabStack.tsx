import { useEffect, useMemo, useState } from 'react';
import { Mic, Gift, Bot } from 'lucide-react';
// Link import removed - using window.location.assign for FAB route navigation to keep them framework-agnostic
import { useApp } from '@/context/AppContext';
import { useRouletteConfig } from '@/hooks/useRoulette';
import { useHomeFabButtons } from '@/hooks/useHomeFabButtons';
import { VoiceCommandFab } from '@/components/voice/VoiceCommandFab';
import { GameRouter } from '@/components/games/GameRouter';
import { ChatBotWidget } from './ChatBotWidget';
import { getIcon } from '@/components/admin/IconPicker';
import { cn } from '@/lib/utils';
import type { HomeFabButton } from '@/types';

const HINT_KEY = 'voice_hint_seen';
const CHAMFER = 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)';

function FabButton({
  onClick, label, children, primary, badge,
}: { onClick: () => void; label: string; children: React.ReactNode; primary?: boolean; badge?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'group relative w-11 h-11 flex items-center justify-center border backdrop-blur-md transition-all hover:scale-105',
        primary
          ? 'bg-foreground text-background border-foreground'
          : 'bg-background/80 text-foreground border-foreground/20 hover:bg-foreground hover:text-background'
      )}
      style={{ clipPath: CHAMFER }}
    >
      {children}
      {badge && (
        <span className="absolute -top-1.5 -right-1.5 bg-foreground text-background text-[8px] font-bold px-1.5 py-0.5 uppercase tracking-wider">
          {badge}
        </span>
      )}
    </button>
  );
}

function cornerStyle(corner: string, x: number, y: number): React.CSSProperties {
  const s: React.CSSProperties = { position: 'fixed', zIndex: 40 };
  if (corner === 'br') { s.right = x; s.bottom = y; }
  else if (corner === 'bl') { s.left = x; s.bottom = y; }
  else if (corner === 'tr') { s.right = x; s.top = y; }
  else if (corner === 'tl') { s.left = x; s.top = y; }
  return s;
}

export function FabStack() {
  const { designSettings } = useApp();
  const { data: rouletteConfig } = useRouletteConfig();
  const { data: customFabs = [] } = useHomeFabButtons();
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [rouletteOpen, setRouletteOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const voiceEnabled = designSettings.voiceCommandEnabled;
  const hintEnabled = (designSettings as any).voiceOnboardingHint !== false;

  useEffect(() => {
    if (!voiceEnabled || !hintEnabled) return;
    try {
      if (localStorage.getItem(HINT_KEY)) return;
    } catch { return; }
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

  return (
    <>
      {/* Custom FABs from DB - each absolutely positioned per device */}
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

      {/* Default FAB stack (preserved) */}
      <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-40 flex flex-col gap-2 items-end">
        {showHint && voiceEnabled && (
          <div
            className="relative bg-foreground text-background px-3 py-2 text-[10px] uppercase tracking-[0.18em] font-bold animate-fade-in shadow-xl mb-1"
            style={{ clipPath: CHAMFER }}
          >
            Nouveau · commandez à la voix
            <span className="absolute -bottom-1.5 right-4 w-3 h-3 bg-foreground rotate-45" />
          </div>
        )}
        <ChatBotWidget open={chatOpen} onOpenChange={setChatOpen} hideTrigger />
        <FabButton onClick={() => setChatOpen(true)} label="Assistant">
          <Bot className="h-5 w-5" />
        </FabButton>
        {rouletteConfig?.enabled && (
          <FabButton onClick={() => setRouletteOpen(true)} label="Jeu-concours" badge="Jeu">
            <Gift className="h-5 w-5" />
          </FabButton>
        )}
        {voiceEnabled && (
          <FabButton onClick={() => { setShowHint(false); try { localStorage.setItem(HINT_KEY, '1'); } catch {}; setVoiceOpen(true); }} label="Commande vocale" primary badge="New">
            <Mic className="h-5 w-5" />
          </FabButton>
        )}
      </div>
      <VoiceCommandFab open={voiceOpen} onOpenChange={setVoiceOpen} hideTrigger />
      <GameRouter open={rouletteOpen} onOpenChange={setRouletteOpen} hideTrigger />
    </>
  );
}
