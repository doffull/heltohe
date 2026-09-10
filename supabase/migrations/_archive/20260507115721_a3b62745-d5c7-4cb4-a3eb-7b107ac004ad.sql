
-- Visitor tracking
CREATE TABLE public.visitor_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent TEXT,
  ip_hash TEXT,
  country TEXT,
  device TEXT,
  referrer TEXT,
  landing_path TEXT
);

CREATE TABLE public.page_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  path TEXT NOT NULL,
  title TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_ms INTEGER
);

CREATE TABLE public.click_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  path TEXT NOT NULL,
  element_label TEXT,
  element_selector TEXT,
  x INTEGER,
  y INTEGER,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_visitor_sessions_last_seen ON public.visitor_sessions(last_seen_at DESC);
CREATE INDEX idx_page_views_session ON public.page_views(session_id, viewed_at DESC);
CREATE INDEX idx_click_events_session ON public.click_events(session_id, clicked_at DESC);
CREATE INDEX idx_page_views_path ON public.page_views(path, viewed_at DESC);

ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.click_events ENABLE ROW LEVEL SECURITY;

-- Public can insert (anonymous tracking)
CREATE POLICY "Anyone can insert sessions" ON public.visitor_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update own session by session_id" ON public.visitor_sessions FOR UPDATE USING (true);
CREATE POLICY "Anyone can insert page views" ON public.page_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert click events" ON public.click_events FOR INSERT WITH CHECK (true);

-- Admins read
CREATE POLICY "Admins read sessions" ON public.visitor_sessions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins read page views" ON public.page_views FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins read click events" ON public.click_events FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage sessions" ON public.visitor_sessions FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.visitor_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.page_views;
ALTER PUBLICATION supabase_realtime ADD TABLE public.click_events;
ALTER TABLE public.visitor_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.page_views REPLICA IDENTITY FULL;
ALTER TABLE public.click_events REPLICA IDENTITY FULL;
