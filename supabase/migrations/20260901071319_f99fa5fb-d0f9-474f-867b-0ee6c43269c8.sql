ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

DELETE FROM public.crm_contacts a
USING public.crm_contacts b
WHERE a.ctid > b.ctid AND lower(a.email) = lower(b.email);

UPDATE public.crm_contacts SET email = lower(email) WHERE email <> lower(email);

CREATE UNIQUE INDEX IF NOT EXISTS crm_contacts_email_key ON public.crm_contacts (email);