
-- Locations table (boutiques, web, B2B)
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'boutique', -- boutique, web, b2b
  address TEXT,
  city TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage locations" ON public.locations FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view active locations" ON public.locations FOR SELECT USING (is_active = true);

-- Inventory table (product-level inventory config)
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  threshold INTEGER NOT NULL DEFAULT 10,
  channel TEXT NOT NULL DEFAULT 'b2c', -- b2b, b2c, both
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id)
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage inventory" ON public.inventory FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view inventory" ON public.inventory FOR SELECT USING (true);

-- Stock levels (quantity per product per location)
CREATE TABLE public.stock_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved INTEGER NOT NULL DEFAULT 0,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(inventory_id, location_id)
);

ALTER TABLE public.stock_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage stock levels" ON public.stock_levels FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view stock levels" ON public.stock_levels FOR SELECT USING (true);

-- Stock transfers
CREATE TABLE public.stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE NOT NULL,
  from_location_id UUID REFERENCES public.locations(id) NOT NULL,
  to_location_id UUID REFERENCES public.locations(id) NOT NULL,
  quantity INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_transit, completed, cancelled
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage transfers" ON public.stock_transfers FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_levels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_transfers;

-- Triggers for updated_at
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_stock_levels_updated_at BEFORE UPDATE ON public.stock_levels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_stock_transfers_updated_at BEFORE UPDATE ON public.stock_transfers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed 15 boutiques + Web + B2B
INSERT INTO public.locations (name, type, city) VALUES
  ('Westfield Forum des Halles', 'boutique', 'Paris'),
  ('Les Quatre Temps', 'boutique', 'La Défense'),
  ('Centre Bourse', 'boutique', 'Marseille'),
  ('Part-Dieu', 'boutique', 'Lyon'),
  ('Euralille', 'boutique', 'Lille'),
  ('Polygone', 'boutique', 'Montpellier'),
  ('Cap 3000', 'boutique', 'Nice'),
  ('Mériadeck', 'boutique', 'Bordeaux'),
  ('Place d''Arc', 'boutique', 'Orléans'),
  ('Les Terrasses du Port', 'boutique', 'Marseille'),
  ('Confluence', 'boutique', 'Lyon'),
  ('Grand Littoral', 'boutique', 'Marseille'),
  ('Carré Sénart', 'boutique', 'Lieusaint'),
  ('Aéroville', 'boutique', 'Tremblay-en-France'),
  ('Parly 2', 'boutique', 'Le Chesnay'),
  ('Boutique en ligne', 'web', NULL),
  ('Canal B2B', 'b2b', NULL);
