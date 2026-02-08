import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface ProductImageGalleryProps {
  image: string;
  name: string;
}

export default function ProductImageGallery({ image, name }: ProductImageGalleryProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || !isZoomed) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  return (
    <div className="space-y-4">
      {/* Main Image with Zoom */}
      <motion.div
        ref={containerRef}
        className="relative chamfer-hud-lg overflow-hidden bg-card/30 cursor-crosshair aspect-square"
        onClick={() => setIsZoomed(!isZoomed)}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isZoomed && setIsZoomed(false)}
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.img
          src={image}
          alt={name}
          className="w-full h-full object-cover"
          style={isZoomed ? {
            transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
            scale: 2.5,
          } : {
            transformOrigin: 'center center',
            scale: 1,
          }}
          transition={{ type: 'tween', duration: 0.3 }}
        />

        {/* Zoom indicator */}
        <AnimatePresence>
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
        </AnimatePresence>

        {/* HUD corner accents */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/40" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/40" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/40" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/40" />
      </motion.div>

      {/* Thumbnail strip (visual enhancement with single image) */}
      <motion.div
        className="flex gap-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <div className="w-20 h-20 chamfer-hud-sm overflow-hidden border-2 border-primary bg-card/30">
          <img src={image} alt={name} className="w-full h-full object-cover" />
        </div>
        {/* Placeholder thumbnails for visual effect */}
        {[1, 2, 3].map((i) => (
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
