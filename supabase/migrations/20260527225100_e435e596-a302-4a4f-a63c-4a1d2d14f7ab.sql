
-- 1. Drop public read on bot_config (widget uses bot_config_public view)
DROP POLICY IF EXISTS "Public can view active bot config rows" ON public.bot_config;

-- 2. Create restricted public view for roulette segments (no probability/code prefix/operational fields)
CREATE OR REPLACE VIEW public.roulette_segments_public
WITH (security_invoker = true) AS
SELECT id, label, description, color, text_color, icon, sort_order, is_active, reward_type
FROM public.roulette_segments
WHERE is_active = true;

REVOKE ALL ON public.roulette_segments_public FROM PUBLIC;
GRANT SELECT ON public.roulette_segments_public TO anon, authenticated;

-- Drop the broad public select policy on roulette_segments; keep admin manage policy
DROP POLICY IF EXISTS "Anyone can view active segments" ON public.roulette_segments;
DROP POLICY IF EXISTS "Public can view active segments" ON public.roulette_segments;
DROP POLICY IF EXISTS "Active segments are viewable" ON public.roulette_segments;

-- Ensure admins keep full access (no-op if already present)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='roulette_segments' AND policyname='Admins manage roulette segments'
  ) THEN
    CREATE POLICY "Admins manage roulette segments" ON public.roulette_segments
      FOR ALL TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- 3. Tighten banner_analytics INSERT (replace WITH CHECK true with shape validation)
DROP POLICY IF EXISTS "Anyone can insert banner events" ON public.banner_analytics;
CREATE POLICY "Anyone can insert banner events" ON public.banner_analytics
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    banner_id IS NOT NULL
    AND length(banner_id) <= 200
    AND banner_type IS NOT NULL
    AND length(banner_type) <= 50
    AND event IS NOT NULL
    AND length(event) <= 50
  );
