
-- A. Storage: drop the broad SELECT policy that allows listing.
-- Public read via /storage/v1/object/public/... bypasses RLS for public buckets, so URLs still work.
DROP POLICY IF EXISTS "Anyone can view media" ON storage.objects;

-- Keep admin-only listing for management UI
CREATE POLICY "Admins can list media"
ON storage.objects FOR SELECT
USING (bucket_id = 'media' AND has_role(auth.uid(), 'admin'::app_role));

-- B. Revoke EXECUTE on trigger-only SECURITY DEFINER functions (not meant to be called via API)
REVOKE EXECUTE ON FUNCTION public.auto_create_category_page() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.generate_category_slug() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.audit_role_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.auto_create_inventory_on_product_insert() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;

-- C. Limit message length on public contact form (defense against spam/DoS)
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_length_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_length_check
  CHECK (length(message) <= 5000 AND length(name) <= 200);

-- D. Explicit "deny anon" for defense in depth on sensitive admin tables
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'admin_config', 'notification_config', 'notification_log',
    'role_audit_log', 'colissimo_bordereaux', 'stock_transfers', 'stock_history'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Deny anon access" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "Deny anon access" ON public.%I AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false)',
      t
    );
  END LOOP;
END $$;
