
## Plan — Espace Colissimo Complet (page dédiée /admin/colissimo)

### Ce qu'il faut construire

Une nouvelle page admin `/admin/colissimo` avec 3 onglets :

---

### Onglet 1 — Expéditions (tableau de bord principal)

Liste de toutes les commandes avec leur statut d'expédition Colissimo :
- Filtre : "Sans étiquette" / "Étiquette générée" / "Expédié" / "Livré"
- Colonne numéro de suivi cliquable (lien La Poste)
- Bouton **"Générer étiquette"** par ligne → appelle `colissimo-proxy` action `generateLabel` → sauvegarde le tracking dans la commande + télécharge le PDF
- Bouton **"Voir le suivi"** si numéro présent
- Bouton **"Marquer expédiée"** → met `status = 'Shipped'` + `shippingCarrier = 'Colissimo'`
- Compteurs en haut : À expédier / En transit / Livrées
- Génération groupée (plusieurs commandes à la fois)

---

### Onglet 2 — Points Relais (carte + liste)

Recherche de points relais Colissimo :
- Input code postal + bouton Rechercher → appelle `colissimo-proxy` action `getRelayPoints`
- **Carte interactive** via [Leaflet.js](https://leafletjs.com/) + OpenStreetMap (gratuit, pas de clé API)
  - Marqueurs sur la carte pour chaque point relais
  - Clic sur marqueur → popup avec infos
- Liste à côté avec nom, adresse, distance, horaires d'ouverture par jour
- Design : carte à gauche (2/3) + liste scrollable à droite (1/3)

**Package à ajouter** : `leaflet` + `react-leaflet` (gratuits, OSM, pas de clé API)

---

### Onglet 3 — Configuration Colissimo

Formulaire pour configurer les identifiants Colissimo :
- Champ Login Colissimo Entreprise + Password (stockés comme secrets via `secrets--fetch_secrets`)
- Adresse expéditeur (nom société, adresse, CP, ville) → stockée dans `design_settings` comme nouveaux champs `colissimo_sender_*`
- Test de connexion → bouton "Tester la connexion" → appelle `getRelayPoints` avec CP `75001` pour vérifier
- Statut de connexion (vert = OK / rouge = erreur credentials)
- Migration DB pour ajouter les champs sender dans `design_settings`

---

### Architecture technique

**Nouveau fichier** : `src/pages/admin/AdminColissimo.tsx`
- 3 tabs : Expéditions / Points Relais / Configuration

**Modifications** :
- `src/pages/admin/Admin.tsx` : ajouter route `/admin/colissimo/*` + icône Truck dans sidebar
- `supabase/functions/colissimo-proxy/index.ts` : ajouter action `testConnection` (appel `getRelayPoints` 75001 et retourne success/error)
- Migration DB : ajouter colonnes `colissimo_sender_name`, `colissimo_sender_address`, `colissimo_sender_zip`, `colissimo_sender_city` dans `design_settings`
- `src/hooks/useDesignSettings.ts` : mapper les nouveaux champs sender

**Carte** : `react-leaflet` + `leaflet` (npm packages, tiles OpenStreetMap gratuites)
- Coordonnées des points relais sont disponibles dans la réponse XML Colissimo (lat/lng dans `coordGeolocalisationLatitude` / `coordGeolocalisationLongitude`)
- Le parser `parseRelayPointsFromXml` dans l'edge function sera mis à jour pour inclure ces champs

---

### Fichiers à créer/modifier

| Fichier | Action |
|---|---|
| `src/pages/admin/AdminColissimo.tsx` | Créer — page complète 3 onglets |
| `src/pages/admin/Admin.tsx` | Ajouter route + sidebar item Colissimo |
| `supabase/functions/colissimo-proxy/index.ts` | Ajouter action `testConnection` + lat/lng dans parseRelayPoints |
| Migration SQL | Ajouter colonnes sender dans design_settings |
| `src/hooks/useDesignSettings.ts` | Mapper nouveaux champs colissimo_sender_* |

---

### Dépendances à installer

- `react-leaflet` + `leaflet` (carte interactive open-source, OpenStreetMap, gratuit, aucune clé API requise)
- Ajouter le CSS Leaflet dans `index.html` ou `index.css`
