CREATE TABLE public.product_category_order (
  category_slug text NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (category_slug, product_id)
);

CREATE INDEX product_category_order_slug_position_idx
  ON public.product_category_order (category_slug, position);

GRANT SELECT ON public.product_category_order TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_category_order TO authenticated;
GRANT ALL ON public.product_category_order TO service_role;

ALTER TABLE public.product_category_order ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read product order"
  ON public.product_category_order FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert product order"
  ON public.product_category_order FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update product order"
  ON public.product_category_order FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete product order"
  ON public.product_category_order FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_product_category_order_updated_at
  BEFORE UPDATE ON public.product_category_order
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();