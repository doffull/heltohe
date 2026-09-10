-- 1) checkout_config: remove blanket public read, expose a sanitized public view
DROP POLICY IF EXISTS "Anyone can view checkout config" ON public.checkout_config;

CREATE OR REPLACE VIEW public.checkout_config_public AS
SELECT
  cc.id,
  cc.config_key,
  cc.shipping_home_price,
  cc.shipping_relay_price,
  cc.free_shipping_threshold,
  cc.home_delivery_enabled,
  cc.relay_enabled,
  cc.checkout_message,
  cc.relay_map_settings,
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'key', pm->>'key',
      'label', pm->>'label',
      'enabled', COALESCE((pm->>'enabled')::boolean, false),
      'description', pm->>'description',
      'icon', pm->>'icon'
    ))
    FROM jsonb_array_elements(COALESCE(cc.payment_methods, '[]'::jsonb)) AS pm
    WHERE COALESCE((pm->>'enabled')::boolean, false) = true
  ), '[]'::jsonb) AS payment_methods
FROM public.checkout_config cc;

GRANT SELECT ON public.checkout_config_public TO anon, authenticated;

-- 2) product_reviews: authors may only edit pending reviews, and edits stay pending
DROP POLICY IF EXISTS "Users can edit their pending reviews within 30 days" ON public.product_reviews;

CREATE POLICY "Users can edit their pending reviews within 30 days"
ON public.product_reviews FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND status = 'pending'
  AND created_at > (now() - '30 days'::interval)
)
WITH CHECK (
  user_id = auth.uid()
  AND status = 'pending'
);

-- 3) Realtime: publish only the row id for products/categories
ALTER PUBLICATION supabase_realtime SET TABLE
  public.products (id),
  public.categories (id);