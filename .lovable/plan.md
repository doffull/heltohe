## Objectif
Retirer la possibilité de télécharger le résultat de l'essayage virtuel.

## Modification
Fichier : `src/components/product/VirtualTryOnButton.tsx`

1. Supprimer le bouton « Télécharger » (lignes ~382-384) affiché sous l'image générée.
2. Supprimer la fonction `download` (lignes ~124-130) devenue inutile.
3. Retirer `Download` de l'import `lucide-react` (ligne 3).

Aucun autre changement (le reste du flux d'essayage virtuel reste identique).