
-- 1. Révoquer l'exécution des fonctions internes (triggers, opérations stock/fidélité backend)
REVOKE EXECUTE ON FUNCTION public.award_loyalty_points(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.consume_order_stock(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.release_order_stock(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.reserve_order_stock(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.trigger_award_loyalty_points() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.audit_role_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.auto_create_inventory_on_product_insert() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.auto_create_category_page() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.generate_category_slug() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sanitize_techwear_hero() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;

-- 2. Restreindre aux utilisateurs connectés uniquement
REVOKE EXECUTE ON FUNCTION public.validate_and_create_order(jsonb, text, text, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.redeem_loyalty_reward(uuid) FROM anon, public;

-- 3. Refuser l'anon sur fonctions admin (la vérification has_role interne reste mais on cache au public)
REVOKE EXECUTE ON FUNCTION public.get_newsletter_stats() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.list_users_by_role(app_role) FROM anon, public;

-- 4. Resserrer la policy UPDATE permissive sur visitor_sessions
-- L'UPDATE legitime passe via la RPC SECURITY DEFINER track_session_heartbeat,
-- donc on supprime totalement l'UPDATE direct côté client.
DROP POLICY IF EXISTS "Anyone can update their session" ON public.visitor_sessions;
DROP POLICY IF EXISTS "Anyone can update own session by session_id" ON public.visitor_sessions;
REVOKE UPDATE ON public.visitor_sessions FROM anon, authenticated;

-- 5. Resserrer un peu les policies INSERT analytics: exiger session_id non vide
DROP POLICY IF EXISTS "Anyone can insert click events" ON public.click_events;
CREATE POLICY "Anyone can insert click events"
  ON public.click_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (session_id IS NOT NULL AND length(session_id) >= 8 AND length(path) <= 500);

DROP POLICY IF EXISTS "Anyone can insert page views" ON public.page_views;
CREATE POLICY "Anyone can insert page views"
  ON public.page_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (session_id IS NOT NULL AND length(session_id) >= 8 AND length(path) <= 500);

DROP POLICY IF EXISTS "Anyone can insert error logs" ON public.client_error_logs;
CREATE POLICY "Anyone can insert error logs"
  ON public.client_error_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (source IS NOT NULL AND length(source) <= 200 AND (message IS NULL OR length(message) <= 4000));
