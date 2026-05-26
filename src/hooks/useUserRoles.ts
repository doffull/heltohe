import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'stock_manager' | 'preparator' | 'auditor' | 'order_validator';

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin',
  stock_manager: 'Resp. stock',
  preparator: 'Préparateur',
  auditor: 'Auditeur',
  order_validator: 'Valideur commandes',
};

export const ROLE_COLORS: Record<AppRole, string> = {
  admin: 'bg-red-500/20 text-red-500 border-red-500/30',
  stock_manager: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
  preparator: 'bg-green-500/20 text-green-500 border-green-500/30',
  auditor: 'bg-sky-500/20 text-sky-500 border-sky-500/30',
  order_validator: 'bg-indigo-500/20 text-indigo-500 border-indigo-500/30',
};

/** Fetch all role rows once and group by user_id (admin-only via RLS). */
export function useAllUserRoles() {
  return useQuery({
    queryKey: ['all-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('user_id, role');
      if (error) throw error;
      const map = new Map<string, AppRole[]>();
      (data || []).forEach((r: any) => {
        const arr = map.get(r.user_id) || [];
        arr.push(r.role as AppRole);
        map.set(r.user_id, arr);
      });
      return map;
    },
  });
}

/** Audit log of role changes (admin-only via RLS). */
export function useRoleAuditLog() {
  return useQuery({
    queryKey: ['role-audit-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });
}
