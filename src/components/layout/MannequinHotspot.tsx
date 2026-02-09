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

function Hotspot({ hotspot }: HotspotProps) {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = ICON_MAP[hotspot.icon] || Shield;

  const xNum = parseInt(hotspot.x);
  const tooltipPosition = xNum > 50 ? 'right' : 'left';

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
      >
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
