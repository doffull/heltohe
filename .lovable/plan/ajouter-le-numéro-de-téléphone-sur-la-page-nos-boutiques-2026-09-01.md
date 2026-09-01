# Ajouter le numéro de téléphone sur la page « Nos boutiques »

## Objectif
Afficher le numéro **06 51 51 33 77** de façon bien visible, **au-dessus de la carte**, sur la page « Nos boutiques » (`/boutiques`), là où apparaissent les centres commerciaux.

## Changement
Dans `src/pages/Boutiques.tsx`, insérer un bandeau téléphone juste avant le bloc carte (`{/* Map */}`), dans le conteneur existant `px-6 lg:px-12` :

- Ligne d'appel à grande visibilité, style HUD cohérent avec le site :
  - icône `Phone` (lucide-react)
  - libellé « Information boutiques & centres commerciaux »
  - numéro en gros, gras, majuscules via `hud-text`
  - lien `tel:+33651513377` cliquable (mobile = appel direct)
- Mise en page responsive : centré sur mobile, aligné à gauche sur desktop, avec fond `bg-card` + bordure `border-border` et classe `chamfer-hud` pour rester dans la charte Industrial Luxury.

## Détails techniques
- Numéro formaté pour l'affichage : `06 51 51 33 77`
- `href` du lien : `tel:+33651513377`
- Aucune dépendance ni modification de la carte Google Maps.
- Aucun impact sur les données / backend.

## Hors périmètre
- La page `/trouver-une-boutique` (StoreLocator) n'est pas modifiée sauf si vous le souhaitez — je peux appliquer le même bandeau là-bas aussi.

## Vérification
- Lecture du rendu via aperçu sur mobile (360px) et desktop.
- Contrôle que le lien `tel:` est actif et le numéro lisible.
