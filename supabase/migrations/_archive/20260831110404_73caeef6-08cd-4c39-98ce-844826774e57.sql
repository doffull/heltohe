DROP VIEW IF EXISTS public.checkout_config_public;
CREATE VIEW public.checkout_config_public AS
SELECT cc.id,
    cc.config_key,
    cc.shipping_home_price,
    cc.shipping_relay_price,
    cc.free_shipping_threshold,
    cc.free_shipping_relay_only,
    cc.home_delivery_enabled,
    cc.relay_enabled,
    cc.checkout_message,
    cc.relay_map_settings,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('key', pm.value ->> 'key'::text, 'label', pm.value ->> 'label'::text, 'enabled', COALESCE((pm.value ->> 'enabled'::text)::boolean, false), 'description', pm.value ->> 'description'::text, 'icon', pm.value ->> 'icon'::text)) AS jsonb_agg
           FROM jsonb_array_elements(COALESCE(cc.payment_methods, '[]'::jsonb)) pm(value)
          WHERE COALESCE((pm.value ->> 'enabled'::text)::boolean, false) = true), '[]'::jsonb) AS payment_methods
   FROM public.checkout_config cc;

GRANT SELECT ON public.checkout_config_public TO anon, authenticated, service_role;
