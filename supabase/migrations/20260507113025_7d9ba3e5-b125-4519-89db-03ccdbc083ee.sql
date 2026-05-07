CREATE TABLE public.home_fab_buttons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Sparkles',
  action_type TEXT NOT NULL DEFAULT 'route',
  action_value TEXT NOT NULL DEFAULT '/',
  variant TEXT NOT NULL DEFAULT 'glossy',
  position_desktop JSONB NOT NULL DEFAULT '{"corner":"br","x":24,"y":24}'::jsonb,
  position_mobile  JSONB NOT NULL DEFAULT '{"corner":"br","x":16,"y":16}'::jsonb,
  visible_desktop BOOLEAN NOT NULL DEFAULT true,
  visible_mobile  BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  badge TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT home_fab_action_type_chk CHECK (action_type IN ('route','external','roulette','voice','chat','newsletter')),
  CONSTRAINT home_fab_variant_chk CHECK (variant IN ('glossy','glass','neon','metal','outline','minimal'))
);

ALTER TABLE public.home_fab_buttons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active fab buttons"
  ON public.home_fab_buttons FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage fab buttons"
  ON public.home_fab_buttons FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_home_fab_buttons_updated_at
  BEFORE UPDATE ON public.home_fab_buttons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();