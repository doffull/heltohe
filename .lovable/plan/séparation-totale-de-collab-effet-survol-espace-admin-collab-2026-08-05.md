# Séparation totale de Collab + effet survol + espace admin Collab

## Constat vérifié

- En base, les 39 produits Collab sont tous bien étiquetés `category = "Collab"` (aucun produit Collab caché dans Homme/Femme/Enfant).
- Sur `/boutique` onglet « Tout » (desktop et mobile 360px), la grille publique ne rend **aucun** produit Collab aujourd'hui : le seul « Collab » présent dans la page est le lien de navigation de l'en-tête. La fuite que vous voyez vient donc très probablement d'un cache navigateur/écran mis en cache — le plan commence par une revérification, puis met en place un garde-fou centralisé pour que ce soit impossible.
- Les filtres tailles/couleurs de la boutique sont déjà calculés sur la liste hors-Collab, mais rien n'empêche structurellement une régression : le filtrage est répété à la main dans une dizaine de fichiers.

## 1. Isolation Collab garantie (garde-fou centralisé)

- Nouveau hook `useShopProducts()` (catalogue normal, Collab exclu) et `useCollabProducts()` (Collab uniquement), basés sur `useProducts`.
- Remplacer tous les appels directs à `useProducts()` côté vitrine par le hook adapté : boutique, accueil, sections produits, méga menu, recherche, sidebar HUD, recommandations, compte à rebours promo, assistant vocal, rendu de pages.
- Tailles et couleurs : les options de filtre proviennent toujours du même jeu de données que la grille → aucune couleur/taille Collab dans la boutique normale, et inversement.
- Vérification navigateur après coup : `/boutique`, `/boutique?category=Homme`, `/collab`, recherche, méga menu.

## 2. Filtres propres à Collab

- Sur `/collab`, panneau de filtres alimenté uniquement par les produits Collab.
- En plus : possibilité de définir dans l'admin une liste de **tailles Collab** et de **pastilles couleur Collab** (ordre + libellé + couleur). Si définie, elle prime sur la détection automatique ; sinon, détection automatique depuis les produits Collab.

## 3. Effet swap d'image au survol

- Sur la vignette produit : fondu croisé vers une seconde image au survol (et au premier tap sur mobile, sans bloquer la navigation).
- Source de l'image : image de survol dédiée si définie sur le produit, sinon la 2ᵉ image de la galerie ; aucun effet si le produit n'a qu'une image.
- Nouveau champ « Image de survol » dans le formulaire produit (choix via la médiathèque).
- Réglages activation / vitesse / type de transition (fondu, zoom, glissement) — global pour la boutique, et surchargeable pour Collab.

## 4. Tailles affichées plus bas

- Dans la vignette, le bloc « Tailles disponibles » descend en bas de l'image (au lieu du centre), au-dessus du liseré, avec apparition douce au survol.

## 5. Nouvel espace admin « Collab » (`/admin/collab`)

Quatre onglets :

1. **Produits** — liste des produits Collab uniquement, création/édition avec la catégorie Collab pré-remplie, sous-titre Collab par défaut, badge « LIMITED EDITION » pré-activé, édition en masse (prix, stock, sous-titre, image principale).
2. **Filtres** — gestion des tailles Collab et des pastilles couleur Collab (ajout, renommage, couleur/texture, réordonnancement par glisser-déposer).
3. **Page & contenus** — titre, sous-titre, texte d'intro, image de hero/bannière, textes des CTA de `/collab`, métadonnées SEO.
4. **Animation & disposition** — effet de survol (type, durée), nombre de colonnes de la grille (mobile/tablette/desktop), style des pastilles, affichage ou non des tailles, position du badge.

Sauvegarde selon le comportement admin habituel : enregistrement instantané pour les changements structurels, auto-save différé (800 ms) pour les champs texte.

## Détails techniques

- Migration base de données :
  - `products.hover_image text` (image de survol par produit).
  - `design_settings.collab_settings jsonb` (tailles, couleurs, textes de page, animation, disposition) avec valeur par défaut.
- `src/lib/shopVisibility.ts` conservé comme source de vérité, étendu pour couvrir aussi les sous-catégories d'une catégorie marketplace.
- Nouveaux fichiers : `src/hooks/useShopProducts.ts`, `src/hooks/useCollabSettings.ts`, `src/pages/admin/AdminCollab.tsx` (+ onglets), et une variante `CollabFilterPanel` réutilisant `ShopFilterPanel`.
- Route `/admin/collab` ajoutée dans `Admin.tsx` et entrée correspondante dans la navigation admin.
- Aucun changement sur les prix, le tunnel de commande ou les paiements.
