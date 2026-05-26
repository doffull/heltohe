
# Refonte Header + Hero (style Under Armour)

Objectif : reproduire la mise en page de la capture (header sombre compact + hero plein écran avec vidéo et titres en bas) **uniquement** sur la page d'accueil. Le reste de la page reste strictement identique.

## 1. Header style Under Armour

Refonte de `src/components/layout/Header.tsx` :
- Fond **noir** unifié (avec léger glaze conservé en option), hauteur compacte (~56 px mobile, 64 px desktop).
- Disposition en 3 zones :
  - **Gauche** : bouton hamburger (ouvre le sidebar existant) + sélecteur langue FR/EN compact.
  - **Centre** : logo de la marque (BrandLogo, version blanche, centré et plus grand).
  - **Droite** : icône **Recherche** (ouvre la barre actuelle ou un overlay), icône **Compte** (lien `/account`), icône **Panier** avec badge quantité (lien `/cart`).
- Barre **bandeau supérieur** fine "Livraison gratuite dès 30€ | Retours sous 60 jours" alimentée par `designSettings.announcementBar` (texte éditable, masquable).
- Tous les icônes en blanc, hover subtil.
- Le header reste `fixed` mais devient **full width** sur la page d'accueil (au-dessus du sidebar) pour matcher la capture ; sur les autres pages, l'offset `left-16 lg:left-64` est conservé.
- Animations existantes (frost drift, glaze) conservées en plus discret.

## 2. Hero plein écran style "carburant"

Refonte de `src/components/home/HeroSlider.tsx` :
- Hauteur : **100vh mobile**, `90vh` desktop (au lieu de 55/70/80 vh).
- Pleine largeur (déjà le cas) — supprimer la marge gauche induite par le sidebar sur la home : le hero passe **derrière** le sidebar.
- Support **vidéo background** déjà présent (`mediaType: 'video'`) : on s'assure de `autoplay muted loop playsInline`, `object-cover`, ratio plein.
- Overlay dégradé bas → haut (noir 70 % → transparent) pour la lisibilité.
- **Textes positionnés en bas** (au lieu du centre) :
  - Mini-titre/eyebrow optionnel (ex : "BASELAYER HEATGEAR ELITE").
  - Titre énorme **bold uppercase** (typo display, ~`clamp(2.5rem, 9vw, 6rem)`), aligné à gauche, 2 lignes max.
  - Sous-titre court.
  - CTA bouton plein large mobile / inline desktop.
- Dots/flèches déplacés en bas à droite, plus discrets.

## 3. Page Home

Dans `src/pages/Home.tsx` :
- Ajouter une classe wrapper `home-fullbleed-hero` pour permettre au Hero de sortir des paddings et passer sous/au-dessus du sidebar (via CSS dédié dans `index.css`).
- **Rien d'autre n'est modifié** : Voice banner, catégories, produits, loyalty, popup, roulette, FABs — tout reste intact et dans le même ordre.

## 4. Détails techniques

- Nouvelle prop `variant?: 'home' | 'default'` sur `Header` (défaut `default`). `MainLayout` détecte `pathname === '/'` et passe `variant="home"`.
- Variant `home` : header full width, fond noir, logo centré, icônes droite.
- Variant `default` : comportement actuel inchangé.
- Nouvelle clé `designSettings.announcementBar?: { enabled: boolean; text: string }` (avec fallback) — pas de migration DB nécessaire, stockée dans le JSON design existant.
- Pas de changement de logique métier, pas de changement DB, pas de changement des autres pages.

## 5. Fichiers touchés

- `src/components/layout/Header.tsx` (refonte)
- `src/components/layout/MainLayout.tsx` (passer le variant selon la route)
- `src/components/home/HeroSlider.tsx` (hauteur, position des textes, overlay)
- `src/pages/Home.tsx` (wrapper full-bleed)
- `src/index.css` (classe `home-fullbleed-hero`, ajustement z-index header home)

Aucun autre fichier n'est touché.
