CREATE TABLE public.client_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL,
  label text,
  message text,
  stack text,
  component_stack text,
  url text,
  user_agent text,
  viewport text,
  pixel_ratio numeric,
  console_tail jsonb,
  extra jsonb
);

CREATE INDEX idx_client_error_logs_created_at ON public.client_error_logs (created_at DESC);
CREATE INDEX idx_client_error_logs_source ON public.client_error_logs (source);

ALTER TABLE public.client_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert error logs"
  ON public.client_error_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view error logs"
  ON public.client_error_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete error logs"
  ON public.client_error_logs FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));