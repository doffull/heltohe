# Corriger le footer qui ne réagit pas aux réglages

## Ce qui se passe

Les réglages de **Admin → Footer** sont bien enregistrés en base (la configuration `showNewsletter`, `showCurrency`, `showLanguageSwitch` s'y trouve, dernière écriture à 14:03).

Le problème est en lecture : le site lit ses réglages de design via une vue publique qui expose 122 colonnes… mais **pas** la colonne de configuration du footer. Résultat : le footer reçoit toujours une configuration vide et retombe sur ses valeurs par défaut, quoi que vous changiez dans l'admin.

## Correction

1. Ajouter la colonne de configuration du footer à la vue publique de réglages, en conservant toutes les autres colonnes et les mêmes règles d'accès (lecture publique en lecture seule).
2. Vérifier ensuite dans l'aperçu qu'un changement (logo, texte de marque, colonnes de liens, newsletter, réseaux sociaux, liens légaux) se répercute immédiatement sur le pied de page du site.

Aucun changement de design ni de comportement de l'admin : c'est uniquement le canal de lecture qui est réparé.

## Détails techniques

- `src/hooks/useDesignSettings.ts` lit `design_settings_public` (`select('*')`) et mappe `db.footer_config → footerConfig`. La colonne absente de la vue rend `footerConfig` toujours `{}`.
- Migration : `CREATE OR REPLACE VIEW public.design_settings_public` en ajoutant `footer_config` à la liste de colonnes existante (view `security_invoker`), puis re-`GRANT SELECT` à `anon, authenticated` si nécessaire.
- Aucune modification de `src/components/layout/Footer.tsx` ni de `src/pages/admin/AdminFooter.tsx` prévue ; le cache local (`lvtk-design-cache-v2`) se rafraîchit tout seul (refetch toutes les 15 s).
