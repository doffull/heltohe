
-- CGV consents table
CREATE TABLE IF NOT EXISTS public.cgv_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_hash TEXT,
  ip_hash TEXT,
  version TEXT NOT NULL,
  accepted BOOLEAN NOT NULL,
  user_agent TEXT,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cgv_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert cgv consent" ON public.cgv_consents
  FOR INSERT TO anon, authenticated
  WITH CHECK (length(version) <= 50);

CREATE POLICY "Admins can read cgv consents" ON public.cgv_consents
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'auditor'::app_role));

CREATE INDEX IF NOT EXISTS idx_cgv_consents_created ON public.cgv_consents(created_at DESC);

-- RPC record_cgv_consent
CREATE OR REPLACE FUNCTION public.record_cgv_consent(
  p_version TEXT,
  p_accepted BOOLEAN,
  p_session_hash TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_version IS NULL OR length(p_version) > 50 THEN
    RAISE EXCEPTION 'INVALID_VERSION';
  END IF;
  INSERT INTO public.cgv_consents (user_id, session_hash, version, accepted, user_agent, url)
  VALUES (auth.uid(), nullif(p_session_hash,''), p_version, p_accepted, left(coalesce(p_user_agent,''), 500), left(coalesce(p_url,''), 500))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_cgv_consent(TEXT, BOOLEAN, TEXT, TEXT, TEXT) TO anon, authenticated;

-- RPC security_audit_snapshot
CREATE OR REPLACE FUNCTION public.security_audit_snapshot()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tables_no_rls JSONB;
  v_functions_no_path JSONB;
  v_recent_errors JSONB;
  v_failed_logins INT := 0;
  v_score INT := 100;
  v_critical_rpcs JSONB;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'auditor'::app_role)) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('table', c.relname)), '[]'::jsonb)
  INTO v_tables_no_rls
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = false;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('function', p.proname)), '[]'::jsonb)
  INTO v_functions_no_path
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef = true
    AND NOT EXISTS (
      SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
      WHERE cfg LIKE 'search_path=%'
    );

  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
  INTO v_recent_errors
  FROM (
    SELECT coalesce(message,'<no message>') AS message, count(*) AS occurrences, max(created_at) AS last_seen
    FROM public.client_error_logs
    WHERE created_at > now() - interval '7 days'
    GROUP BY message
    ORDER BY count(*) DESC
    LIMIT 20
  ) t;

  BEGIN
    SELECT count(*)::INT INTO v_failed_logins
    FROM auth.audit_log_entries
    WHERE created_at > now() - interval '24 hours'
      AND payload->>'action' IN ('login_failure','user_signedup_failed');
  EXCEPTION WHEN OTHERS THEN
    v_failed_logins := 0;
  END;

  SELECT jsonb_object_agg(name, exists_) INTO v_critical_rpcs
  FROM (
    SELECT n AS name, EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace WHERE ns.nspname='public' AND p.proname = n) AS exists_
    FROM unnest(ARRAY['validate_and_create_order','spin_roulette','has_role','record_cgv_consent']) n
  ) s;

  v_score := v_score - LEAST(40, jsonb_array_length(v_tables_no_rls) * 20);
  v_score := v_score - LEAST(20, jsonb_array_length(v_functions_no_path) * 2);
  v_score := v_score - LEAST(20, v_failed_logins / 10);
  v_score := GREATEST(0, v_score);

  RETURN jsonb_build_object(
    'score', v_score,
    'tablesWithoutRls', v_tables_no_rls,
    'functionsWithoutSearchPath', v_functions_no_path,
    'recentErrors', v_recent_errors,
    'failedLogins24h', v_failed_logins,
    'criticalRpcs', v_critical_rpcs,
    'generatedAt', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.security_audit_snapshot() TO authenticated;

-- Policies SELECT pour auditor
CREATE POLICY "Auditors can view orders" ON public.orders
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'auditor'::app_role));
CREATE POLICY "Auditors can view customers" ON public.customers
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'auditor'::app_role));
CREATE POLICY "Auditors can view error logs" ON public.client_error_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'auditor'::app_role));
CREATE POLICY "Auditors can view role audit" ON public.role_audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'auditor'::app_role));
CREATE POLICY "Auditors can view inventory" ON public.inventory
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'auditor'::app_role));
CREATE POLICY "Auditors can view stock levels" ON public.stock_levels
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'auditor'::app_role));
CREATE POLICY "Auditors can view admin access log" ON public.admin_access_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'auditor'::app_role));

-- Newsletter popups : récurrence
ALTER TABLE public.newsletter_popups
  ADD COLUMN IF NOT EXISTS interval_seconds INTEGER NOT NULL DEFAULT 300,
  ADD COLUMN IF NOT EXISTS max_per_session INTEGER NOT NULL DEFAULT 3;
