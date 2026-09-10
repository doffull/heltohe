
CREATE TABLE public.stock_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  size TEXT,
  color TEXT,
  quantity_before INTEGER DEFAULT 0,
  quantity_after INTEGER DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.stock_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage stock history"
  ON public.stock_history FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
