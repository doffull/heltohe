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
    url := 'https://bumfyrfmormisyjletpb.supabase.co/functions/v1/poll-carrier-tracking',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1bWZ5cmZtb3JtaXN5amxldHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMTY3NjgsImV4cCI6MjA4NTc5Mjc2OH0.n145vusBgfNPvGXSCacoSxwJDujFR9zNEUB2twBovVI"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  );
  $$
);