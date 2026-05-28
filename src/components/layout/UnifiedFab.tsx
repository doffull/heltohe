import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, Gift, Bot, Sparkles, X, Pencil } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useRouletteConfig } from '@/hooks/useRoulette';
import { useHomeFabButtons, useHomeFabMutations } from '@/hooks/useHomeFabButtons';
import { useAuth } from '@/context/AuthContext';
import { VoiceCommandFab } from '@/components/voice/VoiceCommandFab';
import { RouletteFab } from '@/components/home/RouletteFab';
import { ChatBotWidget } from './ChatBotWidget';
import { getIcon } from '@/components/admin/IconPicker';
import { cn } from '@/lib/utils';
import { cornerStyle, type FabPos } from '@/lib/fabPosition';
import { useAdminDrag } from '@/lib/useAdminDrag';
import { toast } from 'sonner';
import { useVisualEditor } from '@/components/visual-editor/VisualEditorProvider';
import type { HomeFabButton } from '@/types';

const HINT_KEY = 'voice_hint_seen';

const ICON_MAP: Record<string, any> = { voice: Mic, chat: Bot, roulette: Gift };

const DEFAULT_ITEMS = [
  { id: 'voice' as const, label: 'Voix', icon: 'Mic', visible: true, order: 0 },
  { id: 'chat' as const, label: 'Assistant', icon: 'Bot', visible: true, order: 1 },
  { id: 'roulette' as const, label: 'Jeu-concours', icon: 'Gift', visible: true, order: 2 },
];


export function UnifiedFab() {
  const { designSettings, updateDesignSettings } = useApp();
  const { isAdmin } = useAuth();
  const { data: rouletteConfig } = useRouletteConfig();
  const { data: customFabs = [] } = useHomeFabButtons();
  const { upsert: upsertFab } = useHomeFabMutations();
  const [open, setOpen] = useState(false);
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

  const cfg = (designSettings as any).unifiedFab || {};
  const accent = cfg.accentColor || '#ffffff';
  const mode: 'socle' | 'free' | 'grouped' | 'cluster' | 'dock' =
    cfg.mode === 'free' ? 'free' : cfg.mode === 'grouped' ? 'grouped' : cfg.mode === 'cluster' ? 'cluster' : cfg.mode === 'dock' ? 'dock' : 'socle';
  const groupSide: 'left' | 'right' = cfg.groupSide === 'right' ? 'right' : 'left';
  const groupOffsetY: number = typeof cfg.groupOffsetY === 'number' ? cfg.groupOffsetY : 220;
  const items = (cfg.items && cfg.items.length ? cfg.items : DEFAULT_ITEMS) as any[];
  const posCfg = isMobile
    ? (cfg.position_mobile || { corner: 'br', x: 16, y: 16 })
    : (cfg.position_desktop || { corner: 'br', x: 24, y: 24 });
  const clusterPos: FabPos = (isMobile ? cfg.clusterPos_mobile : cfg.clusterPos_desktop) || { corner: 'br', x: 16, y: 90 };
  const clusterDir: 'row' | 'col' = cfg.clusterDir === 'row' ? 'row' : 'col';
  const freeCustomIds: string[] = Array.isArray(cfg.freeCustomIds) ? cfg.freeCustomIds : [];
  const dockPos: FabPos = (isMobile ? cfg.dockPos_mobile : cfg.dockPos_desktop) || { corner: 'bc', x: 0, y: 24 };
  const dockDir: 'row' | 'col' = cfg.dockDir === 'col' ? 'col' : 'row';
  const dockSize: number = cfg.dockSize || 44;
  const dockBlur: number = cfg.dockBlur ?? 24;
  const dockShowVoice = cfg.dockShowVoice !== false;
  const dockShowChat = cfg.dockShowChat !== false;
  const dockShowVisualEditor = cfg.dockShowVisualEditor !== false;
  const dockShowRoulette = cfg.dockShowRoulette !== false;

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

  let visibleItems = items
    .filter((it) => it.visible)
    .filter((it) => it.id !== 'voice' || voiceEnabled)
    .filter((it) => it.id !== 'roulette' || rouletteConfig?.enabled)
    .sort((a, b) => a.order - b.order);

  // Safety net: if admin configuration has hidden everything, fall back to defaults
  // so the games/voice/chat panel never disappears entirely on the public site.
  if (visibleItems.length === 0 && visibleCustom.length === 0) {
    visibleItems = DEFAULT_ITEMS
      .filter((it) => it.id !== 'voice' || voiceEnabled)
      .filter((it) => it.id !== 'roulette' || rouletteConfig?.enabled);
  }

  // ── Persistence helpers ──────────────────────────────────────────
  const posKey = isMobile ? 'position_mobile' : 'position_desktop';

  const saveSocleItemPos = (id: string, pos: FabPos) => {
    const next = items.map((it) => it.id === id ? { ...it, [posKey]: pos } : it);
    updateDesignSettings({ ...(designSettings as any), unifiedFab: { ...cfg, items: next } } as any);
    toast.success(`Position « ${id} » enregistrée`);
  };

  const saveCustomFabPos = (b: HomeFabButton, pos: FabPos) => {
    upsertFab.mutateAsync({ ...b, [posKey]: pos } as any).then(() => toast.success(`Position « ${b.label} » enregistrée`));
  };

  const saveGroupPos = (pos: FabPos) => {
    // Convert to side + offsetY (always anchored left/right)
    const side: 'left' | 'right' = pos.corner.endsWith('r') ? 'right' : 'left';
    const top = pos.corner.startsWith('t') ? pos.y : window.innerHeight - pos.y - 56;
    updateDesignSettings({ ...(designSettings as any), unifiedFab: { ...cfg, groupSide: side, groupOffsetY: Math.max(80, Math.round(top)) } } as any);
    toast.success('Mini-socle repositionné');
  };

  const saveClusterPos = (pos: FabPos) => {
    const key = isMobile ? 'clusterPos_mobile' : 'clusterPos_desktop';
    updateDesignSettings({ ...(designSettings as any), unifiedFab: { ...cfg, [key]: pos } } as any);
    toast.success('Cluster repositionné');
  };

  const saveDockPos = (pos: FabPos) => {
    const key = isMobile ? 'dockPos_mobile' : 'dockPos_desktop';
    updateDesignSettings({ ...(designSettings as any), unifiedFab: { ...cfg, [key]: pos } } as any);
    toast.success('Dock repositionné');
  };

  // ── Per-button drag hooks ────────────────────────────────────────
  const groupDrag = useAdminDrag({ enabled: isAdmin, autoCommit: true, onCommit: saveGroupPos });
  const clusterDrag = useAdminDrag({ enabled: isAdmin, autoCommit: true, onCommit: saveClusterPos });
  const dockDrag = useAdminDrag({ enabled: isAdmin, autoCommit: true, onCommit: saveDockPos });

  // Visual editor toggle for admins (used in dock). Provider always present at App root.
  const ve = useVisualEditor();

  return (
    <>
      {/* Custom DB FABs (skipped in cluster/dock mode unless marked free) */}
      {visibleCustom
        .filter((b) => (mode !== 'cluster' && mode !== 'dock') || freeCustomIds.includes(b.id))
        .map((b) => {
          const pos = isMobile ? b.position_mobile : b.position_desktop;
          const I = getIcon(b.icon);
          return (
            <CustomFabButton
              key={b.id}
              button={b}
              pos={pos as FabPos}
              isAdmin={isAdmin}
              isMobile={isMobile}
              accent={accent}
              onClick={() => handleAction(b)}
              onDragCommit={(p) => saveCustomFabPos(b, p)}
              Icon={I}
            />
          );
        })}

      {/* Hint bubble */}
      {showHint && voiceEnabled && (
        <div
          className="fixed z-[51] bg-foreground text-background px-3 py-2 text-[10px] uppercase tracking-[0.18em] font-bold animate-fade-in shadow-2xl"
          style={cornerStyle(posCfg.corner, (posCfg.x || 0) + 70, (posCfg.y || 0) + 8)}
        >
          Nouveau · commande vocale
        </div>
      )}

      <ChatBotWidget open={chatOpen} onOpenChange={setChatOpen} hideTrigger />

      {mode === 'dock' ? (
        <Dock
          dockPos={dockPos}
          dockDir={dockDir}
          dockSize={dockSize}
          dockBlur={dockBlur}
          dockDrag={dockDrag}
          isAdmin={isAdmin}
          accent={accent}
          voiceEnabled={!!voiceEnabled}
          dockShowVoice={dockShowVoice}
          dockShowChat={dockShowChat}
          dockShowVisualEditor={dockShowVisualEditor && isAdmin}
          dockShowRoulette={dockShowRoulette}
          rouletteEnabled={!!rouletteConfig?.enabled}
          customs={visibleCustom.filter((b) => !freeCustomIds.includes(b.id))}
          onVoice={() => triggerItem('voice')}
          onChat={() => triggerItem('chat')}
          onRoulette={() => triggerItem('roulette')}
          onVisualEditor={() => ve?.setIsOpen(!ve.isOpen)}
          onCustom={(b) => handleAction(b)}
        />
      ) : mode === 'cluster' ? (
        <>
          {/* Free socle items (e.g. Jeu-concours isolé) */}
          {visibleItems
            .filter((it: any) => (it.clusterFree ?? (it.id === 'roulette')) === true)
            .map((it: any) => {
              const Icon = ICON_MAP[it.id] || Sparkles;
              const p = (isMobile ? it.position_mobile : it.position_desktop) || (isMobile ? { corner: 'br', x: 16, y: 90 } : { corner: 'br', x: 24, y: 110 });
              return (
                <SocleFreeButton
                  key={it.id}
                  id={it.id}
                  label={it.label}
                  Icon={Icon}
                  pos={p as FabPos}
                  isAdmin={isAdmin}
                  isMobile={isMobile}
                  accent={accent}
                  onClick={() => triggerItem(it.id)}
                  onDragCommit={(np) => saveSocleItemPos(it.id, np)}
                />
              );
            })}

          {/* Cluster bloc — déplaçable d'un seul tenant */}
          <div
            onPointerDown={clusterDrag.onPointerDown}
            className={cn(
              'fixed z-40 flex gap-2 p-2 rounded-2xl backdrop-blur-xl bg-background/80 border border-foreground/20 shadow-2xl',
              clusterDir === 'col' ? 'flex-col' : 'flex-row',
              isAdmin && 'ring-2 ring-primary/60 cursor-grab active:cursor-grabbing'
            )}
            style={{
              ...cornerStyle(clusterPos.corner, clusterPos.x, clusterPos.y),
              boxShadow: `0 8px 32px ${accent}33`,
              touchAction: isAdmin ? 'none' : undefined,
            } as any}
          >
            {visibleItems
              .filter((it: any) => !(it.clusterFree ?? (it.id === 'roulette')))
              .map((it: any) => {
                const Icon = ICON_MAP[it.id] || Sparkles;
                return (
                  <button
                    key={it.id}
                    onClick={(e) => { e.stopPropagation(); if (clusterDrag.blockClickRef.current) return; triggerItem(it.id); }}
                    aria-label={it.label}
                    title={it.label}
                    className="w-11 h-11 rounded-full bg-background/90 border-2 border-foreground/40 text-foreground hover:scale-110 hover:bg-foreground hover:text-background transition-all flex items-center justify-center"
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            {visibleCustom
              .filter((b) => !freeCustomIds.includes(b.id))
              .map((b) => {
                const I = getIcon(b.icon);
                return (
                  <button
                    key={b.id}
                    onClick={(e) => { e.stopPropagation(); if (clusterDrag.blockClickRef.current) return; handleAction(b); }}
                    aria-label={b.label}
                    title={b.label}
                    className={cn(`hw-cta-btn hw-cta-v-${b.variant} hw-cta-rd-md w-11 h-11 p-0 relative`)}
                  >
                    <I className="h-4 w-4" />
                    {b.badge && (
                      <span className="absolute -top-1.5 -right-1.5 bg-foreground text-background text-[8px] font-bold px-1.5 py-0.5 uppercase tracking-wider">
                        {b.badge}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </>
      ) : mode === 'free' || mode === 'grouped' ? (
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
                    onPointerDown={groupDrag.onPointerDown}
                    className={cn(
                      'fixed z-40 flex flex-col gap-2 p-2 rounded-2xl backdrop-blur-xl bg-background/80 border border-foreground/20 shadow-2xl',
                      isAdmin && 'ring-2 ring-primary/60 cursor-grab active:cursor-grabbing'
                    )}
                    style={{
                      [groupSide]: 16,
                      top: groupOffsetY,
                      boxShadow: `0 8px 32px ${accent}33`,
                      touchAction: isAdmin ? 'none' : undefined,
                    } as any}
                  >
                    {visibleItems
                      .filter((it: any) => groupedIds.has(it.id))
                      .map((it: any) => {
                        const Icon = ICON_MAP[it.id] || Sparkles;
                        return (
                          <button
                            key={it.id}
                            onClick={() => { if (groupDrag.blockClickRef.current) return; triggerItem(it.id); }}
                            aria-label={it.label}
                            title={it.label}
                            className="group relative w-11 h-11 rounded-full bg-background/90 border-2 border-foreground/40 text-foreground hover:scale-110 hover:bg-foreground hover:text-background transition-all flex items-center justify-center"
                          >
                            <Icon className="h-4 w-4" />
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
                    <SocleFreeButton
                      key={it.id}
                      id={it.id}
                      label={it.label}
                      Icon={Icon}
                      pos={p as FabPos}
                      isAdmin={isAdmin}
                      isMobile={isMobile}
                      accent={accent}
                      onClick={() => triggerItem(it.id)}
                      onDragCommit={(np) => saveSocleItemPos(it.id, np)}
                    />
                  );
                })}
              </>
            );
          })()}
        </>
      ) : (
        <SocleStack
          posCfg={posCfg}
          isAdmin={isAdmin}
          isMobile={isMobile}
          accent={accent}
          open={open}
          setOpen={setOpen}
          visibleItems={visibleItems}
          triggerItem={triggerItem}
          onDragCommit={(pos) => {
            updateDesignSettings({ ...(designSettings as any), unifiedFab: { ...cfg, [posKey]: pos } } as any);
            toast.success('Socle repositionné');
          }}
        />
      )}

      <VoiceCommandFab open={voiceOpen} onOpenChange={setVoiceOpen} hideTrigger />
      <RouletteFab open={rouletteOpen} onOpenChange={setRouletteOpen} hideTrigger />
    </>
  );
}

// ── Sub-components for per-button drag ────────────────────────────────

function CustomFabButton({ button, pos, isAdmin, isMobile, accent, onClick, onDragCommit, Icon }: any) {
  const drag = useAdminDrag({ enabled: isAdmin, autoCommit: true, onCommit: onDragCommit });
  return (
    <button
      type="button"
      onClick={() => { if (drag.blockClickRef.current) return; onClick(); }}
      onPointerDown={drag.onPointerDown}
      aria-label={button.label}
      title={button.label}
      className={cn(
        `hw-cta-btn hw-cta-v-${button.variant} hw-cta-rd-md w-12 h-12 p-0 shadow-xl`,
        isAdmin && 'ring-2 ring-primary/60 cursor-grab active:cursor-grabbing'
      )}
      style={{ ...cornerStyle(pos.corner, pos.x, pos.y), touchAction: isAdmin ? 'none' : undefined }}
    >
      <Icon className="h-5 w-5" />
      {button.badge && (
        <span className="absolute -top-1.5 -right-1.5 bg-foreground text-background text-[8px] font-bold px-1.5 py-0.5 uppercase tracking-wider">
          {button.badge}
        </span>
      )}
    </button>
  );
}

function SocleFreeButton({ id, label, Icon, pos, isAdmin, isMobile, accent, onClick, onDragCommit }: any) {
  const drag = useAdminDrag({ enabled: isAdmin, autoCommit: true, onCommit: onDragCommit });
  return (
    <button
      onClick={() => { if (drag.blockClickRef.current) return; onClick(); }}
      onPointerDown={drag.onPointerDown}
      aria-label={label}
      title={label}
      className={cn(
        'group w-12 h-12 rounded-full backdrop-blur-xl bg-background/80 border-2 border-foreground/40 text-foreground hover:scale-110 hover:bg-foreground hover:text-background transition-all shadow-xl flex items-center justify-center',
        isAdmin && 'ring-2 ring-primary/60 cursor-grab active:cursor-grabbing'
      )}
      style={{ ...cornerStyle(pos.corner, pos.x, pos.y), boxShadow: `0 8px 24px ${accent}44, 0 0 0 3px ${accent}11`, touchAction: isAdmin ? 'none' : undefined }}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

function SocleStack({ posCfg, isAdmin, isMobile, accent, open, setOpen, visibleItems, triggerItem, onDragCommit }: any) {
  const drag = useAdminDrag({ enabled: isAdmin, autoCommit: true, onCommit: onDragCommit });
  return (
    <div style={cornerStyle(posCfg.corner, posCfg.x, posCfg.y)} className="flex flex-col items-center gap-3">
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
              </button>
            );
          })}
        </div>
      )}
      <button
        onPointerDown={drag.onPointerDown}
        onClick={() => { if (drag.blockClickRef.current) return; setOpen((v: boolean) => !v); }}
        aria-label={open ? 'Fermer' : 'Ouvrir le menu flottant'}
        className={cn(
          'relative w-14 h-14 rounded-full backdrop-blur-xl border-2 transition-all flex items-center justify-center',
          open
            ? 'bg-foreground text-background border-foreground rotate-45'
            : 'bg-background/80 text-foreground border-foreground/40 hover:scale-110',
          isAdmin && 'ring-2 ring-primary/60 cursor-grab active:cursor-grabbing'
        )}
        style={{ boxShadow: `0 8px 32px ${accent}55, 0 0 0 4px ${accent}11, inset 0 0 20px ${accent}22`, touchAction: isAdmin ? 'none' : undefined }}
      >
        <span className="absolute inset-0 rounded-full animate-pulse pointer-events-none" style={{ boxShadow: `0 0 20px ${accent}66`, opacity: 0.6 }} />
        {open ? <X className="h-5 w-5 relative -rotate-45" /> : <Sparkles className="h-5 w-5 relative" />}
      </button>
    </div>
  );
}

function Dock({ dockPos, dockDir, dockSize, dockBlur, dockDrag, isAdmin, accent, voiceEnabled, dockShowVoice, dockShowChat, dockShowVisualEditor, dockShowRoulette, rouletteEnabled, customs, onVoice, onChat, onRoulette, onVisualEditor, onCustom }: any) {
  const items: Array<{ key: string; Icon: any; label: string; onClick: () => void }> = [];
  if (dockShowVoice && voiceEnabled) items.push({ key: 'voice', Icon: Mic, label: 'Voix', onClick: onVoice });
  if (dockShowChat) items.push({ key: 'chat', Icon: Bot, label: 'Assistant', onClick: onChat });
  if (dockShowRoulette && rouletteEnabled) items.push({ key: 'roulette', Icon: Gift, label: 'Jeu-concours', onClick: onRoulette });
  customs.forEach((b: any) => items.push({ key: b.id, Icon: getIcon(b.icon), label: b.label, onClick: () => onCustom(b) }));
  if (dockShowVisualEditor) items.push({ key: 've', Icon: Pencil, label: 'Éditeur visuel', onClick: onVisualEditor });
  if (items.length === 0) return null;
  return (
    <div
      onPointerDown={dockDrag.onPointerDown}
      className={cn(
        'flex items-center gap-2 p-2 rounded-full border shadow-2xl',
        dockDir === 'col' ? 'flex-col' : 'flex-row',
        isAdmin && 'ring-2 ring-primary/60 cursor-grab active:cursor-grabbing'
      )}
      style={{
        ...cornerStyle(dockPos.corner, dockPos.x, dockPos.y),
        backdropFilter: `blur(${dockBlur}px) saturate(180%)`,
        WebkitBackdropFilter: `blur(${dockBlur}px) saturate(180%)`,
        background: 'rgba(255,255,255,0.06)',
        borderColor: 'rgba(255,255,255,0.18)',
        boxShadow: `0 12px 40px ${accent}33, inset 0 1px 0 rgba(255,255,255,0.18)`,
        touchAction: isAdmin ? 'none' : undefined,
      } as any}
    >
      {items.map((it) => (
        <button
          key={it.key}
          onClick={(e) => { e.stopPropagation(); if (dockDrag.blockClickRef.current) return; it.onClick(); }}
          aria-label={it.label}
          title={it.label}
          className="rounded-full flex items-center justify-center text-foreground hover:bg-foreground/15 transition-colors"
          style={{ width: dockSize, height: dockSize }}
        >
          <it.Icon className="h-5 w-5" />
        </button>
      ))}
    </div>
  );
}
