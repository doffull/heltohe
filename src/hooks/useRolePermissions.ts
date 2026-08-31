import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from '@/hooks/useUserRoles';

export type RolePermissions = Record<string, string[]>;

/** Périmètres de repli si la table n'est pas encore lisible (hors ligne, RLS). */
export const DEFAULT_ROLE_ROUTES: Record<Exclude<AppRole, 'admin'>, string[]> = {
  preparator: ['/admin', '/admin/preparations', '/admin/colissimo'],
  stock_manager: ['/admin', '/admin/stock', '/admin/produits', '/admin/preparations'],
  order_validator: ['/admin', '/admin/commandes', '/admin/preparations', '/admin/colissimo', '/admin/clients'],
  auditor: ['/admin', '/admin/audit', '/admin/errors', '/admin/bannieres-analytics', '/admin/media-audit'],
};

/** Permissions (routes admin autorisées) par rôle, stockées en base. */
export function useRolePermissions() {
  return useQuery({
    queryKey: ['role-permissions'],
    queryFn: async (): Promise<RolePermissions> => {
      const { data, error } = await supabase
        .from('role_permissions' as any)
        .select('role, allowed_routes');
      if (error) throw error;
      const map: RolePermissions = {};
      (data || []).forEach((row: any) => {
        map[row.role] = (row.allowed_routes || []) as string[];
      });
      return map;
    },
    staleTime: 60_000,
  });
}

export function useSaveRolePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ role, routes }: { role: AppRole; routes: string[] }) => {
      const { error } = await supabase
        .from('role_permissions' as any)
        .upsert({ role, allowed_routes: routes }, { onConflict: 'role' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['role-permissions'] }),
  });
}
