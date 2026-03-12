import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { HUDStat } from '@/types';

interface HUDStatsProps {
  className?: string;
}

export function HUDStats({ className }: HUDStatsProps) {
  const { designSettings, t } = useApp();
  const { stats, statsLabel, statsSubLabel, showStats, statsStyle } = designSettings;
  
  if (!showStats) return null;
  
  return (
    <div 
      className={cn(
        "absolute z-30 p-4 chamfer-hud backdrop-blur-sm",
        statsStyle.animation === 'pulse' && 'animate-pulse-glow',
        statsStyle.animation === 'fade' && 'animate-fade-in',
        className
      )}
      style={{
        backgroundColor: `${statsStyle.bg}cc`,
        color: statsStyle.text,
        transform: `scale(${statsStyle.scale})`,
        top: statsStyle.pos.top ? `${statsStyle.pos.top}%` : 'auto',
        bottom: statsStyle.pos.bottom ? `${statsStyle.pos.bottom}%` : 'auto',
        left: statsStyle.pos.left ? `${statsStyle.pos.left}%` : 'auto',
        right: statsStyle.pos.right ? `${statsStyle.pos.right}%` : 'auto',
      }}
    >
      <div className="space-y-3">
        <div className="hud-text text-[10px] text-primary/80">
          {statsLabel}
        </div>
        <div className="hud-text text-xs mb-3">
          {statsSubLabel}
        </div>
        
        {stats.map((stat, index) => (
          <StatBar 
            key={stat.label} 
            stat={stat} 
            delay={index * 200}
          />
        ))}
      </div>
    </div>
  );
}

function StatBar({ stat, delay }: { stat: HUDStat; delay: number }) {
  return (
    <div 
      className="space-y-1 animate-slide-in-left"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex justify-between items-center">
        <span className="hud-text text-[10px] text-muted-foreground">
          {stat.label}
        </span>
        <span className="hud-text text-xs text-primary">
          {stat.value}%
        </span>
      </div>
      <div className="hud-progress">
        <div 
          className="hud-progress-bar"
          style={{ width: `${stat.value}%` }}
        />
      </div>
    </div>
  );
}

export function HUDUnitID({ className }: { className?: string }) {
  const { designSettings } = useApp();
  const { customUnitID, unitIdLabel, showUnitID, unitIdStyle } = designSettings;
  
  if (!showUnitID) return null;
  
  return (
    <div 
      className={cn(
        "absolute z-30 p-3 chamfer-hud-sm backdrop-blur-sm",
        unitIdStyle.animation === 'fade' && 'animate-fade-in',
        unitIdStyle.animation === 'pulse' && 'animate-pulse-glow',
        className
      )}
      style={{
        backgroundColor: `${unitIdStyle.bg}cc`,
        color: unitIdStyle.text,
        transform: `scale(${unitIdStyle.scale})`,
        top: unitIdStyle.pos.top ? `${unitIdStyle.pos.top}%` : 'auto',
        bottom: unitIdStyle.pos.bottom ? `${unitIdStyle.pos.bottom}%` : 'auto',
        left: unitIdStyle.pos.left ? `${unitIdStyle.pos.left}%` : 'auto',
        right: unitIdStyle.pos.right ? `${unitIdStyle.pos.right}%` : 'auto',
      }}
    >
      <div className="hud-text text-[10px] text-muted-foreground mb-1">
        {unitIdLabel}
      </div>
      <div className="hud-text text-sm text-primary terminal-cursor">
        {customUnitID}
      </div>
    </div>
  );
}

export function HUDLogo({ className }: { className?: string }) {
  const { designSettings } = useApp();
  const { hudLogo, showLogo, logoStyle } = designSettings;
  
  if (!showLogo || !hudLogo) return null;
  
  return (
    <div 
      className={cn(
        "absolute z-30 p-3 chamfer-hud backdrop-blur-sm",
        logoStyle.animation === 'glitch' && 'glitch-effect',
        logoStyle.animation === 'pulse' && 'animate-pulse-glow',
        className
      )}
      style={{
        backgroundColor: `${logoStyle.bg}cc`,
        transform: `scale(${logoStyle.scale})`,
        top: logoStyle.pos.top ? `${logoStyle.pos.top}%` : 'auto',
        bottom: logoStyle.pos.bottom ? `${logoStyle.pos.bottom}%` : 'auto',
        left: logoStyle.pos.left ? `${logoStyle.pos.left}%` : 'auto',
        right: logoStyle.pos.right ? `${logoStyle.pos.right}%` : 'auto',
      }}
    >
      <img 
        src={hudLogo} 
        alt="Brand Logo" 
        className="h-12 w-auto object-contain logo-visibility-filter"
      />
    </div>
  );
}
