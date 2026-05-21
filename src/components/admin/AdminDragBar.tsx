import { useAuth } from '@/context/AuthContext';
import { useAdminViewport } from '@/context/AdminViewportContext';
import { useApp } from '@/context/AppContext';
import { Magnet, Lock, Unlock, Smartphone, Tablet, Monitor, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export function AdminDragBar() {
  const { isAdmin } = useAuth() as any;
  const { designSettings, updateDesignSettings } = useApp();
  const { device, setDevice, snap, setSnap, locked, setLocked, overrideEnabled, setOverrideEnabled } = useAdminViewport();
  if (!isAdmin) return null;

  const resetAll = async () => {
    const cur = (designSettings as any) || {};
    const ufab = cur.unifiedFab || {};
    const tw = cur.techwearHero || {};
    const cleared: any = {
      ...cur,
      unifiedFab: {
        ...ufab,
        position_desktop: undefined, position_mobile: undefined, position_tablet: undefined,
        rouletteFab: ufab.rouletteFab ? {
          ...ufab.rouletteFab,
          position_desktop: { corner: 'cc', x: 0, y: 0 },
          position_mobile: { corner: 'cc', x: 0, y: 0 },
          position_tablet: { corner: 'cc', x: 0, y: 0 },
        } : ufab.rouletteFab,
      },
      techwearHero: {
        ...tw,
        modelBadgePos: undefined, sidePanelPos: undefined, titlePos: undefined,
        modelBadgePos_mobile: undefined, modelBadgePos_tablet: undefined, modelBadgePos_desktop: undefined,
        sidePanelPos_mobile: undefined, sidePanelPos_tablet: undefined, sidePanelPos_desktop: undefined,
      },
    };
    await updateDesignSettings(cleared);
    toast.success('Toutes les positions ont été réinitialisées');
  };

  const copyTo = async (target: 'mobile' | 'tablet' | 'desktop') => {
    const cur = (designSettings as any) || {};
    const ufab = cur.unifiedFab || {};
    const rfab = ufab.rouletteFab || {};
    const tw = cur.techwearHero || {};
    const srcKey = `position_${device}`;
    const dstKey = `position_${target}`;
    await updateDesignSettings({
      ...cur,
      unifiedFab: { ...ufab, rouletteFab: { ...rfab, [dstKey]: rfab[srcKey] } },
      techwearHero: {
        ...tw,
        [`modelBadgePos_${target}`]: tw[`modelBadgePos_${device}`] ?? tw.modelBadgePos,
        [`sidePanelPos_${target}`]: tw[`sidePanelPos_${device}`] ?? tw.sidePanelPos,
      },
    } as any);
    toast.success(`Copié ${device} → ${target}`);
  };

  const Btn = ({ active, onClick, title, children }: any) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider border-2 transition ${
        active ? 'bg-foreground text-background border-foreground' : 'bg-background text-foreground border-foreground/30 hover:border-foreground'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div
      className="fixed left-1/2 bottom-3 z-[60] -translate-x-1/2 hidden lg:flex items-center gap-1 bg-background border-2 border-primary/60 px-2 py-1.5 shadow-2xl"
      style={{ backdropFilter: 'blur(12px)' }}
    >
      <span className="text-[9px] uppercase tracking-widest font-bold opacity-60 px-1">Admin Drag</span>
      <Btn active={snap} onClick={() => setSnap(!snap)} title="Snap grille 8px">
        <Magnet className="h-3 w-3" /> {snap ? 'Snap' : 'Libre'}
      </Btn>
      <Btn active={locked} onClick={() => setLocked(!locked)} title="Verrouiller le drag">
        {locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
        {locked ? 'Verrou' : 'Ouvert'}
      </Btn>
      <div className="w-px h-5 bg-foreground/30 mx-0.5" />
      <Btn active={overrideEnabled} onClick={() => setOverrideEnabled(!overrideEnabled)} title="Forcer un device">
        {overrideEnabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        {overrideEnabled ? 'Forcé' : 'Auto'}
      </Btn>
      <Btn active={overrideEnabled && device === 'mobile'} onClick={() => { setOverrideEnabled(true); setDevice('mobile'); }} title="Mobile">
        <Smartphone className="h-3 w-3" /> M
      </Btn>
      <Btn active={overrideEnabled && device === 'tablet'} onClick={() => { setOverrideEnabled(true); setDevice('tablet'); }} title="Tablet">
        <Tablet className="h-3 w-3" /> T
      </Btn>
      <Btn active={overrideEnabled && device === 'desktop'} onClick={() => { setOverrideEnabled(true); setDevice('desktop'); }} title="Desktop">
        <Monitor className="h-3 w-3" /> D
      </Btn>
      <div className="w-px h-5 bg-foreground/30 mx-0.5" />
      <Btn onClick={() => copyTo('mobile')} title="Copier la position vers mobile">→M</Btn>
      <Btn onClick={() => copyTo('tablet')} title="Copier vers tablet">→T</Btn>
      <Btn onClick={() => copyTo('desktop')} title="Copier vers desktop">→D</Btn>
      <Btn onClick={resetAll} title="Reset toutes les positions">
        <RotateCcw className="h-3 w-3" /> Reset
      </Btn>
    </div>
  );
}
