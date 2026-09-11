-- Rendre la roulette visible par les visiteurs, sans rouvrir les tables.
--
-- CONSTAT
-- `RouletteFab` teste `if (!config?.enabled || segments.length === 0) return null`.
-- Or `roulette_config` et `roulette_segments` portent chacune deux politiques
-- RESTRICTIVE issues du durcissement post-audit :
--     Deny anon reads on roulette_config/_segments        -> anon      : USING (false)
--     Restrict roulette_*_reads to admins                 -> connectés : admin uniquement
-- Les vues assainies `roulette_config_public` et `roulette_segments_public`
-- avaient été créées précisément pour exposer une version publique — mais en
-- `security_invoker = true`, elles s'exécutent avec les droits de l'appelant et
-- se font bloquer par ces mêmes politiques. Résultat : elles renvoient toujours
-- zéro ligne à un visiteur, et le bouton flottant ne s'affiche jamais. Vérifié
-- en production le 11/09/2026 : les deux vues renvoient [] en anonyme.
--
-- CHOIX
-- On bascule les deux vues en SECURITY DEFINER (security_invoker = false) :
-- elles s'exécutent alors avec les droits de leur propriétaire et contournent la
-- RLS des tables sous-jacentes.
--
-- Les tables, elles, NE SONT PAS TOUCHÉES : aucune politique n'est supprimée ni
-- assouplie. Un visiteur ne peut toujours pas les lire directement, et n'obtient
-- que les colonnes que les vues laissent passer.
--
-- C'est ce qui distingue cette solution de l'alternative « ajouter une politique
-- permissive pour anon sur les tables » : la RLS filtre des LIGNES, pas des
-- COLONNES. Ouvrir la table exposerait `probability_weight` — les probabilités
-- de gain — ainsi que `reward_value`, `min_purchase`, `max_discount` et
-- `code_prefix`. C'est exactement ce que les vues excluent, et ce qu'il ne faut
-- pas divulguer avant un tirage.
--
-- Les vues restent limitées aux colonnes d'affichage, et
-- `roulette_segments_public` conserve son filtre `WHERE is_active = true`.
--
-- ⚠️ L'analyseur de sécurité Supabase signale les vues SECURITY DEFINER par
-- principe. Ici c'est le comportement recherché et il est sûr : la vue est
-- filtrée en colonnes et en lignes, et n'expose aucune donnée personnelle.
--
-- Le tirage n'est pas concerné : `spin_roulette` est déjà SECURITY DEFINER avec
-- `search_path` fixé, et déjà accordée à anon.

ALTER VIEW "public"."roulette_config_public" SET ("security_invoker" = false);
ALTER VIEW "public"."roulette_segments_public" SET ("security_invoker" = false);

-- La lecture publique est portée par les vues uniquement.
GRANT SELECT ON "public"."roulette_config_public" TO "anon", "authenticated";
GRANT SELECT ON "public"."roulette_segments_public" TO "anon", "authenticated";

-- Garde-fou : les tables de base ne doivent jamais être lisibles directement.
-- Le baseline a posé un `GRANT ALL ... TO anon` dessus ; seules les politiques
-- RESTRICTIVE l'empêchent aujourd'hui d'avoir un effet. On retire le privilège
-- pour ne pas dépendre d'une seule ligne de défense.
REVOKE ALL ON "public"."roulette_config" FROM "anon";
REVOKE ALL ON "public"."roulette_segments" FROM "anon";
