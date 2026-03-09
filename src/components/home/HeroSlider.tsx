import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { HeroSlide } from '@/types';
import { Button } from '@/components/ui/button';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';

export function HeroSlider() {
  const { designSettings, setCurrentView } = useApp();
  const { heroSlides, sliderAutoPlay, sliderSpeed, showSliderOverlay, sliderGrayscale } = designSettings;
  const [currentIndex, setCurrentIndex] = useState(0);
  const { scrollY } = useScroll();
  const isMobile = useIsMobile();
  
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
  
  if (heroSlides.length === 0) return null;
  
  const currentSlide = heroSlides[currentIndex];
  
  // Determine which media to show based on mobile
  const useMobileMedia = isMobile && currentSlide.mobileImage;
  const bgMedia = useMobileMedia
    ? currentSlide.mobileImage!
    : (currentSlide.backgroundMedia || currentSlide.media);
  
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
    <div className="relative h-[55vh] sm:h-[70vh] lg:h-[80vh] overflow-hidden">
      {/* Background Layer (slowest parallax) */}
      <motion.div 
        className={cn(
          "absolute inset-0 transition-all duration-1000",
          sliderGrayscale && "grayscale"
        )}
        style={{ y: bgY, scale: bgScale }}
      >
        {effectiveMediaType === 'video' ? (
          <video
            src={bgMedia}
            autoPlay muted loop playsInline
            className="w-full h-full"
            style={{ objectFit, objectPosition }}
          />
        ) : (
          <img
            src={bgMedia}
            alt={currentSlide.title}
            className="w-full h-full"
            style={{ objectFit, objectPosition }}
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
          />
        </motion.div>
      )}
        
      {/* Overlay */}
      <div 
        className={cn(
          "absolute inset-0 z-[3]",
          showSliderOverlay 
            ? "bg-gradient-to-r from-background via-background/70 to-transparent"
            : "bg-gradient-to-t from-background via-background/50 to-transparent"
        )}
      />
      
      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-center px-6 lg:px-16">
        <div className="max-w-2xl space-y-6 animate-slide-in-left">
          <div 
            className="hud-text text-sm tracking-[0.3em] text-primary"
            style={{ color: currentSlide.accentColor }}
          >
            {currentSlide.subtitle}
          </div>
          
          <h1 className="text-2xl sm:text-4xl lg:text-6xl xl:text-7xl font-bold tracking-tight">
            <span className="glitch-effect" data-text={currentSlide.title}>
              {currentSlide.title}
            </span>
          </h1>
          
          <Button
            onClick={() => setCurrentView('Shop')}
            className={cn(
              "chamfer-hud px-8 py-6 hud-text text-sm tracking-wider",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "transition-all duration-300 hover:scale-105"
            )}
            style={{ backgroundColor: currentSlide.accentColor }}
          >
            {currentSlide.ctaText}
          </Button>
        </div>
      </div>
      
      {/* Navigation arrows */}
      {heroSlides.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-background/50 backdrop-blur-sm border border-border/30 chamfer-hud-sm hover:bg-background/80 transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-background/50 backdrop-blur-sm border border-border/30 chamfer-hud-sm hover:bg-background/80 transition-colors"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}
      
      {/* Dots */}
      {heroSlides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "w-2 h-2 transition-all duration-300",
                index === currentIndex 
                  ? "w-8 bg-primary" 
                  : "bg-muted-foreground/50 hover:bg-muted-foreground"
              )}
            />
          ))}
        </div>
      )}
      
      {/* Slide counter */}
      <div className="absolute bottom-8 right-8 z-20 hud-text text-sm text-muted-foreground">
        <span className="text-primary">{String(currentIndex + 1).padStart(2, '0')}</span>
        <span className="mx-2">/</span>
        <span>{String(heroSlides.length).padStart(2, '0')}</span>
      </div>
    </div>
  );
}
