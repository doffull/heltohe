import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationConfig {
  id: string;
  config_key: string;
  notify_on_identity_verified: boolean;
  notify_on_payment_verified: boolean;
  notify_on_all_validated: boolean;
  notification_channels: { email: boolean; sms: boolean };
  sms_from_number: string;
  email_templates: Record<string, { subject: string; body: string }>;
  sms_templates: Record<string, string>;
}

export function useNotificationConfig() {
  return useQuery({
    queryKey: ['notification-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_config')
        .select('*')
        .eq('config_key', 'main')
        .maybeSingle();
      if (error) throw error;
      return data as unknown as NotificationConfig | null;
    },
  });
}

export function useUpsertNotificationConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: Partial<NotificationConfig>) => {
      const { data: existing } = await supabase
        .from('notification_config')
        .select('id')
        .eq('config_key', 'main')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('notification_config')
          .update(config as any)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notification_config')
          .insert({ config_key: 'main', ...config } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-config'] }),
  });
}

export function useNotificationLogs(limit = 50) {
  return useQuery({
    queryKey: ['notification-logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
}
