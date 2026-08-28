CREATE TABLE public.order_tracking_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status_code TEXT NOT NULL,
  label TEXT NOT NULL,
  location TEXT,
  carrier TEXT,
  event_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX order_tracking_events_unique
  ON public.order_tracking_events (order_id, status_code, event_at);
CREATE INDEX order_tracking_events_order_idx
  ON public.order_tracking_events (order_id, event_at DESC);

GRANT SELECT ON public.order_tracking_events TO authenticated;
GRANT ALL ON public.order_tracking_events TO service_role;

ALTER TABLE public.order_tracking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_tracking_events_owner_select"
  ON public.order_tracking_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_tracking_events.order_id
        AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "order_tracking_events_admin_select"
  ON public.order_tracking_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.order_tracking_events REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_tracking_events;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  PERFORM cron.unschedule('poll-carrier-tracking-hourly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'poll-carrier-tracking-hourly',
  '7 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://hzjzqdlyehclnpeqkier.supabase.co/functions/v1/poll-carrier-tracking',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer __ANON_KEY__"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  );
  $$
);

-- ⚠️ Le jeton ci-dessous doit être la clé anon DE CE projet Supabase.
-- La migration d'origine embarquait celle d'un autre projet : le cron aurait
-- été rejeté en 401 sans que rien ne le signale. Le garde-fou qui suit fait
-- échouer le déploiement tant que la valeur n'a pas été renseignée — un échec
-- bruyant vaut mieux qu'un suivi de colis silencieusement mort.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'poll-carrier-tracking-hourly' AND command LIKE '%__ANON_KEY__%'
  ) THEN
    RAISE EXCEPTION 'poll-carrier-tracking : remplacer __ANON_KEY__ par la clé anon du projet avant de déployer';
  END IF;
END $$;
