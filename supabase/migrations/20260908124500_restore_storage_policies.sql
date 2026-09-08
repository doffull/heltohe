-- Rétablit les politiques RLS de `storage.objects`, perdues lors du transfert
-- du 03-04/09 vers hzjzqdlyehclnpeqkier (§21).
--
-- 🔴 CONSTAT — `select … from pg_policies where schemaname = 'storage'` ne
-- renvoyait AUCUNE ligne : pas une seule politique, tous buckets confondus.
-- RLS restant actif, tout accès `authenticated` était refusé. Symptôme visible
-- côté admin : « new row violates row-level security policy » à chaque envoi
-- d'image (bannière, photo produit), et médiathèque vide.
--
-- Pourquoi c'était passé inaperçu : seuls les accès NAVIGATEUR sont concernés.
--   · l'affichage public des images passe par /storage/v1/object/public/…,
--     qui contourne la RLS sur un bucket public ;
--   · les étiquettes Colissimo (create-colissimo-label, colissimo-proxy,
--     order-slip-pdf) utilisent la clé service_role, qui l'ignore aussi.
-- Tout ce qui transite par le serveur fonctionnait donc normalement.
--
-- ⚠️ POURQUOI CE N'EST PAS UN SIMPLE OUBLI À REJOUER — le transfert a copié le
-- bucket et ses objets, mais pas le schéma interne `storage` où vivent les
-- politiques (l'angle mort déjà relevé au §21 : seul le schéma `public` avait
-- été comparé). Et comme `supabase_migrations` a été recopié à l'identique
-- (186 entrées), Supabase tient les migrations d'origine pour appliquées :
-- elles ne seront JAMAIS rejouées. D'où cette migration de rattrapage.
--
-- ⚠️ À APPLIQUER À LA MAIN dans l'éditeur SQL du projet. Pour la même raison,
-- `supabase db push` ne garantit pas son exécution.
--
-- Idempotente : rejouable sans effet de bord. Ne touche ni aux buckets ni aux
-- objets — uniquement aux politiques.
--
-- Origine des définitions reprises ici :
--   media  → 20260208144212 (INSERT/UPDATE/DELETE) + 20260505103928 (SELECT)
--   labels → 20260818142129 (SELECT/INSERT/DELETE) + 20260831101715 (UPDATE)
--
-- Écart assumé avec 20260208144212 : le rôle y était passé sans cast
-- (`has_role(auth.uid(), 'admin')`). On normalise sur la forme typée
-- `'admin'::app_role`, seule employée depuis, et on restreint explicitement
-- `TO authenticated` — la version de février s'appliquait à `public`, ce qui
-- exposait inutilement la règle au rôle `anon`.

-- ---------------------------------------------------------------------------
-- Bucket `media` — public en lecture, écriture réservée aux admins.
--
-- ⚠️ Pas de politique SELECT pour `anon` : c'est volontaire depuis
-- 20260505103928. La lecture publique emprunte l'URL publique, qui ne consulte
-- pas la RLS ; ouvrir le SELECT ici autoriserait en plus le LISTAGE du bucket.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins can list media" ON storage.objects;
CREATE POLICY "Admins can list media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can upload media" ON storage.objects;
CREATE POLICY "Admins can upload media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'::app_role));

-- `upsert: true` côté client (AdminDesign, InventoryProductDialog, Bulk*) : un
-- remplacement déclenche un UPDATE, pas un INSERT. Sans cette politique, seul
-- le tout premier envoi d'un chemin donné passerait.
DROP POLICY IF EXISTS "Admins can update media" ON storage.objects;
CREATE POLICY "Admins can update media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete media" ON storage.objects;
CREATE POLICY "Admins can delete media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------------
-- Bucket `labels` — privé, et cela doit le rester : une étiquette porte le nom,
-- l'adresse et le téléphone du destinataire. La lecture publique passe par des
-- URL signées, émises côté serveur.
--
-- Les préparateurs lisent, seuls les admins écrivent.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins can read labels" ON storage.objects;
CREATE POLICY "Admins can read labels"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'labels'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'preparator'::app_role)
  )
);

DROP POLICY IF EXISTS "Admins can write labels" ON storage.objects;
CREATE POLICY "Admins can write labels"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'labels' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update labels" ON storage.objects;
CREATE POLICY "Admins can update labels"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'labels' AND public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'labels' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete labels" ON storage.objects;
CREATE POLICY "Admins can delete labels"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'labels' AND public.has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------------
-- Contrôle. Doit renvoyer 8 lignes.
-- ---------------------------------------------------------------------------
-- select policyname, cmd, roles
--   from pg_policies
--  where schemaname = 'storage' and tablename = 'objects'
--  order by policyname;
