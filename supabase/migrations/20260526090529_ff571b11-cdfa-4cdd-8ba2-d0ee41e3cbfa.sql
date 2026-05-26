
CREATE TABLE IF NOT EXISTS public.banner_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banner_id TEXT NOT NULL,
  banner_type TEXT NOT NULL,
  event TEXT NOT NULL CHECK (event IN ('view','click','dismiss','convert')),
  session_hash TEXT,
  url TEXT,
  user_id UUID,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_banner_analytics_banner ON public.banner_analytics (banner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_banner_analytics_type ON public.banner_analytics (banner_type, event, created_at DESC);

ALTER TABLE public.banner_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert banner events"
  ON public.banner_analytics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read banner analytics"
  ON public.banner_analytics FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete banner analytics"
  ON public.banner_analytics FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));
