# Presets GIF + génération de GIF en masse

Deux ajouts autour de l'outil « Créer un GIF animé ».

## 1. Presets réutilisables

Dans la fenêtre « Créer un GIF animé » (fiche produit) :

- La largeur de sortie devient un champ libre (200 → 2000 px) en plus des raccourcis existants, pour saisir 550, 1900, etc.
- Les derniers réglages utilisés (vitesse, largeur, boucle, destinations image principale / survol) sont mémorisés et rechargés automatiquement à la prochaine ouverture.
- Barre de presets nommés : « Enregistrer comme preset… » (nom saisi), sélection en un clic pour appliquer, et suppression. Les presets sont partagés pour tout l'admin (stockés dans les réglages du site), donc disponibles sur tous les produits.
- Un preset contient : vitesse par image, largeur, boucle, destinations par défaut.

## 2. Génération en masse

Nouvelle action de masse dans Produits, à côté de « Modifier en masse » : **« Créer des GIF »**, active dès qu'au moins un produit est sélectionné.

- Choix du preset (ou réglages manuels identiques à la fenêtre unitaire).
- Règle de composition des images pour chaque produit : « Image principale + galerie » ou « Galerie seulement », avec nombre max d'images par GIF (2 à 10).
- Destination : image principale et/ou image de survol.
- Liste des produits sélectionnés avec état par ligne (en attente / génération / uploadé / ignoré si moins de 2 images / erreur), barre de progression globale, traitement séquentiel annulable.
- À la fin : récapitulatif « X GIF créés, Y ignorés, Z erreurs ».

Les produits sans au moins 2 images sont ignorés proprement, sans bloquer le lot.

## Détails techniques

- **Presets stockés** en base : nouvelle colonne `gif_presets jsonb default '[]'` sur `design_settings` (admin uniquement, pas exposée dans la vue publique), plus champ `gifPresets` dans les types + mapping `useDesignSettings.ts`. Derniers réglages utilisés en `localStorage` (`hmp.gif.last`).
- **Extraction de la logique d'encodage** de `GifBuilderDialog.tsx` vers `src/lib/gifBuilder.ts` (`buildGifBlob({ images, delay, width, loop })`, chargement `crossOrigin`, canvas letterbox, quantize/applyPalette) afin d'être réutilisée par la version unitaire et la version en masse.
- **Nouveau composant** `src/components/admin/BulkGifDialog.tsx` : reçoit les produits sélectionnés, boucle séquentielle `buildGifBlob` → `useFileUpload` (bucket `media`, dossier `products/gifs`) → `useBulkUpdateProducts`/update individuel sur `image` et/ou `hover_image`.
- **Nouveau composant** `src/components/admin/GifPresetBar.tsx` partagé par les deux fenêtres (liste, application, enregistrement, suppression via `updateDesignSettings` + `flushDesignSettings`).
- `AdminProducts.tsx` : bouton et état d'ouverture dans la barre d'actions de masse existante (`useBulkSelection`).
