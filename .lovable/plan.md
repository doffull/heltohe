## Diagnostic

Le bug vient de `src/hooks/useDesignSettings.ts`. Plusieurs onglets admin appellent `updateDesignSettings({ ... })` avec des clés qui **ne sont jamais écrites en base** ni relues au chargement. React Query réhydrate depuis la base → la valeur locale disparaît → l'UI "ne veut pas changer".

Exemple précis rapporté (liens de navigation, `HeaderDesignTab`) :
- L'onglet écrit `headerNavItems`.
- La colonne DB `design_settings.header_nav_items` **existe déjà**.
- Mais ni `dbToSettings` ni `settingsToDb` ne la mappent → toggles/inputs sans effet.

### Autres champs orphelins détectés (même symptôme)

| Clé admin              | Colonne DB existante ?          | Correctif           |
|------------------------|---------------------------------|---------------------|
| `headerNavItems`       | ✅ `header_nav_items`           | Mapper colonne      |
| `topBanner`            | ✅ `top_banner`                 | Mapper colonne      |
| `adminSectionColors`   | ✅ `admin_section_colors`       | Mapper colonne      |
| `megaMenuLinks`        | ❌                              | Piggyback `settings_json.megaMenuLinks` |
| `sidebarNavLinks`      | ❌                              | Piggyback `settings_json.sidebarNavLinks` |
| `unifiedFab`           | ❌                              | Piggyback `settings_json.unifiedFab` |
| `promoParallax`        | ❌                              | Piggyback `settings_json.promoParallax` |
| `pageTransition`       | ❌                              | Piggyback `settings_json.pageTransition` |
| `fontHeading`, `fontBody` | ❌                           | Piggyback `settings_json.fonts` |
| `sliderImageOpacity`   | ❌                              | Piggyback `settings_json.sliderImageOpacity` |

## Correctif

1. **`src/hooks/useDesignSettings.ts`** — ajouter les 3 colonnes réelles et 7 champs piggyback dans `dbToSettings` (lecture) **et** `settingsToDb` (écriture).
2. Vérifier les valeurs par défaut pour éviter l'écrasement à l'upsert :
   - `headerNavItems` : `[]` par défaut (l'UI fournit déjà les templates).
   - `topBanner` : `null` par défaut (déjà colonne jsonb).
   - `adminSectionColors` : `{}` par défaut.
3. Aucune migration SQL requise — toutes les colonnes ciblées existent déjà.
4. `settings_json` reste unique (fusionner les nouveaux piggyback avec l'existant pour ne pas perdre `securityOverlay`, `trustpilot`, etc.).

## Vérification

1. Aller dans **Admin > Design > En-tête**, cocher un lien de nav dans la liste "Liens rapides" → refresh la page → le lien reste coché.
2. Modifier le label d'un lien de nav → refresh → le label est conservé.
3. Idem sur : liens du méga-menu, FAB unifié, transition de page, bannière du haut, couleurs des sections admin.
4. Ouvrir le site public → la nouvelle nav apparaît immédiatement (grâce à `refetchInterval: 15_000` déjà en place).

## Hors-scope

- Refonte du composant `HeaderDesignTab` (l'UI marche déjà, seul le pipeline de persistance était cassé).
- Migration de nouvelles colonnes dédiées pour les piggyback (`settings_json` suffit et évite de multiplier les colonnes rarement lues).
