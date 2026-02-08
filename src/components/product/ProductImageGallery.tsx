import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, Play, Image as ImageIcon } from 'lucide-react';

interface ProductImageGalleryProps {
  image: string;
  name: string;
  videoUrl?: string;
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

export default function ProductImageGallery({ image, name, videoUrl }: ProductImageGalleryProps) {
  const [activeMedia, setActiveMedia] = useState<'image' | 'video'>('image');
  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  return (
    <div className="space-y-4">
      {/* Main media area */}
      <motion.div
        ref={containerRef}
        className={`relative chamfer-hud-lg overflow-hidden bg-card/30 aspect-square ${activeMedia === 'image' ? 'cursor-crosshair' : ''}`}
        onClick={() => activeMedia === 'image' && setIsZoomed(!isZoomed)}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isZoomed && setIsZoomed(false)}
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <AnimatePresence mode="wait">
          {activeMedia === 'image' ? (
            <motion.img
              key="image"
              src={image}
              alt={name}
              className="w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={isZoomed ? {
                transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
                scale: 2.5,
              } : {
                transformOrigin: 'center center',
                scale: 1,
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

        {/* HUD corner accents */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/40" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/40" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/40" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/40" />
      </motion.div>

      {/* Thumbnail strip */}
      <motion.div
        className="flex gap-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
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

        {/* Video thumbnail */}
        {videoUrl && (
          <button
            onClick={switchToVideo}
            className={`w-20 h-20 chamfer-hud-sm overflow-hidden border-2 bg-card/30 relative transition-colors ${activeMedia === 'video' ? 'border-primary' : 'border-border/30 opacity-60 hover:opacity-100'}`}
          >
            <img src={image} alt={`${name} video`} className="w-full h-full object-cover grayscale" />
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
              <Play className="h-6 w-6 text-foreground fill-foreground" />
            </div>
          </button>
        )}

        {/* Placeholder thumbnails */}
        {!videoUrl && [1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-20 h-20 chamfer-hud-sm overflow-hidden border border-border/30 bg-card/10 opacity-40 relative"
          >
            <img src={image} alt={name} className="w-full h-full object-cover grayscale" />
            <div className="absolute inset-0 bg-background/60" />
          </div>
        ))}
      </motion.div>
    </div>
  );
}
