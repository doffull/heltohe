import { Mic, Bot, ArrowRight, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { useBannerAnalytics } from '@/hooks/useBannerAnalytics';

interface VoiceAssistantBannerConfig {
  enabled?: boolean;
  title?: string;
  subtitle?: string;
  voiceCtaLabel?: string;
  chatCtaLabel?: string;
}

export function VoiceAssistantBanner() {
  const { designSettings } = useApp();
  const reduce = useReducedMotion();
  const cfg: VoiceAssistantBannerConfig = (designSettings as any).voiceBanner || {};
  const { trackClick } = useBannerAnalytics('voice-assistant-home', 'voice_assistant', cfg.enabled !== false);
  if (cfg.enabled === false) return null;

  const title = cfg.title || 'Commandez à la voix';
  const subtitle =
    cfg.subtitle ||
    "Dites ce que vous cherchez — IGRA, votre assistant IA, répond à toutes vos questions et vous guide en temps réel.";
  const voiceLabel = cfg.voiceCtaLabel || 'Activer la voix';
  const chatLabel = cfg.chatCtaLabel || 'Parler à IGRA';

  return (
    <section className="py-6 lg:py-10">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden chamfer-hud border border-white/20 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)]"
          style={{
            background:
              'linear-gradient(120deg, hsl(0 0% 8%) 0%, hsl(0 0% 18%) 40%, hsl(0 0% 35%) 70%, hsl(0 0% 55%) 100%)',
          }}
        >
          {/* Radial gray glow */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full"
            style={{
              background:
                'radial-gradient(circle, hsl(0 0% 100% / 0.35) 0%, transparent 70%)',
              filter: 'blur(20px)',
            }}
            animate={reduce ? undefined : { scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full"
            style={{
              background:
                'radial-gradient(circle, hsl(0 0% 80% / 0.35) 0%, transparent 70%)',
              filter: 'blur(24px)',
            }}
            animate={reduce ? undefined : { scale: [1.1, 1, 1.1], opacity: [0.6, 0.9, 0.6] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Chrome top liseré */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-px"
            style={{
              background:
                'linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.9), transparent)',
            }}
          />
          {/* Sheen sweep */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -inset-y-4 -left-1/3 w-1/2 rotate-12"
            style={{
              background:
                'linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.15), transparent)',
            }}
            animate={reduce ? undefined : { x: ['-30%', '260%'] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.5 }}
          />

          <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5 md:gap-8 p-5 md:p-7 items-center text-white">
            <div className="flex items-start gap-4">
              <div className="flex gap-2 shrink-0">
                <motion.span
                  className="grid place-items-center h-12 w-12 rounded-full bg-white/15 ring-1 ring-white/40 backdrop-blur-md shadow-[0_4px_18px_hsl(0_0%_100%/0.25)]"
                  animate={reduce ? undefined : { scale: [1, 1.08, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Mic className="h-5 w-5 text-white" />
                </motion.span>
                <span className="grid place-items-center h-12 w-12 rounded-full bg-white/10 ring-1 ring-white/30 backdrop-blur-md">
                  <Bot className="h-5 w-5 text-white" />
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[10px] tracking-[0.3em] text-white/80 mb-1 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" /> NOUVEAU · IA VOCALE
                </p>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold uppercase tracking-tight leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
                  {title}
                </h3>
                <p className="text-sm text-white/85 mt-1.5 max-w-xl">{subtitle}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={() => { trackClick({ cta: 'voice' }); window.dispatchEvent(new CustomEvent('lvtk:open-voice')); }}
                className="group inline-flex items-center justify-center gap-2 h-11 px-5 chamfer-hud-sm bg-white text-black hover:bg-gray-100 transition-all text-xs uppercase tracking-[0.18em] font-bold shadow-[0_8px_24px_hsl(0_0%_100%/0.25)] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <Mic className="h-4 w-4" />
                {voiceLabel}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                type="button"
                onClick={() => { trackClick({ cta: 'chat' }); window.dispatchEvent(new CustomEvent('lvtk:open-chatbot')); }}
                className="group inline-flex items-center justify-center gap-2 h-11 px-5 chamfer-hud-sm border border-white/50 bg-white/10 text-white hover:bg-white/20 backdrop-blur-md transition-all text-xs uppercase tracking-[0.18em] font-semibold focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <Bot className="h-4 w-4" />
                {chatLabel}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default VoiceAssistantBanner;
