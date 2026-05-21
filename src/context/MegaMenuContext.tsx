import { createContext, ReactNode, useCallback, useContext, useState } from 'react';

interface MegaMenuCtx { open: boolean; setOpen: (v: boolean) => void; toggle: () => void }
const Ctx = createContext<MegaMenuCtx | null>(null);

export function MegaMenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  return <Ctx.Provider value={{ open, setOpen, toggle }}>{children}</Ctx.Provider>;
}

export function useMegaMenu() {
  const ctx = useContext(Ctx);
  if (!ctx) return { open: false, setOpen: () => {}, toggle: () => {} } as MegaMenuCtx;
  return ctx;
}
