import { useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, Play, Image as ImageIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ColorOption } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';

interface ProductImageGalleryProps {
  image: string;
  name: string;
  videoUrl?: string;
  galleryImages?: string[];
  colorOptions?: ColorOption[];
  selectedColor?: string | null;
  onColorChange?: (color: string) => void;
  modelHeight?: string;
  modelSizeWorn?: string;
}

function isEmbedVideo(url: string) {
  return /youtube|youtu\.be|vimeo/i.test(url);
}

function getEmbedUrl(url: string) {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
  return url;
}

export default function ProductImageGallery({
  image,
  name,
  videoUrl,
  colorOptions = [],
  selectedColor,
  onColorChange,
  modelHeight,
  modelSizeWorn,
}: ProductImageGalleryProps) {
  const isMobile = useIsMobile();
  const [activeMedia, setActiveMedia] = useState<'image' | 'video'>('image');
  const [showModelBadge, setShowModelBadge] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTapRef = useRef(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || !isZoomed || activeMedia !== 'image') return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const switchToImage = () => {
    if (videoRef.current) videoRef.current.pause();
    setActiveMedia('image');
    setIsZoomed(false);
  };

  const switchToVideo = () => {
    setActiveMedia('video');
    setIsZoomed(false);
  };

  // Handle double-tap on mobile to open fullscreen
  const handleTap = useCallback(() => {
    if (activeMedia !== 'image') return;
    if (isMobile) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        setFullscreenOpen(true);
      }
      lastTapRef.current = now;
    } else {
      setIsZoomed(!isZoomed);
    }
  }, [activeMedia, isMobile, isZoomed]);

  // Determine which color image to show (if colorOptions have images)
  const activeColorOption = colorOptions.find(c => c.color === selectedColor);
  const displayImage = (activeColorOption?.image) || image;

  return (
    <div className="space-y-4">
      {/* Main media area */}
      <motion.div
        ref={containerRef}
        className={`relative chamfer-hud-lg overflow-hidden bg-card/30 aspect-square ${activeMedia === 'image' ? (isMobile ? '' : 'cursor-crosshair') : ''}`}
        onClick={handleTap}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isZoomed && setIsZoomed(false)}
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <AnimatePresence mode="wait">
          {activeMedia === 'image' ? (
            <motion.img
              key={`image-${displayImage}-${selectedColor}`}
              src={displayImage}
              alt={name}
              className="w-full h-full object-cover"
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: isZoomed ? 3.5 : 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={isZoomed ? {
                transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
              } : {
                transformOrigin: 'center center',
              }}
            />
          ) : videoUrl && isEmbedVideo(videoUrl) ? (
            <motion.div
              key="iframe"
              className="w-full h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <iframe
                src={getEmbedUrl(videoUrl)}
                className="w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title={`${name} video`}
              />
            </motion.div>
          ) : videoUrl ? (
            <motion.video
              key="video"
              ref={videoRef}
              src={videoUrl}
              controls
              autoPlay
              className="w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          ) : null}
        </AnimatePresence>

        {/* Selected color badge overlay — always visible when a color is selected */}
        <AnimatePresence>
          {selectedColor && (
            <motion.div
              key={selectedColor}
              className="absolute top-4 left-4 flex items-center gap-2 bg-background/85 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-md"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
            >
              <span
                className="w-3 h-3 rounded-full border border-border/60 shadow-sm"
                style={{ backgroundColor: activeColorOption?.color || selectedColor }}
              />
              <span className="text-xs font-bold hud-text uppercase tracking-wider">
                {activeColorOption?.label || selectedColor}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Color tint overlay for visual feedback when no per-color image */}
        <AnimatePresence>
          {selectedColor && !activeColorOption?.image && activeMedia === 'image' && (
            <motion.div
              key={`tint-${selectedColor}`}
              className="absolute inset-0 pointer-events-none"
              style={{ backgroundColor: selectedColor, mixBlendMode: 'hue' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.15 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </AnimatePresence>

        {/* Zoom indicator (image only) */}
        {activeMedia === 'image' && (
          <motion.div
            className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-sm p-2 rounded-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {isZoomed ? (
              <ZoomOut className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ZoomIn className="h-5 w-5 text-muted-foreground" />
            )}
          </motion.div>
        )}

        {/* Mobile double-tap hint */}
        {isMobile && activeMedia === 'image' && (
          <motion.div
            className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-sm px-2.5 py-1.5 rounded-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <span className="text-[10px] text-muted-foreground">Double-tap pour zoomer</span>
          </motion.div>
        )}

        {/* Mannequin badge — bottom-left, dismissable */}
        {showModelBadge && (modelHeight || modelSizeWorn) && activeMedia === 'image' && (
          <motion.div
            className="absolute bottom-4 left-4 flex items-center gap-2 bg-background/85 backdrop-blur-sm rounded-full pl-3 pr-1.5 py-1.5 shadow-md"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[10px] font-bold hud-text uppercase tracking-wider">
              📏 {[modelHeight, modelSizeWorn && `taille ${modelSizeWorn}`].filter(Boolean).join(' · ')}
            </span>
            <button
              type="button"
              onClick={() => setShowModelBadge(false)}
              className="w-5 h-5 rounded-full hover:bg-foreground/10 flex items-center justify-center"
              aria-label="Masquer"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}

        {/* HUD corner accents */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/40" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/40" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/40" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/40" />
      </motion.div>

      {/* Fullscreen zoom overlay for mobile */}
      <AnimatePresence>
        {fullscreenOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setFullscreenOpen(false)}
          >
            <button
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-foreground/10 backdrop-blur-sm rounded-full flex items-center justify-center"
              onClick={() => setFullscreenOpen(false)}
            >
              <X className="h-5 w-5 text-foreground" />
            </button>
            <div
              className="w-full h-full overflow-auto"
              style={{ touchAction: 'manipulation' }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={displayImage}
                alt={name}
                className="w-full min-h-full object-contain"
                style={{ touchAction: 'pinch-zoom', maxWidth: 'none', width: '200%', marginLeft: '-50%' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Thumbnail strip */}
      <motion.div
        className="flex gap-2 flex-wrap"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        {/* Color swatches as thumbnails (when colorOptions exist) */}
        {colorOptions.length > 0 ? (
          colorOptions.map((co, i) => (
            <motion.button
              key={co.color}
              onClick={() => {
                onColorChange?.(co.color);
                switchToImage();
              }}
              className={`w-14 h-14 chamfer-hud-sm overflow-hidden border-2 relative transition-all ${
                selectedColor === co.color
                  ? 'border-primary shadow-[0_0_8px_hsl(var(--primary)/0.4)]'
                  : 'border-border/30 opacity-70 hover:opacity-100 hover:border-border'
              }`}
              title={co.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {co.image ? (
                <img src={co.image} alt={co.label} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: co.color }}>
                  {selectedColor === co.color && (
                    <span className="text-[10px] font-bold" style={{ color: isLightColor(co.color) ? '#000' : '#fff' }}>✓</span>
                  )}
                </div>
              )}
            </motion.button>
          ))
        ) : (
          <>
            {/* Image thumbnail */}
            <button
              onClick={switchToImage}
              className={`w-20 h-20 chamfer-hud-sm overflow-hidden border-2 bg-card/30 relative transition-colors ${activeMedia === 'image' ? 'border-primary' : 'border-border/30 opacity-60 hover:opacity-100'}`}
            >
              <img src={image} alt={name} className="w-full h-full object-cover" />
              {videoUrl && (
                <div className="absolute bottom-1 left-1">
                  <ImageIcon className="h-3 w-3 text-foreground drop-shadow-md" />
                </div>
              )}
            </button>

          </>
        )}

        {/* Video thumbnail always last */}
        {videoUrl && (
          <button
            onClick={switchToVideo}
            className={`w-14 h-14 chamfer-hud-sm overflow-hidden border-2 bg-card/30 relative transition-colors ${activeMedia === 'video' ? 'border-primary' : 'border-border/30 opacity-60 hover:opacity-100'}`}
          >
            <img src={image} alt={`${name} video`} className="w-full h-full object-cover grayscale" />
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
              <Play className="h-5 w-5 text-foreground fill-foreground" />
            </div>
          </button>
        )}
      </motion.div>
    </div>
  );
}

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length < 6) return false;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}
