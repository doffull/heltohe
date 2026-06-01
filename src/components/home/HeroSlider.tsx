import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { HeroSlide } from '@/types';
import { Button } from '@/components/ui/button';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { InlineEditable } from '@/components/visual-editor/InlineEditable';
import { useVisualEditor } from '@/components/visual-editor/VisualEditorProvider';
import { MediaLibraryDialog } from '@/components/visual-editor/MediaLibraryDialog';
import { EditableCta } from '@/components/visual-editor/EditableCta';
import { useAuth } from '@/context/AuthContext';
import { ImagePlus } from 'lucide-react';
import { HeroVideo } from './HeroVideo';

const HERO_PLACEHOLDER = '/placeholder.svg';

const FALLBACK_HERO_SLIDE: HeroSlide = {
  id: 'fallback-home-hero',
  media: HERO_PLACEHOLDER,
  mediaType: 'image',
  title: 'LVTK6',
  subtitle: 'COLLECTION TECHNIQUE PREMIUM',
  ctaText: 'Découvrir',
  ctaUrl: '/boutique',
  objectFit: 'cover',
  objectPosition: 'center',
};

export function HeroSlider() {
  const { designSettings, updateDesignSettings, setCurrentView } = useApp();
  const { sliderAutoPlay, sliderSpeed, sliderGrayscale } = designSettings;
  const configuredSlides = designSettings.heroSlides || [];
  const heroSlides = configuredSlides.length > 0 ? configuredSlides : [FALLBACK_HERO_SLIDE];
  const [currentIndex, setCurrentIndex] = useState(0);
  const { scrollY } = useScroll();
  const isMobile = useIsMobile();
  const { isOpen, setIsDirty } = useVisualEditor();
  const { isAdmin } = useAuth();
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  // Parallax transforms for 3 layers
  const bgY = useTransform(scrollY, [0, 600], [0, 120]);
  const mgY = useTransform(scrollY, [0, 600], [0, 60]);
  const fgY = useTransform(scrollY, [0, 600], [0, 20]);
  const bgScale = useTransform(scrollY, [0, 600], [1, 1.1]);

  useEffect(() => {
    if (!sliderAutoPlay || heroSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroSlides.length);
    }, sliderSpeed);
    return () => clearInterval(interval);
  }, [sliderAutoPlay, sliderSpeed, heroSlides.length]);

  const goToSlide = (index: number) => setCurrentIndex(index);
  const goToPrev = () => setCurrentIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  const goToNext = () => setCurrentIndex((prev) => (prev + 1) % heroSlides.length);

  // Reset index if it goes out of bounds (e.g. after slides update)
  useEffect(() => {
    if (currentIndex >= heroSlides.length && heroSlides.length > 0) {
      setCurrentIndex(0);
    }
  }, [heroSlides.length, currentIndex]);

  const currentSlide = heroSlides[currentIndex] ?? heroSlides[0];
  if (!currentSlide) return null;

  // Helper to update a specific field of the current slide
  function updateCurrentSlide(changes: Partial<HeroSlide>) {
    const sourceSlides = configuredSlides.length > 0 ? configuredSlides : [currentSlide];
    const next = sourceSlides.map((s, i) => i === currentIndex ? { ...s, ...changes } : s);
    updateDesignSettings({ heroSlides: next });
    setIsDirty(true);
  }

  // Determine which media to show based on mobile
  const useMobileMedia = isMobile && currentSlide.mobileImage;
  const bgMedia = useMobileMedia
    ? currentSlide.mobileImage!
    : (currentSlide.backgroundMedia || currentSlide.media || HERO_PLACEHOLDER);

  // Determine media type for mobile
  const mobileIsVideo = currentSlide.mobileMediaType === 'video';
  const effectiveMediaType = useMobileMedia
    ? (mobileIsVideo ? 'video' : 'image')
    : currentSlide.mediaType;

  // Determine objectFit/objectPosition
  const objectFit = useMobileMedia
    ? (currentSlide.mobileObjectFit || 'cover')
    : (currentSlide.objectFit || 'cover');
  const objectPosition = useMobileMedia
    ? (currentSlide.mobileObjectPosition || 'center')
    : (currentSlide.objectPosition || 'center');

  return (
    <div className="relative -mx-3 lg:-mx-5 -mt-3 lg:-mt-5 h-[100svh] sm:h-[92vh] lg:h-[94vh] overflow-hidden bg-black">
      {/* Background Layer (slowest parallax) */}
      <motion.div
        className={cn(
          "absolute inset-0 transition-all duration-1000",
          sliderGrayscale && "grayscale"
        )}
        style={{ y: bgY, scale: bgScale }}
      >
        {effectiveMediaType === 'video' ? (
          <HeroVideo
            src={bgMedia}
            poster={currentSlide.foregroundMedia || currentSlide.midgroundMedia || HERO_PLACEHOLDER}
            objectPosition={objectPosition as string}
          />
        ) : (
          <img
            src={bgMedia}
            alt={currentSlide.title}
            className="w-full h-full"
            style={{ objectFit: 'cover', objectPosition }}
            {...({ fetchpriority: 'high' } as any)}
            onError={(e) => { e.currentTarget.src = HERO_PLACEHOLDER; }}
          />
        )}
      </motion.div>

      {/* Midground Layer */}
      {!useMobileMedia && currentSlide.midgroundMedia && (
        <motion.div
          className="absolute inset-0 z-[1]"
          style={{ y: mgY }}
        >
          <img
            src={currentSlide.midgroundMedia}
            alt=""
            className="w-full h-full object-cover mix-blend-overlay opacity-60"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </motion.div>
      )}

      {/* Foreground Layer (fastest parallax) */}
      {!useMobileMedia && currentSlide.foregroundMedia && (
        <motion.div
          className="absolute inset-0 z-[2]"
          style={{ y: fgY }}
        >
          <img
            src={currentSlide.foregroundMedia}
            alt=""
            className="w-full h-full object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </motion.div>
      )}

      {/* Bottom-up gradient overlay for legibility */}
      <div
        className="absolute inset-0 z-[3] pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 25%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0) 75%)',
        }}
      />

      {/* Content — anchored at bottom-left */}
      <div className="relative z-10 h-full flex flex-col justify-end px-5 sm:px-10 lg:px-16 pb-16 sm:pb-20 lg:pb-24">
        <div className="max-w-4xl space-y-3 sm:space-y-4 animate-fade-in">
          {/* Eyebrow / Subtitle */}
          {currentSlide.subtitle && (
            <InlineEditable
              fieldKey={`hero-subtitle-${currentIndex}`}
              value={currentSlide.subtitle || ''}
              onChange={(v) => updateCurrentSlide({ subtitle: v })}
              as="div"
              className="hud-text text-[10px] sm:text-xs tracking-[0.3em] text-white/80 uppercase"
              style={{ color: currentSlide.accentColor || undefined }}
            />
          )}

          {/* Big bold title */}
          <h1
            className="font-bold uppercase tracking-tight text-white leading-[0.92]"
            style={{ fontSize: 'clamp(2.25rem, 9vw, 5.5rem)' }}
          >
            <InlineEditable
              fieldKey={`hero-title-${currentIndex}`}
              value={currentSlide.title || ''}
              onChange={(v) => updateCurrentSlide({ title: v })}
              as="span"
              className={cn(isOpen && "!no-underline")}
            >
              <span className="whitespace-pre-line drop-shadow-[0_2px_24px_rgba(0,0,0,0.35)]">
                {currentSlide.title}
              </span>
            </InlineEditable>
          </h1>

          {/* CTA */}
          {currentSlide.ctaText && (currentSlide as any).ctaVisible !== false && (
            <div className="pt-2 sm:pt-3">
              <EditableCta
                text={currentSlide.ctaText || ''}
                url={currentSlide.ctaUrl || '/boutique'}
                onChange={({ text, url }) => updateCurrentSlide({ ctaText: text, ctaUrl: url } as any)}
              >
                <Button
                  onClick={() => { if (!isOpen) setCurrentView('Shop'); }}
                  className={cn(
                    "px-6 py-5 sm:px-8 sm:py-6 text-xs sm:text-sm tracking-wider uppercase font-bold",
                    "bg-white text-black hover:bg-white/90 rounded-none",
                    "transition-all duration-300",
                    isOpen && "cursor-default"
                  )}
                  style={{
                    backgroundColor: currentSlide.accentColor || undefined,
                    color: currentSlide.accentColor ? '#fff' : undefined,
                  }}
                >
                  <InlineEditable
                    fieldKey={`hero-cta-${currentIndex}`}
                    value={currentSlide.ctaText || ''}
                    onChange={(v) => updateCurrentSlide({ ctaText: v })}
                    as="span"
                  />
                </Button>
              </EditableCta>
            </div>
          )}
        </div>
      </div>


      {/* Navigation arrows — discreet */}
      {heroSlides.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            aria-label="Slide précédent"
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 sm:p-3 bg-black/30 backdrop-blur-sm text-white hover:bg-black/60 transition-colors rounded-full"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={goToNext}
            aria-label="Slide suivant"
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 sm:p-3 bg-black/30 backdrop-blur-sm text-white hover:bg-black/60 transition-colors rounded-full"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dots — bottom right */}
      {heroSlides.length > 1 && (
        <div className="absolute bottom-5 right-5 sm:bottom-6 sm:right-8 z-20 flex items-center gap-2">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              aria-label={`Aller au slide ${index + 1}`}
              className={cn(
                "h-1 transition-all duration-300 rounded-full",
                index === currentIndex
                  ? "w-8 bg-white"
                  : "w-3 bg-white/40 hover:bg-white/70"
              )}
            />
          ))}
        </div>
      )}

      {/* Visual editor hint + change-media button */}
      {isOpen && isAdmin && (
        <>
          <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 bg-primary/90 text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-full pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Cliquez sur un texte pour l'éditer
          </div>
          <button
            type="button"
            onClick={() => setMediaPickerOpen(true)}
            className="absolute top-12 right-3 z-30 inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1.5 rounded shadow-lg hover:bg-primary/90"
          >
            <ImagePlus className="h-3 w-3" />
            Changer l'image
          </button>
          <MediaLibraryDialog
            open={mediaPickerOpen}
            onOpenChange={setMediaPickerOpen}
            accept="all"
            title="Image / vidéo du Hero"
            onSelect={(url) => {
              const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(url);
              updateCurrentSlide({ media: url, backgroundMedia: url, mediaType: isVideo ? 'video' : 'image' } as any);
              setIsDirty(true);
            }}
          />
        </>
      )}
    </div>
  );
}

