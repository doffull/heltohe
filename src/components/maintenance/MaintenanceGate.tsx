import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useDesignSettings } from '@/hooks/useDesignSettings';
import { MaintenancePage } from './MaintenancePage';

const ALWAYS_ALLOWED = ['/admin', '/auth', '/.lovable'];

/**
 * Affiche la page de maintenance à la place du site public quand le mode
 * maintenance est activé depuis /admin/seo. L'admin et les routes d'accès
 * (/admin, /auth) restent toujours disponibles.
 */
export function MaintenanceGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { isAdmin } = useAuth();
  const { data: settings } = useDesignSettings();
  const s = (settings as any) || {};

  const allowedRoute = ALWAYS_ALLOWED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const adminBypass = s.maintenanceAdminBypass !== false && isAdmin;

  if (s.maintenanceEnabled === true && !allowedRoute && !adminBypass) {
    return <MaintenancePage />;
  }

  return <>{children}</>;
}
