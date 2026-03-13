import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminConfig {
  id?: string;
  adminNotificationEmail?: string;
  colissimoSenderName?: string;
  colissimoSenderAddress?: string;
  colissimoSenderZip?: string;
  colissimoSenderCity?: string;
}

function dbToAdminConfig(db: Record<string, unknown>): AdminConfig {
  return {
    id: db.id as string,
    adminNotificationEmail: (db.admin_notification_email as string) || undefined,
    colissimoSenderName: (db.colissimo_sender_name as string) ?? '',
    colissimoSenderAddress: (db.colissimo_sender_address as string) ?? '',
    colissimoSenderZip: (db.colissimo_sender_zip as string) ?? '',
    colissimoSenderCity: (db.colissimo_sender_city as string) ?? '',
  };
}

export function useAdminConfig() {
  return useQuery({
    queryKey: ['admin_config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_config')
        .select('*')
        .eq('config_key', 'main')
        .maybeSingle();
      if (error) throw error;
      if (!data) return {} as AdminConfig;
      return dbToAdminConfig(data as Record<string, unknown>);
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useSaveAdminConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: AdminConfig) => {
      const payload = {
        config_key: 'main',
        admin_notification_email: config.adminNotificationEmail || null,
        colissimo_sender_name: config.colissimoSenderName ?? '',
        colissimo_sender_address: config.colissimoSenderAddress ?? '',
        colissimo_sender_zip: config.colissimoSenderZip ?? '',
        colissimo_sender_city: config.colissimoSenderCity ?? '',
      };
      const { error } = await supabase
        .from('admin_config')
        .upsert(payload, { onConflict: 'config_key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_config'] });
    },
  });
}
