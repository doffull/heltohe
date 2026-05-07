# Plan : Mobile checkout + couleurs par étape

## Objectif
Adapter le tunnel d'achat (Panier → Adresse → Livraison → Confirmation) au format mobile (360px) en évitant les débordements sur l'étape Colissimo, et donner une couleur distincte à chacune des 3 étapes.

## 1. Code couleur par étape

| Étape | Couleur | Token CSS |
|---|---|---|
| 1 — Adresse | Bleu | `hsl(210 90% 50%)` → `--step-address` |
| 2 — Livraison (Colissimo) | Orange | `hsl(28 95% 55%)` → `--step-delivery` |
| 3 — Confirmation | Vert | `hsl(142 70% 42%)` → `--step-confirm` |

- Ajout des 3 tokens HSL dans `src/index.css` (light + dark).
- Le numéro d'étape actif et l'icône du titre de section utilisent la couleur correspondante.
- La barre de progression colore les pastilles (active = couleur étape ; passée = même couleur en opacité 60%).
- Le bouton CTA principal de chaque étape reprend la couleur de son étape.

## 2. Mobile fixes — `src/pages/Checkout.tsx`

### Barre de progression (lignes 303-326)
- Afficher le label sous la pastille en `text-[10px]` à partir de 360px (suppression du `hidden sm:block`).
- Réduire largeur du séparateur (`w-4 sm:w-8`).
- Layout `flex-1` pour centrage propre.

### Étape 2 — Mode de livraison (zones qui débordent)
- Boutons Colissimo : passer le contenu en `flex-col gap-2 sm:flex-row sm:items-center sm:justify-between` pour que le prix passe sous le titre en mobile.
- Prix : `text-sm whitespace-nowrap`, titre `break-words`.
- Liste des points relais (lignes 466-499) :
  - `p-3` → `p-2.5` mobile.
  - Nom point relais : retirer `truncate`, autoriser `break-words` + `text-xs leading-tight`.
  - Adresse / horaires : `text-[11px]` mobile, `ml-5` → `ml-4`.
  - Distance : passer en haut à droite via `flex-col items-end`, ne plus chevaucher le texte.
- Bandeau récap "Point relais sélectionné" : adresse en `break-words`.
- Bandeau "Plus que X€" : `text-[11px]` mobile.
- Récap commande sticky (sidebar) : sur mobile (`<lg`), passer en accordéon repliable via `<details>` pour libérer l'écran. Sticky désactivé `<lg`.
- Boutons Retour / Confirmer : `flex-col sm:flex-row gap-2`, bouton confirmer prend toute la largeur mobile, montant en `text-sm` mobile.

### Étape 1 — Adresse
- Padding container `p-4 sm:p-6`.
- Inputs : `text-base` (évite le zoom iOS).

### Étape 3 — Confirmation
- Container `p-5 sm:p-8`, encadré IBAN passe en `text-[11px]` mobile, `break-all` sur la référence.

## 3. Mobile fixes — `src/pages/Cart.tsx`
- Carte produit : image `w-20 h-20 sm:w-24 sm:h-24`, prix `text-sm` mobile pour ne pas déborder.
- Récap : passer en accordéon `<details open>` sur `<lg` ou afficher sous les articles en pleine largeur (sticky désactivé mobile).
- Bouton "PASSER COMMANDE" : couleur étape 1 (bleu) pour annoncer la suite.

## 4. Tests visuels
- Screenshot 360x800 sur `/panier`, `/checkout` étapes 1, 2 (avec recherche relais 75001), 3.
- Vérifier qu'aucun texte/prix ne dépasse, que les 3 couleurs sont bien distinctes.

## Fichiers modifiés
- `src/index.css` (3 tokens couleur)
- `src/pages/Checkout.tsx` (layout mobile + couleurs)
- `src/pages/Cart.tsx` (layout mobile + couleur CTA)

Aucune modification de la logique métier (calcul prix, appel Colissimo, RPC commande).
