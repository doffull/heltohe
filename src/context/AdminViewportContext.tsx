import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

export type AdminDevice = 'mobile' | 'tablet' | 'desktop';

interface Ctx {
  device: AdminDevice;
  setDevice: (d: AdminDevice) => void;
  snap: boolean;
  setSnap: (s: boolean) => void;
  locked: boolean;
  setLocked: (l: boolean) => void;
  /** Effective device used by draggable components. Admins use override; others rely on window. */
  effectiveDevice: AdminDevice;
  setOverrideEnabled: (b: boolean) => void;
  overrideEnabled: boolean;
}

const AdminViewportCtx = createContext<Ctx | null>(null);

function detectDevice(): AdminDevice {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1200) return 'tablet';
  return 'desktop';
}

export function AdminViewportProvider({ children }: { children: ReactNode }) {
  const [device, setDeviceState] = useState<AdminDevice>(() => {
    const v = (typeof localStorage !== 'undefined' && localStorage.getItem('admin_drag_device')) as AdminDevice | null;
    return v || detectDevice();
  });
  const [snap, setSnapState] = useState<boolean>(() => {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem('admin_drag_snap') : null;
    return v === null ? true : v === '1';
  });
  const [locked, setLockedState] = useState<boolean>(() => {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem('admin_drag_locked') : null;
    return v === '1';
  });
  const [overrideEnabled, setOverrideEnabledState] = useState<boolean>(() => {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem('admin_drag_override') : null;
    return v === '1';
  });
  const [autoDevice, setAutoDevice] = useState<AdminDevice>(detectDevice());
  useEffect(() => {
    const onResize = () => setAutoDevice(detectDevice());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const setDevice = (d: AdminDevice) => { localStorage.setItem('admin_drag_device', d); setDeviceState(d); };
  const setSnap = (s: boolean) => { localStorage.setItem('admin_drag_snap', s ? '1' : '0'); setSnapState(s); };
  const setLocked = (l: boolean) => { localStorage.setItem('admin_drag_locked', l ? '1' : '0'); setLockedState(l); };
  const setOverrideEnabled = (b: boolean) => { localStorage.setItem('admin_drag_override', b ? '1' : '0'); setOverrideEnabledState(b); };

  const value = useMemo<Ctx>(() => ({
    device, setDevice, snap, setSnap, locked, setLocked,
    overrideEnabled, setOverrideEnabled,
    effectiveDevice: overrideEnabled ? device : autoDevice,
  }), [device, snap, locked, overrideEnabled, autoDevice]);

  return <AdminViewportCtx.Provider value={value}>{children}</AdminViewportCtx.Provider>;
}

export function useAdminViewport(): Ctx {
  const v = useContext(AdminViewportCtx);
  if (!v) {
    // Safe fallback if used outside provider
    return {
      device: 'desktop', setDevice: () => {},
      snap: true, setSnap: () => {},
      locked: false, setLocked: () => {},
      overrideEnabled: false, setOverrideEnabled: () => {},
      effectiveDevice: detectDevice(),
    };
  }
  return v;
}
