# Corriger « Google Maps key missing » dans Admin → Boutiques

## Ce qui a été vérifié

- La connexion Google Maps Platform est bien active et liée au projet (clé gérée par Lovable, passerelle activée).
- Les variables `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` et `..._TRACKING_ID` sont présentes et non vides côté application.
- La page Admin → Boutiques (`src/pages/admin/AdminBoutiques.tsx`) **n'affiche aucune carte** aujourd'hui : elle ne fait que de la recherche IA (fonction `boutique-lookup`) et un géocodage via OpenStreetMap/Nominatim.
- Le message « Google Maps key missing » provient du chargeur de carte, dupliqué à l'identique dans 3 fichiers : `src/lib/loadGoogleMaps.ts`, `src/pages/Boutiques.tsx`, `src/pages/StoreLocator.tsx`. Le chargeur lit la clé **au moment de l'import du module** : si la page était ouverte avant l'arrivée de la clé, l'erreur reste affichée tant que l'onglet n'est pas rechargé.

## Ce qui sera fait

1. **Un seul chargeur de carte**
   - Supprimer les copies locales dans `Boutiques.tsx` et `StoreLocator.tsx`, tout passer par `src/lib/loadGoogleMaps.ts`.
   - Lire la clé au moment de l'appel (et non à l'import), pour qu'un simple retour sur la page suffise après configuration.
   - Message d'erreur en français et compréhensible, avec bouton « Réessayer ».

2. **Carte de prévisualisation dans Admin → Boutiques**
   - Mini-carte dans le formulaire de boutique, centrée sur les coordonnées saisies, avec marqueur déplaçable pour ajuster la position (met à jour lat/lng).
   - Repli propre si la carte ne charge pas : lien « Voir sur Google Maps » (déjà présent) + saisie manuelle lat/lng.

3. **Géocodage fiabilisé**
   - Remplacer OpenStreetMap/Nominatim par le géocodage Google via la passerelle du connecteur (côté serveur, dans la fonction `boutique-lookup` étendue avec une action `geocode`).
   - Messages d'erreur explicites si la clé serveur est refusée, au lieu d'un « Adresse introuvable » trompeur.

4. **Vérification**
   - Contrôle du chargement de la carte sur `/boutiques`, sur la section « Nos boutiques » de l'accueil et sur `/admin/boutiques`.
   - Test du géocodage sur une adresse réelle.

## Détails techniques

- Chargeur unique : `key`/`channel` relus via `import.meta.env` à chaque appel, promesse mémorisée uniquement en cas de succès, `loading=async` + callback global conservés.
- Marqueur admin : `google.maps.Marker` avec `draggable: true` (pas d'`AdvancedMarkerElement`, qui exige un `mapId`).
- Géocodage serveur : `GET /maps/api/geocode/json` via `https://connector-gateway.lovable.dev/google_maps`, avec gestion explicite du 403 (clé restreinte).
- Aucun changement sur le catalogue, les commandes, les paiements ou le design global.
