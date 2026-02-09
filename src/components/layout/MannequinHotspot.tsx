import { useState } from 'react';
import { LucideIcon, Shield, Package, Layers, Move } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { MannequinHotspotConfig } from '@/types';

const ICON_MAP: Record<string, LucideIcon> = {
  Shield,
  Package,
  Layers,
  Move,
};

const DEFAULT_HOTSPOTS: MannequinHotspotConfig[] = [
  { id: 'collar', x: '50%', y: '15%', label: 'COL TECHNIQUE', details: 'Protection coupe-vent intégrée', icon: 'Shield' },
  { id: 'pocket', x: '30%', y: '45%', label: 'POCHE TACTIQUE', details: 'Accès rapide sécurisé', icon: 'Package' },
  { id: 'fabric', x: '70%', y: '60%', label: 'TISSU TECHNIQUE', details: 'Gore-Tex Pro imperméabilité', icon: 'Layers' },
  { id: 'hem', x: '50%', y: '85%', label: 'OURLET AJUSTABLE', details: 'Cordon élastique intégré', icon: 'Move' },
];

interface HotspotProps {
  hotspot: MannequinHotspotConfig;
}

function getMediaType(url: string): 'video' | 'image' {
  const ext = url.split('.').pop()?.toLowerCase() || '';
  if (['mp4', 'webm', 'ogg'].includes(ext)) return 'video';
  return 'image';
}

function Hotspot({ hotspot }: HotspotProps) {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = ICON_MAP[hotspot.icon] || Shield;

  const xNum = parseInt(hotspot.x);
  const tooltipPosition = xNum > 50 ? 'right' : 'left';
  const hasMedia = !!hotspot.media;
  const mediaType = hotspot.mediaType || (hotspot.media ? getMediaType(hotspot.media) : 'image');

  return (
    <div
      className="mannequin-hotspot"
      style={{ left: hotspot.x, top: hotspot.y }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="hotspot-point" />
      
      <div 
        className={`hotspot-tooltip ${tooltipPosition} ${isHovered ? 'visible' : ''}`}
        style={hasMedia ? { minWidth: '200px' } : undefined}
      >
        {/* Media preview */}
        {hasMedia && isHovered && (
          <div className="mb-2 rounded overflow-hidden border border-border/30" style={{ width: '180px', height: '120px' }}>
            {mediaType === 'video' ? (
              <video
                src={hotspot.media}
                className="w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              <img
                src={hotspot.media}
                alt={hotspot.label}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
              />
            )}
          </div>
        )}
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-3 h-3" />
          <span className="font-bold tracking-wider">{hotspot.label}</span>
        </div>
        <p className="text-foreground/70">{hotspot.details}</p>
      </div>
    </div>
  );
}

export function MannequinHotspots() {
  const { designSettings } = useApp();
  const hotspots = designSettings.mannequinHotspots?.length > 0
    ? designSettings.mannequinHotspots
    : DEFAULT_HOTSPOTS;

  return (
    <>
      {hotspots.map((hotspot) => (
        <Hotspot key={hotspot.id} hotspot={hotspot} />
      ))}
    </>
  );
}
