-- Expéditions hors France — forfait international et déclaration douanière.
--
-- Contexte : jusqu'ici le pays n'était jamais demandé au checkout et l'étiquette
-- déclarait toujours `FR` à Colissimo. Toute commande étrangère était bloquée à
-- l'expédition. Arbitrage du 14/09/2026, voir COLISSIMO_ARBITRAGE.md.
--
-- Cette migration couvre la partie base de données :
--   1. le forfait international, réglable depuis l'admin ;
--   2. son application dans `validate_and_create_order` ;
--   3. les deux réglages douaniers (code SH, pays d'origine) utilisés par
--      l'étiquetage pour construire la déclaration CN23.

-- ---------------------------------------------------------------------------
-- 1. Forfait international
-- ---------------------------------------------------------------------------

ALTER TABLE public.checkout_config
  ADD COLUMN IF NOT EXISTS international_shipping_price NUMERIC NOT NULL DEFAULT 40;

COMMENT ON COLUMN public.checkout_config.international_shipping_price IS
  'Forfait unique appliqué dès que la destination n''est pas la France. Remplace '
  'les frais de port (il ne s''y ajoute pas) et ignore le franco de port. '
  'Affiché à la cliente sous « Supplément d''expédition internationale » — jamais '
  '« frais de douane » : les droits réels restent dus à la réception.';

-- La vue publique alimente le checkout : sans cette colonne, le front retombe
-- sur sa valeur par défaut et n'obéit plus au réglage de l'administration.
--
-- ⚠️ `international_shipping_price` est ajoutée EN DERNIÈRE POSITION, et non à
-- côté des autres tarifs : `CREATE OR REPLACE VIEW` n'autorise l'ajout de
-- colonnes qu'à la fin. L'insérer au milieu ferait échouer la migration avec
-- « cannot change name of view column ».
CREATE OR REPLACE VIEW public.checkout_config_public AS
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
          WHERE (COALESCE((("pm"."value" ->> 'enabled'::"text"))::boolean, false) = true)), '[]'::"jsonb") AS "payment_methods",
    "international_shipping_price"
   FROM "public"."checkout_config" "cc";

ALTER VIEW public.checkout_config_public OWNER TO postgres;
GRANT ALL ON TABLE public.checkout_config_public TO anon;
GRANT ALL ON TABLE public.checkout_config_public TO authenticated;
GRANT ALL ON TABLE public.checkout_config_public TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Réglages douaniers
-- ---------------------------------------------------------------------------

ALTER TABLE public.admin_config
  ADD COLUMN IF NOT EXISTS colissimo_customs_hs_code TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS colissimo_customs_origin_country TEXT DEFAULT 'CN';

COMMENT ON COLUMN public.admin_config.colissimo_customs_hs_code IS
  'Code SH (nomenclature douanière) par défaut, utilisé quand le produit n''en '
  'porte pas. Laissé vide sur décision du 14/09/2026. À renseigner sans '
  'redéploiement si un envoi est refusé ou retenu en douane — pour des doudounes, '
  '620240 (enveloppe synthétique, positions « femmes », note 9 du chapitre 62).';

COMMENT ON COLUMN public.admin_config.colissimo_customs_origin_country IS
  'Pays de FABRICATION des articles (et non d''expédition), code ISO 2 lettres.';

-- ---------------------------------------------------------------------------
-- 3. Application du forfait à la création de commande
-- ---------------------------------------------------------------------------
-- ⚠️ Cette fonction est le miroir serveur de `computeShippingCost`
-- (src/hooks/useCheckoutConfig.ts). Les deux doivent rendre le même montant,
-- sinon le prix affiché et le prix encaissé divergent.

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
  v_international NUMERIC;
  v_country TEXT;
  v_is_domestic BOOLEAN;
BEGIN
  SELECT free_shipping_threshold, shipping_home_price, shipping_relay_price,
         free_shipping_relay_only, international_shipping_price
  INTO v_cfg
  FROM public.checkout_config WHERE config_key = 'main';

  v_threshold := COALESCE(v_cfg.free_shipping_threshold, 99);
  v_home := COALESCE(v_cfg.shipping_home_price, 15);
  v_relay := COALESCE(v_cfg.shipping_relay_price, 4.5);
  v_relay_only := COALESCE(v_cfg.free_shipping_relay_only, TRUE);
  v_international := COALESCE(v_cfg.international_shipping_price, 40);

  -- Le checkout envoie un code ISO depuis le 14/09/2026 ; les commandes plus
  -- anciennes et les corrections manuelles en admin portent le libellé complet.
  -- Les deux doivent être reconnus comme « France », sinon une commande
  -- française hériterait du forfait international.
  v_country := UPPER(TRIM(COALESCE(p_order_data->>'customer_country', 'FR')));
  v_is_domestic := v_country IN ('FR', 'FRANCE', '');

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

  IF NOT v_is_domestic THEN
    -- Forfait unique hors France : il remplace les frais de port, s'applique
    -- quel que soit le mode de livraison et ne connaît pas le franco.
    v_shipping_cost := v_international;
  ELSIF p_delivery_mode = 'home' THEN
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

  -- Un code « livraison offerte » n'annule pas le forfait international : il
  -- couvre un envoi France, pas le surcoût réel d'un envoi hors frontière.
  IF v_free_shipping AND v_is_domestic THEN
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
    -- On enregistre le code ISO normalisé : c'est lui que l'étiquetage
    -- transmettra à Colissimo.
    CASE WHEN v_is_domestic THEN 'FR' ELSE v_country END,
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
