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