import { Mic, Bot, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';

interface VoiceAssistantBannerConfig {
  enabled?: boolean;
  title?: string;
  subtitle?: string;
  voiceCtaLabel?: string;
  chatCtaLabel?: string;
}

export function VoiceAssistantBanner() {
  const { designSettings } = useApp();
  const cfg: VoiceAssistantBannerConfig = (designSettings as any).voiceBanner || {};
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
          className="relative overflow-hidden chamfer-hud border border-foreground/15 bg-gradient-to-br from-foreground/[0.04] via-background to-foreground/[0.02] backdrop-blur-xl backdrop-saturate-150 shadow-[0_12px_40px_-16px_hsl(var(--foreground)/0.35)]"
        >
          {/* Sheen overlay */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-y-2 -left-1/3 w-1/2 rotate-12 bg-gradient-to-r from-transparent via-foreground/10 to-transparent animate-[sheen_6s_ease-in-out_infinite]"
          />
          <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5 md:gap-8 p-5 md:p-7 items-center">
            <div className="flex items-start gap-4">
              <div className="flex gap-2 shrink-0">
                <span className="grid place-items-center h-11 w-11 rounded-full bg-foreground/5 ring-1 ring-foreground/15">
                  <Mic className="h-5 w-5" />
                </span>
                <span className="grid place-items-center h-11 w-11 rounded-full bg-foreground/5 ring-1 ring-foreground/15">
                  <Bot className="h-5 w-5" />
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground mb-1">
                  // ASSISTANCE
                </p>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold uppercase tracking-tight leading-tight">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">{subtitle}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('lvtk:open-voice'))}
                className="group inline-flex items-center justify-center gap-2 h-11 px-5 chamfer-hud-sm bg-foreground text-background hover:bg-foreground/90 transition-colors text-xs uppercase tracking-[0.18em] font-semibold"
              >
                <Mic className="h-4 w-4" />
                {voiceLabel}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('lvtk:open-chatbot'))}
                className="group inline-flex items-center justify-center gap-2 h-11 px-5 chamfer-hud-sm border border-foreground/30 hover:bg-foreground/5 transition-colors text-xs uppercase tracking-[0.18em] font-semibold"
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
