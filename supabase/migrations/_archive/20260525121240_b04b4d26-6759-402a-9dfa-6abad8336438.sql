
CREATE TABLE IF NOT EXISTS public.wp_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  direction text NOT NULL CHECK (direction IN ('import','export')),
  status text NOT NULL CHECK (status IN ('success','partial','failed')),
  total integer NOT NULL DEFAULT 0,
  succeeded integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  message text,
  details jsonb,
  triggered_by uuid
);

CREATE INDEX IF NOT EXISTS idx_wp_sync_logs_created_at ON public.wp_sync_logs (created_at DESC);

ALTER TABLE public.wp_sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view wp sync logs" ON public.wp_sync_logs;
CREATE POLICY "Admins can view wp sync logs"
ON public.wp_sync_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert wp sync logs" ON public.wp_sync_logs;
CREATE POLICY "Admins can insert wp sync logs"
ON public.wp_sync_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
