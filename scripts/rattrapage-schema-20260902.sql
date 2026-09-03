-- ═══════════════════════════════════════════════════════════════════════
--  RATTRAPAGE DE SCHÉMA — projet hzjzqdlyehclnpeqkier          02/09/2026
--
--  Rejoue les 14 migrations jamais appliquées à cette base. Au retour sur le
--  projet d'origine, le registre n'a pas été relu : Lovable écrivait encore
--  dans bumfyrfmormisyjletpb.
--
--  Comble 15 tables + 33 colonnes manquantes.
--  Ne supprime AUCUNE donnée : les seuls DROP portent sur des vues, politiques
--  et triggers recréés dans la foulée, plus un DROP NOT NULL qui assouplit.
--
--  ⚠️ TOUT EST DANS UNE SEULE TRANSACTION. Au moindre échec, rien n'est
--     appliqué — on relit l'erreur et on recommence, sans état intermédiaire.
--
--  Trois blocs sont volontairement écartés (voir « ÉCARTÉ » dans le corps) :
--  les extensions pgmq/pg_cron/vault, les wrappers RPC de file, et le cron
--  de suivi colis. Aucun n'est nécessaire au schéma.
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════
--  1/14  20260824112441_bcbd04ac-eb6b-4e91-be53-b3eca47edda6
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.design_settings ADD COLUMN IF NOT EXISTS legal_pages jsonb NOT NULL DEFAULT '{}'::jsonb;

DROP VIEW IF EXISTS public.design_settings_public;
CREATE VIEW public.design_settings_public AS
 SELECT id, settings_key, sidebar_bg, accent_color, sidebar_gradient, gradient_intensity,
    show_logo, show_stats, show_unit_id, show_overlays, hud_logo, unit_id_label, custom_unit_id,
    stats_label, stats_sub_label, background_watermark, stats, hud_buttons, glitch_duration,
    glitch_intensity, click_scale, logo_style, stats_style, unit_id_style, social_style,
    background_media, is_slideshow_active, slideshow_speed, hero_slides, slider_auto_play,
    slider_speed, show_slider_overlay, slider_grayscale, social_links, social_display_mode,
    home_sections, presets, schedules, pages, created_at, updated_at, sidebar_image,
    category_columns, header_preset, header_bg_color, header_text_color, header_fixed, top_banner,
    footer_logo, favicon_url, header_nav_items, site_name, site_tagline, sidebar_reappear_delay,
    slider_height, site_spacing, category_layout, show_sidebar_product_card, show_sidebar_sizes,
    show_sidebar_stats, show_sidebar_gallery, show_sidebar_product_number, sidebar_slider_enabled,
    sidebar_slider_speed, sidebar_slider_max_products, sidebar_brand_name, sidebar_brand_subtitle,
    sidebar_info_text, sidebar_product_title, sidebar_product_description, sidebar_sizes,
    sidebar_image_opacity, mobile_sidebar_image, mobile_sidebar_media_type, stat_bar_filled_color,
    stat_bar_empty_color, mannequin_hotspots, sidebar_brand_position, legal_company_name,
    legal_company_form, legal_capital, legal_address, legal_zip, legal_city, admin_section_colors,
    techwear_hero, logo_size, logo_background_shape, logo_background_color, logo_background_padding,
    show_sidebar_newsletter, sidebar_newsletter_title, sidebar_newsletter_cta, voice_command_enabled,
    voice_onboarding_hint, global_product_sizes, home_custom_sections, home_page_blocks,
    color_display_mode, home_texts, seo_indexable, seo_noimageindex, seo_default_title,
    seo_default_description, seo_og_image, maintenance_enabled, maintenance_title,
    maintenance_message, maintenance_until, maintenance_image, maintenance_bg,
    maintenance_admin_bypass, legal_siret, legal_rcs, legal_vat, legal_director, legal_rgpd_email,
    legal_return_email, contact_email, contact_phone, collab_settings, shop_hover_effect,
    footer_config, legal_pages
   FROM design_settings;

GRANT SELECT ON public.design_settings_public TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════
--  2/14  20260827100317_d77a0b53-6a96-4e32-ac69-8e0025026822
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS zip TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT;

CREATE TABLE IF NOT EXISTS public.customer_email_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_email TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  email_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  provider_id TEXT,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.customer_email_log TO authenticated;
GRANT ALL ON public.customer_email_log TO service_role;
ALTER TABLE public.customer_email_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read email log" ON public.customer_email_log;
CREATE POLICY "Admins can read email log" ON public.customer_email_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS customer_email_log_email_idx ON public.customer_email_log (customer_email, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
--  3/14  20260827131015_56fb2519-8335-4cf3-8b36-5501926096be
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE public.auth_email_templates (
  key text PRIMARY KEY,
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  published jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.auth_email_templates TO authenticated;
GRANT ALL ON public.auth_email_templates TO service_role;

ALTER TABLE public.auth_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage auth email templates"
ON public.auth_email_templates FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER auth_email_templates_updated_at
BEFORE UPDATE ON public.auth_email_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
--  4/14  20260827140407_21a1145b-e21e-4509-8f23-d7801852e192
-- ═══════════════════════════════════════════════════════════════

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

-- ⚠️ ÉCARTÉ : CREATE EXTENSION pg_cron/pg_net + planification du job
--    'poll-carrier-tracking-hourly'. Le garde-fou __ANON_KEY__ lève une
--    exception tant que la clé n'est pas renseignée, ce qui annulerait
--    TOUTE la transaction. À rejouer séparément (étape optionnelle).


-- ═══════════════════════════════════════════════════════════════
--  5/14  20260827144119_919b8785-8c09-42bd-80f9-af4e80933a62
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sold_out_badge boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sold_out_label text;

-- ═══════════════════════════════════════════════════════════════
--  6/14  20260827150755_514cabea-d5ce-4aa4-a61b-0d0cd8fd8b83
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.bot_config
  ADD COLUMN IF NOT EXISTS chat_model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  ADD COLUMN IF NOT EXISTS voice_model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  ADD COLUMN IF NOT EXISTS ai_default_model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  ADD COLUMN IF NOT EXISTS ai_vision_model text NOT NULL DEFAULT 'google/gemini-2.5-pro';

-- ═══════════════════════════════════════════════════════════════
--  7/14  20260831094737_03a2db8d-480b-449c-9623-08e6e5a20182
-- ═══════════════════════════════════════════════════════════════

-- Clients : unicité e-mail + user_id optionnel
ALTER TABLE public.customers ALTER COLUMN user_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS customers_email_unique ON public.customers (lower(email));
ALTER TABLE public.customers ADD CONSTRAINT customers_email_key UNIQUE (email);

-- Traçabilité WooCommerce
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS wc_id BIGINT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'site';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS orders_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS wc_created_at TIMESTAMPTZ;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS wc_id BIGINT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'site';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS wc_created_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS orders_wc_id_idx ON public.orders (wc_id);
CREATE INDEX IF NOT EXISTS customers_wc_id_idx ON public.customers (wc_id);

-- Configuration WooCommerce
CREATE TABLE IF NOT EXISTS public.woocommerce_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE DEFAULT 'main',
  store_url TEXT,
  consumer_key TEXT,
  consumer_secret TEXT,
  sync_customers BOOLEAN NOT NULL DEFAULT true,
  sync_orders BOOLEAN NOT NULL DEFAULT true,
  sync_stats BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  store_info JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.woocommerce_config TO authenticated;
GRANT ALL ON public.woocommerce_config TO service_role;
ALTER TABLE public.woocommerce_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "woocommerce_config_admin_all" ON public.woocommerce_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_woocommerce_config_updated_at BEFORE UPDATE ON public.woocommerce_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Statistiques WooCommerce
CREATE TABLE IF NOT EXISTS public.woocommerce_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report TEXT NOT NULL,
  period TEXT NOT NULL DEFAULT 'month',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (report, period)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.woocommerce_stats TO authenticated;
GRANT ALL ON public.woocommerce_stats TO service_role;
ALTER TABLE public.woocommerce_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "woocommerce_stats_admin_all" ON public.woocommerce_stats
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_woocommerce_stats_updated_at BEFORE UPDATE ON public.woocommerce_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
--  8/14  20260831110301_30e10259-7c99-4111-b131-a471891d2989
-- ═══════════════════════════════════════════════════════════════

-- 1. Checkout config: relay-only free shipping
ALTER TABLE public.checkout_config
  ADD COLUMN IF NOT EXISTS free_shipping_relay_only BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE public.checkout_config
SET free_shipping_relay_only = TRUE,
    shipping_home_price = 15,
    free_shipping_threshold = 99
WHERE config_key = 'main';

-- 2. Contact messages: automatic AI reply
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS auto_reply TEXT,
  ADD COLUMN IF NOT EXISTS auto_replied_at TIMESTAMPTZ;

-- 3. FAQ items
CREATE TABLE IF NOT EXISTS public.faq_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.faq_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faq_items TO authenticated;
GRANT ALL ON public.faq_items TO service_role;

ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active FAQ items" ON public.faq_items;
CREATE POLICY "Anyone can read active FAQ items"
ON public.faq_items FOR SELECT TO anon, authenticated
USING (is_active = TRUE OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage FAQ items" ON public.faq_items;
CREATE POLICY "Admins can manage FAQ items"
ON public.faq_items FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_faq_items_updated_at ON public.faq_items;
CREATE TRIGGER update_faq_items_updated_at
BEFORE UPDATE ON public.faq_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.faq_items (question, answer, category, sort_order)
SELECT * FROM (VALUES
  ('Quels sont les délais de livraison ?', 'Vos commandes sont préparées sous 24 à 48h ouvrées. La livraison Colissimo prend ensuite 2 à 3 jours ouvrés en France métropolitaine.', 'livraison', 1),
  ('La livraison est-elle gratuite ?', 'La livraison en point relais est offerte dès 99 € d''achat. La livraison à domicile est facturée 15 €, quel que soit le montant de la commande.', 'livraison', 2),
  ('Comment suivre ma commande ?', 'Dès l''expédition, vous recevez un e-mail avec votre numéro de suivi. Vous pouvez aussi consulter l''avancement dans votre espace client, rubrique « Où en est mon colis ».', 'livraison', 3),
  ('Puis-je retourner un article ?', 'Vous disposez de 14 jours après réception pour nous retourner un article non porté, dans son emballage d''origine. Les articles enfants ne sont ni repris ni échangés.', 'retours', 4),
  ('Quels moyens de paiement acceptez-vous ?', 'Carte bancaire, PayPal et virement bancaire. Tous les paiements sont sécurisés.', 'paiement', 5),
  ('Comment choisir ma taille ?', 'Chaque fiche produit dispose d''un guide des tailles. En cas de doute, écrivez-nous : nous vous conseillons la taille adaptée à votre morphologie.', 'produits', 6)
) AS v(question, answer, category, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.faq_items);

-- 4. Customer profile creation (server-side, called on sign-in)
CREATE OR REPLACE FUNCTION public.ensure_customer_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

REVOKE ALL ON FUNCTION public.ensure_customer_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_customer_profile() TO authenticated;

-- Backfill existing signed-up accounts
INSERT INTO public.customers (user_id, email, first_name, last_name, source, created_at)
SELECT u.id,
       u.email,
       COALESCE(u.raw_user_meta_data->>'first_name', ''),
       COALESCE(u.raw_user_meta_data->>'last_name', ''),
       'site',
       u.created_at
FROM auth.users u
WHERE u.email IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.customers c WHERE c.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM public.customers c WHERE lower(c.email) = lower(u.email));

UPDATE public.customers c
SET user_id = u.id
FROM auth.users u
WHERE c.user_id IS NULL AND lower(c.email) = lower(u.email);

-- 5. Order validation reads the saved checkout configuration
CREATE OR REPLACE FUNCTION public.validate_and_create_order(
  p_items jsonb,
  p_promo_code text,
  p_delivery_mode text,
  p_order_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- ═══════════════════════════════════════════════════════════════
--  9/14  20260831114904_72a51ffa-57ef-4a70-8901-819048a8bb72
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE public.role_permissions (
  role app_role PRIMARY KEY,
  allowed_routes text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.role_permissions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_permissions_select_authenticated"
  ON public.role_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "role_permissions_admin_write"
  ON public.role_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.role_permissions (role, allowed_routes) VALUES
  ('preparator', ARRAY['/admin','/admin/preparations','/admin/colissimo']),
  ('stock_manager', ARRAY['/admin','/admin/stock','/admin/produits','/admin/preparations']),
  ('order_validator', ARRAY['/admin','/admin/commandes','/admin/preparations','/admin/colissimo','/admin/clients']),
  ('auditor', ARRAY['/admin','/admin/audit','/admin/errors','/admin/bannieres-analytics','/admin/media-audit'])
ON CONFLICT (role) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 10/14  20260831210155_email_infra
-- ═══════════════════════════════════════════════════════════════

-- Email infrastructure
-- Creates the queue system, send log, send state, suppression, and unsubscribe
-- tables used by both auth and transactional emails.

-- ⚠️ ÉCARTÉ : CREATE EXTENSION pg_net / pg_cron / supabase_vault / pgmq
-- ⚠️ ÉCARTÉ : création des files pgmq (auth_emails, transactional_emails + DLQ)
--    Motif : personne n'appelle enqueue_email(). La file, le worker et le cron
--    tourneraient à vide. Seules les 4 TABLES sont créées ci-dessous.


-- Email send log table (audit trail for all send attempts)
-- UPDATE is allowed for the service role so the suppression edge function
-- can update a log record's status when a bounce/complaint/unsubscribe occurs.
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT,
  template_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'suppressed', 'failed', 'bounced', 'complained', 'dlq')),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Supabase no longer grants public-schema access to service_role by default;
-- emit the grant explicitly so edge functions can reach the table via PostgREST.
GRANT ALL ON public.email_send_log TO service_role;

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can read send log"
    ON public.email_send_log FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert send log"
    ON public.email_send_log FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can update send log"
    ON public.email_send_log FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_send_log_created ON public.email_send_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient ON public.email_send_log(recipient_email);

-- Backfill: add message_id column to existing tables that predate this migration
DO $$ BEGIN
  ALTER TABLE public.email_send_log ADD COLUMN message_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_send_log_message ON public.email_send_log(message_id);

-- Prevent duplicate sends: only one 'sent' row per message_id.
-- If VT expires and another worker picks up the same message, the pre-send
-- check catches it. This index is a DB-level safety net for race conditions.
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_send_log_message_sent_unique
  ON public.email_send_log(message_id) WHERE status = 'sent';

-- Backfill: update status CHECK constraint for existing tables that predate new statuses
DO $$ BEGIN
  ALTER TABLE public.email_send_log DROP CONSTRAINT IF EXISTS email_send_log_status_check;
  ALTER TABLE public.email_send_log ADD CONSTRAINT email_send_log_status_check
    CHECK (status IN ('pending', 'sent', 'suppressed', 'failed', 'bounced', 'complained', 'dlq'));
END $$;

-- Rate-limit state and queue config (single row, tracks Retry-After cooldown + throughput settings)
CREATE TABLE IF NOT EXISTS public.email_send_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  retry_after_until TIMESTAMPTZ,
  batch_size INTEGER NOT NULL DEFAULT 10,
  send_delay_ms INTEGER NOT NULL DEFAULT 200,
  auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15,
  transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.email_send_state (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Backfill: add config columns to existing tables that predate this migration
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN batch_size INTEGER NOT NULL DEFAULT 10;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN send_delay_ms INTEGER NOT NULL DEFAULT 200;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

GRANT ALL ON public.email_send_state TO service_role;

ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can manage send state"
    ON public.email_send_state FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ⚠️ ÉCARTÉ : wrappers RPC pgmq (enqueue_email, read_email_batch,
--    delete_email, move_to_dlq) et leurs GRANT/REVOKE — dépendent de pgmq,
--    non installée. À rejouer le jour où la file servira.

CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('unsubscribe', 'bounce', 'complaint')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(email)
);

GRANT ALL ON public.suppressed_emails TO service_role;

ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can read suppressed emails"
    ON public.suppressed_emails FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert suppressed emails"
    ON public.suppressed_emails FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_suppressed_emails_email ON public.suppressed_emails(email);

-- Email unsubscribe tokens table (one token per email address for unsubscribe links)
-- No DELETE policy to prevent removing tokens. UPDATE allowed only to mark tokens as used.
CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ
);

GRANT ALL ON public.email_unsubscribe_tokens TO service_role;

ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can read tokens"
    ON public.email_unsubscribe_tokens FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can insert tokens"
    ON public.email_unsubscribe_tokens FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can mark tokens as used"
    ON public.email_unsubscribe_tokens FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_token ON public.email_unsubscribe_tokens(token);

-- ============================================================
-- POST-MIGRATION STEPS (applied dynamically by setup_email_infra)
-- These steps contain project-specific secrets and URLs and
-- cannot be expressed as static SQL. They are applied via the
-- Supabase Management API (ExecuteSQL) each time the tool runs.
-- ============================================================
--
-- 1. VAULT SECRET
--    Stores (or updates) the Supabase service_role key in
--    vault as 'email_queue_service_role_key'.
--    Uses vault.create_secret / vault.update_secret (upsert).
--    To revert: DELETE FROM vault.secrets WHERE name = 'email_queue_service_role_key';
--
-- 2. CRON JOB (pg_cron)
--    Creates job 'process-email-queue' with a 5-second interval.
--    The job checks:
--      a) rate-limit cooldown (email_send_state.retry_after_until)
--      b) whether auth_emails or transactional_emails queues have messages
--    If conditions are met, it calls the process-email-queue Edge Function
--    via net.http_post using the vault-stored service_role key.
--    To revert: SELECT cron.unschedule('process-email-queue');

-- ═══════════════════════════════════════════════════════════════
-- 11/14  20260901071319_f99fa5fb-d0f9-474f-867b-0ee6c43269c8
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

DELETE FROM public.crm_contacts a
USING public.crm_contacts b
WHERE a.ctid > b.ctid AND lower(a.email) = lower(b.email);

UPDATE public.crm_contacts SET email = lower(email) WHERE email <> lower(email);

CREATE UNIQUE INDEX IF NOT EXISTS crm_contacts_email_key ON public.crm_contacts (email);

-- ═══════════════════════════════════════════════════════════════
-- 12/14  20260901131321_21daec8b-2ab1-477f-87af-31f19a9f23de
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.newsletters
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirm_token UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS newsletters_confirm_token_idx ON public.newsletters(confirm_token);
CREATE UNIQUE INDEX IF NOT EXISTS newsletters_unsubscribe_token_idx ON public.newsletters(unsubscribe_token);

CREATE TABLE IF NOT EXISTS public.newsletter_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  preheader TEXT,
  content TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  cta_label TEXT,
  cta_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  unsubscribed_count INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletter_campaigns TO authenticated;
GRANT ALL ON public.newsletter_campaigns TO service_role;
ALTER TABLE public.newsletter_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage newsletter campaigns"
ON public.newsletter_campaigns FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.newsletter_campaign_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.newsletter_campaigns(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS newsletter_campaign_sends_campaign_idx ON public.newsletter_campaign_sends(campaign_id);

GRANT SELECT ON public.newsletter_campaign_sends TO authenticated;
GRANT ALL ON public.newsletter_campaign_sends TO service_role;
ALTER TABLE public.newsletter_campaign_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read newsletter campaign sends"
ON public.newsletter_campaign_sends FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_newsletter_campaigns_updated_at
BEFORE UPDATE ON public.newsletter_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.checkout_config
  ADD COLUMN IF NOT EXISTS auto_colissimo_label BOOLEAN NOT NULL DEFAULT false;

-- ═══════════════════════════════════════════════════════════════
-- 13/14  20260901134241_15b9d0b8-75ac-443b-a867-194d4cb898d1
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.password_reset_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  ip_hash text,
  succeeded boolean NOT NULL DEFAULT true,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_attempts_email_created_idx
  ON public.password_reset_attempts (email, created_at DESC);

GRANT ALL ON public.password_reset_attempts TO service_role;

ALTER TABLE public.password_reset_attempts ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- 14/14  20260901152408_7ec2c941-72c2-42ab-9f9e-e1d87e0a0cdb
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS abandoned_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS orders_is_draft_idx ON public.orders (is_draft);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS weight_grams INTEGER,
  ADD COLUMN IF NOT EXISTS dim_length_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS dim_width_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS dim_height_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS colissimo_product_code TEXT;

CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  html_body TEXT NOT NULL DEFAULT '',
  text_body TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_templates_admin_all"
  ON public.email_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

UPDATE public.orders
   SET abandoned_at = now()
 WHERE abandoned_at IS NULL
   AND lower(coalesce(payment_status, '')) <> 'paid';

COMMIT;
