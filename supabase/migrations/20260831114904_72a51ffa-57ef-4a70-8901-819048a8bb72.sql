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