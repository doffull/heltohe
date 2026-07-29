## Plan de correction

1. **Corriger la sauvegarde des badges de confiance produit**
   - Ajouter `productTrustBadges` dans le mapping `design_settings` ↔ réglages applicatifs.
   - Le stocker dans `settings_json` comme les autres réglages sans colonne dédiée.
   - Ainsi les changements dans `/admin/product-badges` ne disparaîtront plus au refetch/rechargement.

2. **Éviter que les réglages admin récents soient écrasés**
   - Renforcer `useDesignSettings` / `AppContext` pour que les réglages locaux en cours de modification ne soient pas remplacés trop tôt par une ancienne réponse backend.
   - Conserver un cache optimiste cohérent après chaque sauvegarde.
   - Ne réappliquer les données backend que lorsqu’il n’y a pas d’édition/sauvegarde en cours.

3. **Rendre la sauvegarde plus robuste pour les futures sections admin**
   - Étendre le bloc `settings_json` pour inclure les champs récents qui n’ont pas de colonne dédiée, au lieu de les perdre à chaque sauvegarde.
   - Préserver les valeurs existantes des sous-objets JSON quand une section admin ne modifie qu’une partie des réglages.

4. **Stabiliser l’interface Badges produit**
   - Garder l’onglet actif et la catégorie active pendant l’édition.
   - Ajouter des boutons explicitement non-submit si nécessaire pour éviter toute réinitialisation involontaire.
   - Utiliser les mises à jour immédiates sur les actions critiques comme activation/désactivation, ajout/suppression et édition des badges.

5. **Vérifier le problème sur l’admin global**
   - Contrôler les composants admin qui utilisent `updateDesignSettings` pour les liens de navigation, switches, textes et badges.
   - Harmoniser leur comportement de sauvegarde pour que les clics, champs texte et cases à cocher restent modifiables.

6. **Validation finale**
   - Tester visuellement dans l’admin : modifier un badge, désactiver/activer un badge, changer un label, ajouter une catégorie, puis vérifier que la page ne revient pas à l’état initial.
   - Vérifier un autre espace admin de réglages avec switch/texte/lien navigation pour confirmer que le problème ne se reproduit pas.