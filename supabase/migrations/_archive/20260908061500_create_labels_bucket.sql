-- Bucket des étiquettes d'expédition.
--
-- Les politiques d'accès existent depuis le 18/08 (lecture admin et
-- préparateur, écriture / mise à jour / suppression réservées aux admins),
-- mais le bucket lui-même n'avait jamais été créé : `create-colissimo-label`
-- échouait sur « Upload échoué: Bucket not found » juste après avoir obtenu
-- l'étiquette de Colissimo. Le colis était donc affranchi côté La Poste, et
-- perdu côté site.
--
-- Créé à la main sur hzjzqdlyehclnpeqkier le 08/09 ; cette migration le verse
-- au dépôt pour qu'un projet reconstruit le retrouve — la migration du §21 a
-- montré ce qui arrive au reste.
--
-- ⚠️ Privé, et cela doit le rester : une étiquette porte le nom, l'adresse et
-- le téléphone du destinataire. La lecture passe par des URL signées.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('labels', 'labels', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;
