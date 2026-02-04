import { useState } from 'react';
import { LucideIcon, Shield, Package, Layers, Move } from 'lucide-react';

interface HotspotData {
  id: string;
  x: string;
  y: string;
  label: string;
  details: string;
  Icon: LucideIcon;
}

const HOTSPOTS: HotspotData[] = [
  {
    id: 'collar',
    x: '50%',
    y: '15%',
    label: 'COL TECHNIQUE',
    details: 'Protection coupe-vent intégrée',
    Icon: Shield,
  },
  {
    id: 'pocket',
    x: '30%',
    y: '45%',
    label: 'POCHE TACTIQUE',
    details: 'Accès rapide sécurisé',
    Icon: Package,
  },
  {
    id: 'fabric',
    x: '70%',
    y: '60%',
    label: 'TISSU TECHNIQUE',
    details: 'Gore-Tex Pro imperméabilité',
    Icon: Layers,
  },
  {
    id: 'hem',
    x: '50%',
    y: '85%',
    label: 'OURLET AJUSTABLE',
    details: 'Cordon élastique intégré',
    Icon: Move,
  },
];

interface HotspotProps {
  hotspot: HotspotData;
}

function Hotspot({ hotspot }: HotspotProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { Icon } = hotspot;

  // Determine tooltip position based on hotspot location
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
  return (
    <>
      {HOTSPOTS.map((hotspot) => (
        <Hotspot key={hotspot.id} hotspot={hotspot} />
      ))}
    </>
  );
}
