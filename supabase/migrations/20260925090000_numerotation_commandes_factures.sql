-- Numérotation des commandes et des factures — 25/09/2026
--
-- Demande du client : deux séries DISTINCTES, CONSÉCUTIVES, générées côté
-- serveur.
--   · Commandes : HMP-10000, HMP-10001, …  (séquence Postgres)
--   · Factures  : FA-1000,   FA-1001,   …  (compteur verrouillé)
--
-- Avant : le numéro de commande était fabriqué par l'APPELANT à partir de
-- l'horloge (`HMP-${Date.now().toString(36)}`), dans le navigateur ou dans
-- les edge functions `payplug` / `paypal`. Non séquentiel, et deux commandes
-- à la même milliseconde se percutaient. Il n'existait aucun numéro de
-- facture : la facture imprimée reprenait le numéro de commande.
--
-- Pourquoi deux mécanismes différents :
--   · une SÉQUENCE n'est pas transactionnelle — une commande refusée après
--     `nextval` (produit inactif, code promo invalide…) laisse un trou. C'est
--     sans conséquence pour une commande.
--   · une FACTURE doit suivre une série continue, sans trou (obligation
--     légale en France). Le compteur est une ligne mise à jour dans la même
--     transaction que la commande : si la transaction échoue, le numéro est
--     rendu. Le verrou de ligne sérialise deux paiements simultanés.
--
-- Règles d'attribution de la facture (trigger `assign_invoice_number`) :
--   · au passage à « payé », une seule fois, jamais réattribuée ;
--   · jamais pour une commande de test (`is_test`) ni un import WooCommerce
--     (`WC-…`) ni un ancien test (`TEST-…`) ;
--   · aucune attribution rétroactive : les commandes déjà payées avant cette
--     migration restent sans numéro de facture.
-- Les avoirs ne sont PAS gérés (décision du 25/09/2026).

-- ---------------------------------------------------------------------------
-- 1. Série des commandes
-- ---------------------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS public.order_number_seq
  AS BIGINT START WITH 10000 MINVALUE 10000 INCREMENT BY 1;

-- ---------------------------------------------------------------------------
-- 2. Série des factures
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.invoice_counter (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),  -- une seule ligne
  last_value BIGINT NOT NULL
);

INSERT INTO public.invoice_counter (id, last_value) VALUES (TRUE, 999)
  ON CONFLICT (id) DO NOTHING;

-- Aucun accès direct : seul le trigger (SECURITY DEFINER) y touche.
ALTER TABLE public.invoice_counter ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.invoice_counter FROM anon, authenticated;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS invoiced_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS orders_invoice_number_key
  ON public.orders (invoice_number) WHERE invoice_number IS NOT NULL;

CREATE OR REPLACE FUNCTION public.assign_invoice_number()
  RETURNS TRIGGER
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
  AS $$
DECLARE
  v_next BIGINT;
BEGIN
  -- Une facture émise est définitive : personne ne la modifie ni ne l'efface.
  IF TG_OP = 'UPDATE' AND OLD.invoice_number IS NOT NULL THEN
    NEW.invoice_number := OLD.invoice_number;
    NEW.invoiced_at := OLD.invoiced_at;
    RETURN NEW;
  END IF;

  -- Aucune facture ne se pose à la main.
  IF TG_OP = 'INSERT' OR NEW.invoice_number IS DISTINCT FROM OLD.invoice_number THEN
    NEW.invoice_number := NULL;
    NEW.invoiced_at := NULL;
  END IF;

  IF lower(btrim(COALESCE(NEW.payment_status, ''))) <> 'paid'
     OR NEW.is_test
     OR NEW.order_number LIKE 'WC-%'
     OR NEW.order_number LIKE 'TEST-%' THEN
    RETURN NEW;
  END IF;

  -- Uniquement au PASSAGE à « payé ». Sans cette garde, n'importe quelle
  -- modification d'une commande déjà payée avant la migration (ajout d'un
  -- numéro de suivi…) lui attribuerait une facture rétroactive.
  IF TG_OP = 'UPDATE' AND lower(btrim(COALESCE(OLD.payment_status, ''))) = 'paid' THEN
    RETURN NEW;
  END IF;

  UPDATE public.invoice_counter
     SET last_value = last_value + 1
   WHERE id
  RETURNING last_value INTO v_next;

  NEW.invoice_number := 'FA-' || v_next;
  NEW.invoiced_at := now();
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.assign_invoice_number() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.assign_invoice_number() FROM PUBLIC, anon, authenticated;

-- BEFORE : le numéro est écrit dans la même ligne, dans la même transaction.
DROP TRIGGER IF EXISTS assign_invoice_number_trg ON public.orders;
CREATE TRIGGER assign_invoice_number_trg
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.assign_invoice_number();

-- ---------------------------------------------------------------------------
-- 3. Création de commande : le numéro est attribué par le serveur
-- ---------------------------------------------------------------------------
-- Reprise de la version du 14/09/2026 (expedition_internationale), seules
-- changent l'attribution du numéro et la prise en compte de `is_test`.

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
  v_is_test BOOLEAN;
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

  -- Le numéro est attribué ici et nulle part ailleurs : tout
  -- `order_number` envoyé par l'appelant est ignoré (voir en-tête).
  -- Une commande de test n'est reconnue que si l'appelant est admin, et ne
  -- consomme pas la série : elle garde un préfixe TEST- hors séquence.
  v_is_test := lower(COALESCE(p_order_data->>'is_test', '')) IN ('true', 't', '1')
               AND public.has_role(auth.uid(), 'admin');

  IF v_is_test THEN
    v_order_number := 'TEST-' || to_char(clock_timestamp(), 'YYMMDDHH24MISSMS');
  ELSE
    v_order_number := 'HMP-' || nextval('public.order_number_seq');
  END IF;

  INSERT INTO public.orders (
    order_number, user_id, customer_email, customer_name, customer_phone,
    customer_address, customer_city, customer_zip, customer_country, items,
    subtotal, shipping_cost, tax, total, payment_method, payment_status, status, shipping_carrier,
    is_test
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
    'colissimo',
    v_is_test
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
