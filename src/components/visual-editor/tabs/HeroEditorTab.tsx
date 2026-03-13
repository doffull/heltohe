import { useApp } from '@/context/AppContext';
import { useVisualEditor } from '../VisualEditorProvider';
import { HeroSlide } from '@/types';
import { ChevronDown, ChevronUp, Image } from 'lucide-react';
import { useState } from 'react';

export function HeroEditorTab() {
  const { designSettings, updateDesignSettings } = useApp();
  const { setIsDirty } = useVisualEditor();
  const [expanded, setExpanded] = useState<string | null>(designSettings.heroSlides?.[0]?.id ?? null);

  const slides: HeroSlide[] = designSettings.heroSlides || [];

  function updateSlide(index: number, changes: Partial<HeroSlide>) {
    const next = slides.map((s, i) => i === index ? { ...s, ...changes } : s);
    updateDesignSettings({ heroSlides: next });
    setIsDirty(true);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground px-1">Modifiez les slides du Hero en temps réel.</p>

      {slides.length === 0 && (
        <p className="text-xs text-muted-foreground px-1 py-4 text-center border border-dashed border-border rounded">Aucune slide configurée.</p>
      )}

      {slides.map((slide, index) => {
        const isExpanded = expanded === slide.id;
        return (
          <div key={slide.id} className="border border-border rounded overflow-hidden">
            {/* Slide header */}
            <button
              onClick={() => setExpanded(isExpanded ? null : slide.id)}
              className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors text-left"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 border border-border"
                  style={{ backgroundColor: slide.accentColor || '#3b82f6' }}
                />
                <span className="text-xs font-semibold truncate">{slide.title || `Slide ${index + 1}`}</span>
              </div>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
            </button>

            {/* Mini preview */}
            {isExpanded && (
              <div
                className="relative w-full aspect-video bg-muted flex items-end overflow-hidden"
                style={{ background: slide.media ? `url(${slide.media}) center/cover no-repeat` : undefined }}
              >
                {slide.media && <div className="absolute inset-0 bg-black/40" />}
                {!slide.media && <Image className="absolute inset-0 m-auto w-8 h-8 text-muted-foreground opacity-30" />}
                <div className="relative z-10 p-3 w-full">
                  <p className="text-white text-xs font-bold truncate drop-shadow" style={{ color: slide.accentColor || '#fff' }}>
                    {slide.title || 'Titre'}
                  </p>
                  <p className="text-white/70 text-[10px] truncate drop-shadow">{slide.subtitle || 'Sous-titre'}</p>
                </div>
              </div>
            )}

            {/* Fields */}
            {isExpanded && (
              <div className="p-3 space-y-3 bg-background">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Titre</label>
                  <input
                    type="text"
                    value={slide.title}
                    onChange={e => updateSlide(index, { title: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded bg-muted border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Titre du slide"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Sous-titre</label>
                  <input
                    type="text"
                    value={slide.subtitle}
                    onChange={e => updateSlide(index, { subtitle: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded bg-muted border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Sous-titre"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Texte CTA</label>
                  <input
                    type="text"
                    value={slide.ctaText}
                    onChange={e => updateSlide(index, { ctaText: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded bg-muted border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="DÉCOUVRIR"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">URL CTA</label>
                  <input
                    type="text"
                    value={slide.ctaUrl}
                    onChange={e => updateSlide(index, { ctaUrl: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded bg-muted border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="/boutique"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex-1">Couleur accent</label>
                  <input
                    type="color"
                    value={slide.accentColor || '#3b82f6'}
                    onChange={e => updateSlide(index, { accentColor: e.target.value })}
                    className="w-8 h-7 rounded cursor-pointer border border-border bg-transparent"
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
