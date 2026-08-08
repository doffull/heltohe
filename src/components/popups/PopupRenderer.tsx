import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { PopupBackground, PopupLayer, PopupCampaign } from '@/types/popups';
import { POPUP_FORMATS } from '@/types/popups';

interface RendererProps {
  campaign: Pick<PopupCampaign, 'layers' | 'background' | 'format'>;
  /** Scale factor for font sizes (canvas width / reference width) */
  scale?: number;
  interactive?: boolean;
  reducedMotion?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onLayerAction?: (layer: PopupLayer) => void;
  onEmailSubmit?: (email: string, layer: PopupLayer) => void;
  submitting?: boolean;
}

function animationVariants(layer: PopupLayer, reduced: boolean) {
  const a = layer.animation || 'fade';
  if (reduced || a === 'none') return { initial: { opacity: 1 }, animate: { opacity: 1 } };
  switch (a) {
    case 'slide-up':
      return { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 } };
    case 'slide-down':
      return { initial: { opacity: 0, y: -24 }, animate: { opacity: 1, y: 0 } };
    case 'slide-left':
      return { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 } };
    case 'slide-right':
      return { initial: { opacity: 0, x: -24 }, animate: { opacity: 1, x: 0 } };
    case 'zoom':
      return { initial: { opacity: 0, scale: 0.85 }, animate: { opacity: 1, scale: 1 } };
    case 'glow':
      return { initial: { opacity: 0, filter: 'brightness(2.2)' }, animate: { opacity: 1, filter: 'brightness(1)' } };
    default:
      return { initial: { opacity: 0 }, animate: { opacity: 1 } };
  }
}

function Typewriter({ text, duration = 1.2 }: { text: string; duration?: number }) {
  const [shown, setShown] = useState('');
  useEffect(() => {
    setShown('');
    if (!text) return;
    const step = Math.max(20, (duration * 1000) / text.length);
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(t);
    }, step);
    return () => clearInterval(t);
  }, [text, duration]);
  return <>{shown}</>;
}

function Countdown({ endsAt }: { endsAt?: string }) {
  const [left, setLeft] = useState('');
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const ms = new Date(endsAt).getTime() - Date.now();
      if (ms <= 0) return setLeft('00:00:00');
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setLeft(`${d > 0 ? `${d}j ` : ''}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endsAt]);
  return <>{left || '--:--:--'}</>;
}

function backgroundStyle(bg: PopupBackground): React.CSSProperties {
  return {
    backgroundColor: bg.color || '#000',
    backgroundImage: bg.gradient || (bg.image ? `url(${bg.image})` : undefined),
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
}

export function PopupRenderer({
  campaign,
  scale = 1,
  interactive = true,
  reducedMotion = false,
  selectedId,
  onSelect,
  onLayerAction,
  onEmailSubmit,
  submitting,
}: RendererProps) {
  const [email, setEmail] = useState('');
  const bg = campaign.background || {};
  const ratio = POPUP_FORMATS.find((f) => f.value === campaign.format)?.ratio ?? 1;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: String(ratio), ...backgroundStyle(bg) }}
    >
      {bg.video && (
        <video
          src={bg.video}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {(bg.overlay || bg.blur) && (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: `rgba(0,0,0,${bg.overlay ?? 0})`,
            backdropFilter: bg.blur ? `blur(${bg.blur}px)` : undefined,
          }}
        />
      )}

      {(campaign.layers || []).map((layer) => {
        const v = animationVariants(layer, reducedMotion);
        const common: React.CSSProperties = {
          position: 'absolute',
          left: `${layer.x}%`,
          top: `${layer.y}%`,
          width: `${layer.w}%`,
          height: layer.h ? `${layer.h}%` : undefined,
          transform: layer.rotate ? `rotate(${layer.rotate}deg)` : undefined,
          opacity: layer.opacity ?? 1,
          zIndex: layer.z ?? 1,
        };
        const isSelected = selectedId === layer.id;
        const selectRing = isSelected ? { outline: '1px dashed currentColor', outlineOffset: 2 } : {};

        const textStyle: React.CSSProperties = {
          fontFamily: layer.fontFamily,
          fontSize: `${(layer.fontSize ?? 16) * scale}px`,
          fontWeight: layer.fontWeight ?? 400,
          letterSpacing: layer.letterSpacing ? `${layer.letterSpacing}em` : undefined,
          lineHeight: layer.lineHeight ?? 1.2,
          color: layer.color,
          textAlign: layer.align || 'center',
          textTransform: layer.uppercase ? 'uppercase' : undefined,
          textShadow: layer.shadow ? '0 2px 12px rgba(0,0,0,0.6)' : undefined,
        };

        const content = (() => {
          switch (layer.kind) {
            case 'text':
              return (
                <div style={textStyle}>
                  {layer.animation === 'typewriter' && !reducedMotion ? (
                    <Typewriter text={layer.text || ''} duration={layer.duration} />
                  ) : (
                    layer.text
                  )}
                </div>
              );
            case 'image':
              return layer.src ? (
                <img
                  src={layer.src}
                  alt=""
                  className="h-full w-full"
                  style={{ objectFit: layer.fit || 'cover', borderRadius: layer.radius }}
                />
              ) : (
                <div className="flex h-full min-h-[40px] w-full items-center justify-center border border-dashed border-current/40 text-[10px] opacity-60">
                  IMAGE
                </div>
              );
            case 'video':
              return layer.src ? (
                <video
                  src={layer.src}
                  autoPlay={layer.autoplay !== false}
                  loop={layer.loop !== false}
                  muted={layer.muted !== false}
                  playsInline
                  controls={layer.autoplay === false}
                  className="h-full w-full"
                  style={{ objectFit: layer.fit || 'cover', borderRadius: layer.radius }}
                />
              ) : (
                <div className="flex h-full min-h-[40px] w-full items-center justify-center border border-dashed border-current/40 text-[10px] opacity-60">
                  VIDÉO
                </div>
              );
            case 'button':
              return (
                <button
                  type="button"
                  onClick={() => interactive && onLayerAction?.(layer)}
                  className="w-full py-3 text-center transition-opacity hover:opacity-90"
                  style={{
                    ...textStyle,
                    backgroundColor: layer.bgColor,
                    letterSpacing: `${layer.letterSpacing ?? 0.2}em`,
                    clipPath:
                      'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
                  }}
                >
                  {layer.text}
                </button>
              );
            case 'email':
              return (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (interactive) onEmailSubmit?.(email, layer);
                  }}
                  className="space-y-2"
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={layer.placeholder || 'email@exemple.com'}
                    maxLength={255}
                    className="w-full border border-current/30 bg-white/10 px-3 py-2.5 text-center text-sm outline-none placeholder:opacity-50"
                    style={{ color: layer.color }}
                    disabled={!interactive || submitting}
                  />
                  <button
                    type="submit"
                    disabled={!interactive || submitting}
                    className="w-full py-2.5 text-[11px] font-bold uppercase tracking-[0.25em]"
                    style={{ backgroundColor: layer.color || '#fff', color: layer.bgColor || '#000' }}
                  >
                    {submitting ? '…' : layer.ctaLabel || "Je m'inscris"}
                  </button>
                </form>
              );
            case 'countdown':
              return (
                <div style={{ ...textStyle, fontVariantNumeric: 'tabular-nums' }}>
                  <Countdown endsAt={layer.endsAt} />
                </div>
              );
            case 'promo':
              return (
                <div
                  className="border border-dashed border-current/50 px-3 py-2"
                  style={{ ...textStyle, backgroundColor: layer.bgColor, letterSpacing: '0.25em' }}
                >
                  {layer.code}
                </div>
              );
            default:
              return null;
          }
        })();

        return (
          <motion.div
            key={layer.id}
            initial={v.initial}
            animate={v.animate}
            transition={{ duration: reducedMotion ? 0 : layer.duration ?? 0.5, delay: reducedMotion ? 0 : layer.delay ?? 0 }}
            style={{ ...common, ...selectRing }}
            onMouseDown={onSelect ? () => onSelect(layer.id) : undefined}
          >
            {content}
          </motion.div>
        );
      })}
    </div>
  );
}

export default PopupRenderer;
