## Problème identifié

La version publiée charge bien l’app, mais la requête publique vers `design_settings_public` retourne une liste vide (`[]`). Du coup le site tombe sur les valeurs par défaut du code : `Mon Site`, logo absent, image hero en placeholder, etc.

Cause probable : la vue publique `design_settings_public` a été repassée en mode `security_invoker`, donc elle applique les règles privées de la table `design_settings`. Ces règles autorisent l’admin connecté, mais bloquent les visiteurs anonymes du site publié.

## Plan de correction

1. **Restaurer la lecture publique sécurisée des réglages visibles**
   - Recréer/ajuster `design_settings_public` comme vue publique contrôlée, sans exposer les champs sensibles.
   - Conserver la table source `design_settings` privée/admin-only.
   - Donner l’accès de lecture à `anon` et `authenticated` uniquement sur la vue publique.

2. **Vérifier les médias publics**
   - Confirmer que le bucket `media` est bien public.
   - Vérifier que le logo et les vidéos/images de hero présents dans vos réglages sont accessibles publiquement.

3. **Valider sur le domaine publié**
   - Recharger `https://lvtk2026.helvetica-mp.net` en visiteur anonyme.
   - Vérifier que la requête `design_settings_public` retourne la ligne `main`.
   - Confirmer que le logo, le nom du site et les médias configurés reviennent au lieu des placeholders.

## Détail technique

La correction sera une migration base de données ciblée :
- ne pas rendre `design_settings` publique directement ;
- utiliser `design_settings_public` comme surface publique filtrée ;
- garder les règles de sécurité admin sur la table complète.