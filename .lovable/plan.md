# GIF animés produits + gestion Top ventes / Nouveautés

Deux ajouts distincts : un générateur de GIF animé dans « Modifier produit », et une vraie curation manuelle des sections de la page d'accueil.

## 1. Générateur de GIF animé (fiche produit admin)

Dans le formulaire produit, un bouton **« Créer un GIF animé »** ouvre une petite fenêtre :

- Sélection de 2 à 10 images parmi l'image principale et la galerie du produit (cases à cocher, ordre réglable).
- Réglages simples : vitesse (durée par image, 100 ms → 1 s), taille de sortie (600 px ou 900 px de large), boucle infinie.
- Aperçu animé immédiat avant validation.
- Génération dans le navigateur (quelques secondes), puis envoi automatique dans la médiathèque.
- À la fin, deux choix : **définir comme image principale** ou **définir comme image de survol** (effet swap de la vignette). Les deux sont possibles.

Le GIF s'affiche partout où l'image produit est utilisée (vignette boutique, fiche produit, galerie) sans changement d'affichage : c'est une image normale, animée.

## 2. Espace Top ventes / Nouveautés (Dashboard → onglet Produits)

L'onglet « Produits » de la gestion page d'accueil est enrichi :

- Ajout de la section manquante **Top ventes** aux côtés de En vedette, Nouveautés, Promo, Tendances.
- Pour chaque section : liste des produits mis en avant, **réordonnable par glisser-déposer**, avec vignette, nom et prix.
- Ajout/retrait d'un produit via la recherche existante (un clic).
- L'ordre défini dans l'admin est exactement l'ordre affiché sur la page d'accueil.
- Compteur par section et limite indicative de 8 produits (au-delà, seuls les 8 premiers sont affichés en homepage).

La page d'accueil respecte cette sélection ordonnée ; si une section n'a aucune sélection manuelle, le comportement automatique actuel (par tag, puis repli) reste en place.

## Détails techniques

**GIF**
- Nouvelle dépendance `gifenc` (encodage GIF léger côté navigateur).
- Nouveau composant `src/components/admin/GifBuilderDialog.tsx` : chargement des images en `Image` (`crossOrigin="anonymous"`), rendu sur `<canvas>` à taille fixe (letterbox pour conserver le ratio), quantification + encodage frame par frame, `Blob` `image/gif`.
- Upload via `useFileUpload` (bucket `media`, dossier `products/gifs`), puis `setFormData` sur `image` et/ou `hoverImage` dans `ProductForm.tsx`.
- Aucun changement backend nécessaire : `image` / `hover_image` sont déjà des URLs, et `FileDropZone` accepte déjà `image/gif`.

**Curation homepage**
- Migration : ajout d'une colonne `home_section_products jsonb default '{}'` sur `design_settings` (format `{ "top": ["uuid", ...], "new": [...] }`), plus exposition dans la vue publique `design_settings_public`.
- Types : champ `homeSectionProducts?: Record<string, string[]>` dans les types de design settings + mapping dans `useDesignSettings.ts`.
- `src/pages/admin/AdminDashboard.tsx` (`ProductsTab`) : ajout du tag `top`, panneau de curation avec drag & drop (HTML5 native, comme `AdminCategoryOrdering`), écriture dans `updateDesignSettings({ homeSectionProducts })` ; le tag produit reste synchronisé pour compatibilité.
- `src/components/home/ProductSections.tsx` : résolution des produits par `homeSectionProducts[section.id]` (ordre préservé, produits inactifs/marketplace filtrés via `excludeMarketplaceProducts`), repli sur la logique par tag existante.
