-- =============================================================================
-- BASELINE — état réel de la base au 09/09/2026
-- =============================================================================
--
-- Ce fichier remplace 188 migrations. Il décrit la base telle qu'elle EXISTE
-- sur `hzjzqdlyehclnpeqkier`, et non telle que l'historique prétendait qu'elle
-- soit. Les anciens fichiers sont conservés dans `_archive/` : ils restent la
-- seule trace de l'intention d'origine, et ont déjà servi deux fois à réparer
-- ce que le transfert avait perdu.
--
-- POURQUOI
--
-- Lors du passage de `bumfyrfmormisyjletpb` à `hzjzqdlyehclnpeqkier` (§21 de
-- PROJECT.md), la table `supabase_migrations.schema_migrations` a été recopiée
-- telle quelle. Résultat constaté le 09/09 : 284 versions enregistrées comme
-- appliquées, pour seulement 188 fichiers au dépôt. Une centaine d'entrées ne
-- correspondait à rien, et à l'inverse des objets décrits par les migrations
-- n'avaient jamais été créés — le bucket `labels`, puis TOUTES les politiques
-- de `storage.objects`, découverts à trois jours d'écart.
--
-- `supabase db push` était donc inutilisable : il sautait ce qu'il croyait fait.
--
-- COMMENT IL A ÉTÉ CONSTRUIT
--
--   npx supabase db dump --linked -f backup_2_schema.sql
--
-- Le dump ne couvre que le schéma `public`. La section STORAGE en fin de fichier
-- a été ajoutée à la main : sans elle, un projet reconstruit depuis ce baseline
-- repartirait avec le trou qu'on venait de boucher.
--
-- Conformité vérifiée avant archivage — dump vs inventaire de la base réelle :
--
--   82 tables · 36 fonctions · 62 triggers · 214 policies · 7 vues
--   67 index · 4 types · 4 extensions · 378 grants · 82 tables avec RLS
--
-- ⚠️ CE FICHIER N'A PAS ÉTÉ EXÉCUTÉ SUR LA PRODUCTION. Il y a été déclaré
-- appliqué, puisqu'il ne fait que décrire ce qui s'y trouve déjà. Il ne sert
-- qu'à reconstruire un projet neuf — recette, préproduction, reprise.
--
-- ⚠️ IL FIGE L'EXISTANT, PAS L'IDÉAL. Deux écarts connus avec le dépôt sont
-- donc gravés ici, volontairement :
--
--   · `validate_and_create_order` calcule encore la TVA
--     (`v_tax := v_order_total * 0.2 / 1.2`). Le dépôt portait une version qui
--     la met à zéro, jamais déployée. Décision comptable en suspens.
--   · Cette même version CONSERVE les garde-fous promo — plafond
--     `max_discount`, respect de `usage_limit`, incrément de `usage_count` —
--     que la version du dépôt avait perdus. Les figer ici les met à l'abri.
--
-- LA SUITE
--
-- Toute évolution passe désormais par une nouvelle migration horodatée après
-- celle-ci. `supabase db push` redevient fiable.
--
-- =============================================================================





SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'admin',
    'moderator',
    'user',
    'stock_manager',
    'preparator',
    'auditor',
    'order_validator'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."banner_type" AS ENUM (
    'hero',
    'promo',
    'popup',
    'sidebar'
);


ALTER TYPE "public"."banner_type" OWNER TO "postgres";


CREATE TYPE "public"."loyalty_tier" AS ENUM (
    'bronze',
    'silver',
    'gold',
    'platinum'
);


ALTER TYPE "public"."loyalty_tier" OWNER TO "postgres";


CREATE TYPE "public"."promo_type" AS ENUM (
    'percentage',
    'fixed_amount',
    'free_shipping'
);


ALTER TYPE "public"."promo_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_role_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.role_audit_log (changed_by, operation, target_user_id, role)
    VALUES (auth.uid(), 'DELETE', OLD.user_id, OLD.role::text);
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.role_audit_log (changed_by, operation, target_user_id, role)
    VALUES (auth.uid(), 'INSERT', NEW.user_id, NEW.role::text);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.role_audit_log (changed_by, operation, target_user_id, role)
    VALUES (auth.uid(), 'UPDATE', NEW.user_id, NEW.role::text);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."audit_role_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_create_category_page"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.pages (title, slug, type, category_id, is_published, sections, meta_title, meta_description, seo_keywords)
  VALUES (
    NEW.title,
    NEW.slug,
    'category',
    NEW.id,
    true,
    '[]'::jsonb,
    NEW.meta_title,
    NEW.meta_description,
    NEW.seo_keywords
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_create_category_page"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_create_inventory_on_product_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_inventory_id UUID;
  v_web_location_id UUID;
  v_size TEXT;
  v_nb_sizes INTEGER;
  v_qty_per_size INTEGER;
BEGIN
  -- Get the web/online location id
  SELECT id INTO v_web_location_id
  FROM public.locations
  WHERE type = 'web'
  LIMIT 1;

  -- If no web location exists, skip gracefully
  IF v_web_location_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip if inventory already exists for this product (safety guard)
  IF EXISTS (SELECT 1 FROM public.inventory WHERE product_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Create the inventory entry
  INSERT INTO public.inventory (product_id, sku, name, channel, threshold)
  VALUES (NEW.id, NEW.sku, NEW.name, 'b2c', 10)
  RETURNING id INTO v_inventory_id;

  -- If the product has sizes, create one stock_level row per size
  IF NEW.sizes IS NOT NULL AND array_length(NEW.sizes, 1) > 0 THEN
    v_nb_sizes := array_length(NEW.sizes, 1);
    v_qty_per_size := GREATEST(0, FLOOR(COALESCE(NEW.stock, 0)::NUMERIC / v_nb_sizes)::INTEGER);

    FOREACH v_size IN ARRAY NEW.sizes LOOP
      INSERT INTO public.stock_levels (inventory_id, location_id, quantity, reserved, size)
      VALUES (v_inventory_id, v_web_location_id, v_qty_per_size, 0, v_size);
    END LOOP;
  ELSE
    -- No sizes: single global stock_level row
    INSERT INTO public.stock_levels (inventory_id, location_id, quantity, reserved)
    VALUES (v_inventory_id, v_web_location_id, COALESCE(NEW.stock, 0), 0);
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_create_inventory_on_product_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."award_loyalty_points"("p_order_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_order RECORD;
  v_customer RECORD;
  v_multiplier NUMERIC;
  v_points INTEGER;
  v_new_total INTEGER;
  v_new_tier loyalty_tier;
  v_new_total_spent NUMERIC;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','ORDER_NOT_FOUND'); END IF;
  IF v_order.loyalty_awarded_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'already_awarded', true);
  END IF;
  IF v_order.user_id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'guest_order', true);
  END IF;

  SELECT * INTO v_customer FROM public.customers WHERE user_id = v_order.user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','CUSTOMER_NOT_FOUND'); END IF;

  v_multiplier := CASE v_customer.loyalty_tier
    WHEN 'silver' THEN 1.5
    WHEN 'gold' THEN 2.0
    WHEN 'platinum' THEN 3.0
    ELSE 1.0
  END;

  v_points := FLOOR(COALESCE(v_order.subtotal, 0) * v_multiplier)::INTEGER;
  v_new_total := COALESCE(v_customer.loyalty_points, 0) + v_points;
  v_new_total_spent := COALESCE(v_customer.total_spent, 0) + COALESCE(v_order.total, 0);

  v_new_tier := CASE
    WHEN v_new_total >= 5000 THEN 'platinum'::loyalty_tier
    WHEN v_new_total >= 1500 THEN 'gold'::loyalty_tier
    WHEN v_new_total >= 500 THEN 'silver'::loyalty_tier
    ELSE 'bronze'::loyalty_tier
  END;

  UPDATE public.customers
    SET loyalty_points = v_new_total,
        loyalty_tier = v_new_tier,
        total_spent = v_new_total_spent,
        updated_at = now()
    WHERE id = v_customer.id;

  INSERT INTO public.loyalty_transactions (customer_id, order_id, type, points, description)
  VALUES (v_customer.id, p_order_id, 'earn', v_points,
    'Commande ' || v_order.order_number || ' (×' || v_multiplier || ')');

  UPDATE public.orders SET loyalty_awarded_at = now() WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'points', v_points, 'newTier', v_new_tier, 'totalPoints', v_new_total);
END;
$$;


ALTER FUNCTION "public"."award_loyalty_points"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_user_review_product"("p_product_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_order RECORD;
  v_existing UUID;
  v_size TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'NOT_AUTHENTICATED');
  END IF;

  SELECT id INTO v_existing FROM public.product_reviews
    WHERE user_id = v_uid AND product_id = p_product_id;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'ALREADY_REVIEWED', 'reviewId', v_existing);
  END IF;

  SELECT o.id, o.order_number, o.created_at,
    (SELECT it->>'size' FROM jsonb_array_elements(o.items) it
       WHERE (it->>'productId')::UUID = p_product_id LIMIT 1) AS size
  INTO v_order
  FROM public.orders o
  WHERE o.user_id = v_uid
    AND lower(o.status) IN ('delivered','completed','shipped')
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(o.items) it
      WHERE (it->>'productId')::UUID = p_product_id
    )
  ORDER BY o.created_at DESC
  LIMIT 1;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'NO_PURCHASE');
  END IF;

  RETURN jsonb_build_object(
    'eligible', true,
    'orderId', v_order.id,
    'orderNumber', v_order.order_number,
    'size', v_order.size
  );
END;
$$;


ALTER FUNCTION "public"."can_user_review_product"("p_product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."consume_order_stock"("p_order_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_order RECORD;
  v_item JSONB;
  v_inv_id UUID;
  v_loc_id UUID;
  v_qty INTEGER;
  v_size TEXT;
  v_stock_level RECORD;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'stock_manager'::app_role)) THEN
    RETURN jsonb_build_object('error', 'FORBIDDEN');
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'ORDER_NOT_FOUND'); END IF;
  IF v_order.stock_consumed_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'already_consumed', true);
  END IF;

  SELECT id INTO v_loc_id FROM public.locations WHERE type = 'web' LIMIT 1;
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items) LOOP
    v_qty := COALESCE((v_item->>'quantity')::INTEGER, 0);
    v_size := v_item->>'size';
    SELECT id INTO v_inv_id FROM public.inventory WHERE product_id = (v_item->>'productId')::UUID LIMIT 1;
    IF v_inv_id IS NULL THEN CONTINUE; END IF;
    SELECT * INTO v_stock_level FROM public.stock_levels
      WHERE inventory_id = v_inv_id AND (location_id = v_loc_id OR v_loc_id IS NULL) AND (size IS NOT DISTINCT FROM v_size) LIMIT 1;
    IF v_stock_level.id IS NOT NULL THEN
      UPDATE public.stock_levels
        SET quantity = GREATEST(0, COALESCE(quantity,0) - v_qty),
            reserved = GREATEST(0, COALESCE(reserved,0) - v_qty),
            updated_at = now()
        WHERE id = v_stock_level.id;
      INSERT INTO public.stock_history (inventory_id, location_id, size, quantity_before, quantity_after, action, created_by, note)
      VALUES (v_inv_id, v_stock_level.location_id, v_size, COALESCE(v_stock_level.quantity,0), GREATEST(0, COALESCE(v_stock_level.quantity,0) - v_qty), 'shipment', auth.uid(), 'Order ' || v_order.order_number);
    END IF;
  END LOOP;
  UPDATE public.orders SET stock_consumed_at = now() WHERE id = p_order_id;
  RETURN jsonb_build_object('success', true);
END;
$$;


ALTER FUNCTION "public"."consume_order_stock"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."default_collab_limited_edition"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF lower(trim(coalesce(NEW.category, ''))) = 'collab' AND NEW.limited_edition IS NOT TRUE THEN
    NEW.limited_edition := true;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."default_collab_limited_edition"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_category_page"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  DELETE FROM public.pages WHERE category_id = OLD.id AND type = 'category';
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."delete_category_page"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_customer_profile"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_meta JSONB;
  v_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('error', 'NOT_AUTHENTICATED');
  END IF;

  SELECT email, COALESCE(raw_user_meta_data, '{}'::jsonb)
  INTO v_email, v_meta
  FROM auth.users WHERE id = v_uid;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object('error', 'USER_NOT_FOUND');
  END IF;

  SELECT id INTO v_id FROM public.customers WHERE user_id = v_uid;
  IF v_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', TRUE, 'customerId', v_id, 'created', FALSE);
  END IF;

  -- Link an existing imported/guest record with the same email, else create one
  UPDATE public.customers
  SET user_id = v_uid,
      first_name = COALESCE(NULLIF(first_name, ''), v_meta->>'first_name', ''),
      last_name = COALESCE(NULLIF(last_name, ''), v_meta->>'last_name', '')
  WHERE lower(email) = lower(v_email) AND user_id IS NULL
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    INSERT INTO public.customers (user_id, email, first_name, last_name, source)
    VALUES (v_uid, v_email, COALESCE(v_meta->>'first_name', ''), COALESCE(v_meta->>'last_name', ''), 'site')
    RETURNING id INTO v_id;
  END IF;

  RETURN jsonb_build_object('success', TRUE, 'customerId', v_id, 'created', TRUE);
END;
$$;


ALTER FUNCTION "public"."ensure_customer_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_user_by_email"("p_email" "text") RETURNS TABLE("user_id" "uuid", "email" "text", "roles" "public"."app_role"[])
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  RETURN QUERY
  SELECT
    au.id AS user_id,
    au.email::text AS email,
    COALESCE(ARRAY_AGG(ur.role) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::app_role[]) AS roles
  FROM auth.users au
  LEFT JOIN public.user_roles ur ON ur.user_id = au.id
  WHERE lower(au.email) = lower(trim(p_email))
  GROUP BY au.id, au.email
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."find_user_by_email"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_category_slug"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  base_slug TEXT;
  candidate_slug TEXT;
  counter INTEGER := 1;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    base_slug := lower(NEW.slug);
  ELSE
    base_slug := lower(NEW.title);
  END IF;

  base_slug := replace(base_slug, 'à', 'a');
  base_slug := replace(base_slug, 'â', 'a');
  base_slug := replace(base_slug, 'ä', 'a');
  base_slug := replace(base_slug, 'é', 'e');
  base_slug := replace(base_slug, 'è', 'e');
  base_slug := replace(base_slug, 'ê', 'e');
  base_slug := replace(base_slug, 'ë', 'e');
  base_slug := replace(base_slug, 'ï', 'i');
  base_slug := replace(base_slug, 'î', 'i');
  base_slug := replace(base_slug, 'ô', 'o');
  base_slug := replace(base_slug, 'ö', 'o');
  base_slug := replace(base_slug, 'ù', 'u');
  base_slug := replace(base_slug, 'û', 'u');
  base_slug := replace(base_slug, 'ü', 'u');
  base_slug := replace(base_slug, 'ÿ', 'y');
  base_slug := replace(base_slug, 'ç', 'c');
  base_slug := replace(base_slug, '&', '-');
  base_slug := regexp_replace(base_slug, '[^a-z0-9\s-]', '', 'g');
  base_slug := regexp_replace(base_slug, '[\s-]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);

  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'categorie';
  END IF;

  candidate_slug := base_slug;
  WHILE EXISTS (
    SELECT 1 FROM public.categories
    WHERE slug = candidate_slug
      AND id IS DISTINCT FROM NEW.id
  ) LOOP
    counter := counter + 1;
    candidate_slug := base_slug || '-' || counter;
  END LOOP;

  NEW.slug := candidate_slug;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_category_slug"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_newsletter_stats"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_total integer;
  v_recent integer;
  v_unsub integer;
  v_by_source jsonb;
  v_top_popup jsonb;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  SELECT count(*) INTO v_total FROM public.newsletters WHERE is_subscribed = true;
  SELECT count(*) INTO v_recent FROM public.newsletters WHERE subscribed_at > now() - interval '7 days';
  SELECT count(*) INTO v_unsub FROM public.newsletters WHERE is_subscribed = false;
  SELECT coalesce(jsonb_object_agg(coalesce(source,'unknown'), c), '{}'::jsonb)
    INTO v_by_source
    FROM (SELECT source, count(*) c FROM public.newsletters GROUP BY source) s;
  SELECT to_jsonb(t) INTO v_top_popup FROM (
    SELECT p.id, p.name,
      (SELECT count(*) FROM public.newsletter_popup_views v WHERE v.popup_id = p.id) views,
      (SELECT count(*) FROM public.newsletter_popup_views v WHERE v.popup_id = p.id AND v.converted) conversions
    FROM public.newsletter_popups p
    ORDER BY conversions DESC NULLS LAST
    LIMIT 1
  ) t;
  RETURN jsonb_build_object(
    'totalSubscribers', v_total,
    'last7Days', v_recent,
    'unsubscribed', v_unsub,
    'bySource', v_by_source,
    'topPopup', v_top_popup
  );
END;
$$;


ALTER FUNCTION "public"."get_newsletter_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_product_review_stats"("p_product_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count INTEGER;
  v_avg NUMERIC;
  v_dist jsonb;
BEGIN
  SELECT count(*), COALESCE(avg(rating),0)
  INTO v_count, v_avg
  FROM public.product_reviews
  WHERE product_id = p_product_id AND status = 'approved';

  SELECT jsonb_object_agg(r::TEXT, c) INTO v_dist FROM (
    SELECT r, COALESCE(SUM(CASE WHEN pr.rating = r THEN 1 ELSE 0 END),0)::INTEGER AS c
    FROM generate_series(1,5) r
    LEFT JOIN public.product_reviews pr
      ON pr.product_id = p_product_id AND pr.status = 'approved' AND pr.rating = r
    GROUP BY r
  ) s;

  RETURN jsonb_build_object(
    'count', v_count,
    'average', ROUND(v_avg::NUMERIC, 2),
    'distribution', COALESCE(v_dist, '{}'::jsonb)
  );
END;
$$;


ALTER FUNCTION "public"."get_product_review_stats"("p_product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_users_by_role"("p_role" "public"."app_role") RETURNS TABLE("user_id" "uuid", "email" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'stock_manager'::app_role)) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  RETURN QUERY
  SELECT ur.user_id, COALESCE(c.email, au.email)::TEXT
  FROM public.user_roles ur
  LEFT JOIN public.customers c ON c.user_id = ur.user_id
  LEFT JOIN auth.users au ON au.id = ur.user_id
  WHERE ur.role = p_role;
END;
$$;


ALTER FUNCTION "public"."list_users_by_role"("p_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_popup_converted"("p_popup_id" "uuid", "p_session_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF p_popup_id IS NULL OR p_session_id IS NULL OR length(p_session_id) < 8 THEN RETURN; END IF;
  UPDATE public.newsletter_popup_views
     SET converted = true, converted_at = now()
   WHERE popup_id = p_popup_id AND session_id = p_session_id AND converted IS NOT TRUE;
END;
$$;


ALTER FUNCTION "public"."mark_popup_converted"("p_popup_id" "uuid", "p_session_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."moderate_review"("p_review_id" "uuid", "p_action" "text", "p_reply" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)) THEN
    RETURN jsonb_build_object('error','FORBIDDEN');
  END IF;

  IF p_action = 'approve' THEN
    UPDATE public.product_reviews SET status = 'approved' WHERE id = p_review_id;
  ELSIF p_action = 'reject' THEN
    UPDATE public.product_reviews SET status = 'rejected' WHERE id = p_review_id;
  ELSIF p_action = 'reply' THEN
    UPDATE public.product_reviews
      SET admin_reply = NULLIF(trim(p_reply),''), admin_reply_at = now()
      WHERE id = p_review_id;
  ELSE
    RETURN jsonb_build_object('error','INVALID_ACTION');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;


ALTER FUNCTION "public"."moderate_review"("p_review_id" "uuid", "p_action" "text", "p_reply" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_order_statuses"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.status IS NOT NULL THEN
    NEW.status := initcap(lower(btrim(NEW.status)));
  END IF;
  IF NEW.payment_status IS NOT NULL THEN
    NEW.payment_status := initcap(lower(btrim(NEW.payment_status)));
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."normalize_order_statuses"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."preview_promo_code"("p_code" "text", "p_subtotal" numeric) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_promo RECORD;
  v_discount NUMERIC := 0;
BEGIN
  IF p_code IS NULL OR p_code = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Code promo invalide');
  END IF;
  SELECT * INTO v_promo FROM public.promo_codes
   WHERE code = UPPER(p_code)
     AND is_active = TRUE
     AND (expires_at IS NULL OR expires_at > NOW())
     AND (starts_at IS NULL OR starts_at <= NOW());
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Code promo invalide');
  END IF;
  IF v_promo.usage_limit IS NOT NULL AND COALESCE(v_promo.usage_count,0) >= v_promo.usage_limit THEN
    RETURN jsonb_build_object('success', false, 'message', 'Ce code promo a atteint sa limite d''utilisation');
  END IF;
  IF v_promo.min_purchase IS NOT NULL AND p_subtotal < v_promo.min_purchase THEN
    RETURN jsonb_build_object('success', false, 'message', 'Montant minimum requis: ' || v_promo.min_purchase || '€');
  END IF;
  IF v_promo.type = 'percentage' THEN
    v_discount := p_subtotal * (v_promo.value / 100.0);
    IF v_promo.max_discount IS NOT NULL THEN
      v_discount := LEAST(v_discount, v_promo.max_discount);
    END IF;
  ELSIF v_promo.type = 'fixed_amount' THEN
    v_discount := LEAST(v_promo.value, p_subtotal);
  ELSIF v_promo.type = 'free_shipping' THEN
    v_discount := 0;
  END IF;
  RETURN jsonb_build_object(
    'success', true,
    'discount', v_discount,
    'type', v_promo.type,
    'message', 'Code appliqué'
  );
END;
$$;


ALTER FUNCTION "public"."preview_promo_code"("p_code" "text", "p_subtotal" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_cgv_consent"("p_version" "text", "p_accepted" boolean, "p_session_hash" "text" DEFAULT NULL::"text", "p_user_agent" "text" DEFAULT NULL::"text", "p_url" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."record_cgv_consent"("p_version" "text", "p_accepted" boolean, "p_session_hash" "text", "p_user_agent" "text", "p_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."redeem_loyalty_reward"("p_reward_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_customer RECORD;
  v_reward RECORD;
  v_code TEXT;
  v_promo_id UUID;
  v_expires TIMESTAMPTZ;
  v_promo_type promo_type;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('error','NOT_AUTHENTICATED'); END IF;
  SELECT * INTO v_customer FROM public.customers WHERE user_id = v_uid;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','CUSTOMER_NOT_FOUND'); END IF;
  SELECT * INTO v_reward FROM public.loyalty_rewards WHERE id = p_reward_id AND is_active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','REWARD_NOT_FOUND'); END IF;
  IF COALESCE(v_customer.loyalty_points,0) < v_reward.points_required THEN
    RETURN jsonb_build_object('error','INSUFFICIENT_POINTS');
  END IF;

  v_promo_type := CASE v_reward.reward_type
    WHEN 'percentage' THEN 'percentage'::promo_type
    WHEN 'free_shipping' THEN 'free_shipping'::promo_type
    ELSE 'fixed_amount'::promo_type
  END;

  v_code := 'FID-' || UPPER(SUBSTR(REPLACE(gen_random_uuid()::text,'-',''),1,8));
  v_expires := now() + interval '90 days';

  INSERT INTO public.promo_codes (code, description, type, value, usage_limit, usage_count, is_active, starts_at, expires_at)
  VALUES (v_code, 'Récompense fidélité: ' || v_reward.name, v_promo_type, v_reward.value, 1, 0, true, now(), v_expires)
  RETURNING id INTO v_promo_id;

  UPDATE public.customers
    SET loyalty_points = loyalty_points - v_reward.points_required, updated_at = now()
    WHERE id = v_customer.id;

  INSERT INTO public.loyalty_transactions (customer_id, type, points, description)
  VALUES (v_customer.id, 'redeem', -v_reward.points_required,
    'Échange: ' || v_reward.name || ' (code ' || v_code || ')');

  RETURN jsonb_build_object('success', true, 'code', v_code, 'expiresAt', v_expires, 'rewardName', v_reward.name);
END;
$$;


ALTER FUNCTION "public"."redeem_loyalty_reward"("p_reward_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_order_stock"("p_order_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_order RECORD;
  v_item JSONB;
  v_inv_id UUID;
  v_loc_id UUID;
  v_qty INTEGER;
  v_size TEXT;
  v_stock_level RECORD;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'stock_manager'::app_role)) THEN
    RETURN jsonb_build_object('error', 'FORBIDDEN');
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND OR v_order.stock_reserved_at IS NULL THEN
    RETURN jsonb_build_object('success', true, 'noop', true);
  END IF;

  SELECT id INTO v_loc_id FROM public.locations WHERE type = 'web' LIMIT 1;
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items) LOOP
    v_qty := COALESCE((v_item->>'quantity')::INTEGER, 0);
    v_size := v_item->>'size';
    SELECT id INTO v_inv_id FROM public.inventory WHERE product_id = (v_item->>'productId')::UUID LIMIT 1;
    IF v_inv_id IS NULL THEN CONTINUE; END IF;
    SELECT * INTO v_stock_level FROM public.stock_levels
      WHERE inventory_id = v_inv_id AND (location_id = v_loc_id OR v_loc_id IS NULL) AND (size IS NOT DISTINCT FROM v_size) LIMIT 1;
    IF v_stock_level.id IS NOT NULL THEN
      UPDATE public.stock_levels SET reserved = GREATEST(0, COALESCE(reserved,0) - v_qty), updated_at = now() WHERE id = v_stock_level.id;
    END IF;
  END LOOP;
  UPDATE public.orders SET stock_reserved_at = NULL WHERE id = p_order_id;
  RETURN jsonb_build_object('success', true);
END;
$$;


ALTER FUNCTION "public"."release_order_stock"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reserve_order_stock"("p_order_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_order RECORD;
  v_item JSONB;
  v_inv_id UUID;
  v_loc_id UUID;
  v_qty INTEGER;
  v_size TEXT;
  v_stock_level RECORD;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'stock_manager'::app_role)) THEN
    RETURN jsonb_build_object('error', 'FORBIDDEN');
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'ORDER_NOT_FOUND'); END IF;
  IF v_order.stock_reserved_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'already_reserved', true);
  END IF;

  SELECT id INTO v_loc_id FROM public.locations WHERE type = 'web' LIMIT 1;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items) LOOP
    v_qty := COALESCE((v_item->>'quantity')::INTEGER, 0);
    v_size := v_item->>'size';
    SELECT id INTO v_inv_id FROM public.inventory WHERE product_id = (v_item->>'productId')::UUID LIMIT 1;
    IF v_inv_id IS NULL THEN CONTINUE; END IF;

    SELECT * INTO v_stock_level FROM public.stock_levels
      WHERE inventory_id = v_inv_id
        AND (location_id = v_loc_id OR v_loc_id IS NULL)
        AND (size IS NOT DISTINCT FROM v_size)
      LIMIT 1;

    IF v_stock_level.id IS NOT NULL THEN
      UPDATE public.stock_levels
        SET reserved = COALESCE(reserved, 0) + v_qty, updated_at = now()
        WHERE id = v_stock_level.id;
      INSERT INTO public.stock_history (inventory_id, location_id, size, quantity_before, quantity_after, action, created_by, note)
      VALUES (v_inv_id, v_stock_level.location_id, v_size, COALESCE(v_stock_level.reserved,0), COALESCE(v_stock_level.reserved,0) + v_qty, 'reservation', auth.uid(), 'Order ' || v_order.order_number);
    END IF;
  END LOOP;

  UPDATE public.orders SET stock_reserved_at = now() WHERE id = p_order_id;

  INSERT INTO public.order_preparations (order_id, status)
  VALUES (p_order_id, 'pending')
  ON CONFLICT (order_id) DO NOTHING;

  RETURN jsonb_build_object('success', true);
END;
$$;


ALTER FUNCTION "public"."reserve_order_stock"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sanitize_techwear_hero"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_default jsonb := jsonb_build_object(
    'enabled', false,
    'productId', null,
    'modelBadge', jsonb_build_object('line1', 'MODEL', 'line2', '0.1.2'),
    'ctaPrimary', jsonb_build_object('label', 'SHOP NOW', 'href', '/boutique'),
    'ctaSecondary', jsonb_build_object('label', 'EXPLORE', 'href', '/boutique'),
    'stats', jsonb_build_array(
      jsonb_build_object('label', 'PRICE', 'value', 75),
      jsonb_build_object('label', 'DURABILITY', 'value', 90),
      jsonb_build_object('label', 'FASHION', 'value', 85)
    ),
    'visibleSizes', jsonb_build_array('M', 'L'),
    'defaultSize', 'M',
    'colorOptions', jsonb_build_array(
      jsonb_build_object('name', 'Black', 'hex', '#000000', 'image', '/assets/home/model-black.png')
    ),
    'defaultColor', 0,
    'imageFit', 'cover',
    'imagePosition', 'center',
    'showStats', true,
    'showColors', true,
    'showSizes', true,
    'showModelBadge', true
  );
BEGIN
  IF NEW.techwear_hero IS NULL THEN
    NEW.techwear_hero := v_default;
    RETURN NEW;
  END IF;
  -- Replace each null sub-key with defaults
  IF NEW.techwear_hero->'colorOptions' IS NULL OR jsonb_typeof(NEW.techwear_hero->'colorOptions') <> 'array' THEN
    NEW.techwear_hero := jsonb_set(NEW.techwear_hero, '{colorOptions}', v_default->'colorOptions');
  END IF;
  IF NEW.techwear_hero->'stats' IS NULL OR jsonb_typeof(NEW.techwear_hero->'stats') <> 'array' THEN
    NEW.techwear_hero := jsonb_set(NEW.techwear_hero, '{stats}', v_default->'stats');
  END IF;
  IF NEW.techwear_hero->'visibleSizes' IS NULL OR jsonb_typeof(NEW.techwear_hero->'visibleSizes') <> 'array' THEN
    NEW.techwear_hero := jsonb_set(NEW.techwear_hero, '{visibleSizes}', v_default->'visibleSizes');
  END IF;
  IF NEW.techwear_hero->'modelBadge' IS NULL THEN
    NEW.techwear_hero := jsonb_set(NEW.techwear_hero, '{modelBadge}', v_default->'modelBadge');
  END IF;
  IF NEW.techwear_hero->'ctaPrimary' IS NULL THEN
    NEW.techwear_hero := jsonb_set(NEW.techwear_hero, '{ctaPrimary}', v_default->'ctaPrimary');
  END IF;
  IF NEW.techwear_hero->'ctaSecondary' IS NULL THEN
    NEW.techwear_hero := jsonb_set(NEW.techwear_hero, '{ctaSecondary}', v_default->'ctaSecondary');
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sanitize_techwear_hero"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."security_audit_snapshot"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."security_audit_snapshot"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."spin_roulette"("p_email" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_config RECORD;
  v_uid UUID := auth.uid();
  v_email TEXT := lower(trim(coalesce(p_email, '')));
  v_last_spin TIMESTAMPTZ;
  v_total_weight INTEGER;
  v_pick INTEGER;
  v_running INTEGER := 0;
  v_segment RECORD;
  v_today_count INTEGER;
  v_code TEXT;
  v_promo_id UUID;
  v_expires TIMESTAMPTZ;
  v_spin_id UUID;
BEGIN
  SELECT * INTO v_config FROM public.roulette_config WHERE config_key='main';
  IF NOT v_config.enabled THEN
    RETURN jsonb_build_object('error','DISABLED');
  END IF;

  IF v_uid IS NULL AND (v_email = '' OR v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') THEN
    RETURN jsonb_build_object('error','EMAIL_REQUIRED');
  END IF;

  -- Cooldown check
  SELECT max(created_at) INTO v_last_spin
  FROM public.roulette_spins
  WHERE (v_uid IS NOT NULL AND user_id = v_uid)
     OR (v_uid IS NULL AND email = v_email);

  IF v_last_spin IS NOT NULL AND v_last_spin > now() - (v_config.cooldown_hours || ' hours')::interval THEN
    RETURN jsonb_build_object(
      'error','COOLDOWN',
      'nextAvailableAt', v_last_spin + (v_config.cooldown_hours || ' hours')::interval
    );
  END IF;

  -- Weighted random pick (server-side)
  SELECT COALESCE(SUM(probability_weight),0) INTO v_total_weight
  FROM public.roulette_segments WHERE is_active = true;

  IF v_total_weight <= 0 THEN
    RETURN jsonb_build_object('error','NO_SEGMENTS');
  END IF;

  v_pick := 1 + floor(random() * v_total_weight)::int;

  FOR v_segment IN
    SELECT * FROM public.roulette_segments
    WHERE is_active = true
    ORDER BY sort_order, id
  LOOP
    v_running := v_running + v_segment.probability_weight;
    IF v_pick <= v_running THEN
      EXIT;
    END IF;
  END LOOP;

  -- Daily cap per segment
  IF v_segment.max_wins_per_day IS NOT NULL THEN
    SELECT count(*) INTO v_today_count
    FROM public.roulette_spins
    WHERE segment_id = v_segment.id
      AND created_at > now() - interval '1 day';
    IF v_today_count >= v_segment.max_wins_per_day THEN
      -- fallback: pick the "nothing" segment if any
      SELECT * INTO v_segment FROM public.roulette_segments
       WHERE is_active = true AND reward_type = 'nothing' LIMIT 1;
      IF v_segment.id IS NULL THEN
        RETURN jsonb_build_object('error','LIMIT_REACHED');
      END IF;
    END IF;
  END IF;

  -- Generate promo code (if reward != nothing)
  IF v_segment.reward_type <> 'nothing' THEN
    v_code := upper(v_segment.code_prefix) || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
    v_expires := now() + (v_config.reward_validity_days || ' days')::interval;

    INSERT INTO public.promo_codes (
      code, description, type, value, min_purchase, max_discount,
      usage_limit, usage_count, is_active, starts_at, expires_at
    ) VALUES (
      v_code,
      'Gain roulette: ' || v_segment.label,
      v_segment.reward_type::promo_type,
      v_segment.reward_value,
      v_segment.min_purchase,
      v_segment.max_discount,
      1, 0, true, now(), v_expires
    ) RETURNING id INTO v_promo_id;
  END IF;

  INSERT INTO public.roulette_spins (user_id, email, segment_id, promo_code_id, promo_code)
  VALUES (v_uid, NULLIF(v_email,''), v_segment.id, v_promo_id, v_code)
  RETURNING id INTO v_spin_id;

  RETURN jsonb_build_object(
    'success', true,
    'spinId', v_spin_id,
    'segmentId', v_segment.id,
    'label', v_segment.label,
    'description', v_segment.description,
    'rewardType', v_segment.reward_type,
    'rewardValue', v_segment.reward_value,
    'minPurchase', v_segment.min_purchase,
    'code', v_code,
    'expiresAt', v_expires,
    'nextAvailableAt', now() + (v_config.cooldown_hours || ' hours')::interval
  );
END;
$_$;


ALTER FUNCTION "public"."spin_roulette"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."spin_roulette"("p_email" "text" DEFAULT NULL::"text", "p_ip_hash" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_config RECORD;
  v_uid UUID := auth.uid();
  v_email TEXT := lower(trim(coalesce(p_email, '')));
  v_ip TEXT := nullif(trim(coalesce(p_ip_hash, '')), '');
  v_last_spin TIMESTAMPTZ;
  v_total_weight INTEGER;
  v_pick INTEGER;
  v_running INTEGER := 0;
  v_segment RECORD;
  v_today_count INTEGER;
  v_code TEXT;
  v_promo_id UUID;
  v_expires TIMESTAMPTZ;
  v_spin_id UUID;
  v_cooldown INTERVAL;
BEGIN
  SELECT * INTO v_config FROM public.roulette_config WHERE config_key='main';
  IF NOT v_config.enabled THEN
    RETURN jsonb_build_object('error','DISABLED');
  END IF;

  IF v_uid IS NULL AND (v_email = '' OR v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') THEN
    RETURN jsonb_build_object('error','EMAIL_REQUIRED');
  END IF;

  v_cooldown := (v_config.cooldown_hours || ' hours')::interval;

  -- Cooldown: per user_id, per email, AND per ip_hash
  SELECT max(created_at) INTO v_last_spin
  FROM public.roulette_spins
  WHERE created_at > now() - v_cooldown
    AND (
      (v_uid IS NOT NULL AND user_id = v_uid)
      OR (v_email <> '' AND email = v_email)
      OR (v_ip IS NOT NULL AND ip_hash = v_ip)
    );

  IF v_last_spin IS NOT NULL THEN
    RETURN jsonb_build_object(
      'error','COOLDOWN',
      'nextAvailableAt', v_last_spin + v_cooldown
    );
  END IF;

  SELECT COALESCE(SUM(probability_weight),0) INTO v_total_weight
  FROM public.roulette_segments WHERE is_active = true;

  IF v_total_weight <= 0 THEN
    RETURN jsonb_build_object('error','NO_SEGMENTS');
  END IF;

  v_pick := 1 + floor(random() * v_total_weight)::int;

  FOR v_segment IN
    SELECT * FROM public.roulette_segments
    WHERE is_active = true
    ORDER BY sort_order, id
  LOOP
    v_running := v_running + v_segment.probability_weight;
    IF v_pick <= v_running THEN
      EXIT;
    END IF;
  END LOOP;

  IF v_segment.max_wins_per_day IS NOT NULL THEN
    SELECT count(*) INTO v_today_count
    FROM public.roulette_spins
    WHERE segment_id = v_segment.id
      AND created_at > now() - interval '1 day';
    IF v_today_count >= v_segment.max_wins_per_day THEN
      SELECT * INTO v_segment FROM public.roulette_segments
       WHERE is_active = true AND reward_type = 'nothing' LIMIT 1;
      IF v_segment.id IS NULL THEN
        RETURN jsonb_build_object('error','LIMIT_REACHED');
      END IF;
    END IF;
  END IF;

  IF v_segment.reward_type <> 'nothing' THEN
    v_code := upper(v_segment.code_prefix) || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
    v_expires := now() + (v_config.reward_validity_days || ' days')::interval;

    INSERT INTO public.promo_codes (
      code, description, type, value, min_purchase, max_discount,
      usage_limit, usage_count, is_active, starts_at, expires_at
    ) VALUES (
      v_code,
      'Gain roulette: ' || v_segment.label,
      v_segment.reward_type::promo_type,
      v_segment.reward_value,
      v_segment.min_purchase,
      v_segment.max_discount,
      1, 0, true, now(), v_expires
    ) RETURNING id INTO v_promo_id;
  END IF;

  INSERT INTO public.roulette_spins (user_id, email, ip_hash, segment_id, promo_code_id, promo_code)
  VALUES (v_uid, NULLIF(v_email,''), v_ip, v_segment.id, v_promo_id, v_code)
  RETURNING id INTO v_spin_id;

  RETURN jsonb_build_object(
    'success', true,
    'spinId', v_spin_id,
    'segmentId', v_segment.id,
    'label', v_segment.label,
    'description', v_segment.description,
    'rewardType', v_segment.reward_type,
    'rewardValue', v_segment.reward_value,
    'minPurchase', v_segment.min_purchase,
    'code', v_code,
    'expiresAt', v_expires,
    'nextAvailableAt', now() + v_cooldown
  );
END;
$_$;


ALTER FUNCTION "public"."spin_roulette"("p_email" "text", "p_ip_hash" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_product_review"("p_product_id" "uuid", "p_rating" smallint, "p_title" "text", "p_comment" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_eligibility jsonb;
  v_auto_approve BOOLEAN := true;
  v_status TEXT;
  v_review_id UUID;
  v_size TEXT;
  v_order_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('error','NOT_AUTHENTICATED');
  END IF;
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RETURN jsonb_build_object('error','INVALID_RATING');
  END IF;
  IF p_comment IS NULL OR length(trim(p_comment)) < 10 THEN
    RETURN jsonb_build_object('error','COMMENT_TOO_SHORT');
  END IF;
  IF length(p_comment) > 2000 OR length(coalesce(p_title,'')) > 120 THEN
    RETURN jsonb_build_object('error','TOO_LONG');
  END IF;

  v_eligibility := public.can_user_review_product(p_product_id);
  IF NOT (v_eligibility->>'eligible')::BOOLEAN THEN
    RETURN jsonb_build_object('error', v_eligibility->>'reason');
  END IF;

  v_order_id := (v_eligibility->>'orderId')::UUID;
  v_size := v_eligibility->>'size';

  -- Read auto-approve toggle from design_settings.settings_json
  BEGIN
    SELECT COALESCE((settings_json->'reviews'->>'autoApprove')::BOOLEAN, true)
    INTO v_auto_approve
    FROM public.design_settings
    WHERE settings_key = 'main'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_auto_approve := true;
  END;

  v_status := CASE WHEN v_auto_approve THEN 'approved' ELSE 'pending' END;

  INSERT INTO public.product_reviews (
    product_id, user_id, order_id, rating, title, comment,
    status, is_verified_purchase, size_purchased
  ) VALUES (
    p_product_id, v_uid, v_order_id, p_rating,
    NULLIF(trim(p_title),''), trim(p_comment),
    v_status, true, v_size
  )
  RETURNING id INTO v_review_id;

  RETURN jsonb_build_object('success', true, 'reviewId', v_review_id, 'status', v_status);
END;
$$;


ALTER FUNCTION "public"."submit_product_review"("p_product_id" "uuid", "p_rating" smallint, "p_title" "text", "p_comment" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_category_page"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_page_id UUID;
  v_slug TEXT;
  v_counter INTEGER := 1;
BEGIN
  SELECT id INTO v_page_id FROM public.pages WHERE category_id = NEW.id;

  v_slug := NEW.slug;
  WHILE EXISTS (
    SELECT 1 FROM public.pages
    WHERE slug = v_slug AND (v_page_id IS NULL OR id <> v_page_id)
  ) LOOP
    v_counter := v_counter + 1;
    v_slug := NEW.slug || '-' || v_counter;
  END LOOP;

  IF v_page_id IS NULL THEN
    INSERT INTO public.pages (title, slug, type, category_id, is_published, sections, meta_title, meta_description, seo_keywords)
    VALUES (NEW.title, v_slug, 'category', NEW.id, true, '[]'::jsonb, NEW.meta_title, NEW.meta_description, NEW.seo_keywords);
  ELSE
    UPDATE public.pages
       SET title = NEW.title,
           slug = v_slug,
           type = 'category',
           meta_title = COALESCE(NEW.meta_title, meta_title),
           meta_description = COALESCE(NEW.meta_description, meta_description),
           seo_keywords = COALESCE(NEW.seo_keywords, seo_keywords),
           updated_at = now()
     WHERE id = v_page_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_category_page"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_crm_conversation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.crm_conversations
     SET last_message_at = NEW.created_at, updated_at = now()
   WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."touch_crm_conversation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_session_heartbeat"("p_session_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF p_session_id IS NULL OR length(p_session_id) < 8 THEN RETURN; END IF;
  UPDATE public.visitor_sessions
     SET last_seen_at = now()
   WHERE session_id = p_session_id;
END;
$$;


ALTER FUNCTION "public"."track_session_heartbeat"("p_session_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_award_loyalty_points"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.loyalty_awarded_at IS NULL
     AND NEW.user_id IS NOT NULL
     AND (LOWER(NEW.payment_status) = 'paid' OR LOWER(NEW.status) IN ('shipped','delivered','completed')) THEN
    PERFORM public.award_loyalty_points(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_award_loyalty_points"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."uppercase_product_subtitle"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.subtitle IS NOT NULL THEN
    NEW.subtitle := upper(btrim(NEW.subtitle));
    IF NEW.subtitle = '' THEN
      NEW.subtitle := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."uppercase_product_subtitle"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_and_create_order"("p_items" "jsonb", "p_promo_code" "text", "p_delivery_mode" "text", "p_order_data" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_item JSONB;
  v_product RECORD;
  v_subtotal NUMERIC := 0;
  v_promo_discount NUMERIC := 0;
  v_shipping_cost NUMERIC;
  v_order_total NUMERIC;
  v_tax NUMERIC;
  v_promo RECORD;
  v_free_shipping BOOLEAN := FALSE;
  v_order_items JSONB := '[]'::JSONB;
  v_order_id UUID;
  v_order_number TEXT;
  v_unit_price NUMERIC;
  v_qty INTEGER;
  v_cfg RECORD;
  v_threshold NUMERIC;
  v_home NUMERIC;
  v_relay NUMERIC;
  v_relay_only BOOLEAN;
BEGIN
  SELECT free_shipping_threshold, shipping_home_price, shipping_relay_price, free_shipping_relay_only
  INTO v_cfg
  FROM public.checkout_config WHERE config_key = 'main';

  v_threshold := COALESCE(v_cfg.free_shipping_threshold, 99);
  v_home := COALESCE(v_cfg.shipping_home_price, 15);
  v_relay := COALESCE(v_cfg.shipping_relay_price, 4.5);
  v_relay_only := COALESCE(v_cfg.free_shipping_relay_only, TRUE);

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT id, name, price, sale_price, image, is_active
    INTO v_product
    FROM public.products
    WHERE id = (v_item->>'productId')::UUID;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'PRODUCT_NOT_FOUND', 'productId', v_item->>'productId');
    END IF;

    IF NOT v_product.is_active THEN
      RETURN jsonb_build_object('error', 'PRODUCT_INACTIVE', 'productId', v_item->>'productId', 'productName', v_product.name);
    END IF;

    v_unit_price := COALESCE(v_product.sale_price, v_product.price);
    v_qty := (v_item->>'quantity')::INTEGER;

    IF v_qty <= 0 OR v_qty > 100 THEN
      RETURN jsonb_build_object('error', 'INVALID_QUANTITY', 'productId', v_item->>'productId');
    END IF;

    v_subtotal := v_subtotal + (v_unit_price * v_qty);

    v_order_items := v_order_items || jsonb_build_array(
      jsonb_build_object(
        'productId', v_product.id,
        'name', v_product.name,
        'price', v_unit_price,
        'quantity', v_qty,
        'size', v_item->>'size',
        'color', v_item->>'color',
        'image', v_product.image
      )
    );
  END LOOP;

  IF jsonb_array_length(v_order_items) = 0 THEN
    RETURN jsonb_build_object('error', 'EMPTY_ORDER');
  END IF;

  IF p_promo_code IS NOT NULL AND p_promo_code <> '' THEN
    SELECT * INTO v_promo
    FROM public.promo_codes
    WHERE code = UPPER(p_promo_code)
      AND is_active = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (starts_at IS NULL OR starts_at <= NOW())
      AND (usage_limit IS NULL OR usage_count < usage_limit)
      AND (min_purchase IS NULL OR v_subtotal >= min_purchase);

    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'INVALID_PROMO_CODE');
    END IF;

    IF v_promo.type = 'percentage' THEN
      v_promo_discount := v_subtotal * (v_promo.value / 100.0);
      IF v_promo.max_discount IS NOT NULL THEN
        v_promo_discount := LEAST(v_promo_discount, v_promo.max_discount);
      END IF;
    ELSIF v_promo.type = 'fixed_amount' THEN
      v_promo_discount := LEAST(v_promo.value, v_subtotal);
    ELSIF v_promo.type = 'free_shipping' THEN
      v_promo_discount := 0;
      v_free_shipping := TRUE;
    END IF;

    UPDATE public.promo_codes SET usage_count = COALESCE(usage_count, 0) + 1 WHERE id = v_promo.id;
  END IF;

  IF p_delivery_mode = 'home' THEN
    v_shipping_cost := CASE
      WHEN NOT v_relay_only AND v_subtotal >= v_threshold THEN 0
      ELSE v_home
    END;
  ELSE
    v_shipping_cost := CASE
      WHEN v_subtotal >= v_threshold THEN 0
      ELSE v_relay
    END;
  END IF;

  IF v_free_shipping THEN
    v_shipping_cost := 0;
  END IF;

  v_order_total := GREATEST(0, (v_subtotal - v_promo_discount) + v_shipping_cost);
  v_tax := v_order_total * 0.2 / 1.2;

  v_order_number := p_order_data->>'order_number';

  INSERT INTO public.orders (
    order_number, user_id, customer_email, customer_name, customer_phone,
    customer_address, customer_city, customer_zip, customer_country, items,
    subtotal, shipping_cost, tax, total, payment_method, payment_status, status, shipping_carrier
  ) VALUES (
    v_order_number,
    CASE WHEN (p_order_data->>'user_id') IS NOT NULL AND (p_order_data->>'user_id') <> '' THEN (p_order_data->>'user_id')::UUID ELSE NULL END,
    p_order_data->>'customer_email',
    p_order_data->>'customer_name',
    p_order_data->>'customer_phone',
    p_order_data->>'customer_address',
    p_order_data->>'customer_city',
    p_order_data->>'customer_zip',
    COALESCE(p_order_data->>'customer_country', 'France'),
    v_order_items,
    v_subtotal - v_promo_discount,
    v_shipping_cost,
    v_tax,
    v_order_total,
    'manual',
    'pending',
    'pending',
    'colissimo'
  )
  RETURNING id INTO v_order_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'orderId', v_order_id,
    'orderNumber', v_order_number,
    'subtotal', v_subtotal - v_promo_discount,
    'shippingCost', v_shipping_cost,
    'tax', v_tax,
    'total', v_order_total,
    'items', v_order_items
  );
END;
$$;


ALTER FUNCTION "public"."validate_and_create_order"("p_items" "jsonb", "p_promo_code" "text", "p_delivery_mode" "text", "p_order_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vote_review_helpful"("p_review_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('error','NOT_AUTHENTICATED'); END IF;
  BEGIN
    INSERT INTO public.product_review_votes (review_id, user_id) VALUES (p_review_id, v_uid);
    UPDATE public.product_reviews SET helpful_count = helpful_count + 1 WHERE id = p_review_id;
    RETURN jsonb_build_object('success', true, 'voted', true);
  EXCEPTION WHEN unique_violation THEN
    DELETE FROM public.product_review_votes WHERE review_id = p_review_id AND user_id = v_uid;
    UPDATE public.product_reviews SET helpful_count = GREATEST(0, helpful_count - 1) WHERE id = p_review_id;
    RETURN jsonb_build_object('success', true, 'voted', false);
  END;
END;
$$;


ALTER FUNCTION "public"."vote_review_helpful"("p_review_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "label" "text" DEFAULT 'Domicile'::"text",
    "first_name" "text",
    "last_name" "text",
    "address" "text" NOT NULL,
    "address_line2" "text",
    "city" "text" NOT NULL,
    "zip" "text" NOT NULL,
    "country" "text" DEFAULT 'France'::"text",
    "phone" "text",
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_access_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email" "text",
    "route" "text",
    "user_agent" "text",
    "ip_hash" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_access_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "config_key" "text" DEFAULT 'main'::"text" NOT NULL,
    "admin_notification_email" "text",
    "colissimo_sender_name" "text" DEFAULT ''::"text",
    "colissimo_sender_address" "text" DEFAULT ''::"text",
    "colissimo_sender_zip" "text" DEFAULT ''::"text",
    "colissimo_sender_city" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auth_email_templates" (
    "key" "text" NOT NULL,
    "draft" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "published" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "published_at" timestamp with time zone
);


ALTER TABLE "public"."auth_email_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."banner_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "banner_id" "text" NOT NULL,
    "banner_type" "text" NOT NULL,
    "event" "text" NOT NULL,
    "session_hash" "text",
    "url" "text",
    "user_id" "uuid",
    "meta" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "banner_analytics_event_check" CHECK (("event" = ANY (ARRAY['view'::"text", 'click'::"text", 'dismiss'::"text", 'convert'::"text"])))
);


ALTER TABLE "public"."banner_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."banners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "public"."banner_type" DEFAULT 'hero'::"public"."banner_type" NOT NULL,
    "title" "text",
    "subtitle" "text",
    "description" "text",
    "image" "text",
    "link" "text",
    "button_text" "text",
    "position" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "display_delay" integer DEFAULT 2000
);


ALTER TABLE "public"."banners" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bot_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "system_prompt" "text" DEFAULT 'Tu es Helvetica, l''expert mode de LVTK6.'::"text" NOT NULL,
    "suggestions" "jsonb" DEFAULT '[]'::"jsonb",
    "bot_name" "text" DEFAULT 'Helvetica'::"text",
    "bot_avatar" "text",
    "welcome_message" "text" DEFAULT 'Bonjour ! Je suis Helvetica, votre expert mode LVTK6. Comment puis-je vous aider ?'::"text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "chat_model" "text" DEFAULT 'google/gemini-2.5-flash'::"text" NOT NULL,
    "voice_model" "text" DEFAULT 'google/gemini-2.5-flash'::"text" NOT NULL,
    "ai_default_model" "text" DEFAULT 'google/gemini-2.5-flash'::"text" NOT NULL,
    "ai_vision_model" "text" DEFAULT 'google/gemini-2.5-pro'::"text" NOT NULL
);


ALTER TABLE "public"."bot_config" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."bot_config_public" WITH ("security_invoker"='true') AS
 SELECT "id",
    "bot_name",
    "bot_avatar",
    "welcome_message",
    "suggestions",
    "is_active"
   FROM "public"."bot_config"
  WHERE ("is_active" = true);


ALTER VIEW "public"."bot_config_public" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."boutiques" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "address" "text" NOT NULL,
    "city" "text" NOT NULL,
    "postal_code" "text",
    "country" "text" DEFAULT 'France'::"text" NOT NULL,
    "latitude" double precision NOT NULL,
    "longitude" double precision NOT NULL,
    "image" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."boutiques" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cart_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "size" "text",
    "color" "text",
    "quantity" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cart_items_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "cart_items_quantity_positive" CHECK ((("quantity" > 0) AND ("quantity" <= 999)))
);


ALTER TABLE "public"."cart_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "image" "text",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "display_size" "text" DEFAULT 'medium'::"text",
    "cover_mode" "text" DEFAULT 'cover'::"text",
    "parent_id" "uuid",
    "slug" "text",
    "meta_title" "text",
    "meta_description" "text",
    "seo_keywords" "text",
    "template_id" "uuid",
    "icon" "text",
    "icon_image" "text",
    "visibility" "text" DEFAULT 'all'::"text" NOT NULL,
    "include_children" boolean DEFAULT true NOT NULL,
    "cover_position" "text" DEFAULT '50% 50%'::"text" NOT NULL,
    "cover_zoom" numeric DEFAULT 1 NOT NULL,
    "cover_bg" "text",
    CONSTRAINT "categories_visibility_check" CHECK (("visibility" = ANY (ARRAY['all'::"text", 'menu'::"text", 'site'::"text"])))
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."category_hero_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid" NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."category_hero_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cgv_consents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "session_hash" "text",
    "ip_hash" "text",
    "version" "text" NOT NULL,
    "accepted" boolean NOT NULL,
    "user_agent" "text",
    "url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cgv_consents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "text",
    "user_message" "text",
    "bot_response" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."chat_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checkout_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "config_key" "text" DEFAULT 'main'::"text" NOT NULL,
    "shipping_home_price" numeric DEFAULT 6.50 NOT NULL,
    "shipping_relay_price" numeric DEFAULT 4.50 NOT NULL,
    "free_shipping_threshold" numeric DEFAULT 200 NOT NULL,
    "home_delivery_enabled" boolean DEFAULT true NOT NULL,
    "relay_enabled" boolean DEFAULT true NOT NULL,
    "payment_methods" "jsonb" DEFAULT '[{"key": "bank_transfer", "label": "Virement bancaire", "enabled": true}, {"key": "check", "label": "Chèque", "enabled": false}]'::"jsonb" NOT NULL,
    "checkout_message" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "relay_map_settings" "jsonb" DEFAULT '{"tileStyle": "standard", "defaultZoom": 13, "markerColor": "#3B82F6", "searchRadius": 10, "selectedMarkerColor": "#EF4444"}'::"jsonb" NOT NULL,
    "free_shipping_relay_only" boolean DEFAULT true NOT NULL,
    "auto_colissimo_label" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."checkout_config" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."checkout_config_public" AS
 SELECT "id",
    "config_key",
    "shipping_home_price",
    "shipping_relay_price",
    "free_shipping_threshold",
    "home_delivery_enabled",
    "relay_enabled",
    "checkout_message",
    "relay_map_settings",
    COALESCE(( SELECT "jsonb_agg"("jsonb_build_object"('key', ("pm"."value" ->> 'key'::"text"), 'label', ("pm"."value" ->> 'label'::"text"), 'enabled', COALESCE((("pm"."value" ->> 'enabled'::"text"))::boolean, false), 'description', ("pm"."value" ->> 'description'::"text"), 'icon', ("pm"."value" ->> 'icon'::"text"))) AS "jsonb_agg"
           FROM "jsonb_array_elements"(COALESCE("cc"."payment_methods", '[]'::"jsonb")) "pm"("value")
          WHERE (COALESCE((("pm"."value" ->> 'enabled'::"text"))::boolean, false) = true)), '[]'::"jsonb") AS "payment_methods"
   FROM "public"."checkout_config" "cc";


ALTER VIEW "public"."checkout_config_public" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."click_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "text" NOT NULL,
    "path" "text" NOT NULL,
    "element_label" "text",
    "element_selector" "text",
    "x" integer,
    "y" integer,
    "clicked_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."click_events" REPLICA IDENTITY FULL;


ALTER TABLE "public"."click_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_error_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source" "text" NOT NULL,
    "label" "text",
    "message" "text",
    "stack" "text",
    "component_stack" "text",
    "url" "text",
    "user_agent" "text",
    "viewport" "text",
    "pixel_ratio" numeric,
    "console_tail" "jsonb",
    "extra" "jsonb"
);


ALTER TABLE "public"."client_error_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."colissimo_bordereaux" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "bordereau_date" "date" NOT NULL,
    "package_count" integer DEFAULT 0 NOT NULL,
    "tracking_numbers" "jsonb" DEFAULT '[]'::"jsonb",
    "pdf_base64" "text"
);


ALTER TABLE "public"."colissimo_bordereaux" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "name" "text",
    "phone" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source" "text" DEFAULT 'manual'::"text" NOT NULL
);


ALTER TABLE "public"."crm_contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contact_id" "uuid" NOT NULL,
    "subject" "text" DEFAULT ''::"text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "order_id" "uuid",
    "last_message_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."crm_conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_message_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" DEFAULT 'general'::"text" NOT NULL,
    "subject" "text",
    "body" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."crm_message_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_email" "text" NOT NULL,
    "recipient_email" "text" NOT NULL,
    "content" "text" NOT NULL,
    "direction" "text" DEFAULT 'outbound'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."crm_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_email_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_email" "text" NOT NULL,
    "order_id" "uuid",
    "email_type" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "status" "text" DEFAULT 'sent'::"text" NOT NULL,
    "provider_id" "text",
    "error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."customer_email_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "first_name" "text",
    "last_name" "text",
    "email" "text" NOT NULL,
    "phone" "text",
    "loyalty_points" integer DEFAULT 0,
    "loyalty_tier" "public"."loyalty_tier" DEFAULT 'bronze'::"public"."loyalty_tier",
    "total_spent" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "address" "text",
    "city" "text",
    "zip" "text",
    "country" "text",
    "wc_id" bigint,
    "source" "text" DEFAULT 'site'::"text" NOT NULL,
    "orders_count" integer DEFAULT 0 NOT NULL,
    "wc_created_at" timestamp with time zone
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."design_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "settings_key" "text" DEFAULT 'main'::"text" NOT NULL,
    "sidebar_bg" "text" DEFAULT '#0A0A0A'::"text",
    "accent_color" "text" DEFAULT '#00FF88'::"text",
    "sidebar_gradient" boolean DEFAULT true,
    "gradient_intensity" integer DEFAULT 30,
    "show_logo" boolean DEFAULT true,
    "show_stats" boolean DEFAULT true,
    "show_unit_id" boolean DEFAULT true,
    "show_overlays" boolean DEFAULT true,
    "hud_logo" "text" DEFAULT '/lovable-uploads/logo.png'::"text",
    "unit_id_label" "text" DEFAULT 'SYSTEM ID'::"text",
    "custom_unit_id" "text" DEFAULT 'UNITÉ_ALPHA_01'::"text",
    "stats_label" "text" DEFAULT 'DATA FLUX //'::"text",
    "stats_sub_label" "text" DEFAULT 'SYSTÈME ACTIF'::"text",
    "background_watermark" "text" DEFAULT ''::"text",
    "stats" "jsonb" DEFAULT '[{"label": "WATERPROOFING", "value": 98}, {"label": "THERMAL", "value": 85}, {"label": "ARMOR", "value": 92}]'::"jsonb",
    "hud_buttons" "jsonb" DEFAULT '[]'::"jsonb",
    "glitch_duration" integer DEFAULT 300,
    "glitch_intensity" integer DEFAULT 5,
    "click_scale" numeric(3,2) DEFAULT 0.97,
    "logo_style" "jsonb" DEFAULT '{}'::"jsonb",
    "stats_style" "jsonb" DEFAULT '{}'::"jsonb",
    "unit_id_style" "jsonb" DEFAULT '{}'::"jsonb",
    "social_style" "jsonb" DEFAULT '{}'::"jsonb",
    "background_media" "jsonb" DEFAULT '[]'::"jsonb",
    "is_slideshow_active" boolean DEFAULT false,
    "slideshow_speed" integer DEFAULT 5000,
    "hero_slides" "jsonb" DEFAULT '[]'::"jsonb",
    "slider_auto_play" boolean DEFAULT true,
    "slider_speed" integer DEFAULT 5000,
    "show_slider_overlay" boolean DEFAULT true,
    "slider_grayscale" boolean DEFAULT false,
    "social_links" "jsonb" DEFAULT '[]'::"jsonb",
    "social_display_mode" "text" DEFAULT 'icons'::"text",
    "home_sections" "jsonb" DEFAULT '[]'::"jsonb",
    "presets" "jsonb" DEFAULT '[]'::"jsonb",
    "schedules" "jsonb" DEFAULT '[]'::"jsonb",
    "pages" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sidebar_image" "text",
    "category_columns" integer DEFAULT 4,
    "header_preset" "text" DEFAULT 'classic'::"text",
    "header_bg_color" "text" DEFAULT ''::"text",
    "header_text_color" "text" DEFAULT ''::"text",
    "header_fixed" boolean DEFAULT true,
    "top_banner" "jsonb" DEFAULT '{"text": "", "bgColor": "#000000", "enabled": false, "textColor": "#ffffff"}'::"jsonb",
    "footer_logo" "text" DEFAULT ''::"text",
    "favicon_url" "text" DEFAULT ''::"text",
    "header_nav_items" "jsonb" DEFAULT '[]'::"jsonb",
    "site_name" "text" DEFAULT 'Mon Site'::"text",
    "site_tagline" "text" DEFAULT ''::"text",
    "contact_email" "text" DEFAULT ''::"text",
    "contact_phone" "text" DEFAULT ''::"text",
    "sidebar_reappear_delay" integer DEFAULT 10000,
    "slider_height" "text" DEFAULT '100vh'::"text",
    "site_spacing" "text" DEFAULT 'compact'::"text",
    "category_layout" "jsonb" DEFAULT '{"gap": "md", "preset": "portrait", "columns": 4, "aspectRatio": "3/4"}'::"jsonb",
    "show_sidebar_product_card" boolean DEFAULT true,
    "show_sidebar_sizes" boolean DEFAULT true,
    "show_sidebar_stats" boolean DEFAULT true,
    "show_sidebar_gallery" boolean DEFAULT true,
    "show_sidebar_product_number" boolean DEFAULT true,
    "sidebar_slider_enabled" boolean DEFAULT true,
    "sidebar_slider_speed" integer DEFAULT 6000,
    "sidebar_slider_max_products" integer DEFAULT 5,
    "sidebar_brand_name" "text" DEFAULT ''::"text",
    "sidebar_brand_subtitle" "text" DEFAULT ''::"text",
    "sidebar_info_text" "text" DEFAULT ''::"text",
    "sidebar_product_title" "text" DEFAULT ''::"text",
    "sidebar_product_description" "text" DEFAULT ''::"text",
    "sidebar_sizes" "jsonb" DEFAULT '["XS", "S", "M", "L", "XL", "XXL", "XXXL"]'::"jsonb",
    "sidebar_image_opacity" numeric DEFAULT 1,
    "mobile_sidebar_image" "text",
    "mobile_sidebar_media_type" "text" DEFAULT 'image'::"text",
    "stat_bar_filled_color" "text" DEFAULT '#ffffff'::"text",
    "stat_bar_empty_color" "text" DEFAULT '#333333'::"text",
    "admin_notification_email" "text",
    "colissimo_sender_name" "text" DEFAULT ''::"text",
    "colissimo_sender_address" "text" DEFAULT ''::"text",
    "colissimo_sender_zip" "text" DEFAULT ''::"text",
    "colissimo_sender_city" "text" DEFAULT ''::"text",
    "mannequin_hotspots" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "sidebar_brand_position" "text" DEFAULT 'top'::"text",
    "legal_company_name" "text" DEFAULT ''::"text",
    "legal_company_form" "text" DEFAULT ''::"text",
    "legal_capital" "text" DEFAULT ''::"text",
    "legal_address" "text" DEFAULT ''::"text",
    "legal_zip" "text" DEFAULT ''::"text",
    "legal_city" "text" DEFAULT ''::"text",
    "legal_siret" "text" DEFAULT ''::"text",
    "legal_rcs" "text" DEFAULT ''::"text",
    "legal_vat" "text" DEFAULT ''::"text",
    "legal_director" "text" DEFAULT ''::"text",
    "legal_rgpd_email" "text" DEFAULT ''::"text",
    "legal_return_email" "text" DEFAULT ''::"text",
    "admin_section_colors" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "techwear_hero" "jsonb" DEFAULT "jsonb_build_object"('enabled', false, 'productId', NULL::"unknown", 'modelBadge', "jsonb_build_object"('line1', 'MODEL', 'line2', '0.1.2'), 'ctaPrimary', "jsonb_build_object"('label', 'SHOP NOW', 'href', '/boutique'), 'ctaSecondary', "jsonb_build_object"('label', 'EXPLORE', 'href', '/boutique'), 'stats', "jsonb_build_array"("jsonb_build_object"('label', 'PRICE', 'value', 75), "jsonb_build_object"('label', 'DURABILITY', 'value', 90), "jsonb_build_object"('label', 'FASHION', 'value', 85)), 'visibleSizes', "jsonb_build_array"('M', 'L'), 'defaultSize', 'M', 'colorOptions', "jsonb_build_array"("jsonb_build_object"('name', 'Black', 'hex', '#000000', 'image', '/assets/home/model-black.png'), "jsonb_build_object"('name', 'White', 'hex', '#ffffff', 'image', '/assets/home/model-white.png'), "jsonb_build_object"('name', 'Gray', 'hex', '#888888', 'image', '/assets/home/model-gray.png')), 'defaultColor', 0, 'imageFit', 'cover', 'imagePosition', 'center', 'showStats', true, 'showColors', true, 'showSizes', true, 'showModelBadge', true) NOT NULL,
    "logo_size" integer DEFAULT 40,
    "logo_background_shape" "text" DEFAULT 'none'::"text",
    "logo_background_color" "text" DEFAULT ''::"text",
    "logo_background_padding" integer DEFAULT 8,
    "show_sidebar_newsletter" boolean DEFAULT true,
    "sidebar_newsletter_title" "text" DEFAULT 'Newsletter'::"text",
    "sidebar_newsletter_cta" "text" DEFAULT 'Je m''inscris'::"text",
    "voice_command_enabled" boolean DEFAULT true,
    "voice_onboarding_hint" boolean DEFAULT true NOT NULL,
    "global_product_sizes" "jsonb" DEFAULT '["XS", "S", "M", "L", "XL", "XXL", "XXXL"]'::"jsonb" NOT NULL,
    "home_custom_sections" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "home_page_blocks" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "settings_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "color_display_mode" "text" DEFAULT 'swatches'::"text" NOT NULL,
    "home_texts" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "security_overlay" "jsonb" DEFAULT "jsonb_build_object"('enabled', true, 'text_mode', 'brand', 'custom_text', 'PROTECTED', 'opacity', 0.05, 'angle', '-30'::integer, 'density', 60, 'font_size', 10, 'color', 'auto', 'show_timestamp', true, 'disable_for_admin', true, 'printscreen_blur_enabled', true, 'printscreen_blur_ms', 800) NOT NULL,
    "product_grid_layout" "text" DEFAULT 'minimal'::"text" NOT NULL,
    "seo_indexable" boolean DEFAULT true NOT NULL,
    "seo_noimageindex" boolean DEFAULT false NOT NULL,
    "seo_default_title" "text" DEFAULT ''::"text",
    "seo_default_description" "text" DEFAULT ''::"text",
    "seo_og_image" "text" DEFAULT ''::"text",
    "maintenance_enabled" boolean DEFAULT false NOT NULL,
    "maintenance_title" "text" DEFAULT ''::"text",
    "maintenance_message" "text" DEFAULT ''::"text",
    "maintenance_until" timestamp with time zone,
    "maintenance_image" "text" DEFAULT ''::"text",
    "maintenance_bg" "text" DEFAULT ''::"text",
    "maintenance_admin_bypass" boolean DEFAULT true NOT NULL,
    "collab_settings" "jsonb" DEFAULT "jsonb_build_object"('sizes', '[]'::"jsonb", 'colors', '[]'::"jsonb", 'page', "jsonb_build_object"('title', 'COLLAB', 'subtitle', 'HELVETICA MOUNTAIN PIONEERS X PEGASHOES', 'intro', '', 'heroImage', '', 'ctaLabel', '', 'ctaHref', '', 'metaTitle', '', 'metaDescription', ''), 'animation', "jsonb_build_object"('hoverEffect', 'fade', 'hoverDuration', 500, 'hoverEnabled', true), 'layout', "jsonb_build_object"('columnsMobile', 2, 'columnsTablet', 2, 'columnsDesktop', 3, 'swatchStyle', 'round', 'showSizes', true, 'badgePosition', 'bottom-right')) NOT NULL,
    "shop_hover_effect" "jsonb" DEFAULT "jsonb_build_object"('enabled', true, 'effect', 'fade', 'duration', 500) NOT NULL,
    "footer_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "legal_pages" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."design_settings" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."design_settings_public" AS
 SELECT "id",
    "settings_key",
    "sidebar_bg",
    "accent_color",
    "sidebar_gradient",
    "gradient_intensity",
    "show_logo",
    "show_stats",
    "show_unit_id",
    "show_overlays",
    "hud_logo",
    "unit_id_label",
    "custom_unit_id",
    "stats_label",
    "stats_sub_label",
    "background_watermark",
    "stats",
    "hud_buttons",
    "glitch_duration",
    "glitch_intensity",
    "click_scale",
    "logo_style",
    "stats_style",
    "unit_id_style",
    "social_style",
    "background_media",
    "is_slideshow_active",
    "slideshow_speed",
    "hero_slides",
    "slider_auto_play",
    "slider_speed",
    "show_slider_overlay",
    "slider_grayscale",
    "social_links",
    "social_display_mode",
    "home_sections",
    "presets",
    "schedules",
    "pages",
    "created_at",
    "updated_at",
    "sidebar_image",
    "category_columns",
    "header_preset",
    "header_bg_color",
    "header_text_color",
    "header_fixed",
    "top_banner",
    "footer_logo",
    "favicon_url",
    "header_nav_items",
    "site_name",
    "site_tagline",
    "sidebar_reappear_delay",
    "slider_height",
    "site_spacing",
    "category_layout",
    "show_sidebar_product_card",
    "show_sidebar_sizes",
    "show_sidebar_stats",
    "show_sidebar_gallery",
    "show_sidebar_product_number",
    "sidebar_slider_enabled",
    "sidebar_slider_speed",
    "sidebar_slider_max_products",
    "sidebar_brand_name",
    "sidebar_brand_subtitle",
    "sidebar_info_text",
    "sidebar_product_title",
    "sidebar_product_description",
    "sidebar_sizes",
    "sidebar_image_opacity",
    "mobile_sidebar_image",
    "mobile_sidebar_media_type",
    "stat_bar_filled_color",
    "stat_bar_empty_color",
    "mannequin_hotspots",
    "sidebar_brand_position",
    "legal_company_name",
    "legal_company_form",
    "legal_capital",
    "legal_address",
    "legal_zip",
    "legal_city",
    "admin_section_colors",
    "techwear_hero",
    "logo_size",
    "logo_background_shape",
    "logo_background_color",
    "logo_background_padding",
    "show_sidebar_newsletter",
    "sidebar_newsletter_title",
    "sidebar_newsletter_cta",
    "voice_command_enabled",
    "voice_onboarding_hint",
    "global_product_sizes",
    "home_custom_sections",
    "home_page_blocks",
    "color_display_mode",
    "home_texts",
    "seo_indexable",
    "seo_noimageindex",
    "seo_default_title",
    "seo_default_description",
    "seo_og_image",
    "maintenance_enabled",
    "maintenance_title",
    "maintenance_message",
    "maintenance_until",
    "maintenance_image",
    "maintenance_bg",
    "maintenance_admin_bypass",
    "legal_siret",
    "legal_rcs",
    "legal_vat",
    "legal_director",
    "legal_rgpd_email",
    "legal_return_email",
    "contact_email",
    "contact_phone",
    "collab_settings",
    "shop_hover_effect",
    "footer_config",
    "legal_pages"
   FROM "public"."design_settings";


ALTER VIEW "public"."design_settings_public" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_send_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "text",
    "template_name" "text" NOT NULL,
    "recipient_email" "text" NOT NULL,
    "status" "text" NOT NULL,
    "error_message" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "email_send_log_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'suppressed'::"text", 'failed'::"text", 'bounced'::"text", 'complained'::"text", 'dlq'::"text"])))
);


ALTER TABLE "public"."email_send_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_send_state" (
    "id" integer DEFAULT 1 NOT NULL,
    "retry_after_until" timestamp with time zone,
    "batch_size" integer DEFAULT 10 NOT NULL,
    "send_delay_ms" integer DEFAULT 200 NOT NULL,
    "auth_email_ttl_minutes" integer DEFAULT 15 NOT NULL,
    "transactional_email_ttl_minutes" integer DEFAULT 60 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "email_send_state_id_check" CHECK (("id" = 1))
);


ALTER TABLE "public"."email_send_state" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "subject" "text" DEFAULT ''::"text" NOT NULL,
    "html_body" "text" DEFAULT ''::"text" NOT NULL,
    "text_body" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."email_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_unsubscribe_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token" "text" NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "used_at" timestamp with time zone
);


ALTER TABLE "public"."email_unsubscribe_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."faq_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question" "text" NOT NULL,
    "answer" "text" NOT NULL,
    "category" "text" DEFAULT 'general'::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."faq_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."home_fab_buttons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "label" "text" NOT NULL,
    "icon" "text" DEFAULT 'Sparkles'::"text" NOT NULL,
    "action_type" "text" DEFAULT 'route'::"text" NOT NULL,
    "action_value" "text" DEFAULT '/'::"text" NOT NULL,
    "variant" "text" DEFAULT 'glossy'::"text" NOT NULL,
    "position_desktop" "jsonb" DEFAULT '{"x": 24, "y": 24, "corner": "br"}'::"jsonb" NOT NULL,
    "position_mobile" "jsonb" DEFAULT '{"x": 16, "y": 16, "corner": "br"}'::"jsonb" NOT NULL,
    "visible_desktop" boolean DEFAULT true NOT NULL,
    "visible_mobile" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "badge" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "home_fab_action_type_chk" CHECK (("action_type" = ANY (ARRAY['route'::"text", 'external'::"text", 'roulette'::"text", 'voice'::"text", 'chat'::"text", 'newsletter'::"text"]))),
    CONSTRAINT "home_fab_variant_chk" CHECK (("variant" = ANY (ARRAY['glossy'::"text", 'glass'::"text", 'neon'::"text", 'metal'::"text", 'outline'::"text", 'minimal'::"text"])))
);


ALTER TABLE "public"."home_fab_buttons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "sku" "text" NOT NULL,
    "name" "text" NOT NULL,
    "threshold" integer DEFAULT 10 NOT NULL,
    "channel" "text" DEFAULT 'b2c'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inventory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" DEFAULT 'boutique'::"text" NOT NULL,
    "address" "text",
    "city" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loyalty_rewards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "points_required" integer NOT NULL,
    "reward_type" "text" DEFAULT 'discount'::"text" NOT NULL,
    "value" numeric NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."loyalty_rewards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loyalty_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "order_id" "uuid",
    "points" integer NOT NULL,
    "type" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."loyalty_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mannequins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "image_url" "text" NOT NULL,
    "gender" "text" DEFAULT 'unisexe'::"text" NOT NULL,
    "age_range" "text" DEFAULT 'adulte'::"text" NOT NULL,
    "skin_tone" "text" DEFAULT 'medium'::"text" NOT NULL,
    "morphology" "text" DEFAULT 'regular'::"text" NOT NULL,
    "height_cm" integer,
    "fit_notes" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."mannequins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_read" boolean DEFAULT false,
    "auto_reply" "text",
    "auto_replied_at" timestamp with time zone,
    CONSTRAINT "messages_length_check" CHECK ((("length"("message") <= 5000) AND ("length"("name") <= 200)))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messaging_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "config_key" "text" DEFAULT 'main'::"text" NOT NULL,
    "default_from_email" "text",
    "default_from_name" "text",
    "provider" "text" DEFAULT 'resend'::"text" NOT NULL,
    "signature" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."messaging_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."newsletter_campaign_sends" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."newsletter_campaign_sends" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."newsletter_campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject" "text" NOT NULL,
    "preheader" "text",
    "content" "text" DEFAULT ''::"text" NOT NULL,
    "image_url" "text",
    "cta_label" "text",
    "cta_url" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "sent_count" integer DEFAULT 0 NOT NULL,
    "failed_count" integer DEFAULT 0 NOT NULL,
    "unsubscribed_count" integer DEFAULT 0 NOT NULL,
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."newsletter_campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."newsletter_popup_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "popup_id" "uuid" NOT NULL,
    "session_id" "text",
    "viewed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "converted" boolean DEFAULT false NOT NULL,
    "converted_at" timestamp with time zone
);


ALTER TABLE "public"."newsletter_popup_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."newsletter_popups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "title" "text" DEFAULT 'Rejoignez la newsletter'::"text" NOT NULL,
    "subtitle" "text" DEFAULT ''::"text",
    "cta_label" "text" DEFAULT 'S''inscrire'::"text" NOT NULL,
    "image_url" "text",
    "display_trigger" "text" DEFAULT 'delay'::"text" NOT NULL,
    "delay_seconds" integer DEFAULT 5 NOT NULL,
    "frequency_days" integer DEFAULT 7 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "bg_color" "text" DEFAULT '#000000'::"text",
    "text_color" "text" DEFAULT '#ffffff'::"text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "interval_seconds" integer DEFAULT 300 NOT NULL,
    "max_per_session" integer DEFAULT 3 NOT NULL
);


ALTER TABLE "public"."newsletter_popups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."newsletters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text",
    "is_subscribed" boolean DEFAULT true,
    "preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "subscribed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "unsubscribed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source" "text",
    "popup_id" "uuid",
    "referrer_path" "text",
    "confirmed_at" timestamp with time zone,
    "confirm_token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "unsubscribe_token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."newsletters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "config_key" "text" DEFAULT 'main'::"text" NOT NULL,
    "notify_on_identity_verified" boolean DEFAULT false NOT NULL,
    "notify_on_payment_verified" boolean DEFAULT false NOT NULL,
    "notify_on_all_validated" boolean DEFAULT true NOT NULL,
    "notification_channels" "jsonb" DEFAULT '{"sms": false, "email": true}'::"jsonb" NOT NULL,
    "sms_from_number" "text" DEFAULT ''::"text",
    "email_templates" "jsonb" DEFAULT '{"all_validated": {"body": "Bonjour {{customer_name}},\n\nVotre commande {{order_number}} est entièrement validée et sera expédiée prochainement.\n\nCordialement,\nL''équipe LVTK6", "subject": "Commande {{order_number}} - Commande validée"}, "payment_verified": {"body": "Bonjour {{customer_name}},\n\nLe paiement de votre commande {{order_number}} a été confirmé.\n\nCordialement,\nL''équipe LVTK6", "subject": "Commande {{order_number}} - Paiement confirmé"}, "identity_verified": {"body": "Bonjour {{customer_name}},\n\nVotre identité a été vérifiée pour la commande {{order_number}}.\n\nCordialement,\nL''équipe LVTK6", "subject": "Commande {{order_number}} - Identité vérifiée"}}'::"jsonb" NOT NULL,
    "sms_templates" "jsonb" DEFAULT '{"all_validated": "LVTK6: Commande {{order_number}} validée ! Expédition prochaine.", "payment_verified": "LVTK6: Paiement confirmé pour la commande {{order_number}}.", "identity_verified": "LVTK6: Votre identité est vérifiée pour la commande {{order_number}}."}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notification_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "channel" "text" NOT NULL,
    "notification_type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "recipient" "text" NOT NULL,
    "error_message" "text",
    "sent_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notification_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_preparations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "assigned_to" "uuid",
    "assigned_by" "uuid",
    "assigned_at" timestamp with time zone,
    "prepared_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."order_preparations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_tracking_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "status_code" "text" NOT NULL,
    "label" "text" NOT NULL,
    "location" "text",
    "carrier" "text",
    "event_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."order_tracking_events" REPLICA IDENTITY FULL;


ALTER TABLE "public"."order_tracking_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_number" "text" NOT NULL,
    "customer_name" "text" NOT NULL,
    "customer_email" "text" NOT NULL,
    "customer_phone" "text",
    "customer_address" "text" NOT NULL,
    "customer_city" "text" NOT NULL,
    "customer_zip" "text" NOT NULL,
    "customer_country" "text" DEFAULT 'France'::"text" NOT NULL,
    "items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "subtotal" numeric(10,2) NOT NULL,
    "tax" numeric(10,2) DEFAULT 0 NOT NULL,
    "shipping_cost" numeric(10,2) DEFAULT 0 NOT NULL,
    "total" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'Pending'::"text" NOT NULL,
    "payment_status" "text" DEFAULT 'Pending'::"text" NOT NULL,
    "payment_method" "text",
    "notes" "text",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tracking_number" "text",
    "shipping_carrier" "text",
    "validation_flags" "jsonb" DEFAULT '{"payment": false, "identity": false, "shipping": false}'::"jsonb" NOT NULL,
    "stock_reserved_at" timestamp with time zone,
    "stock_consumed_at" timestamp with time zone,
    "loyalty_awarded_at" timestamp with time zone,
    "is_test" boolean DEFAULT false NOT NULL,
    "label_url" "text",
    "label_path" "text",
    "label_generated_at" timestamp with time zone,
    "wc_id" bigint,
    "source" "text" DEFAULT 'site'::"text" NOT NULL,
    "wc_created_at" timestamp with time zone,
    "is_draft" boolean DEFAULT false NOT NULL,
    "abandoned_at" timestamp with time zone,
    CONSTRAINT "orders_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['Pending'::"text", 'Paid'::"text", 'Failed'::"text", 'Refunded'::"text"]))),
    CONSTRAINT "orders_status_check" CHECK (("status" = ANY (ARRAY['Pending'::"text", 'Processing'::"text", 'Shipped'::"text", 'Delivered'::"text", 'Cancelled'::"text"])))
);

ALTER TABLE ONLY "public"."orders" REPLICA IDENTITY FULL;


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."page_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "type" "text" NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "theme" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "layout" "jsonb" DEFAULT '{"grid": {"gap": 16, "cols": 12}, "blocks": []}'::"jsonb" NOT NULL,
    "preview_image" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "page_templates_type_check" CHECK (("type" = ANY (ARRAY['product'::"text", 'category'::"text"])))
);


ALTER TABLE "public"."page_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."page_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "text" NOT NULL,
    "path" "text" NOT NULL,
    "title" "text",
    "viewed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "duration_ms" integer
);

ALTER TABLE ONLY "public"."page_views" REPLICA IDENTITY FULL;


ALTER TABLE "public"."page_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "type" "text" DEFAULT 'custom'::"text" NOT NULL,
    "category_id" "uuid",
    "is_published" boolean DEFAULT false,
    "meta_title" "text",
    "meta_description" "text",
    "seo_keywords" "text",
    "sections" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "menu_link" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."password_reset_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "ip_hash" "text",
    "succeeded" boolean DEFAULT true NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."password_reset_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_gateway_secrets" (
    "gateway" "text" NOT NULL,
    "secret_key" "text" NOT NULL,
    "last4" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid"
);

ALTER TABLE ONLY "public"."payment_gateway_secrets" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_gateway_secrets" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_gateway_secrets" IS 'Server-only table. Accessible exclusively via service_role in edge functions (payment-keys). No client (anon/authenticated) access.';



CREATE TABLE IF NOT EXISTS "public"."paypal_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "config_key" "text" DEFAULT 'main'::"text" NOT NULL,
    "environment" "text" DEFAULT 'sandbox'::"text" NOT NULL,
    "client_id_sandbox" "text",
    "client_id_live" "text",
    "enabled" boolean DEFAULT false NOT NULL,
    "enable_paypal_button" boolean DEFAULT true NOT NULL,
    "enable_pay_later" boolean DEFAULT true NOT NULL,
    "enable_card_fields" boolean DEFAULT true NOT NULL,
    "enable_wallets" boolean DEFAULT true NOT NULL,
    "enable_venmo" boolean DEFAULT false NOT NULL,
    "enable_messaging" boolean DEFAULT true NOT NULL,
    "messaging_placements" "jsonb" DEFAULT '{"cart": true, "home": false, "product": true, "checkout": true}'::"jsonb" NOT NULL,
    "button_style" "jsonb" DEFAULT '{"color": "gold", "label": "paypal", "shape": "rect", "height": 45, "layout": "vertical", "tagline": false}'::"jsonb" NOT NULL,
    "brand_name" "text",
    "currency" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "locale" "text" DEFAULT 'fr_FR'::"text" NOT NULL,
    "intent" "text" DEFAULT 'capture'::"text" NOT NULL,
    "webhook_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."paypal_config" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."paypal_config_public" AS
 SELECT "config_key",
    "enabled",
    "enable_paypal_button",
    "enable_pay_later",
    "enable_card_fields",
    "enable_wallets",
    "enable_venmo",
    "enable_messaging",
    "messaging_placements",
    "button_style",
    "brand_name",
    "currency",
    "locale",
    "intent",
    "environment",
        CASE
            WHEN ("environment" = 'live'::"text") THEN "client_id_live"
            ELSE "client_id_sandbox"
        END AS "client_id"
   FROM "public"."paypal_config";


ALTER VIEW "public"."paypal_config_public" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."paypal_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "paypal_order_id" "text" NOT NULL,
    "capture_id" "text",
    "environment" "text" DEFAULT 'sandbox'::"text" NOT NULL,
    "status" "text" DEFAULT 'created'::"text" NOT NULL,
    "amount" numeric DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "funding_source" "text",
    "payer_email" "text",
    "payer_name" "text",
    "refunded_amount" numeric DEFAULT 0 NOT NULL,
    "raw" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."paypal_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."paypal_webhook_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "text",
    "event_type" "text" NOT NULL,
    "resource_id" "text",
    "verification_status" "text",
    "processed" boolean DEFAULT false NOT NULL,
    "error_message" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."paypal_webhook_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payplug_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "payplug_payment_id" "text" NOT NULL,
    "status" "text" DEFAULT 'created'::"text" NOT NULL,
    "amount" numeric DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "is_live" boolean DEFAULT false NOT NULL,
    "failure_message" "text",
    "raw" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payplug_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."popup_campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" DEFAULT 'promo'::"text" NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    "format" "text" DEFAULT 'square'::"text" NOT NULL,
    "layers" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "background" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "display_trigger" "text" DEFAULT 'delay'::"text" NOT NULL,
    "delay_seconds" integer DEFAULT 5 NOT NULL,
    "scroll_percent" integer DEFAULT 50 NOT NULL,
    "idle_seconds" integer DEFAULT 30 NOT NULL,
    "visit_count" integer DEFAULT 1 NOT NULL,
    "frequency_days" integer DEFAULT 7 NOT NULL,
    "max_views" integer DEFAULT 0 NOT NULL,
    "priority" integer DEFAULT 0 NOT NULL,
    "targeting" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."popup_campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."popup_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "event" "text" NOT NULL,
    "session_id" "text",
    "url" "text",
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."popup_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_category_order" (
    "category_slug" "text" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_category_order" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_looks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "cover_image" "text",
    "product_ids" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_looks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_review_votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "review_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_review_votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "order_id" "uuid",
    "rating" smallint NOT NULL,
    "title" "text",
    "comment" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "is_verified_purchase" boolean DEFAULT false NOT NULL,
    "size_purchased" "text",
    "admin_reply" "text",
    "admin_reply_at" timestamp with time zone,
    "helpful_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "product_reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5))),
    CONSTRAINT "product_reviews_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."product_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_styles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "image" "text",
    "product_ids" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_styles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "subtitle" "text",
    "price" numeric(10,2) NOT NULL,
    "sale_price" numeric(10,2),
    "image" "text" NOT NULL,
    "category" "text" NOT NULL,
    "stock" integer DEFAULT 0 NOT NULL,
    "sku" "text" NOT NULL,
    "description" "text",
    "material" "text",
    "care_instructions" "text",
    "sizes" "text"[] DEFAULT '{}'::"text"[],
    "colors" "text"[] DEFAULT '{}'::"text"[],
    "color_options" "jsonb" DEFAULT '[]'::"jsonb",
    "attributes" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "video_url" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "promo_ends_at" timestamp with time zone,
    "model_height" "text",
    "model_size_worn" "text",
    "model_name" "text",
    "gallery_images" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "template_id" "uuid",
    "limited_edition" boolean DEFAULT false NOT NULL,
    "limited_edition_label" "text",
    "limited_edition_color" "text",
    "limited_edition_text_color" "text",
    "limited_edition_position" "text",
    "hover_image" "text",
    "title_logo" "text",
    "tryon_mode" "text" DEFAULT 'both'::"text" NOT NULL,
    "categories" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "status" "text" DEFAULT 'published'::"text" NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "sold_out_badge" boolean DEFAULT true NOT NULL,
    "sold_out_label" "text",
    "weight_grams" integer,
    "dim_length_cm" numeric,
    "dim_width_cm" numeric,
    "dim_height_cm" numeric,
    "colissimo_product_code" "text"
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."promo_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "description" "text",
    "type" "public"."promo_type" DEFAULT 'percentage'::"public"."promo_type" NOT NULL,
    "value" numeric NOT NULL,
    "min_purchase" numeric DEFAULT 0,
    "max_discount" numeric,
    "usage_limit" integer,
    "usage_count" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "starts_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."promo_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "changed_by" "uuid",
    "operation" "text" NOT NULL,
    "target_user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."role_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "role" "public"."app_role" NOT NULL,
    "allowed_routes" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roulette_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "config_key" "text" DEFAULT 'main'::"text" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "title" "text" DEFAULT 'Roulette de la Chance'::"text" NOT NULL,
    "subtitle" "text" DEFAULT 'Tentez votre chance une fois par jour !'::"text" NOT NULL,
    "button_label" "text" DEFAULT 'Tourner la roue'::"text" NOT NULL,
    "fab_label" "text" DEFAULT '🎁 Jeu du jour'::"text" NOT NULL,
    "cooldown_hours" integer DEFAULT 24 NOT NULL,
    "reward_validity_days" integer DEFAULT 7 NOT NULL,
    "require_email" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notify_admin_on_win" boolean DEFAULT false NOT NULL,
    "notify_admin_email" "text" DEFAULT ''::"text",
    "auto_open_on_landing" boolean DEFAULT true NOT NULL,
    "auto_open_delay_ms" integer DEFAULT 1500 NOT NULL,
    "show_after_dismiss_hours" integer DEFAULT 24 NOT NULL,
    "game_type" "text" DEFAULT 'scratch'::"text" NOT NULL
);


ALTER TABLE "public"."roulette_config" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."roulette_config_public" WITH ("security_invoker"='true') AS
 SELECT "id",
    "config_key",
    "enabled",
    "title",
    "subtitle",
    "button_label",
    "fab_label",
    "cooldown_hours",
    "reward_validity_days",
    "require_email",
    "auto_open_on_landing",
    "auto_open_delay_ms",
    "show_after_dismiss_hours",
    "game_type"
   FROM "public"."roulette_config";


ALTER VIEW "public"."roulette_config_public" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roulette_segments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "label" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text",
    "reward_type" "text" NOT NULL,
    "reward_value" numeric DEFAULT 0 NOT NULL,
    "min_purchase" numeric DEFAULT 0 NOT NULL,
    "max_discount" numeric,
    "probability_weight" integer DEFAULT 10 NOT NULL,
    "color" "text" DEFAULT '#000000'::"text" NOT NULL,
    "text_color" "text" DEFAULT '#ffffff'::"text" NOT NULL,
    "icon" "text" DEFAULT '🎁'::"text",
    "code_prefix" "text" DEFAULT 'SPIN'::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "max_wins_per_day" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "roulette_segments_reward_type_check" CHECK (("reward_type" = ANY (ARRAY['percentage'::"text", 'fixed_amount'::"text", 'free_shipping'::"text", 'nothing'::"text"])))
);


ALTER TABLE "public"."roulette_segments" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."roulette_segments_public" WITH ("security_invoker"='true') AS
 SELECT "id",
    "label",
    "description",
    "color",
    "text_color",
    "icon",
    "sort_order",
    "is_active",
    "reward_type"
   FROM "public"."roulette_segments"
  WHERE ("is_active" = true);


ALTER VIEW "public"."roulette_segments_public" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roulette_spins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "email" "text",
    "ip_hash" "text",
    "segment_id" "uuid" NOT NULL,
    "promo_code_id" "uuid",
    "promo_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."roulette_spins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."seo_redirects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "old_url" "text" NOT NULL,
    "old_path" "text" NOT NULL,
    "new_path" "text" DEFAULT ''::"text" NOT NULL,
    "status" "text" DEFAULT 'review'::"text" NOT NULL,
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."seo_redirects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inventory_id" "uuid" NOT NULL,
    "location_id" "uuid",
    "action" "text" NOT NULL,
    "size" "text",
    "color" "text",
    "quantity_before" integer DEFAULT 0,
    "quantity_after" integer DEFAULT 0,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."stock_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_levels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inventory_id" "uuid" NOT NULL,
    "location_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 0 NOT NULL,
    "reserved" integer DEFAULT 0 NOT NULL,
    "last_synced_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "size" "text",
    "color" "text",
    "stocked_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."stock_levels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_transfers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inventory_id" "uuid" NOT NULL,
    "from_location_id" "uuid" NOT NULL,
    "to_location_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "notes" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stock_transfers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suppressed_emails" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "reason" "text" NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "suppressed_emails_reason_check" CHECK (("reason" = ANY (ARRAY['unsubscribe'::"text", 'bounce'::"text", 'complaint'::"text"])))
);


ALTER TABLE "public"."suppressed_emails" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tryon_looks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "mannequin_id" "uuid",
    "base_product_id" "uuid",
    "title" "text",
    "items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "result_image" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tryon_looks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_roles_with_email" WITH ("security_invoker"='true') AS
 SELECT "ur"."id",
    "ur"."user_id",
    "ur"."role",
    "ur"."created_at",
    COALESCE("c"."email", ("au"."email")::"text") AS "email",
    "c"."first_name",
    "c"."last_name"
   FROM (("public"."user_roles" "ur"
     LEFT JOIN "public"."customers" "c" ON (("c"."user_id" = "ur"."user_id")))
     LEFT JOIN "auth"."users" "au" ON (("au"."id" = "ur"."user_id")));


ALTER VIEW "public"."user_roles_with_email" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."visitor_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "text" NOT NULL,
    "user_id" "uuid",
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_agent" "text",
    "ip_hash" "text",
    "country" "text",
    "device" "text",
    "referrer" "text",
    "landing_path" "text"
);

ALTER TABLE ONLY "public"."visitor_sessions" REPLICA IDENTITY FULL;


ALTER TABLE "public"."visitor_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wishlists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."wishlists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."woocommerce_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "config_key" "text" DEFAULT 'main'::"text" NOT NULL,
    "store_url" "text",
    "consumer_key" "text",
    "consumer_secret" "text",
    "sync_customers" boolean DEFAULT true NOT NULL,
    "sync_orders" boolean DEFAULT true NOT NULL,
    "sync_stats" boolean DEFAULT true NOT NULL,
    "last_sync_at" timestamp with time zone,
    "last_sync_status" "text",
    "store_info" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."woocommerce_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."woocommerce_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "report" "text" NOT NULL,
    "period" "text" DEFAULT 'month'::"text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "fetched_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."woocommerce_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wp_sync_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "direction" "text" NOT NULL,
    "status" "text" NOT NULL,
    "total" integer DEFAULT 0 NOT NULL,
    "succeeded" integer DEFAULT 0 NOT NULL,
    "failed" integer DEFAULT 0 NOT NULL,
    "message" "text",
    "details" "jsonb",
    "triggered_by" "uuid",
    "correlation_id" "uuid",
    CONSTRAINT "wp_sync_logs_direction_check" CHECK (("direction" = ANY (ARRAY['import'::"text", 'export'::"text"]))),
    CONSTRAINT "wp_sync_logs_status_check" CHECK (("status" = ANY (ARRAY['success'::"text", 'partial'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."wp_sync_logs" OWNER TO "postgres";


ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_access_log"
    ADD CONSTRAINT "admin_access_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_config"
    ADD CONSTRAINT "admin_config_config_key_key" UNIQUE ("config_key");



ALTER TABLE ONLY "public"."admin_config"
    ADD CONSTRAINT "admin_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auth_email_templates"
    ADD CONSTRAINT "auth_email_templates_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."banner_analytics"
    ADD CONSTRAINT "banner_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banners"
    ADD CONSTRAINT "banners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bot_config"
    ADD CONSTRAINT "bot_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."boutiques"
    ADD CONSTRAINT "boutiques_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_user_id_product_id_size_color_key" UNIQUE ("user_id", "product_id", "size", "color");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."category_hero_settings"
    ADD CONSTRAINT "category_hero_settings_category_id_key" UNIQUE ("category_id");



ALTER TABLE ONLY "public"."category_hero_settings"
    ADD CONSTRAINT "category_hero_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cgv_consents"
    ADD CONSTRAINT "cgv_consents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_logs"
    ADD CONSTRAINT "chat_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checkout_config"
    ADD CONSTRAINT "checkout_config_config_key_key" UNIQUE ("config_key");



ALTER TABLE ONLY "public"."checkout_config"
    ADD CONSTRAINT "checkout_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."click_events"
    ADD CONSTRAINT "click_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_error_logs"
    ADD CONSTRAINT "client_error_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."colissimo_bordereaux"
    ADD CONSTRAINT "colissimo_bordereaux_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_contacts"
    ADD CONSTRAINT "crm_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_conversations"
    ADD CONSTRAINT "crm_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_message_templates"
    ADD CONSTRAINT "crm_message_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_messages"
    ADD CONSTRAINT "crm_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_email_log"
    ADD CONSTRAINT "customer_email_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."design_settings"
    ADD CONSTRAINT "design_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."design_settings"
    ADD CONSTRAINT "design_settings_settings_key_key" UNIQUE ("settings_key");



ALTER TABLE ONLY "public"."email_send_log"
    ADD CONSTRAINT "email_send_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_send_state"
    ADD CONSTRAINT "email_send_state_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_template_key_key" UNIQUE ("template_key");



ALTER TABLE ONLY "public"."email_unsubscribe_tokens"
    ADD CONSTRAINT "email_unsubscribe_tokens_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."email_unsubscribe_tokens"
    ADD CONSTRAINT "email_unsubscribe_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_unsubscribe_tokens"
    ADD CONSTRAINT "email_unsubscribe_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."faq_items"
    ADD CONSTRAINT "faq_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."home_fab_buttons"
    ADD CONSTRAINT "home_fab_buttons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_product_id_key" UNIQUE ("product_id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loyalty_rewards"
    ADD CONSTRAINT "loyalty_rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mannequins"
    ADD CONSTRAINT "mannequins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messaging_config"
    ADD CONSTRAINT "messaging_config_config_key_key" UNIQUE ("config_key");



ALTER TABLE ONLY "public"."messaging_config"
    ADD CONSTRAINT "messaging_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."newsletter_campaign_sends"
    ADD CONSTRAINT "newsletter_campaign_sends_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."newsletter_campaigns"
    ADD CONSTRAINT "newsletter_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."newsletter_popup_views"
    ADD CONSTRAINT "newsletter_popup_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."newsletter_popups"
    ADD CONSTRAINT "newsletter_popups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."newsletters"
    ADD CONSTRAINT "newsletters_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."newsletters"
    ADD CONSTRAINT "newsletters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_config"
    ADD CONSTRAINT "notification_config_config_key_key" UNIQUE ("config_key");



ALTER TABLE ONLY "public"."notification_config"
    ADD CONSTRAINT "notification_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_log"
    ADD CONSTRAINT "notification_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_preparations"
    ADD CONSTRAINT "order_preparations_order_id_key" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."order_preparations"
    ADD CONSTRAINT "order_preparations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_tracking_events"
    ADD CONSTRAINT "order_tracking_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."page_templates"
    ADD CONSTRAINT "page_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."page_templates"
    ADD CONSTRAINT "page_templates_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."page_views"
    ADD CONSTRAINT "page_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pages"
    ADD CONSTRAINT "pages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pages"
    ADD CONSTRAINT "pages_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."password_reset_attempts"
    ADD CONSTRAINT "password_reset_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_gateway_secrets"
    ADD CONSTRAINT "payment_gateway_secrets_pkey" PRIMARY KEY ("gateway");



ALTER TABLE ONLY "public"."paypal_config"
    ADD CONSTRAINT "paypal_config_config_key_key" UNIQUE ("config_key");



ALTER TABLE ONLY "public"."paypal_config"
    ADD CONSTRAINT "paypal_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."paypal_transactions"
    ADD CONSTRAINT "paypal_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."paypal_webhook_events"
    ADD CONSTRAINT "paypal_webhook_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payplug_transactions"
    ADD CONSTRAINT "payplug_transactions_payplug_payment_id_key" UNIQUE ("payplug_payment_id");



ALTER TABLE ONLY "public"."payplug_transactions"
    ADD CONSTRAINT "payplug_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."popup_campaigns"
    ADD CONSTRAINT "popup_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."popup_events"
    ADD CONSTRAINT "popup_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_category_order"
    ADD CONSTRAINT "product_category_order_pkey" PRIMARY KEY ("category_slug", "product_id");



ALTER TABLE ONLY "public"."product_looks"
    ADD CONSTRAINT "product_looks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_review_votes"
    ADD CONSTRAINT "product_review_votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_review_votes"
    ADD CONSTRAINT "product_review_votes_review_id_user_id_key" UNIQUE ("review_id", "user_id");



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_user_id_product_id_key" UNIQUE ("user_id", "product_id");



ALTER TABLE ONLY "public"."product_styles"
    ADD CONSTRAINT "product_styles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_audit_log"
    ADD CONSTRAINT "role_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role");



ALTER TABLE ONLY "public"."roulette_config"
    ADD CONSTRAINT "roulette_config_config_key_key" UNIQUE ("config_key");



ALTER TABLE ONLY "public"."roulette_config"
    ADD CONSTRAINT "roulette_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roulette_segments"
    ADD CONSTRAINT "roulette_segments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roulette_spins"
    ADD CONSTRAINT "roulette_spins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seo_redirects"
    ADD CONSTRAINT "seo_redirects_old_path_key" UNIQUE ("old_path");



ALTER TABLE ONLY "public"."seo_redirects"
    ADD CONSTRAINT "seo_redirects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_history"
    ADD CONSTRAINT "stock_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_levels"
    ADD CONSTRAINT "stock_levels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_transfers"
    ADD CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppressed_emails"
    ADD CONSTRAINT "suppressed_emails_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."suppressed_emails"
    ADD CONSTRAINT "suppressed_emails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tryon_looks"
    ADD CONSTRAINT "tryon_looks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."visitor_sessions"
    ADD CONSTRAINT "visitor_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."visitor_sessions"
    ADD CONSTRAINT "visitor_sessions_session_id_key" UNIQUE ("session_id");



ALTER TABLE ONLY "public"."wishlists"
    ADD CONSTRAINT "wishlists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wishlists"
    ADD CONSTRAINT "wishlists_user_id_product_id_key" UNIQUE ("user_id", "product_id");



ALTER TABLE ONLY "public"."woocommerce_config"
    ADD CONSTRAINT "woocommerce_config_config_key_key" UNIQUE ("config_key");



ALTER TABLE ONLY "public"."woocommerce_config"
    ADD CONSTRAINT "woocommerce_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."woocommerce_stats"
    ADD CONSTRAINT "woocommerce_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."woocommerce_stats"
    ADD CONSTRAINT "woocommerce_stats_report_period_key" UNIQUE ("report", "period");



ALTER TABLE ONLY "public"."wp_sync_logs"
    ADD CONSTRAINT "wp_sync_logs_pkey" PRIMARY KEY ("id");



CREATE INDEX "admin_access_log_created_idx" ON "public"."admin_access_log" USING "btree" ("created_at" DESC);



CREATE INDEX "admin_access_log_user_idx" ON "public"."admin_access_log" USING "btree" ("user_id", "created_at" DESC);



CREATE UNIQUE INDEX "categories_slug_unique" ON "public"."categories" USING "btree" ("slug") WHERE ("slug" IS NOT NULL);



CREATE UNIQUE INDEX "crm_contacts_email_key" ON "public"."crm_contacts" USING "btree" ("lower"("email"));



CREATE INDEX "crm_conversations_contact_idx" ON "public"."crm_conversations" USING "btree" ("contact_id");



CREATE INDEX "crm_messages_conversation_idx" ON "public"."crm_messages" USING "btree" ("conversation_id", "created_at");



CREATE INDEX "customer_email_log_email_idx" ON "public"."customer_email_log" USING "btree" ("customer_email", "created_at" DESC);



CREATE UNIQUE INDEX "customers_email_unique" ON "public"."customers" USING "btree" ("lower"("email"));



CREATE INDEX "customers_wc_id_idx" ON "public"."customers" USING "btree" ("wc_id");



CREATE INDEX "idx_addresses_customer_id" ON "public"."addresses" USING "btree" ("customer_id");



CREATE INDEX "idx_banner_analytics_banner" ON "public"."banner_analytics" USING "btree" ("banner_id", "created_at" DESC);



CREATE INDEX "idx_banner_analytics_type" ON "public"."banner_analytics" USING "btree" ("banner_type", "event", "created_at" DESC);



CREATE INDEX "idx_banners_type" ON "public"."banners" USING "btree" ("type");



CREATE INDEX "idx_boutiques_active_sort" ON "public"."boutiques" USING "btree" ("is_active", "sort_order");



CREATE INDEX "idx_cart_items_user_id" ON "public"."cart_items" USING "btree" ("user_id");



CREATE INDEX "idx_cgv_consents_created" ON "public"."cgv_consents" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_click_events_session" ON "public"."click_events" USING "btree" ("session_id", "clicked_at" DESC);



CREATE INDEX "idx_client_error_logs_created_at" ON "public"."client_error_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_client_error_logs_source" ON "public"."client_error_logs" USING "btree" ("source");



CREATE INDEX "idx_customers_user_id" ON "public"."customers" USING "btree" ("user_id");



CREATE INDEX "idx_email_send_log_created" ON "public"."email_send_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_email_send_log_message" ON "public"."email_send_log" USING "btree" ("message_id");



CREATE UNIQUE INDEX "idx_email_send_log_message_sent_unique" ON "public"."email_send_log" USING "btree" ("message_id") WHERE ("status" = 'sent'::"text");



CREATE INDEX "idx_email_send_log_recipient" ON "public"."email_send_log" USING "btree" ("recipient_email");



CREATE INDEX "idx_loyalty_transactions_customer_id" ON "public"."loyalty_transactions" USING "btree" ("customer_id");



CREATE INDEX "idx_nlpv_popup" ON "public"."newsletter_popup_views" USING "btree" ("popup_id");



CREATE INDEX "idx_nlpv_session" ON "public"."newsletter_popup_views" USING "btree" ("session_id");



CREATE INDEX "idx_orders_order_number" ON "public"."orders" USING "btree" ("order_number");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_orders_user_id" ON "public"."orders" USING "btree" ("user_id");



CREATE INDEX "idx_page_views_path" ON "public"."page_views" USING "btree" ("path", "viewed_at" DESC);



CREATE INDEX "idx_page_views_session" ON "public"."page_views" USING "btree" ("session_id", "viewed_at" DESC);



CREATE INDEX "idx_payplug_transactions_order" ON "public"."payplug_transactions" USING "btree" ("order_id");



CREATE INDEX "idx_product_reviews_product" ON "public"."product_reviews" USING "btree" ("product_id", "status");



CREATE INDEX "idx_product_reviews_user" ON "public"."product_reviews" USING "btree" ("user_id");



CREATE INDEX "idx_products_category" ON "public"."products" USING "btree" ("category");



CREATE INDEX "idx_products_not_deleted" ON "public"."products" USING "btree" ("created_at" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_products_sku" ON "public"."products" USING "btree" ("sku");



CREATE INDEX "idx_products_status" ON "public"."products" USING "btree" ("status");



CREATE INDEX "idx_promo_codes_code" ON "public"."promo_codes" USING "btree" ("code");



CREATE INDEX "idx_spins_email" ON "public"."roulette_spins" USING "btree" ("email", "created_at" DESC);



CREATE INDEX "idx_spins_user" ON "public"."roulette_spins" USING "btree" ("user_id", "created_at" DESC);



CREATE UNIQUE INDEX "idx_stock_levels_inv_loc_size_color" ON "public"."stock_levels" USING "btree" ("inventory_id", "location_id", COALESCE("size", ''::"text"), COALESCE("color", ''::"text"));



CREATE INDEX "idx_suppressed_emails_email" ON "public"."suppressed_emails" USING "btree" ("email");



CREATE INDEX "idx_tryon_looks_user" ON "public"."tryon_looks" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_unsubscribe_tokens_token" ON "public"."email_unsubscribe_tokens" USING "btree" ("token");



CREATE INDEX "idx_visitor_sessions_last_seen" ON "public"."visitor_sessions" USING "btree" ("last_seen_at" DESC);



CREATE INDEX "idx_wishlists_user_id" ON "public"."wishlists" USING "btree" ("user_id");



CREATE INDEX "idx_wp_sync_logs_created_at" ON "public"."wp_sync_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "newsletter_campaign_sends_campaign_idx" ON "public"."newsletter_campaign_sends" USING "btree" ("campaign_id");



CREATE UNIQUE INDEX "newsletters_confirm_token_idx" ON "public"."newsletters" USING "btree" ("confirm_token");



CREATE UNIQUE INDEX "newsletters_unsubscribe_token_idx" ON "public"."newsletters" USING "btree" ("unsubscribe_token");



CREATE INDEX "order_tracking_events_order_idx" ON "public"."order_tracking_events" USING "btree" ("order_id", "event_at" DESC);



CREATE UNIQUE INDEX "order_tracking_events_unique" ON "public"."order_tracking_events" USING "btree" ("order_id", "status_code", "event_at");



CREATE INDEX "orders_is_draft_idx" ON "public"."orders" USING "btree" ("is_draft");



CREATE INDEX "orders_is_test_idx" ON "public"."orders" USING "btree" ("is_test");



CREATE INDEX "orders_wc_id_idx" ON "public"."orders" USING "btree" ("wc_id");



CREATE UNIQUE INDEX "page_templates_default_per_type" ON "public"."page_templates" USING "btree" ("type") WHERE ("is_default" = true);



CREATE UNIQUE INDEX "pages_category_id_unique" ON "public"."pages" USING "btree" ("category_id") WHERE ("category_id" IS NOT NULL);



CREATE INDEX "password_reset_attempts_email_created_idx" ON "public"."password_reset_attempts" USING "btree" ("email", "created_at" DESC);



CREATE INDEX "paypal_transactions_order_id_idx" ON "public"."paypal_transactions" USING "btree" ("order_id");



CREATE UNIQUE INDEX "paypal_transactions_paypal_order_id_key" ON "public"."paypal_transactions" USING "btree" ("paypal_order_id");



CREATE INDEX "paypal_webhook_events_type_idx" ON "public"."paypal_webhook_events" USING "btree" ("event_type", "created_at" DESC);



CREATE INDEX "popup_events_campaign_idx" ON "public"."popup_events" USING "btree" ("campaign_id", "event");



CREATE INDEX "product_category_order_slug_position_idx" ON "public"."product_category_order" USING "btree" ("category_slug", "position");



CREATE INDEX "products_categories_gin" ON "public"."products" USING "gin" ("categories");



CREATE INDEX "wp_sync_logs_correlation_id_idx" ON "public"."wp_sync_logs" USING "btree" ("correlation_id");



CREATE OR REPLACE TRIGGER "admin_config_updated_at" BEFORE UPDATE ON "public"."admin_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "auth_email_templates_updated_at" BEFORE UPDATE ON "public"."auth_email_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "auto_create_category_page_trigger" AFTER INSERT ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."auto_create_category_page"();



CREATE OR REPLACE TRIGGER "crm_contacts_updated_at" BEFORE UPDATE ON "public"."crm_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "crm_conversations_updated_at" BEFORE UPDATE ON "public"."crm_conversations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "crm_messages_touch_conversation" AFTER INSERT ON "public"."crm_messages" FOR EACH ROW EXECUTE FUNCTION "public"."touch_crm_conversation"();



CREATE OR REPLACE TRIGGER "default_collab_limited_edition_trg" BEFORE INSERT ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."default_collab_limited_edition"();



CREATE OR REPLACE TRIGGER "delete_category_page_trigger" BEFORE DELETE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."delete_category_page"();



CREATE OR REPLACE TRIGGER "messaging_config_updated_at" BEFORE UPDATE ON "public"."messaging_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "newsletter_popups_updated_at" BEFORE UPDATE ON "public"."newsletter_popups" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "normalize_order_statuses_trg" BEFORE INSERT OR UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."normalize_order_statuses"();



CREATE OR REPLACE TRIGGER "orders_award_loyalty" AFTER UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_award_loyalty_points"();



CREATE OR REPLACE TRIGGER "popup_campaigns_updated_at" BEFORE UPDATE ON "public"."popup_campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "products_uppercase_subtitle" BEFORE INSERT OR UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."uppercase_product_subtitle"();



CREATE OR REPLACE TRIGGER "sanitize_techwear_hero_trg" BEFORE INSERT OR UPDATE ON "public"."design_settings" FOR EACH ROW EXECUTE FUNCTION "public"."sanitize_techwear_hero"();



CREATE OR REPLACE TRIGGER "set_category_slug" BEFORE INSERT OR UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."generate_category_slug"();



CREATE OR REPLACE TRIGGER "sync_category_page_trigger" AFTER UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."sync_category_page"();



CREATE OR REPLACE TRIGGER "trg_audit_role_change" AFTER INSERT OR DELETE OR UPDATE ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."audit_role_change"();



CREATE OR REPLACE TRIGGER "trg_auto_create_inventory_on_product_insert" AFTER INSERT ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."auto_create_inventory_on_product_insert"();



CREATE OR REPLACE TRIGGER "trg_product_reviews_updated" BEFORE UPDATE ON "public"."product_reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_roulette_config_updated" BEFORE UPDATE ON "public"."roulette_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_roulette_segments_updated" BEFORE UPDATE ON "public"."roulette_segments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_addresses_updated_at" BEFORE UPDATE ON "public"."addresses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_banners_updated_at" BEFORE UPDATE ON "public"."banners" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_bot_config_updated_at" BEFORE UPDATE ON "public"."bot_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_boutiques_updated_at" BEFORE UPDATE ON "public"."boutiques" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_cart_items_updated_at" BEFORE UPDATE ON "public"."cart_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_categories_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_category_hero_settings_updated_at" BEFORE UPDATE ON "public"."category_hero_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_checkout_config_updated_at" BEFORE UPDATE ON "public"."checkout_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_crm_message_templates_updated_at" BEFORE UPDATE ON "public"."crm_message_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_customers_updated_at" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_design_settings_updated_at" BEFORE UPDATE ON "public"."design_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_email_templates_updated_at" BEFORE UPDATE ON "public"."email_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_faq_items_updated_at" BEFORE UPDATE ON "public"."faq_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_home_fab_buttons_updated_at" BEFORE UPDATE ON "public"."home_fab_buttons" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_inventory_updated_at" BEFORE UPDATE ON "public"."inventory" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_locations_updated_at" BEFORE UPDATE ON "public"."locations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_loyalty_rewards_updated_at" BEFORE UPDATE ON "public"."loyalty_rewards" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_mannequins_updated_at" BEFORE UPDATE ON "public"."mannequins" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_newsletter_campaigns_updated_at" BEFORE UPDATE ON "public"."newsletter_campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_notification_config_updated_at" BEFORE UPDATE ON "public"."notification_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_order_preparations_updated_at" BEFORE UPDATE ON "public"."order_preparations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_page_templates_updated_at" BEFORE UPDATE ON "public"."page_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_pages_updated_at" BEFORE UPDATE ON "public"."pages" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_paypal_config_updated_at" BEFORE UPDATE ON "public"."paypal_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_paypal_transactions_updated_at" BEFORE UPDATE ON "public"."paypal_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payplug_transactions_updated_at" BEFORE UPDATE ON "public"."payplug_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_product_category_order_updated_at" BEFORE UPDATE ON "public"."product_category_order" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_product_looks_updated_at" BEFORE UPDATE ON "public"."product_looks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_product_styles_updated_at" BEFORE UPDATE ON "public"."product_styles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_promo_codes_updated_at" BEFORE UPDATE ON "public"."promo_codes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_role_permissions_updated_at" BEFORE UPDATE ON "public"."role_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_seo_redirects_updated_at" BEFORE UPDATE ON "public"."seo_redirects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_stock_levels_updated_at" BEFORE UPDATE ON "public"."stock_levels" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_stock_transfers_updated_at" BEFORE UPDATE ON "public"."stock_transfers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tryon_looks_updated_at" BEFORE UPDATE ON "public"."tryon_looks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_woocommerce_config_updated_at" BEFORE UPDATE ON "public"."woocommerce_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_woocommerce_stats_updated_at" BEFORE UPDATE ON "public"."woocommerce_stats" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "user_roles_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."audit_role_change"();



ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."page_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."category_hero_settings"
    ADD CONSTRAINT "category_hero_settings_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_conversations"
    ADD CONSTRAINT "crm_conversations_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_conversations"
    ADD CONSTRAINT "crm_conversations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."crm_messages"
    ADD CONSTRAINT "crm_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."crm_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_email_log"
    ADD CONSTRAINT "customer_email_log_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "loyalty_transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "loyalty_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."newsletter_campaign_sends"
    ADD CONSTRAINT "newsletter_campaign_sends_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."newsletter_campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_tracking_events"
    ADD CONSTRAINT "order_tracking_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pages"
    ADD CONSTRAINT "pages_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."paypal_transactions"
    ADD CONSTRAINT "paypal_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payplug_transactions"
    ADD CONSTRAINT "payplug_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."popup_events"
    ADD CONSTRAINT "popup_events_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."popup_campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_category_order"
    ADD CONSTRAINT "product_category_order_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_review_votes"
    ADD CONSTRAINT "product_review_votes_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "public"."product_reviews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_review_votes"
    ADD CONSTRAINT "product_review_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."page_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."roulette_spins"
    ADD CONSTRAINT "roulette_spins_promo_code_id_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_codes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."roulette_spins"
    ADD CONSTRAINT "roulette_spins_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "public"."roulette_segments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."stock_history"
    ADD CONSTRAINT "stock_history_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_history"
    ADD CONSTRAINT "stock_history_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stock_levels"
    ADD CONSTRAINT "stock_levels_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_levels"
    ADD CONSTRAINT "stock_levels_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_transfers"
    ADD CONSTRAINT "stock_transfers_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."stock_transfers"
    ADD CONSTRAINT "stock_transfers_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_transfers"
    ADD CONSTRAINT "stock_transfers_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."tryon_looks"
    ADD CONSTRAINT "tryon_looks_mannequin_id_fkey" FOREIGN KEY ("mannequin_id") REFERENCES "public"."mannequins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wishlists"
    ADD CONSTRAINT "wishlists_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



CREATE POLICY "Active boutiques are publicly readable" ON "public"."boutiques" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



CREATE POLICY "Admin full access bordereaux" ON "public"."colissimo_bordereaux" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can delete banner analytics" ON "public"."banner_analytics" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can delete boutiques" ON "public"."boutiques" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can delete customers" ON "public"."customers" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can delete error logs" ON "public"."client_error_logs" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can delete mannequins" ON "public"."mannequins" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can delete message templates" ON "public"."crm_message_templates" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can delete orders" ON "public"."orders" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can delete product order" ON "public"."product_category_order" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can delete products" ON "public"."products" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can delete redirects" ON "public"."seo_redirects" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can insert boutiques" ON "public"."boutiques" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can insert mannequins" ON "public"."mannequins" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can insert message templates" ON "public"."crm_message_templates" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can insert product order" ON "public"."product_category_order" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can insert products" ON "public"."products" FOR INSERT WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can insert redirects" ON "public"."seo_redirects" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can insert wp sync logs" ON "public"."wp_sync_logs" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage FAQ items" ON "public"."faq_items" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage admin config" ON "public"."admin_config" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage all addresses" ON "public"."addresses" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage all customers" ON "public"."customers" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage all roles" ON "public"."user_roles" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage banners" ON "public"."banners" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage bot config" ON "public"."bot_config" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage categories" ON "public"."categories" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage checkout config" ON "public"."checkout_config" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage design settings" ON "public"."design_settings" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage inventory" ON "public"."inventory" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage locations" ON "public"."locations" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage loyalty transactions" ON "public"."loyalty_transactions" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage newsletter subscribers" ON "public"."newsletters" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage notification config" ON "public"."notification_config" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage notification log" ON "public"."notification_log" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage pages" ON "public"."pages" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage product looks" ON "public"."product_looks" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage product styles" ON "public"."product_styles" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage promo codes" ON "public"."promo_codes" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage rewards" ON "public"."loyalty_rewards" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage stock history" ON "public"."stock_history" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage stock levels" ON "public"."stock_levels" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage transfers" ON "public"."stock_transfers" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can read all boutiques" ON "public"."boutiques" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can read banner analytics" ON "public"."banner_analytics" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can read cgv consents" ON "public"."cgv_consents" FOR SELECT TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'auditor'::"public"."app_role")));



CREATE POLICY "Admins can read email log" ON "public"."customer_email_log" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can read full bot_config" ON "public"."bot_config" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can read popup views" ON "public"."newsletter_popup_views" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can update boutiques" ON "public"."boutiques" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can update mannequins" ON "public"."mannequins" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can update message templates" ON "public"."crm_message_templates" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can update messages" ON "public"."messages" FOR UPDATE USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can update orders" ON "public"."orders" FOR UPDATE USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can update product order" ON "public"."product_category_order" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can update products" ON "public"."products" FOR UPDATE USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can update redirects" ON "public"."seo_redirects" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all messages" ON "public"."messages" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all orders" ON "public"."orders" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all products" ON "public"."products" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view chat logs" ON "public"."chat_logs" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view error logs" ON "public"."client_error_logs" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view message templates" ON "public"."crm_message_templates" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view payplug transactions" ON "public"."payplug_transactions" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view role audit log" ON "public"."role_audit_log" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view wp sync logs" ON "public"."wp_sync_logs" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins manage PayPal config" ON "public"."paypal_config" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins manage PayPal transactions" ON "public"."paypal_transactions" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins manage auth email templates" ON "public"."auth_email_templates" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins manage category hero" ON "public"."category_hero_settings" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins manage crm contacts" ON "public"."crm_contacts" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins manage crm conversations" ON "public"."crm_conversations" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins manage crm messages" ON "public"."crm_messages" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins manage fab buttons" ON "public"."home_fab_buttons" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins manage messaging config" ON "public"."messaging_config" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins manage newsletter campaigns" ON "public"."newsletter_campaigns" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins manage page templates" ON "public"."page_templates" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins manage popups" ON "public"."newsletter_popups" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins manage preparations" ON "public"."order_preparations" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins manage reviews" ON "public"."product_reviews" FOR UPDATE TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'moderator'::"public"."app_role"))) WITH CHECK (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'moderator'::"public"."app_role")));



CREATE POLICY "Admins manage roulette config" ON "public"."roulette_config" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins manage roulette segments" ON "public"."roulette_segments" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins manage segments" ON "public"."roulette_segments" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins manage sessions" ON "public"."visitor_sessions" FOR DELETE USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins manage spins" ON "public"."roulette_spins" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins read PayPal config" ON "public"."paypal_config" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins read PayPal transactions" ON "public"."paypal_transactions" FOR SELECT TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'auditor'::"public"."app_role")));



CREATE POLICY "Admins read PayPal webhook events" ON "public"."paypal_webhook_events" FOR SELECT TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'auditor'::"public"."app_role")));



CREATE POLICY "Admins read all reviews" ON "public"."product_reviews" FOR SELECT TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'moderator'::"public"."app_role")));



CREATE POLICY "Admins read click events" ON "public"."click_events" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins read newsletter campaign sends" ON "public"."newsletter_campaign_sends" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins read page views" ON "public"."page_views" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins read sessions" ON "public"."visitor_sessions" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins view all segments" ON "public"."roulette_segments" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins view all spins" ON "public"."roulette_spins" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Anyone can insert banner events" ON "public"."banner_analytics" FOR INSERT TO "authenticated", "anon" WITH CHECK ((("banner_id" IS NOT NULL) AND ("length"("banner_id") <= 200) AND ("banner_type" IS NOT NULL) AND ("length"("banner_type") <= 50) AND ("event" IS NOT NULL) AND ("length"("event") <= 50)));



CREATE POLICY "Anyone can insert cgv consent" ON "public"."cgv_consents" FOR INSERT TO "authenticated", "anon" WITH CHECK (("length"("version") <= 50));



CREATE POLICY "Anyone can insert chat logs" ON "public"."chat_logs" FOR INSERT WITH CHECK ((("session_id" IS NOT NULL) AND ("length"("user_message") <= 2000)));



CREATE POLICY "Anyone can insert click events" ON "public"."click_events" FOR INSERT TO "authenticated", "anon" WITH CHECK ((("session_id" IS NOT NULL) AND ("length"("session_id") >= 8) AND ("length"("path") <= 500)));



CREATE POLICY "Anyone can insert error logs" ON "public"."client_error_logs" FOR INSERT TO "authenticated", "anon" WITH CHECK ((("source" IS NOT NULL) AND ("length"("source") <= 200) AND (("message" IS NULL) OR ("length"("message") <= 4000))));



CREATE POLICY "Anyone can insert page views" ON "public"."page_views" FOR INSERT TO "authenticated", "anon" WITH CHECK ((("session_id" IS NOT NULL) AND ("length"("session_id") >= 8) AND ("length"("path") <= 500)));



CREATE POLICY "Anyone can insert sessions" ON "public"."visitor_sessions" FOR INSERT TO "authenticated", "anon" WITH CHECK ((("session_id" IS NOT NULL) AND ("length"("session_id") >= 8) AND ("length"("session_id") <= 200)));



CREATE POLICY "Anyone can read active FAQ items" ON "public"."faq_items" FOR SELECT TO "authenticated", "anon" USING ((("is_active" = true) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Anyone can read product order" ON "public"."product_category_order" FOR SELECT USING (true);



CREATE POLICY "Anyone can record popup view" ON "public"."newsletter_popup_views" FOR INSERT WITH CHECK (("popup_id" IS NOT NULL));



CREATE POLICY "Anyone can submit messages" ON "public"."messages" FOR INSERT WITH CHECK (("email" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::"text"));



CREATE POLICY "Anyone can subscribe to newsletter with valid email" ON "public"."newsletters" FOR INSERT WITH CHECK (("email" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::"text"));



CREATE POLICY "Anyone can view active banners" ON "public"."banners" FOR SELECT USING ((("is_active" = true) AND (("starts_at" IS NULL) OR ("starts_at" <= "now"())) AND (("ends_at" IS NULL) OR ("ends_at" > "now"()))));



CREATE POLICY "Anyone can view active fab buttons" ON "public"."home_fab_buttons" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view active locations" ON "public"."locations" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view active mannequins" ON "public"."mannequins" FOR SELECT USING ((("is_active" = true) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Anyone can view active popups" ON "public"."newsletter_popups" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view active product looks" ON "public"."product_looks" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view active product styles" ON "public"."product_styles" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view active products" ON "public"."products" FOR SELECT USING ((("is_active" = true) AND ("deleted_at" IS NULL) AND ("status" = 'published'::"text")));



CREATE POLICY "Anyone can view active rewards" ON "public"."loyalty_rewards" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view categories" ON "public"."categories" FOR SELECT USING (true);



CREATE POLICY "Anyone can view enabled category hero" ON "public"."category_hero_settings" FOR SELECT USING (("enabled" = true));



CREATE POLICY "Anyone can view published pages" ON "public"."pages" FOR SELECT USING (("is_published" = true));



CREATE POLICY "Auditors can view admin access log" ON "public"."admin_access_log" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'auditor'::"public"."app_role"));



CREATE POLICY "Auditors can view customers" ON "public"."customers" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'auditor'::"public"."app_role"));



CREATE POLICY "Auditors can view error logs" ON "public"."client_error_logs" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'auditor'::"public"."app_role"));



CREATE POLICY "Auditors can view inventory" ON "public"."inventory" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'auditor'::"public"."app_role"));



CREATE POLICY "Auditors can view orders" ON "public"."orders" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'auditor'::"public"."app_role"));



CREATE POLICY "Auditors can view role audit" ON "public"."role_audit_log" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'auditor'::"public"."app_role"));



CREATE POLICY "Auditors can view stock levels" ON "public"."stock_levels" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'auditor'::"public"."app_role"));



CREATE POLICY "Block non-admin access to guest orders" ON "public"."orders" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ((("user_id" IS NOT NULL) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Block non-admin role inserts" ON "public"."user_roles" AS RESTRICTIVE FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Deny anon access" ON "public"."admin_config" AS RESTRICTIVE TO "anon" USING (false) WITH CHECK (false);



CREATE POLICY "Deny anon access" ON "public"."colissimo_bordereaux" AS RESTRICTIVE TO "anon" USING (false) WITH CHECK (false);



CREATE POLICY "Deny anon access" ON "public"."notification_config" AS RESTRICTIVE TO "anon" USING (false) WITH CHECK (false);



CREATE POLICY "Deny anon access" ON "public"."notification_log" AS RESTRICTIVE TO "anon" USING (false) WITH CHECK (false);



CREATE POLICY "Deny anon access" ON "public"."role_audit_log" AS RESTRICTIVE TO "anon" USING (false) WITH CHECK (false);



CREATE POLICY "Deny anon access" ON "public"."stock_history" AS RESTRICTIVE TO "anon" USING (false) WITH CHECK (false);



CREATE POLICY "Deny anon access" ON "public"."stock_transfers" AS RESTRICTIVE TO "anon" USING (false) WITH CHECK (false);



CREATE POLICY "Deny anon access to stock_levels" ON "public"."stock_levels" AS RESTRICTIVE TO "anon" USING (false) WITH CHECK (false);



CREATE POLICY "Deny anon access to user_roles" ON "public"."user_roles" TO "anon" USING (false) WITH CHECK (false);



CREATE POLICY "Deny anon preparations" ON "public"."order_preparations" AS RESTRICTIVE TO "anon" USING (false) WITH CHECK (false);



CREATE POLICY "Deny anon promo_codes" ON "public"."promo_codes" AS RESTRICTIVE FOR SELECT TO "anon" USING (false);



CREATE POLICY "Deny anon read on roulette_spins" ON "public"."roulette_spins" AS RESTRICTIVE FOR SELECT TO "anon" USING (false);



CREATE POLICY "Deny anon reads on bot_config" ON "public"."bot_config" AS RESTRICTIVE FOR SELECT TO "anon" USING (false);



CREATE POLICY "Deny anon reads on design_settings" ON "public"."design_settings" AS RESTRICTIVE FOR SELECT TO "anon" USING (false);



CREATE POLICY "Deny anon reads on inventory" ON "public"."inventory" AS RESTRICTIVE FOR SELECT TO "anon" USING (false);



CREATE POLICY "Deny anon reads on roulette_config" ON "public"."roulette_config" AS RESTRICTIVE FOR SELECT TO "anon" USING (false);



CREATE POLICY "Deny anon reads on roulette_segments" ON "public"."roulette_segments" AS RESTRICTIVE FOR SELECT TO "anon" USING (false);



CREATE POLICY "Deny popup view deletes" ON "public"."newsletter_popup_views" AS RESTRICTIVE FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "Deny popup view updates" ON "public"."newsletter_popup_views" AS RESTRICTIVE FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);



CREATE POLICY "Deny visitor session updates" ON "public"."visitor_sessions" AS RESTRICTIVE FOR UPDATE TO "authenticated", "anon" USING (false) WITH CHECK (false);



CREATE POLICY "No client access to gateway secrets" ON "public"."payment_gateway_secrets" AS RESTRICTIVE TO "authenticated", "anon" USING (false) WITH CHECK (false);



CREATE POLICY "Preparators update their assigned preparations" ON "public"."order_preparations" FOR UPDATE USING ((("assigned_to" = "auth"."uid"()) AND "public"."has_role"("auth"."uid"(), 'preparator'::"public"."app_role")));



CREATE POLICY "Preparators view their assigned preparations" ON "public"."order_preparations" FOR SELECT USING ((("assigned_to" = "auth"."uid"()) AND "public"."has_role"("auth"."uid"(), 'preparator'::"public"."app_role")));



CREATE POLICY "Public can read templates in use" ON "public"."page_templates" FOR SELECT TO "authenticated", "anon" USING ((("is_default" = true) OR (EXISTS ( SELECT 1
   FROM "public"."products" "p"
  WHERE ("p"."template_id" = "page_templates"."id"))) OR (EXISTS ( SELECT 1
   FROM "public"."categories" "c"
  WHERE ("c"."template_id" = "page_templates"."id")))));



CREATE POLICY "Public reads approved reviews" ON "public"."product_reviews" FOR SELECT USING (("status" = 'approved'::"text"));



CREATE POLICY "Redirects are publicly readable" ON "public"."seo_redirects" FOR SELECT USING (true);



CREATE POLICY "Restrict admin_config reads to admins" ON "public"."admin_config" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Restrict bot_config reads to admins" ON "public"."bot_config" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Restrict chat log reads to admins" ON "public"."chat_logs" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Restrict colissimo_bordereaux reads to admins" ON "public"."colissimo_bordereaux" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Restrict design_settings reads to admins" ON "public"."design_settings" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Restrict message reads to admins" ON "public"."messages" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Restrict newsletter reads to admins" ON "public"."newsletters" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Restrict notification_config reads to admins" ON "public"."notification_config" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Restrict notification_log reads to admins" ON "public"."notification_log" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Restrict preparation reads to staff or assignee" ON "public"."order_preparations" AS RESTRICTIVE FOR SELECT TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'stock_manager'::"public"."app_role") OR (("assigned_to" = "auth"."uid"()) AND "public"."has_role"("auth"."uid"(), 'preparator'::"public"."app_role"))));



CREATE POLICY "Restrict promo_codes reads to admins" ON "public"."promo_codes" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Restrict roulette_config reads to admins" ON "public"."roulette_config" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Restrict roulette_segments reads to admins" ON "public"."roulette_segments" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Restrict roulette_spins reads to owner or admin" ON "public"."roulette_spins" AS RESTRICTIVE FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Restrict stock history reads to staff" ON "public"."stock_history" AS RESTRICTIVE FOR SELECT TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'stock_manager'::"public"."app_role")));



CREATE POLICY "Restrict stock transfer reads to staff" ON "public"."stock_transfers" AS RESTRICTIVE FOR SELECT TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'stock_manager'::"public"."app_role")));



CREATE POLICY "Service role can insert send log" ON "public"."email_send_log" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can insert suppressed emails" ON "public"."suppressed_emails" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can insert tokens" ON "public"."email_unsubscribe_tokens" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage send state" ON "public"."email_send_state" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can mark tokens as used" ON "public"."email_unsubscribe_tokens" FOR UPDATE USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can read send log" ON "public"."email_send_log" FOR SELECT USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can read suppressed emails" ON "public"."suppressed_emails" FOR SELECT USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can read tokens" ON "public"."email_unsubscribe_tokens" FOR SELECT USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can update send log" ON "public"."email_send_log" FOR UPDATE USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Staff can view inventory" ON "public"."inventory" FOR SELECT TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'stock_manager'::"public"."app_role")));



CREATE POLICY "Staff can view stock levels" ON "public"."stock_levels" FOR SELECT TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'stock_manager'::"public"."app_role")));



CREATE POLICY "Stock managers manage preparations" ON "public"."order_preparations" USING ("public"."has_role"("auth"."uid"(), 'stock_manager'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'stock_manager'::"public"."app_role"));



CREATE POLICY "Subscribers can unsubscribe themselves" ON "public"."newsletters" FOR UPDATE TO "authenticated" USING (("lower"("email") = "lower"(COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text")))) WITH CHECK (("lower"("email") = "lower"(COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text"))));



CREATE POLICY "Users can delete their own reviews" ON "public"."product_reviews" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Users can edit their pending reviews within 30 days" ON "public"."product_reviews" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) AND ("status" = 'pending'::"text") AND ("created_at" > ("now"() - '30 days'::interval)))) WITH CHECK ((("user_id" = "auth"."uid"()) AND ("status" = 'pending'::"text")));



CREATE POLICY "Users can insert their own customer profile" ON "public"."customers" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own addresses" ON "public"."addresses" USING (("customer_id" IN ( SELECT "customers"."id"
   FROM "public"."customers"
  WHERE ("customers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage their own cart" ON "public"."cart_items" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own wishlist" ON "public"."wishlists" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own customer profile" ON "public"."customers" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own customer profile" ON "public"."customers" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own loyalty transactions" ON "public"."loyalty_transactions" FOR SELECT USING (("customer_id" IN ( SELECT "customers"."id"
   FROM "public"."customers"
  WHERE ("customers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own orders" ON "public"."orders" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own roles" ON "public"."user_roles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users delete their own votes" ON "public"."product_review_votes" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users insert their own votes" ON "public"."product_review_votes" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users manage their own looks" ON "public"."tryon_looks" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users read their own reviews" ON "public"."product_reviews" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users read their own votes" ON "public"."product_review_votes" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users view own spins" ON "public"."roulette_spins" FOR SELECT USING ((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"())));



ALTER TABLE "public"."addresses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_access_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_access_log_insert" ON "public"."admin_access_log" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'stock_manager'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'preparator'::"public"."app_role"))));



CREATE POLICY "admin_access_log_select" ON "public"."admin_access_log" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



ALTER TABLE "public"."admin_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."auth_email_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."banner_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."banners" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bot_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."boutiques" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cart_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."category_hero_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cgv_consents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."checkout_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."click_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_error_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."colissimo_bordereaux" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."crm_contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."crm_conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."crm_message_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."crm_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_email_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "deny_direct_order_insert" ON "public"."orders" AS RESTRICTIVE FOR INSERT TO "authenticated", "anon" WITH CHECK (false);



ALTER TABLE "public"."design_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_send_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_send_state" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "email_templates_admin_all" ON "public"."email_templates" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



ALTER TABLE "public"."email_unsubscribe_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."faq_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."home_fab_buttons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."loyalty_rewards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."loyalty_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mannequins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messaging_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."newsletter_campaign_sends" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."newsletter_campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."newsletter_popup_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."newsletter_popups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."newsletters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_preparations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_tracking_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_tracking_events_admin_select" ON "public"."order_tracking_events" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "order_tracking_events_owner_select" ON "public"."order_tracking_events" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_tracking_events"."order_id") AND ("o"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."page_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."page_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."password_reset_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_gateway_secrets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paypal_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paypal_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paypal_webhook_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payplug_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."popup_campaigns" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "popup_campaigns_admin_all" ON "public"."popup_campaigns" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "popup_campaigns_public_read_active" ON "public"."popup_campaigns" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



ALTER TABLE "public"."popup_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "popup_events_admin_read" ON "public"."popup_events" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "popup_events_public_insert" ON "public"."popup_events" FOR INSERT TO "authenticated", "anon" WITH CHECK (("event" = ANY (ARRAY['view'::"text", 'click'::"text", 'dismiss'::"text", 'convert'::"text"])));



ALTER TABLE "public"."product_category_order" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_looks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_review_votes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_styles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."promo_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."role_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "role_permissions_admin_write" ON "public"."role_permissions" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "role_permissions_select_authenticated" ON "public"."role_permissions" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."roulette_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roulette_segments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roulette_spins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."seo_redirects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_levels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_transfers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suppressed_emails" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tryon_looks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."visitor_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wishlists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."woocommerce_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "woocommerce_config_admin_all" ON "public"."woocommerce_config" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



ALTER TABLE "public"."woocommerce_stats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "woocommerce_stats_admin_all" ON "public"."woocommerce_stats" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



ALTER TABLE "public"."wp_sync_logs" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."categories" ("id");



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."order_tracking_events";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."orders";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."products" ("id");



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."audit_role_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_role_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_role_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_create_category_page"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_create_category_page"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_create_category_page"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_create_inventory_on_product_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_create_inventory_on_product_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_create_inventory_on_product_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."award_loyalty_points"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."award_loyalty_points"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."award_loyalty_points"("p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_user_review_product"("p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_user_review_product"("p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_user_review_product"("p_product_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."consume_order_stock"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."consume_order_stock"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."consume_order_stock"("p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."default_collab_limited_edition"() TO "anon";
GRANT ALL ON FUNCTION "public"."default_collab_limited_edition"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."default_collab_limited_edition"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_category_page"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_category_page"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_category_page"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."ensure_customer_profile"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ensure_customer_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_customer_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."find_user_by_email"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."find_user_by_email"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_user_by_email"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_category_slug"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_category_slug"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_category_slug"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_newsletter_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_newsletter_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_newsletter_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_product_review_stats"("p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_product_review_stats"("p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_product_review_stats"("p_product_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."list_users_by_role"("p_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."list_users_by_role"("p_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_users_by_role"("p_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_popup_converted"("p_popup_id" "uuid", "p_session_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_popup_converted"("p_popup_id" "uuid", "p_session_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_popup_converted"("p_popup_id" "uuid", "p_session_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."moderate_review"("p_review_id" "uuid", "p_action" "text", "p_reply" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."moderate_review"("p_review_id" "uuid", "p_action" "text", "p_reply" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."moderate_review"("p_review_id" "uuid", "p_action" "text", "p_reply" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_order_statuses"() TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_order_statuses"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_order_statuses"() TO "service_role";



GRANT ALL ON FUNCTION "public"."preview_promo_code"("p_code" "text", "p_subtotal" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."preview_promo_code"("p_code" "text", "p_subtotal" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."preview_promo_code"("p_code" "text", "p_subtotal" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."record_cgv_consent"("p_version" "text", "p_accepted" boolean, "p_session_hash" "text", "p_user_agent" "text", "p_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_cgv_consent"("p_version" "text", "p_accepted" boolean, "p_session_hash" "text", "p_user_agent" "text", "p_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_cgv_consent"("p_version" "text", "p_accepted" boolean, "p_session_hash" "text", "p_user_agent" "text", "p_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."redeem_loyalty_reward"("p_reward_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."redeem_loyalty_reward"("p_reward_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."redeem_loyalty_reward"("p_reward_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."release_order_stock"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."release_order_stock"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."release_order_stock"("p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reserve_order_stock"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reserve_order_stock"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reserve_order_stock"("p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."sanitize_techwear_hero"() TO "anon";
GRANT ALL ON FUNCTION "public"."sanitize_techwear_hero"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sanitize_techwear_hero"() TO "service_role";



GRANT ALL ON FUNCTION "public"."security_audit_snapshot"() TO "anon";
GRANT ALL ON FUNCTION "public"."security_audit_snapshot"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."security_audit_snapshot"() TO "service_role";



GRANT ALL ON FUNCTION "public"."spin_roulette"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."spin_roulette"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."spin_roulette"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."spin_roulette"("p_email" "text", "p_ip_hash" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."spin_roulette"("p_email" "text", "p_ip_hash" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."spin_roulette"("p_email" "text", "p_ip_hash" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_product_review"("p_product_id" "uuid", "p_rating" smallint, "p_title" "text", "p_comment" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_product_review"("p_product_id" "uuid", "p_rating" smallint, "p_title" "text", "p_comment" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_product_review"("p_product_id" "uuid", "p_rating" smallint, "p_title" "text", "p_comment" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_category_page"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_category_page"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_category_page"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_crm_conversation"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_crm_conversation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_crm_conversation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."track_session_heartbeat"("p_session_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."track_session_heartbeat"("p_session_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_session_heartbeat"("p_session_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_award_loyalty_points"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_award_loyalty_points"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_award_loyalty_points"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."uppercase_product_subtitle"() TO "anon";
GRANT ALL ON FUNCTION "public"."uppercase_product_subtitle"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."uppercase_product_subtitle"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_and_create_order"("p_items" "jsonb", "p_promo_code" "text", "p_delivery_mode" "text", "p_order_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_and_create_order"("p_items" "jsonb", "p_promo_code" "text", "p_delivery_mode" "text", "p_order_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_and_create_order"("p_items" "jsonb", "p_promo_code" "text", "p_delivery_mode" "text", "p_order_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."vote_review_helpful"("p_review_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."vote_review_helpful"("p_review_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vote_review_helpful"("p_review_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."addresses" TO "anon";
GRANT ALL ON TABLE "public"."addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."addresses" TO "service_role";



GRANT ALL ON TABLE "public"."admin_access_log" TO "anon";
GRANT ALL ON TABLE "public"."admin_access_log" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_access_log" TO "service_role";



GRANT ALL ON TABLE "public"."admin_config" TO "anon";
GRANT ALL ON TABLE "public"."admin_config" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_config" TO "service_role";



GRANT ALL ON TABLE "public"."auth_email_templates" TO "anon";
GRANT ALL ON TABLE "public"."auth_email_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_email_templates" TO "service_role";



GRANT ALL ON TABLE "public"."banner_analytics" TO "anon";
GRANT ALL ON TABLE "public"."banner_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."banner_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."banners" TO "anon";
GRANT ALL ON TABLE "public"."banners" TO "authenticated";
GRANT ALL ON TABLE "public"."banners" TO "service_role";



GRANT ALL ON TABLE "public"."bot_config" TO "anon";
GRANT ALL ON TABLE "public"."bot_config" TO "authenticated";
GRANT ALL ON TABLE "public"."bot_config" TO "service_role";



GRANT ALL ON TABLE "public"."bot_config_public" TO "anon";
GRANT ALL ON TABLE "public"."bot_config_public" TO "authenticated";
GRANT ALL ON TABLE "public"."bot_config_public" TO "service_role";



GRANT ALL ON TABLE "public"."boutiques" TO "anon";
GRANT ALL ON TABLE "public"."boutiques" TO "authenticated";
GRANT ALL ON TABLE "public"."boutiques" TO "service_role";



GRANT ALL ON TABLE "public"."cart_items" TO "anon";
GRANT ALL ON TABLE "public"."cart_items" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_items" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."category_hero_settings" TO "anon";
GRANT ALL ON TABLE "public"."category_hero_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."category_hero_settings" TO "service_role";



GRANT ALL ON TABLE "public"."cgv_consents" TO "anon";
GRANT ALL ON TABLE "public"."cgv_consents" TO "authenticated";
GRANT ALL ON TABLE "public"."cgv_consents" TO "service_role";



GRANT ALL ON TABLE "public"."chat_logs" TO "anon";
GRANT ALL ON TABLE "public"."chat_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_logs" TO "service_role";



GRANT ALL ON TABLE "public"."checkout_config" TO "anon";
GRANT ALL ON TABLE "public"."checkout_config" TO "authenticated";
GRANT ALL ON TABLE "public"."checkout_config" TO "service_role";



GRANT ALL ON TABLE "public"."checkout_config_public" TO "anon";
GRANT ALL ON TABLE "public"."checkout_config_public" TO "authenticated";
GRANT ALL ON TABLE "public"."checkout_config_public" TO "service_role";



GRANT ALL ON TABLE "public"."click_events" TO "anon";
GRANT ALL ON TABLE "public"."click_events" TO "authenticated";
GRANT ALL ON TABLE "public"."click_events" TO "service_role";



GRANT ALL ON TABLE "public"."client_error_logs" TO "anon";
GRANT ALL ON TABLE "public"."client_error_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."client_error_logs" TO "service_role";



GRANT ALL ON TABLE "public"."colissimo_bordereaux" TO "anon";
GRANT ALL ON TABLE "public"."colissimo_bordereaux" TO "authenticated";
GRANT ALL ON TABLE "public"."colissimo_bordereaux" TO "service_role";



GRANT ALL ON TABLE "public"."crm_contacts" TO "anon";
GRANT ALL ON TABLE "public"."crm_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_contacts" TO "service_role";



GRANT ALL ON TABLE "public"."crm_conversations" TO "anon";
GRANT ALL ON TABLE "public"."crm_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."crm_message_templates" TO "anon";
GRANT ALL ON TABLE "public"."crm_message_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_message_templates" TO "service_role";



GRANT ALL ON TABLE "public"."crm_messages" TO "anon";
GRANT ALL ON TABLE "public"."crm_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_messages" TO "service_role";



GRANT ALL ON TABLE "public"."customer_email_log" TO "anon";
GRANT ALL ON TABLE "public"."customer_email_log" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_email_log" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."design_settings" TO "anon";
GRANT ALL ON TABLE "public"."design_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."design_settings" TO "service_role";



GRANT ALL ON TABLE "public"."design_settings_public" TO "anon";
GRANT ALL ON TABLE "public"."design_settings_public" TO "authenticated";
GRANT ALL ON TABLE "public"."design_settings_public" TO "service_role";



GRANT ALL ON TABLE "public"."email_send_log" TO "anon";
GRANT ALL ON TABLE "public"."email_send_log" TO "authenticated";
GRANT ALL ON TABLE "public"."email_send_log" TO "service_role";



GRANT ALL ON TABLE "public"."email_send_state" TO "anon";
GRANT ALL ON TABLE "public"."email_send_state" TO "authenticated";
GRANT ALL ON TABLE "public"."email_send_state" TO "service_role";



GRANT ALL ON TABLE "public"."email_templates" TO "anon";
GRANT ALL ON TABLE "public"."email_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."email_templates" TO "service_role";



GRANT ALL ON TABLE "public"."email_unsubscribe_tokens" TO "anon";
GRANT ALL ON TABLE "public"."email_unsubscribe_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."email_unsubscribe_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."faq_items" TO "anon";
GRANT ALL ON TABLE "public"."faq_items" TO "authenticated";
GRANT ALL ON TABLE "public"."faq_items" TO "service_role";



GRANT ALL ON TABLE "public"."home_fab_buttons" TO "anon";
GRANT ALL ON TABLE "public"."home_fab_buttons" TO "authenticated";
GRANT ALL ON TABLE "public"."home_fab_buttons" TO "service_role";



GRANT ALL ON TABLE "public"."inventory" TO "anon";
GRANT ALL ON TABLE "public"."inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory" TO "service_role";



GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";



GRANT ALL ON TABLE "public"."loyalty_rewards" TO "anon";
GRANT ALL ON TABLE "public"."loyalty_rewards" TO "authenticated";
GRANT ALL ON TABLE "public"."loyalty_rewards" TO "service_role";



GRANT ALL ON TABLE "public"."loyalty_transactions" TO "anon";
GRANT ALL ON TABLE "public"."loyalty_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."loyalty_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."mannequins" TO "anon";
GRANT ALL ON TABLE "public"."mannequins" TO "authenticated";
GRANT ALL ON TABLE "public"."mannequins" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."messaging_config" TO "anon";
GRANT ALL ON TABLE "public"."messaging_config" TO "authenticated";
GRANT ALL ON TABLE "public"."messaging_config" TO "service_role";



GRANT ALL ON TABLE "public"."newsletter_campaign_sends" TO "anon";
GRANT ALL ON TABLE "public"."newsletter_campaign_sends" TO "authenticated";
GRANT ALL ON TABLE "public"."newsletter_campaign_sends" TO "service_role";



GRANT ALL ON TABLE "public"."newsletter_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."newsletter_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."newsletter_campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."newsletter_popup_views" TO "anon";
GRANT ALL ON TABLE "public"."newsletter_popup_views" TO "authenticated";
GRANT ALL ON TABLE "public"."newsletter_popup_views" TO "service_role";



GRANT ALL ON TABLE "public"."newsletter_popups" TO "anon";
GRANT ALL ON TABLE "public"."newsletter_popups" TO "authenticated";
GRANT ALL ON TABLE "public"."newsletter_popups" TO "service_role";



GRANT ALL ON TABLE "public"."newsletters" TO "anon";
GRANT ALL ON TABLE "public"."newsletters" TO "authenticated";
GRANT ALL ON TABLE "public"."newsletters" TO "service_role";



GRANT ALL ON TABLE "public"."notification_config" TO "anon";
GRANT ALL ON TABLE "public"."notification_config" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_config" TO "service_role";



GRANT ALL ON TABLE "public"."notification_log" TO "anon";
GRANT ALL ON TABLE "public"."notification_log" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_log" TO "service_role";



GRANT ALL ON TABLE "public"."order_preparations" TO "anon";
GRANT ALL ON TABLE "public"."order_preparations" TO "authenticated";
GRANT ALL ON TABLE "public"."order_preparations" TO "service_role";



GRANT ALL ON TABLE "public"."order_tracking_events" TO "anon";
GRANT ALL ON TABLE "public"."order_tracking_events" TO "authenticated";
GRANT ALL ON TABLE "public"."order_tracking_events" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."page_templates" TO "anon";
GRANT ALL ON TABLE "public"."page_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."page_templates" TO "service_role";



GRANT ALL ON TABLE "public"."page_views" TO "anon";
GRANT ALL ON TABLE "public"."page_views" TO "authenticated";
GRANT ALL ON TABLE "public"."page_views" TO "service_role";



GRANT ALL ON TABLE "public"."pages" TO "anon";
GRANT ALL ON TABLE "public"."pages" TO "authenticated";
GRANT ALL ON TABLE "public"."pages" TO "service_role";



GRANT ALL ON TABLE "public"."password_reset_attempts" TO "anon";
GRANT ALL ON TABLE "public"."password_reset_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."password_reset_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."payment_gateway_secrets" TO "anon";
GRANT ALL ON TABLE "public"."payment_gateway_secrets" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_gateway_secrets" TO "service_role";



GRANT ALL ON TABLE "public"."paypal_config" TO "anon";
GRANT ALL ON TABLE "public"."paypal_config" TO "authenticated";
GRANT ALL ON TABLE "public"."paypal_config" TO "service_role";



GRANT ALL ON TABLE "public"."paypal_config_public" TO "anon";
GRANT ALL ON TABLE "public"."paypal_config_public" TO "authenticated";
GRANT ALL ON TABLE "public"."paypal_config_public" TO "service_role";



GRANT ALL ON TABLE "public"."paypal_transactions" TO "anon";
GRANT ALL ON TABLE "public"."paypal_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."paypal_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."paypal_webhook_events" TO "anon";
GRANT ALL ON TABLE "public"."paypal_webhook_events" TO "authenticated";
GRANT ALL ON TABLE "public"."paypal_webhook_events" TO "service_role";



GRANT ALL ON TABLE "public"."payplug_transactions" TO "anon";
GRANT ALL ON TABLE "public"."payplug_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."payplug_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."popup_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."popup_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."popup_campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."popup_events" TO "anon";
GRANT ALL ON TABLE "public"."popup_events" TO "authenticated";
GRANT ALL ON TABLE "public"."popup_events" TO "service_role";



GRANT ALL ON TABLE "public"."product_category_order" TO "anon";
GRANT ALL ON TABLE "public"."product_category_order" TO "authenticated";
GRANT ALL ON TABLE "public"."product_category_order" TO "service_role";



GRANT ALL ON TABLE "public"."product_looks" TO "anon";
GRANT ALL ON TABLE "public"."product_looks" TO "authenticated";
GRANT ALL ON TABLE "public"."product_looks" TO "service_role";



GRANT ALL ON TABLE "public"."product_review_votes" TO "anon";
GRANT ALL ON TABLE "public"."product_review_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."product_review_votes" TO "service_role";



GRANT ALL ON TABLE "public"."product_reviews" TO "anon";
GRANT ALL ON TABLE "public"."product_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."product_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."product_styles" TO "anon";
GRANT ALL ON TABLE "public"."product_styles" TO "authenticated";
GRANT ALL ON TABLE "public"."product_styles" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."promo_codes" TO "anon";
GRANT ALL ON TABLE "public"."promo_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."promo_codes" TO "service_role";



GRANT ALL ON TABLE "public"."role_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."role_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."role_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."roulette_config" TO "anon";
GRANT ALL ON TABLE "public"."roulette_config" TO "authenticated";
GRANT ALL ON TABLE "public"."roulette_config" TO "service_role";



GRANT ALL ON TABLE "public"."roulette_config_public" TO "anon";
GRANT ALL ON TABLE "public"."roulette_config_public" TO "authenticated";
GRANT ALL ON TABLE "public"."roulette_config_public" TO "service_role";



GRANT ALL ON TABLE "public"."roulette_segments" TO "anon";
GRANT ALL ON TABLE "public"."roulette_segments" TO "authenticated";
GRANT ALL ON TABLE "public"."roulette_segments" TO "service_role";



GRANT ALL ON TABLE "public"."roulette_segments_public" TO "anon";
GRANT ALL ON TABLE "public"."roulette_segments_public" TO "authenticated";
GRANT ALL ON TABLE "public"."roulette_segments_public" TO "service_role";



GRANT ALL ON TABLE "public"."roulette_spins" TO "anon";
GRANT ALL ON TABLE "public"."roulette_spins" TO "authenticated";
GRANT ALL ON TABLE "public"."roulette_spins" TO "service_role";



GRANT ALL ON TABLE "public"."seo_redirects" TO "anon";
GRANT ALL ON TABLE "public"."seo_redirects" TO "authenticated";
GRANT ALL ON TABLE "public"."seo_redirects" TO "service_role";



GRANT ALL ON TABLE "public"."stock_history" TO "anon";
GRANT ALL ON TABLE "public"."stock_history" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_history" TO "service_role";



GRANT ALL ON TABLE "public"."stock_levels" TO "anon";
GRANT ALL ON TABLE "public"."stock_levels" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_levels" TO "service_role";



GRANT ALL ON TABLE "public"."stock_transfers" TO "anon";
GRANT ALL ON TABLE "public"."stock_transfers" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_transfers" TO "service_role";



GRANT ALL ON TABLE "public"."suppressed_emails" TO "anon";
GRANT ALL ON TABLE "public"."suppressed_emails" TO "authenticated";
GRANT ALL ON TABLE "public"."suppressed_emails" TO "service_role";



GRANT ALL ON TABLE "public"."tryon_looks" TO "anon";
GRANT ALL ON TABLE "public"."tryon_looks" TO "authenticated";
GRANT ALL ON TABLE "public"."tryon_looks" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles_with_email" TO "anon";
GRANT ALL ON TABLE "public"."user_roles_with_email" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles_with_email" TO "service_role";



GRANT ALL ON TABLE "public"."visitor_sessions" TO "anon";
GRANT ALL ON TABLE "public"."visitor_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."visitor_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."wishlists" TO "anon";
GRANT ALL ON TABLE "public"."wishlists" TO "authenticated";
GRANT ALL ON TABLE "public"."wishlists" TO "service_role";



GRANT ALL ON TABLE "public"."woocommerce_config" TO "anon";
GRANT ALL ON TABLE "public"."woocommerce_config" TO "authenticated";
GRANT ALL ON TABLE "public"."woocommerce_config" TO "service_role";



GRANT ALL ON TABLE "public"."woocommerce_stats" TO "anon";
GRANT ALL ON TABLE "public"."woocommerce_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."woocommerce_stats" TO "service_role";



GRANT ALL ON TABLE "public"."wp_sync_logs" TO "anon";
GRANT ALL ON TABLE "public"."wp_sync_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."wp_sync_logs" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";

































-- =============================================================================
-- STORAGE — ajouté à la main, absent du dump
-- =============================================================================
--
-- `supabase db dump` ne sort que le schéma `public`. Les buckets et les
-- politiques de `storage.objects` en sont donc absents — et c'est précisément
-- ce que le transfert du 04/09 avait perdu :
--
--   · le bucket `labels` n'existait pas, `create-colissimo-label` échouait sur
--     « Bucket not found » APRÈS avoir fait affranchir le colis chez Colissimo ;
--   · `storage.objects` n'avait AUCUNE politique — RLS active, zéro règle, donc
--     tout refusé pour `authenticated`. Le back-office ne pouvait plus envoyer
--     la moindre image (« new row violates row-level security policy »).
--
-- Ces deux pannes sont restées invisibles longtemps parce que seuls les accès
-- NAVIGATEUR étaient touchés : l'affichage public passe par
-- /storage/v1/object/public/, et les edge functions par la clé service_role.
-- Deux chemins qui contournent la RLS.
--
-- Reprend 20260208144212, 20260505103928, 20260818142129, 20260831101715 et
-- 20260908061500 (voir `_archive/`), normalisés sur `::app_role` et restreints
-- `TO authenticated`.
-- -----------------------------------------------------------------------------

-- Buckets ---------------------------------------------------------------------

-- Public en lecture : images du catalogue, bannières, médias du site.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media', 'media', true, 104857600,
  ARRAY[
    'image/jpeg','image/png','image/webp','image/gif','image/svg+xml',
    'image/avif','image/bmp','image/tiff',
    'video/mp4','video/webm','video/quicktime','video/ogg','video/x-matroska',
    'audio/mpeg','audio/wav','audio/ogg','audio/mp4'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ⚠️ Privé, et cela doit le rester : une étiquette porte le nom, l'adresse et le
-- téléphone du destinataire. La lecture passe par des URL signées, émises côté
-- serveur.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('labels', 'labels', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Politiques du bucket `media` ------------------------------------------------
--
-- ⚠️ Pas de politique SELECT pour `anon` : c'est volontaire depuis
-- 20260505103928. La lecture publique emprunte l'URL publique, qui ne consulte
-- pas la RLS ; ouvrir le SELECT ici autoriserait en plus le LISTAGE du bucket.

DROP POLICY IF EXISTS "Admins can list media" ON storage.objects;
CREATE POLICY "Admins can list media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can upload media" ON storage.objects;
CREATE POLICY "Admins can upload media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- `upsert: true` côté client (AdminDesign, InventoryProductDialog, Bulk*) : un
-- remplacement déclenche un UPDATE, pas un INSERT. Sans cette politique, seul le
-- tout premier envoi d'un chemin donné passerait.
DROP POLICY IF EXISTS "Admins can update media" ON storage.objects;
CREATE POLICY "Admins can update media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete media" ON storage.objects;
CREATE POLICY "Admins can delete media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Politiques du bucket `labels` -----------------------------------------------
-- Les préparateurs lisent, seuls les admins écrivent.

DROP POLICY IF EXISTS "Admins can read labels" ON storage.objects;
CREATE POLICY "Admins can read labels"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'labels'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'preparator'::public.app_role)
  )
);

DROP POLICY IF EXISTS "Admins can write labels" ON storage.objects;
CREATE POLICY "Admins can write labels"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'labels' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update labels" ON storage.objects;
CREATE POLICY "Admins can update labels"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'labels' AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'labels' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete labels" ON storage.objects;
CREATE POLICY "Admins can delete labels"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'labels' AND public.has_role(auth.uid(), 'admin'::public.app_role));
