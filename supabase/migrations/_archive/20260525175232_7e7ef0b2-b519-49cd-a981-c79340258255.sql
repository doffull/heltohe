ALTER TABLE public.wp_sync_logs ADD COLUMN IF NOT EXISTS correlation_id uuid;
CREATE INDEX IF NOT EXISTS wp_sync_logs_correlation_id_idx ON public.wp_sync_logs(correlation_id);