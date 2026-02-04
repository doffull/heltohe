import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { HeroSlide } from '@/types';
import { Button } from '@/components/ui/button';

export function HeroSlider() {
  const { designSettings, setCurrentView } = useApp();
  const { heroSlides, sliderAutoPlay, sliderSpeed, showSliderOverlay, sliderGrayscale } = designSettings;
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    if (!sliderAutoPlay || heroSlides.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroSlides.length);
    }, sliderSpeed);
    
    return () => clearInterval(interval);
  }, [sliderAutoPlay, sliderSpeed, heroSlides.length]);
  
  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };
  
  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };
  
  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % heroSlides.length);
  };
  
  if (heroSlides.length === 0) return null;
  
  const currentSlide = heroSlides[currentIndex];
  
  return (
    <div className="relative h-[70vh] lg:h-[80vh] overflow-hidden">
      {/* Background */}
      <div 
        className={cn(
          "absolute inset-0 transition-all duration-1000",
          sliderGrayscale && "grayscale"
        )}
      >
        {currentSlide.mediaType === 'video' ? (
          <video
            src={currentSlide.media}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={currentSlide.media}
            alt={currentSlide.title}
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Overlay */}
        <div 
          className={cn(
            "absolute inset-0",
            showSliderOverlay 
              ? "bg-gradient-to-r from-background via-background/70 to-transparent"
              : "bg-gradient-to-t from-background via-background/50 to-transparent"
          )}
        />
      </div>
      
      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-center px-6 lg:px-16">
        <div className="max-w-2xl space-y-6 animate-slide-in-left">
          <div 
            className="hud-text text-sm tracking-[0.3em] text-primary"
            style={{ color: currentSlide.accentColor }}
          >
            {currentSlide.subtitle}
          </div>
          
          <h1 className="text-4xl lg:text-6xl xl:text-7xl font-bold tracking-tight">
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
